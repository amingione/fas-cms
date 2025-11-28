/**
 * Centralized GROQ queries for the storefront that align with the new Sanity
 * pricing, inventory, variant, and fulfillment fields.
 */

// 1.1 Product Detail Page Query
export const productDetailQuery = /* groq */ `
*[_type == "product" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  description,
  images,
  
  // Pricing with sale logic
  "pricing": {
    "price": pricing.price,
    "salePrice": pricing.salePrice,
    "onSale": pricing.onSale,
    "compareAtPrice": pricing.compareAtPrice,
    "saleActive": pricing.saleActive,
    "discountPercentage": pricing.discountPercentage,
    "saleStartDate": pricing.saleStartDate,
    "saleEndDate": pricing.saleEndDate
  },
  
  // Inventory availability
  "inventory": {
    "trackInventory": inventory.trackInventory,
    "inStock": inventory.quantityAvailable > 0,
    "quantity": inventory.quantityAvailable,
    "allowBackorder": inventory.allowBackorder,
    "lowStock": inventory.quantityAvailable <= inventory.lowStockThreshold,
    "lowStockThreshold": inventory.lowStockThreshold,
    "backorderMessage": inventory.backorderMessage,
    "restockDate": inventory.restockDate
  },
  
  // Variant configuration
  hasVariants,
  variantOptions[]{
    name,
    values
  },
  
  // Available variants only
  variants[available == true] | order(position asc) {
    _key,
    sku,
    title,
    options,
    price,
    compareAtPrice,
    image,
    "inventory": {
      "inStock": inventory.quantityAvailable > 0,
      "quantity": inventory.quantityAvailable,
      "allowBackorder": inventory.allowBackorder
    },
    weight,
    dimensions,
    barcode
  },
  
  // Shipping info
  shippingConfig,
  
  // SEO
  metaTitle,
  metaDescription
}
`;

// 1.2 Product Listing Query (Collection/Category Pages)
export const productListingQuery = /* groq */ `
*[_type == "product" && status == "active" && references($categoryId)] | order(featured desc, _createdAt desc) [0...24] {
  _id,
  title,
  slug,
  images[0],
  
  "pricing": {
    "price": pricing.price,
    "salePrice": pricing.salePrice,
    "onSale": pricing.onSale && pricing.saleActive,
    "compareAtPrice": pricing.compareAtPrice,
    "discountPercentage": pricing.discountPercentage
  },
  
  "inventory": {
    "inStock": inventory.trackInventory == false || inventory.quantityAvailable > 0 || inventory.allowBackorder == true,
    "lowStock": inventory.quantityAvailable <= inventory.lowStockThreshold && inventory.quantityAvailable > 0
  },
  
  hasVariants,
  "variantCount": count(variants[available == true])
}
`;

// 1.3 Inventory Check Before Checkout
export const inventoryCheckQuery = /* groq */ `
*[_type == "product" && _id in $productIds]{
  _id,
  "sku": inventory.sku,
  "trackInventory": inventory.trackInventory,
  "available": inventory.quantityAvailable,
  "reserved": inventory.quantityReserved,
  "inStock": inventory.quantityInStock,
  "allowBackorder": inventory.allowBackorder,
  
 // For variant products
  hasVariants,
  variants[sku in $variantSkus]{
    sku,
    "available": inventory.quantityAvailable,
    "allowBackorder": inventory.allowBackorder
  }
}
`;

// 1.4 Check Active Sales
export const activeSalesQuery = /* groq */ `
*[_type == "product" && pricing.onSale == true && pricing.saleActive == true] | order(pricing.discountPercentage desc) [0...12] {
  _id,
  title,
  slug,
  images[0],
  "pricing": {
    "price": pricing.price,
    "salePrice": pricing.salePrice,
    "compareAtPrice": pricing.compareAtPrice,
    "discountPercentage": pricing.discountPercentage,
    "saleEndDate": pricing.saleEndDate
  }
}
`;

// 1.5 Order Tracking Query
export const orderTrackingQuery = /* groq */ `
*[_type == "order" && orderNumber == $orderNumber && customerEmail == $email][0]{
  _id,
  orderNumber,
  status,
  createdAt,
  totalAmount,
  
  cart[]{
    name,
    quantity,
    price,
    image,
    productUrl
  },
  
  shippingAddress,
  
  "fulfillment": {
    "status": fulfillment.status,
    "method": fulfillment.fulfillmentMethod,
    "trackingNumber": fulfillment.trackingNumber,
    "trackingUrl": fulfillment.trackingUrl,
    "carrier": fulfillment.carrier,
    "service": fulfillment.service,
    "shippedAt": fulfillment.shippedAt,
    "estimatedDelivery": fulfillment.estimatedDelivery,
    "deliveredAt": fulfillment.deliveredAt,
    "deliveredTo": fulfillment.deliveredTo,
    
    "trackingEvents": fulfillment.trackingEvents[] | order(timestamp desc) {
      status,
      message,
      location,
      timestamp
    },
    
    // For pickup orders
    "pickupLocation": fulfillment.pickupLocation.location,
    "readyAt": fulfillment.pickupLocation.readyAt
  }
}
`;

// 1.6 Collections and promotions/reviews additions
export const activePromotionsQuery = /* groq */ `
*[_type == "promotion"
  && status == "active"
  && schedule.isActive == true
  && visibility == "visible"
] | order(schedule.endDate asc) {
  _id,
  title,
  code,
  displayName,
  description,
  promotionType,
  discountType,
  discountValue,
  appliesTo,
  "requirements": {
    "type": minimumRequirements.requirementType,
    "amount": minimumRequirements.minimumAmount,
    "quantity": minimumRequirements.minimumQuantity
  },
  "schedule": {
    "startDate": schedule.startDate,
    "endDate": schedule.endDate
  },
  "marketing": {
    "badgeText": marketing.badgeText,
    "bannerImage": marketing.bannerImage
  },
  "usage": {
    "totalLimit": usageLimits.totalUsageLimit,
    "perCustomerLimit": usageLimits.perCustomerLimit,
    "currentUsage": usageLimits.currentUsageCount
  }
}`;

export const validatePromotionQuery = /* groq */ `
*[_type == "promotion"
  && code == $code
  && status == "active"
  && schedule.isActive == true
][0]{
  _id,
  title,
  code,
  promotionType,
  discountType,
  discountValue,
  appliesTo,
  eligibleProducts[]->_id,
  eligibleCategories[]->_id,
  eligibleCollections[]->_id,
  minimumRequirements,
  customerEligibility,
  usageLimits,
  combinability,
  "isValid": schedule.isActive && (
    !defined(usageLimits.totalUsageLimit) ||
    usageLimits.currentUsageCount < usageLimits.totalUsageLimit
  )
}`;

export const promotionLandingQuery = /* groq */ `
*[_type == "promotion" && slug.current == $slug][0]{
  _id,
  title,
  displayName,
  description,
  code,
  discountType,
  discountValue,
  "schedule": {
    "startDate": schedule.startDate,
    "endDate": schedule.endDate
  },
  "marketing": {
    "bannerImage": marketing.bannerImage,
    "landingPageContent": marketing.landingPageContent
  },
  appliesTo,
  "eligibleProducts": select(
    appliesTo == "products" => eligibleProducts[]->{
      _id,
      title,
      slug,
      images,
      pricing
    }
  )
}`;

export const productReviewsQuery = /* groq */ `
*[_type == "review" 
  && references($productId) 
  && status == "approved"
] | order(featured desc, submittedAt desc) [0...50] {
  _id,
  rating,
  title,
  content,
  customerName,
  verifiedPurchase,
  submittedAt,
  images[]{
    asset->{
      url,
      metadata {
        dimensions
      }
    },
    caption
  },
  pros,
  cons,
  "helpfulness": {
    "upvotes": helpful.upvotes,
    "downvotes": helpful.downvotes
  },
  response,
  featured
}`;

export const productReviewSummaryQuery = /* groq */ `
*[_type == "product" && _id == $productId][0]{
  "reviews": {
    "average": reviews.averageRating,
    "total": reviews.totalReviews,
    "distribution": reviews.ratingDistribution,
    "recommendationPercentage": reviews.recommendationPercentage
  }
}`;

export const collectionWithProductsQuery = /* groq */ `
*[_type == "collection" 
  && slug.current == $slug 
  && visibility == "visible"
][0]{
  _id,
  title,
  description,
  collectionType,
  featuredImage,
  seo,
  productCount,
  automaticRules,
  "products": select(
    collectionType == "manual" => manualProducts[]->{
      _id,
      title,
      slug,
      images[0],
      pricing,
      inventory,
      reviews.averageRating,
      reviews.totalReviews,
      "price": pricing.price
    }
  )
}`;

export const collectionsForNavQuery = /* groq */ `
*[_type == "collection" 
  && visibility == "visible"
  && displayInMenu == true
] | order(featured desc, title asc) {
  _id,
  title,
  slug,
  description,
  featuredImage,
  productCount,
  featured
}`;

export const featuredCollectionsQuery = /* groq */ `
*[_type == "collection" 
  && visibility == "visible"
  && featured == true
] | order(_createdAt desc) [0...6] {
  _id,
  title,
  slug,
  description,
  featuredImage,
  productCount,
  "previewProducts": select(
    collectionType == "manual" => manualProducts[0...4]->{
      _id,
      title,
      images[0],
      pricing
    }
  )
}`;
