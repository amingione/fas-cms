import 'dotenv/config';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset =
  process.env.SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  'production';
const token =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_TOKEN;

if (!projectId || !dataset || !token) {
  console.error('❌ Missing Sanity credentials (need SANITY_PROJECT_ID/DATASET and SANITY_WRITE_TOKEN)');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil'
});

const sanity = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2023-06-07',
  useCdn: false
});

const rawBaseSiteUrl =
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  'https://www.fasmotorsports.com';

const normalizeBaseUrl = (value: string): string => {
  if (!value) return 'https://www.fasmotorsports.com';
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return `https://${value.replace(/^https?:\/\//i, '').replace(/\/$/, '')}`;
  }
};

const baseSiteUrl = normalizeBaseUrl(rawBaseSiteUrl);

const args = process.argv.slice(2);
const slugFilter = args.find((arg) => arg.startsWith('--slug='))?.split('=')[1];
const idFilter = args.find((arg) => arg.startsWith('--id='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

const toPlainText = (input: any): string => {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) {
    return input
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object') {
          if (Array.isArray((block as any).children)) {
            return (block as any).children
              .map((child: any) => (typeof child?.text === 'string' ? child.text : ''))
              .join('');
          }
          if (typeof (block as any).text === 'string') return (block as any).text;
        }
        return '';
      })
      .join(' ');
  }
  if (typeof input === 'object') {
    try {
      return toPlainText(Object.values(input));
    } catch {
      return '';
    }
  }
  return '';
};

const fetchProducts = async () => {
  const filters: string[] = [];
  const params: Record<string, any> = {};
  if (slugFilter) {
    filters.push('slug.current == $slug');
    params.slug = slugFilter;
  }
  if (idFilter) {
    filters.push('_id == $id');
    params.id = idFilter;
  }
  const where = filters.length ? ` && ${filters.join(' && ')}` : '';
  const query = `*[_type=="product" && (status == "active" || !defined(status)) && coalesce(productType, "") != "service"${where}]{
    _id,
    title,
    price,
    slug,
    shortDescription,
    description,
    images[]{asset->{url}},
    stripeProductId,
    stripePriceId
  }`;
  return sanity.fetch<any[]>(query, params);
};

const ensureProduct = async (product: any) => {
  const slug =
    (typeof product?.slug === 'string' && product.slug) ||
    (product?.slug?.current as string) ||
    '';
  const productUrl = slug ? new URL(`/shop/${slug}`, baseSiteUrl).toString() : baseSiteUrl;
  const description = toPlainText(product?.shortDescription || product?.description).slice(0, 2000);
  const imageUrl = Array.isArray(product?.images) ? product.images[0]?.asset?.url : null;

  let stripeProductId = (product?.stripeProductId as string | undefined)?.trim();
  let stripeProduct: Stripe.Product | null = null;

  if (stripeProductId) {
    try {
      stripeProduct = await stripe.products.retrieve(stripeProductId);
    } catch (error) {
      console.warn(`⚠️ Stripe product ${stripeProductId} not found. Will create new.`, error);
      stripeProductId = undefined;
    }
  }

  if (!stripeProduct) {
    if (dryRun) {
      console.log(`DRY RUN: would create Stripe product for ${product.title}`);
      stripeProduct = {
        id: 'dry_product',
        object: 'product'
      } as Stripe.Product;
    } else {
      stripeProduct = await stripe.products.create({
        name: product.title || 'Product',
        description: description || undefined,
        url: productUrl,
        images: imageUrl ? [imageUrl] : undefined,
        metadata: {
          sanity_product_id: product._id,
          slug,
          product_url: productUrl
        }
      });
      console.log(`✅ Created Stripe product ${stripeProduct.id} for ${product.title}`);
    }
  } else {
    const updates: Stripe.ProductUpdateParams = {
      name: product.title || stripeProduct.name,
      description: description || undefined,
      url: productUrl,
      metadata: {
        ...stripeProduct.metadata,
        sanity_product_id: product._id,
        slug,
        product_url: productUrl
      }
    };
    if (imageUrl) updates.images = [imageUrl];
    if (!dryRun) {
      await stripe.products.update(stripeProduct.id, updates);
      console.log(`🔄 Updated Stripe product ${stripeProduct.id}`);
    } else {
      console.log(`DRY RUN: would update Stripe product ${stripeProduct.id}`);
    }
  }

  return { stripeProductId: stripeProduct!.id, stripeProduct };
};

const ensurePrice = async (
  stripeProductId: string,
  product: any
): Promise<{ stripePriceId: string; stripePrice: Stripe.Price | null }> => {
  const amount = Math.max(0, Math.round(Number(product.price || 0) * 100));
  if (!amount) {
    console.warn(`⚠️ Product ${product.title} has no price; skipping price creation.`);
    return { stripePriceId: product.stripePriceId || '', stripePrice: null };
  }

  let existingPriceId = (product?.stripePriceId as string | undefined)?.trim();
  let existingPrice: Stripe.Price | null = null;
  if (existingPriceId) {
    try {
      existingPrice = await stripe.prices.retrieve(existingPriceId);
    } catch (error) {
      console.warn(`⚠️ Stripe price ${existingPriceId} not found. Will create new.`, error);
      existingPriceId = undefined;
    }
  }

  if (existingPrice && (existingPrice.active === false || existingPrice.unit_amount !== amount)) {
    if (!dryRun) {
      await stripe.prices.update(existingPrice.id, { active: false }).catch((err) => {
        console.warn(`Unable to deactivate price ${existingPrice?.id}`, err);
      });
    }
    existingPrice = null;
    existingPriceId = undefined;
  }

  if (!existingPrice) {
    if (dryRun) {
      console.log(`DRY RUN: would create price for product ${product.title}`);
      return { stripePriceId: 'dry_price', stripePrice: null };
    }
    const newPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amount,
      product: stripeProductId,
      nickname: `${product.title || 'Product'} USD`,
      metadata: {
        sanity_product_id: product._id,
        slug:
          (typeof product?.slug === 'string' && product.slug) ||
          (product?.slug?.current as string) ||
          '',
        product_url: new URL(
          `/shop/${
            (typeof product?.slug === 'string' && product.slug) ||
            (product?.slug?.current as string) ||
            ''
          }`,
          baseSiteUrl
        ).toString()
      }
    });
    console.log(`✅ Created Stripe price ${newPrice.id} (${amount} USD)`);
    return { stripePriceId: newPrice.id, stripePrice: newPrice };
  }

  console.log(`ℹ️ Using existing Stripe price ${existingPrice.id}`);
  return { stripePriceId: existingPrice.id, stripePrice: existingPrice };
};

(async () => {
  const products = await fetchProducts();
  if (!products?.length) {
    console.log('No products found. Nothing to sync.');
    return;
  }

  console.log(`Found ${products.length} product(s) to sync${dryRun ? ' (dry run)' : ''}.`);

  for (const product of products) {
    try {
      const { stripeProductId } = await ensureProduct(product);
      const { stripePriceId } = await ensurePrice(stripeProductId, product);

      if (!dryRun) {
        await sanity
          .patch(product._id)
          .set({
            stripeProductId,
            stripePriceId,
            stripeLastSyncedAt: new Date().toISOString()
          })
          .commit({ autoGenerateArrayKeys: true });
        console.log(`📝 Updated Sanity product ${product._id} with Stripe IDs.`);
      } else {
        console.log(`DRY RUN: would update Sanity product ${product._id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync product ${product._id}:`, error);
    }
  }

  console.log('Done.');
})();
