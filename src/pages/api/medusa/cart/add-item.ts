import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

type IncomingCartItem = {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  productUrl?: string;
  shippingClass?: string;
  installOnly?: boolean;
  medusaVariantId?: string;
  selectedOptions?: string[];
  selectedUpgrades?: string[];
};

function sanitizeCartItems(items: unknown): IncomingCartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, any>;
      if (typeof entry.id !== 'string' || !entry.id.trim()) return null;
      return {
        id: entry.id,
        name: typeof entry.name === 'string' ? entry.name : undefined,
        sku: typeof entry.sku === 'string' ? entry.sku : undefined,
        price: typeof entry.price === 'number' ? entry.price : undefined,
        quantity: typeof entry.quantity === 'number' ? entry.quantity : undefined,
        productUrl: typeof entry.productUrl === 'string' ? entry.productUrl : undefined,
        shippingClass: typeof entry.shippingClass === 'string' ? entry.shippingClass : undefined,
        installOnly: typeof entry.installOnly === 'boolean' ? entry.installOnly : undefined,
        selectedOptions: Array.isArray(entry.selectedOptions)
          ? entry.selectedOptions.filter((value: unknown) => typeof value === 'string')
          : undefined,
        selectedUpgrades: Array.isArray(entry.selectedUpgrades)
          ? entry.selectedUpgrades.filter((value: unknown) => typeof value === 'string')
          : undefined,
        medusaVariantId:
          typeof entry.medusaVariantId === 'string' ? entry.medusaVariantId : undefined
      };
    })
    .filter(Boolean) as IncomingCartItem[];
}

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  const cartItems = sanitizeCartItems(body?.cart?.items ?? body?.items ?? body?.cartItems);
  const metadataPayload = { local_cart_items: cartItems };

  const updateResponse = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify({ metadata: metadataPayload })
  });
  const updateData = await readJsonSafe<any>(updateResponse);

  if (!updateResponse.ok) {
    return jsonResponse(
      { error: updateData?.message || 'Failed to update Medusa cart metadata.', details: updateData },
      { status: updateResponse.status },
      { noIndex: true }
    );
  }

  // STEP 1: Fetch existing Medusa cart to check for duplicates
  const cartFetchResponse = await medusaFetch(`/store/carts/${cartId}`);
  const existingCartData = await readJsonSafe<any>(cartFetchResponse);
  const existingCart = existingCartData?.cart;
  const existingItems = Array.isArray(existingCart?.items) ? existingCart.items : [];

  // STEP 2: Build a map of variant_id → existing line_item_id
  const existingItemsByVariant = new Map<string, string>();
  existingItems.forEach((item: any) => {
    if (item.variant_id) {
      existingItemsByVariant.set(item.variant_id, item.id);
    }
  });

  const mappings: { id: string; medusaVariantId: string }[] = [];
  const missingVariants: string[] = [];
  const desiredVariantIds = new Set<string>();

  for (const item of cartItems) {
    const variantId = item.medusaVariantId;

    if (!variantId) {
      // Skip items without variant IDs (e.g., option-only items)
      // They should be part of the parent item's metadata
      console.warn(`Skipping cart item without medusaVariantId: ${item.id}`);
      missingVariants.push(item.id);
      continue;
    }

    desiredVariantIds.add(variantId);
    mappings.push({ id: item.id, medusaVariantId: variantId });

    // STEP 3: Check if item already exists in Medusa cart
    const existingLineItemId = existingItemsByVariant.get(variantId);

    if (existingLineItemId) {
      // UPDATE existing line item quantity
      const updateResponse = await medusaFetch(
        `/store/carts/${cartId}/line-items/${existingLineItemId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            quantity: Math.max(1, item.quantity ?? 1)
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await readJsonSafe<any>(updateResponse);
        console.error(`Failed to update line item ${existingLineItemId}:`, errorData);
        return jsonResponse(
          { error: `Failed to update line item for ${item.id}.`, details: errorData },
          { status: updateResponse.status },
          { noIndex: true }
        );
      }
    } else {
      // CREATE new line item
      const lineItemResponse = await medusaFetch(`/store/carts/${cartId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          variant_id: variantId,
          quantity: Math.max(1, item.quantity ?? 1),
          metadata: {
            local_item_id: item.id,
            sku: item.sku,
            selected_options: item.selectedOptions || [],
            selected_upgrades: item.selectedUpgrades || [],
            product_url: item.productUrl,
            shipping_class: item.shippingClass,
            install_only: item.installOnly ?? false
          }
        })
      });

      if (!lineItemResponse.ok) {
        const lineItemData = await readJsonSafe<any>(lineItemResponse);

        // Log detailed error for debugging
        console.error(`Failed to add Medusa line item for ${item.id}:`, {
          variantId,
          status: lineItemResponse.status,
          details: lineItemData
        });

        return jsonResponse(
          {
            error: `Failed to add Medusa line item for ${item.id}.`,
            details: lineItemData
          },
          { status: lineItemResponse.status },
          { noIndex: true }
        );
      }
    }
  }

  if (missingVariants.length) {
    return jsonResponse(
      {
        error:
          'Some cart items are missing required Medusa variant IDs. Please update your cart before checkout.',
        missingItems: missingVariants
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  // STEP 4: Remove any Medusa line items that are no longer present in the local cart.
  // Without this, removing an item client-side won't remove it from the Medusa cart, and
  // checkout/order summary will continue to show "ghost" items.
  const deletions: Array<{ id: string; variant_id?: string }> = [];
  for (const existing of existingItems) {
    const existingVariantId = existing?.variant_id;
    const existingLineItemId = existing?.id;
    if (typeof existingLineItemId !== 'string' || !existingLineItemId) continue;
    if (typeof existingVariantId !== 'string' || !existingVariantId) continue;
    if (!desiredVariantIds.has(existingVariantId)) {
      deletions.push({ id: existingLineItemId, variant_id: existingVariantId });
    }
  }

  for (const deletion of deletions) {
    const deleteResponse = await medusaFetch(`/store/carts/${cartId}/line-items/${deletion.id}`, {
      method: 'DELETE'
    });
    if (!deleteResponse.ok) {
      const errorData = await readJsonSafe<any>(deleteResponse);
      console.error(`Failed to delete line item ${deletion.id}:`, errorData);
      return jsonResponse(
        { error: 'Failed to remove stale cart items.', details: errorData },
        { status: deleteResponse.status },
        { noIndex: true }
      );
    }
  }

  return jsonResponse(
    {
      cart: updateData?.cart ?? null,
      mappings
    },
    { status: 200 },
    { noIndex: true }
  );
};
