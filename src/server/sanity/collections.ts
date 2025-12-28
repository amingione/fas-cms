import type { SanityClient } from '@sanity/client';

type AutomaticRules = {
  ruleType: string;
  newArrivalsConfig?: { daysBack: number; maxProducts?: number };
  bestSellersConfig?: { minSales?: number; maxProducts?: number };
  onSaleConfig?: { minDiscountPercentage?: number };
  lowStockConfig?: { maxQuantity?: number };
  highRatedConfig?: { minRating?: number; minReviews?: number };
  customQuery?: string;
  categoryFilter?: Array<{ _ref: string }>;
  tagFilter?: string[];
  excludeOutOfStock?: boolean;
};

type CollectionDocument = {
  _id: string;
  collectionType?: string;
  manualProducts?: Array<{ _ref: string }>;
  automaticRules?: AutomaticRules;
};

function addFilter(query: string, clause: string): string {
  return query.replace(']', ` && ${clause}]`);
}

export async function getCollectionProducts(client: SanityClient, collectionId: string) {
  const collection = await client.getDocument(collectionId);
  if (!collection) return [];

  const { collectionType, manualProducts = [], automaticRules } = collection as CollectionDocument;

  if (collectionType === 'manual') {
    if (!Array.isArray(manualProducts) || !manualProducts.length) return [];
    const ids = manualProducts.map((p) => p?._ref).filter(Boolean);
    if (!ids.length) return [];
    return client.fetch(
      `*[_type == "product" && _id in $ids]{
        _id,
        title,
        displayTitle,
        slug,
        images[0],
        pricing,
        inventory,
        reviews,
        "price": pricing.price
      }`,
      { ids }
    );
  }

  const rules = automaticRules || ({} as AutomaticRules);
  let query = '*[_type == "product" && status == "active"';

  switch (rules.ruleType) {
    case 'new_arrivals': {
      const cutoffDate = new Date();
      const daysBack = rules.newArrivalsConfig?.daysBack ?? 30;
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const maxProducts = rules.newArrivalsConfig?.maxProducts ?? 50;
      query += ` && _createdAt > "${cutoffDate.toISOString()}" ] | order(_createdAt desc) [0...${maxProducts}]`;
      break;
    }
    case 'best_sellers': {
      const minSales = rules.bestSellersConfig?.minSales ?? 0;
      const maxProducts = rules.bestSellersConfig?.maxProducts ?? 50;
      query += ` && salesCount > ${minSales}] | order(salesCount desc) [0...${maxProducts}]`;
      break;
    }
    case 'on_sale': {
      query += ' && pricing.onSale == true && pricing.saleActive == true';
      if (rules.onSaleConfig?.minDiscountPercentage) {
        query += ` && pricing.discountPercentage >= ${rules.onSaleConfig.minDiscountPercentage}`;
      }
      query += '] | order(pricing.discountPercentage desc)';
      break;
    }
    case 'low_stock': {
      const maxQuantity = rules.lowStockConfig?.maxQuantity ?? 5;
      query += ` && inventory.trackInventory == true && inventory.quantityAvailable <= ${maxQuantity} && inventory.quantityAvailable > 0]`;
      break;
    }
    case 'high_rated': {
      const minRating = rules.highRatedConfig?.minRating ?? 4;
      const minReviews = rules.highRatedConfig?.minReviews ?? 1;
      query += ` && reviews.averageRating >= ${minRating} && reviews.totalReviews >= ${minReviews}] | order(reviews.averageRating desc)`;
      break;
    }
    case 'custom': {
      query = `*[${rules.customQuery || ''}]`;
      break;
    }
    default: {
      query += ']';
    }
  }

  if (rules.categoryFilter?.length) {
    const categoryIds = rules.categoryFilter.map((ref) => ref._ref).filter(Boolean);
    if (categoryIds.length) {
      query = addFilter(query, 'references(*[_type == "category" && _id in $categoryIds]._id)');
    }
  }

  if (rules.tagFilter?.length) {
    const tags = rules.tagFilter.map((tag) => tag.replace('"', '\\"')).join('", "');
    query = addFilter(query, `count((tags[])[@ in ["${tags}"]]) > 0`);
  }

  if (rules.excludeOutOfStock) {
    query = addFilter(query, '(inventory.quantityAvailable > 0 || inventory.allowBackorder == true)');
  }

  query += '{ _id, title, displayTitle, slug, images[0], pricing, inventory, reviews, "price": pricing.price }';

  return client.fetch(query, {
    categoryIds: rules.categoryFilter?.map((ref) => ref._ref).filter(Boolean)
  });
}
