#!/usr/bin/env tsx
/**
 * Sync Stripe product shipping metadata + shippable/package_dimensions.
 *
 * Default is dry-run. Use --apply to persist updates.
 * Optional filters:
 *   --product-id=prod_123
 *   --limit=50
 *
 * Usage:
 *   yarn tsx scripts/sync-stripe-shipping-metadata.ts
 *   yarn tsx scripts/sync-stripe-shipping-metadata.ts --apply
 */

import 'dotenv/config';
import Stripe from 'stripe';

type SyncPlan = {
  productId: string;
  updates: Stripe.ProductUpdateParams;
  reasons: string[];
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

const ORIGIN_COUNTRY = process.env.ORIGIN_COUNTRY || 'US';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const productIds = new Set<string>();
  let limit: number | undefined;

  args.forEach((arg) => {
    if (arg.startsWith('--product-id=')) {
      const value = arg.split('=')[1]?.trim();
      if (value) productIds.add(value);
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) limit = value;
    }
  });

  return { apply, productIds, limit };
};

const normalizeBool = (value?: string | null): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return undefined;
};

const parseBoxDimensions = (raw?: string | null) => {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw
    .toLowerCase()
    .split(/[x×]/)
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (parts.length !== 3) return null;
  const [length, width, height] = parts;
  return { length, width, height };
};

const readNumber = (value?: string | number | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildSyncPlan = (product: Stripe.Product): SyncPlan | null => {
  const meta = (product.metadata || {}) as Record<string, string>;
  const updates: Stripe.ProductUpdateParams = {};
  const metadataUpdates: Record<string, string> = {};
  const reasons: string[] = [];

  const requiresShipping = normalizeBool(meta.requires_shipping);
  const shippingRequired = normalizeBool(meta.shipping_required);
  if (shippingRequired === undefined && requiresShipping !== undefined) {
    metadataUpdates.shipping_required = requiresShipping ? 'true' : 'false';
    reasons.push('metadata.shipping_required');
  }

  const shippingRequiredFinal =
    shippingRequired !== undefined
      ? shippingRequired
      : requiresShipping !== undefined
        ? requiresShipping
        : undefined;

  const weight =
    readNumber(meta.weight) ??
    readNumber(meta.shipping_weight) ??
    readNumber(meta.shipping_weight_lbs) ?? //do we need?
    (readNumber(meta.shipping_weight_oz) != null // do we need??
      ? Math.round(((readNumber(meta.shipping_weight_oz) as number) / 16) * 100) / 100
      : null);
  if (weight != null && !meta.weight) {
    metadataUpdates.weight = String(weight);
    reasons.push('metadata.weight');
  }
  if (weight != null && !meta.weight_unit) {
    metadataUpdates.weight_unit = 'pound';
    reasons.push('metadata.weight_unit');
  }
  if (shippingRequiredFinal && !meta.origin_country) {
    metadataUpdates.origin_country = ORIGIN_COUNTRY;
    reasons.push('metadata.origin_country');
  }

  const boxDimensions =
    parseBoxDimensions(meta.shipping_box_dimensions) ||
    parseBoxDimensions(meta.shipping_dimensions) ||
    (meta.length && meta.width && meta.height
      ? {
          length: Number(meta.length),
          width: Number(meta.width),
          height: Number(meta.height)
        }
      : null);
  if (boxDimensions) {
    if (!meta.length) {
      metadataUpdates.length = String(boxDimensions.length);
      reasons.push('metadata.length');
    }
    if (!meta.width) {
      metadataUpdates.width = String(boxDimensions.width);
      reasons.push('metadata.width');
    }
    if (!meta.height) {
      metadataUpdates.height = String(boxDimensions.height);
      reasons.push('metadata.height');
    }
    if (!meta.dimension_unit) {
      metadataUpdates.dimension_unit = 'inch';
      reasons.push('metadata.dimension_unit');
    }
  }

  if (Object.keys(metadataUpdates).length > 0) {
    updates.metadata = { ...meta, ...metadataUpdates };
  }

  if (shippingRequiredFinal && !product.shippable) {
    updates.shippable = true;
    reasons.push('product.shippable');
  }

  if (shippingRequiredFinal && !product.package_dimensions && boxDimensions && weight != null) {
    updates.package_dimensions = {
      length: boxDimensions.length,
      width: boxDimensions.width,
      height: boxDimensions.height,
      weight
    };
    reasons.push('product.package_dimensions');
  }

  if (Object.keys(updates).length === 0) return null;
  return { productId: product.id, updates, reasons };
};

const listProducts = async (limit?: number): Promise<Stripe.Product[]> => {
  const results: Stripe.Product[] = [];
  let startingAfter: string | undefined;
  while (true) {
    const page = await stripe.products.list({
      limit: Math.min(limit ?? 100, 100),
      starting_after: startingAfter
    });
    results.push(...page.data);
    if (!page.has_more) break;
    if (limit && results.length >= limit) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return limit ? results.slice(0, limit) : results;
};

const run = async () => {
  const { apply, productIds, limit } = parseArgs();
  const products: Stripe.Product[] = [];

  if (productIds.size > 0) {
    for (const id of productIds) {
      try {
        const product = await stripe.products.retrieve(id);
        products.push(product);
      } catch (error) {
        console.warn(`⚠️  Unable to retrieve product ${id}`, error);
      }
    }
  } else {
    const listed = await listProducts(limit);
    products.push(...listed);
  }

  if (!products.length) {
    console.log('No products found to evaluate.');
    return;
  }

  const plans = products
    .map((product) => buildSyncPlan(product))
    .filter((plan): plan is SyncPlan => Boolean(plan));

  if (!plans.length) {
    console.log('No updates needed.');
    return;
  }

  console.log(`Found ${plans.length} product(s) to update.${apply ? '' : ' (dry-run)'}`);
  for (const plan of plans) {
    console.log(`- ${plan.productId}: ${plan.reasons.join(', ')}`);
    if (apply) {
      await stripe.products.update(plan.productId, plan.updates);
      console.log(`  ✅ Updated ${plan.productId}`);
    }
  }
};

run().catch((error) => {
  console.error('❌ Sync failed', error);
  process.exit(1);
});
