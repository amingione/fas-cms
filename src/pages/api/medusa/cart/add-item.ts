import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { normalizeCartTotals } from '@/lib/money';

type IncomingCartItem = {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  basePrice?: number;
  extra?: number;
  quantity?: number;
  productUrl?: string;
  shippingClass?: string;
  installOnly?: boolean;
  shippingWeight?: number;
  shippingDimensions?: { length?: number; width?: number; height?: number };
  medusaVariantId?: string;
  selectedOptions?: string[];
  selectedUpgrades?: string[];
  selectedUpgradesDetailed?: Array<{
    label: string;
    priceCents: number;
    medusaOptionValueId: string;
  }>;
};

function normalizeLocalItemId(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return raw;
  if (raw.endsWith('::[]')) return raw.slice(0, -4);
  if (raw.endsWith('::')) return raw.slice(0, -2);
  return raw;
}

function toRoundedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function normalizeShippingClass(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function inferInstallOnly(item: IncomingCartItem): boolean {
  if (item.installOnly === true) return true;
  const shippingClass = normalizeShippingClass(item.shippingClass);
  const title = String(item.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service') ||
    shippingClass.includes('performancepackage')
  ) {
    return true;
  }
  if (title.includes('performancepackage') || title.includes('installonly')) {
    return true;
  }
  return false;
}

function buildLineItemMetadata(item: IncomingCartItem, baseVariantId: string, variantId: string) {
  const metadata: Record<string, unknown> = {
    local_item_id: normalizeLocalItemId(item.id),
    base_variant_id: baseVariantId,
    resolved_variant_id: variantId
  };
  if (inferInstallOnly(item)) metadata.install_only = true;

  if (item.sku) metadata.sku = item.sku;
  if (item.productUrl) metadata.product_url = item.productUrl;
  if (item.shippingClass) metadata.shipping_class = item.shippingClass;
  if (typeof item.shippingWeight === 'number') metadata.shipping_weight = item.shippingWeight;
  if (
    item.shippingDimensions &&
    (typeof item.shippingDimensions.length === 'number' ||
      typeof item.shippingDimensions.width === 'number' ||
      typeof item.shippingDimensions.height === 'number')
  ) {
    metadata.shipping_dimensions = item.shippingDimensions;
  }

  const selectedOptions = Array.isArray(item.selectedOptions)
    ? item.selectedOptions.filter((v) => typeof v === 'string' && v.trim())
    : [];
  if (selectedOptions.length) metadata.selected_options = selectedOptions;

  const selectedUpgrades = Array.isArray(item.selectedUpgrades)
    ? item.selectedUpgrades.filter((v) => typeof v === 'string' && v.trim())
    : [];
  if (selectedUpgrades.length) metadata.selected_upgrades = selectedUpgrades;

  const detailed = Array.isArray(item.selectedUpgradesDetailed)
    ? item.selectedUpgradesDetailed.filter(
        (entry) =>
          entry &&
          typeof entry.label === 'string' &&
          entry.label.trim() &&
          Number.isFinite(entry.priceCents)
      )
    : [];
  if (detailed.length) metadata.selected_upgrades_detailed = detailed;

  const optionValueIds = getSelectedUpgradeOptionValueIds(item);
  if (optionValueIds.length) metadata.selected_upgrade_option_value_ids = optionValueIds;

  return metadata;
}

function getSelectedUpgradeOptionValueIds(item: IncomingCartItem): string[] {
  const detailed = Array.isArray(item.selectedUpgradesDetailed) ? item.selectedUpgradesDetailed : [];
  const unique = new Set<string>();
  detailed.forEach((entry) => {
    const valueId = typeof entry?.medusaOptionValueId === 'string' ? entry.medusaOptionValueId.trim() : '';
    if (valueId) unique.add(valueId);
  });
  return Array.from(unique);
}

function getSelectedUpgradeLabels(item: IncomingCartItem): string[] {
  const detailed = Array.isArray(item.selectedUpgradesDetailed) ? item.selectedUpgradesDetailed : [];
  const unique = new Set<string>();
  detailed.forEach((entry) => {
    const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
    if (label) unique.add(label);
  });
  return Array.from(unique);
}

function remapSelectedUpgradeOptionValueIds(
  item: IncomingCartItem,
  remap: Map<string, string>
): IncomingCartItem {
  if (!Array.isArray(item.selectedUpgradesDetailed) || item.selectedUpgradesDetailed.length === 0) {
    return item;
  }
  let changed = false;
  const nextDetailed = item.selectedUpgradesDetailed.map((entry) => {
    const current = typeof entry?.medusaOptionValueId === 'string' ? entry.medusaOptionValueId.trim() : '';
    const replacement = current ? remap.get(current) : undefined;
    if (!replacement || replacement === current) return entry;
    changed = true;
    return { ...entry, medusaOptionValueId: replacement };
  });
  if (!changed) return item;
  return { ...item, selectedUpgradesDetailed: nextDetailed };
}

function populateMissingUpgradeOptionValueIds(
  item: IncomingCartItem,
  optionValueIds: string[]
): IncomingCartItem {
  if (!Array.isArray(item.selectedUpgradesDetailed) || item.selectedUpgradesDetailed.length === 0) {
    return item;
  }
  const normalizedIds = optionValueIds
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!normalizedIds.length) return item;

  let idx = 0;
  let changed = false;
  const nextDetailed = item.selectedUpgradesDetailed.map((entry) => {
    const current = String(entry?.medusaOptionValueId || '').trim();
    if (current) return entry;
    const replacement = normalizedIds[idx] || '';
    if (!replacement) return entry;
    idx += 1;
    changed = true;
    return { ...entry, medusaOptionValueId: replacement };
  });

  if (!changed) return item;
  return { ...item, selectedUpgradesDetailed: nextDetailed };
}

function sanitizeCartItems(items: unknown): IncomingCartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, any>;
      if (typeof entry.id !== 'string' || !entry.id.trim()) return null;
      return {
        id: normalizeLocalItemId(entry.id),
        name: typeof entry.name === 'string' ? entry.name : undefined,
        sku: typeof entry.sku === 'string' ? entry.sku : undefined,
        price: typeof entry.price === 'number' ? entry.price : undefined,
        basePrice: typeof entry.basePrice === 'number' ? entry.basePrice : undefined,
        extra: typeof entry.extra === 'number' ? entry.extra : undefined,
        quantity: typeof entry.quantity === 'number' ? entry.quantity : undefined,
        productUrl: typeof entry.productUrl === 'string' ? entry.productUrl : undefined,
        shippingClass: typeof entry.shippingClass === 'string' ? entry.shippingClass : undefined,
        installOnly: typeof entry.installOnly === 'boolean' ? entry.installOnly : undefined,
        shippingWeight:
          typeof entry.shippingWeight === 'number' ? entry.shippingWeight : undefined,
        shippingDimensions:
          typeof entry.shippingDimensions === 'object' && entry.shippingDimensions
            ? {
                length:
                  typeof entry.shippingDimensions.length === 'number'
                    ? entry.shippingDimensions.length
                    : undefined,
                width:
                  typeof entry.shippingDimensions.width === 'number'
                    ? entry.shippingDimensions.width
                    : undefined,
                height:
                  typeof entry.shippingDimensions.height === 'number'
                    ? entry.shippingDimensions.height
                    : undefined
              }
            : undefined,
        selectedOptions: Array.isArray(entry.selectedOptions)
          ? entry.selectedOptions.filter((value: unknown) => typeof value === 'string')
          : undefined,
        selectedUpgrades: Array.isArray(entry.selectedUpgrades)
          ? entry.selectedUpgrades.filter((value: unknown) => typeof value === 'string')
          : undefined,
        selectedUpgradesDetailed: Array.isArray(entry.selectedUpgradesDetailed)
          ? entry.selectedUpgradesDetailed
              .map((value: any) => {
                if (!value || typeof value !== 'object') return null;
                const label = String(value.label ?? '').trim();
                const medusaOptionValueId = String(value.medusaOptionValueId ?? '').trim();
                const priceCentsRaw =
                  typeof value.priceCents === 'number'
                    ? value.priceCents
                    : typeof value.priceCents === 'string'
                      ? Number(value.priceCents)
                      : Number.NaN;
                if (!Number.isFinite(priceCentsRaw)) return null;
                const priceCents = Math.round(priceCentsRaw);
                if (!label) return null;
                return { label, medusaOptionValueId, priceCents };
              })
              .filter(Boolean) as IncomingCartItem['selectedUpgradesDetailed']
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
  const unresolvedUpgradeItems = cartItems.filter((item) => {
    const labels = Array.isArray(item.selectedUpgrades) ? item.selectedUpgrades : [];
    const detailed = Array.isArray(item.selectedUpgradesDetailed)
      ? item.selectedUpgradesDetailed
      : [];
    if (labels.length > 0 && detailed.length === 0) return true;
    return detailed.some(
      (entry) => !entry.medusaOptionValueId && !(typeof entry?.label === 'string' && entry.label.trim())
    );
  });
  if (unresolvedUpgradeItems.length > 0) {
    console.warn('[unmapped_addon_selection] cart_sync_blocked', {
      cartId,
      count: unresolvedUpgradeItems.length,
      itemIds: unresolvedUpgradeItems.map((item) => item.id)
    });
    return jsonResponse(
      {
        error:
          'One or more selected options is not available for checkout right now. Please remove that option and try again.',
        details: unresolvedUpgradeItems.map((entry) => ({
          id: entry.id,
          selectedUpgrades: entry.selectedUpgradesDetailed
        }))
      },
      { status: 400 },
      { noIndex: true }
    );
  }
  // STEP 1: Fetch existing Medusa cart to check for duplicates
  const cartFetchResponse = await medusaFetch(`/store/carts/${cartId}`);
  const existingCartData = await readJsonSafe<any>(cartFetchResponse);
  const existingCart = existingCartData?.cart;
  const existingItems = Array.isArray(existingCart?.items) ? existingCart.items : [];

  // STEP 2: Build identity maps for existing line items.
  // Canonical identity is local_item_id (mirrors client cart item id).
  // variant_id is a legacy fallback only.
  const existingItemsByLocalId = new Map<string, string>();
  const existingItemsByVariant = new Map<string, string>();
  existingItems.forEach((item: any) => {
    const localId = normalizeLocalItemId(item?.metadata?.local_item_id);
    if (localId) {
      existingItemsByLocalId.set(localId, item.id);
    }
    if (item.variant_id) {
      existingItemsByVariant.set(item.variant_id, item.id);
    }
  });

  const mappings: { id: string; medusaVariantId: string }[] = [];
  const missingVariants: string[] = [];
  const desiredLocalIds = new Set<string>();
  const desiredVariantIds = new Set<string>();
  const resolvedVariantCache = new Map<string, string>();
  const normalizedCartItems: IncomingCartItem[] = [];

  const resolveVariantIdForItem = async (
    baseVariantId: string,
    item: IncomingCartItem
  ): Promise<{ variantId: string; item: IncomingCartItem }> => {
    const resolveOnce = async (optionValueIds: string[]) => {
      const cacheKey = `${baseVariantId}::${optionValueIds.join(',')}`;
      const cached = resolvedVariantCache.get(cacheKey);
      if (cached) {
        return { variantId: cached, data: null as any };
      }
      const response = await medusaFetch('/store/resolve-variant', {
        method: 'POST',
        body: JSON.stringify({
          base_variant_id: baseVariantId,
          option_value_ids: optionValueIds
        })
      });
      const data = await readJsonSafe<any>(response);
      const resolved =
        typeof data?.variant_id === 'string' && data.variant_id.trim()
          ? data.variant_id.trim()
          : baseVariantId;
      resolvedVariantCache.set(cacheKey, resolved);
      return { variantId: resolved, data };
    };

    let workingItem = item;
    let optionValueIds = getSelectedUpgradeOptionValueIds(workingItem).sort();
    const optionLabels = getSelectedUpgradeLabels(workingItem);
    if (!optionValueIds.length && !optionLabels.length) {
      return { variantId: baseVariantId, item: workingItem };
    }

    const resolveByLabels = async (labels: string[]) => {
      const normalized = labels
        .map((label) => String(label || '').trim())
        .filter(Boolean);
      if (!normalized.length) return null;
      const response = await medusaFetch('/store/resolve-variant', {
        method: 'POST',
        body: JSON.stringify({
          base_variant_id: baseVariantId,
          option_labels: normalized
        })
      });
      return readJsonSafe<any>(response);
    };

    try {
      if (!optionValueIds.length && optionLabels.length > 0) {
        const labelResolved = await resolveByLabels(optionLabels);
        const resolvedIds: string[] = Array.isArray(labelResolved?.requested_option_value_ids)
          ? labelResolved.requested_option_value_ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
          : [];
        if (resolvedIds.length > 0) {
          optionValueIds = resolvedIds.sort();
          workingItem = populateMissingUpgradeOptionValueIds(workingItem, optionValueIds);
        }
      }

      if (!optionValueIds.length) {
        return { variantId: baseVariantId, item: workingItem };
      }

      let resolved = await resolveOnce(optionValueIds);
      if (resolved.variantId !== baseVariantId) {
        return { variantId: resolved.variantId, item: workingItem };
      }

      const missingRequested: string[] = Array.isArray(resolved.data?.missing_requested_option_value_ids)
        ? resolved.data.missing_requested_option_value_ids
        : [];
      const availableOptionValueIds: string[] = Array.isArray(resolved.data?.available_option_value_ids)
        ? resolved.data.available_option_value_ids
        : [];
      if (resolved.data?.reason === 'no_matching_variant' && missingRequested.length > 0 && availableOptionValueIds.length === 1) {
        const replacement = String(availableOptionValueIds[0] || '').trim();
        if (replacement) {
          const remap = new Map<string, string>();
          missingRequested.forEach((oldId) => {
            const normalized = String(oldId || '').trim();
            if (normalized) remap.set(normalized, replacement);
          });
          if (remap.size > 0) {
            workingItem = remapSelectedUpgradeOptionValueIds(workingItem, remap);
            optionValueIds = getSelectedUpgradeOptionValueIds(workingItem).sort();
            if (optionValueIds.length > 0) {
              resolved = await resolveOnce(optionValueIds);
              console.warn('[cart/add-item] auto-remapped stale option value ids', {
                itemId: item.id,
                baseVariantId,
                missingRequested,
                replacement,
                resolvedVariantId: resolved.variantId
              });
              return { variantId: resolved.variantId, item: workingItem };
            }
          }
        }
      }

      return { variantId: resolved.variantId, item: workingItem };
    } catch (error) {
      console.warn('[cart/add-item] variant resolution failed; using base variant', {
        baseVariantId,
        optionValueIds,
        error: error instanceof Error ? error.message : String(error)
      });
      return { variantId: baseVariantId, item: workingItem };
    }
  };

  for (const sourceItem of cartItems) {
    let item = sourceItem;
    const baseVariantId = item.medusaVariantId;

    if (!baseVariantId) {
      // Skip items without variant IDs (e.g., option-only items)
      // They should be part of the parent item's metadata
      console.warn(`Skipping cart item without medusaVariantId: ${item.id}`);
      missingVariants.push(item.id);
      continue;
    }

    const resolvedItem = await resolveVariantIdForItem(baseVariantId, item);
    const variantId = resolvedItem.variantId;
    item = resolvedItem.item;
    normalizedCartItems.push(item);

    desiredLocalIds.add(normalizeLocalItemId(item.id));
    desiredVariantIds.add(variantId);
    mappings.push({ id: item.id, medusaVariantId: variantId });

    // STEP 3: Check if item already exists in Medusa cart.
    // Prefer canonical local identity; fallback to variant for legacy lines.
    const localItemId = normalizeLocalItemId(item.id);
    const existingLineItemId =
      (localItemId ? existingItemsByLocalId.get(localItemId) : undefined) ??
      existingItemsByVariant.get(variantId);

    const lineItemMetadata = buildLineItemMetadata(item, baseVariantId, variantId);

    if (existingLineItemId) {
      // UPDATE existing line item quantity
      let updateResponse = await medusaFetch(
        `/store/carts/${cartId}/line-items/${existingLineItemId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            quantity: Math.max(1, item.quantity ?? 1),
            metadata: lineItemMetadata
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await readJsonSafe<any>(updateResponse);
        console.warn(
          `[cart/add-item] metadata update failed for ${existingLineItemId}, retrying quantity-only`,
          { status: updateResponse.status, errorData }
        );
        updateResponse = await medusaFetch(`/store/carts/${cartId}/line-items/${existingLineItemId}`, {
          method: 'POST',
          body: JSON.stringify({
            quantity: Math.max(1, item.quantity ?? 1)
          })
        });
        if (!updateResponse.ok) {
          const retryErrorData = await readJsonSafe<any>(updateResponse);
          console.error(`Failed to update line item ${existingLineItemId}:`, retryErrorData);
          return jsonResponse(
            { error: `Failed to update line item for ${item.id}.`, details: retryErrorData },
            { status: updateResponse.status },
            { noIndex: true }
          );
        }
      }
    } else {
      // CREATE new line item
      const lineItemResponse = await medusaFetch(`/store/carts/${cartId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          variant_id: variantId,
          quantity: Math.max(1, item.quantity ?? 1),
          metadata: lineItemMetadata
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

  // STEP 4: Remove any Medusa line items that are no longer present in the local cart.
  // Without this, removing an item client-side won't remove it from the Medusa cart, and
  // checkout/order summary will continue to show "ghost" items.
  const deletions: Array<{ id: string; variant_id?: string }> = [];
  for (const existing of existingItems) {
    const existingLocalId = normalizeLocalItemId(existing?.metadata?.local_item_id);
    const existingVariantId = existing?.variant_id;
    const existingLineItemId = existing?.id;
    if (typeof existingLineItemId !== 'string' || !existingLineItemId) continue;
    if (existingLocalId) {
      if (!desiredLocalIds.has(existingLocalId)) {
        deletions.push({ id: existingLineItemId, variant_id: existingVariantId });
      }
      continue;
    }
    if (typeof existingVariantId === 'string' && existingVariantId && !desiredVariantIds.has(existingVariantId)) {
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

  const finalCartResponse = await medusaFetch(`/store/carts/${cartId}`);
  const finalCartData = await readJsonSafe<any>(finalCartResponse);

  if (!finalCartResponse.ok) {
    return jsonResponse(
      {
        error: finalCartData?.message || 'Failed to fetch updated Medusa cart.',
        details: finalCartData
      },
      { status: finalCartResponse.status },
      { noIndex: true }
    );
  }

  if (finalCartData?.cart) {
    normalizeCartTotals(finalCartData.cart);
  }

  const finalCartItems = Array.isArray(finalCartData?.cart?.items) ? finalCartData.cart.items : [];
  const finalByLocalId = new Map<string, any>();
  const finalByVariantId = new Map<string, any>();
  for (const lineItem of finalCartItems) {
    const localId = lineItem?.metadata?.local_item_id;
    if (typeof localId === 'string' && localId.trim()) {
      finalByLocalId.set(localId, lineItem);
    }
    const variantId = lineItem?.variant_id;
    if (typeof variantId === 'string' && variantId.trim()) {
      finalByVariantId.set(variantId, lineItem);
    }
  }

  const addOnPriceMismatches = normalizedCartItems
    .map((item) => {
      const detailed = Array.isArray(item.selectedUpgradesDetailed) ? item.selectedUpgradesDetailed : [];
      const addOnTotal = detailed.reduce((sum, entry) => {
        const cents = toRoundedNumber(entry?.priceCents);
        return sum + (cents && cents > 0 ? cents : 0);
      }, 0);
      if (addOnTotal <= 0) return null;

      const explicitBasePrice = toRoundedNumber(item.basePrice);
      const cartItemPrice = toRoundedNumber(item.price);
      const cartItemExtra = toRoundedNumber(item.extra);
      const inferredBasePrice =
        explicitBasePrice ??
        (cartItemPrice != null &&
        cartItemExtra != null &&
        cartItemExtra > 0 &&
        cartItemPrice >= cartItemExtra
          ? cartItemPrice - cartItemExtra
          : cartItemPrice);
      if (inferredBasePrice == null) return null;
      const expectedUnitPrice = inferredBasePrice + addOnTotal;

      const lineItem =
        finalByLocalId.get(item.id) ??
        (item.medusaVariantId ? finalByVariantId.get(item.medusaVariantId) : undefined);
      const actualUnitPrice = toRoundedNumber(lineItem?.unit_price);
      if (actualUnitPrice == null) {
        return {
          id: item.id,
          expectedUnitPrice,
          actualUnitPrice: null,
          addOnTotal
        };
      }

      if (actualUnitPrice !== expectedUnitPrice) {
        return {
          id: item.id,
          expectedUnitPrice,
          actualUnitPrice,
          addOnTotal
        };
      }
      return null;
    })
    .filter(Boolean);

  if (addOnPriceMismatches.length > 0) {
    console.warn('[unmapped_addon_selection] medusa_price_mismatch', {
      cartId,
      mismatches: addOnPriceMismatches
    });
    return jsonResponse(
      {
        error:
          'We could not confirm pricing for one of your selected options. Please remove that option and try again.',
        details: addOnPriceMismatches
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  if (missingVariants.length) {
    return jsonResponse(
      {
        error:
          'Some cart items are missing required Medusa variant IDs. Please update your cart before checkout.',
        missingItems: missingVariants,
        cart: finalCartData?.cart ?? null,
        mappings
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  return jsonResponse(
    {
      cart: finalCartData?.cart ?? null,
      mappings,
      price_mismatch_warnings: addOnPriceMismatches
    },
    { status: 200 },
    { noIndex: true }
  );
};
