const CART_KEY = 'fas_cart_v1';

const parsePrice = (value, fallback = 0) => {
  if (value == null) return fallback;
  const numeric = parseFloat(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$0.00';
  const dollars = numeric / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dollars);
  } catch {
    return `$${dollars.toFixed(2)}`;
  }
};

const getCart = () => {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items };
    }
  } catch {
    /* noop */
  }
  return { items: [] };
};

const setCart = (cart) => {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.cart = cart;
  } catch {
    /* noop */
  }
};

const emitCartChanged = (cart) => {
  try {
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart } }));
  } catch {
    /* noop */
  }
};

const emitAddToCartSuccess = (detail) => {
  try {
    window.dispatchEvent(new CustomEvent('fas:add-to-cart-success', { detail: detail || {} }));
  } catch {
    try {
      window.dispatchEvent(new Event('fas:add-to-cart-success'));
    } catch {
      /* noop */
    }
  }
};

const prefersDesktopOverlay = () => {
  try {
    const hover = window.matchMedia?.('(hover: hover)').matches ?? false;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (hover && !coarse) return true;
    if (hover && coarse === false) return true;
    const maxTouch = navigator.maxTouchPoints || 0;
    if (coarse) return false;
    return maxTouch === 0;
  } catch {
    return false;
  }
};

const normalizeCents = (value) => {
  if (value != null) {
    const numeric =
      typeof value === 'number'
        ? value
        : parseFloat(String(value).replace(/[^0-9.+-]/g, ''));
    if (Number.isFinite(numeric)) return Math.round(numeric);
  }
  return 0;
};

const readConfiguredOptions = () => {
  const result = { selections: [], upgrades: [], extra: 0 };
  const form = document.getElementById('product-options');
  if (!form) return result;
  const handled = new Set();
  const elements = Array.from(form.querySelectorAll('[data-group]'));

  const isUpgradeField = (node) => {
    const ds = node?.dataset || {};
    const groupAttr = node.getAttribute?.('data-group') || '';
    const nameAttr = node.getAttribute?.('name') || '';
    return (
      ds.upgrade === 'true' ||
      ds.addon === 'true' ||
      /upgrade|add[-\s]?on/i.test(groupAttr) ||
      /upgrade|add[-\s]?on/i.test(nameAttr)
    );
  };

const addSelection = (group, value, label, delta, meta = {}) => {
  const numericDeltaCents = normalizeCents(meta.priceCents);
  const numericDelta = Number.isFinite(delta) ? delta : numericDeltaCents / 100;
  const selection = {
    group,
    value,
    label,
    priceDelta: numericDelta,
    priceCents: numericDeltaCents,
    isUpgrade: Boolean(meta.isUpgrade),
    medusaVariantId: meta.medusaVariantId || null,
    medusaOptionId: meta.medusaOptionId || null,
    medusaOptionValueId: meta.medusaOptionValueId || null
  };
  result.selections.push(selection);
  if (selection.isUpgrade) {
    result.upgrades.push({
      group,
      value,
      label,
      priceDelta: numericDelta,
      priceCents: numericDeltaCents,
      medusaVariantId: selection.medusaVariantId || undefined,
      medusaOptionId: selection.medusaOptionId || undefined,
      medusaOptionValueId: selection.medusaOptionValueId || undefined
    });
  }
  result.extra += numericDeltaCents;
};

  elements.forEach((node) => {
    if (handled.has(node)) return;
    const group = node.getAttribute('data-group') || node.getAttribute('name') || 'option';
    const tag = (node.tagName || '').toLowerCase();

    if (tag === 'select') {
      const select = node;
      const option = select.options[select.selectedIndex];
      if (option) {
        const value = option.value ?? '';
        const isPlaceholder =
          option.dataset.placeholder === 'true' ||
          option.disabled ||
          value === '';
        if (!isPlaceholder) {
          const label = option.dataset.label || option.text || value;
          const priceCents = normalizeCents(
            option.dataset.priceCents ?? option.getAttribute('data-price-cents')
          );
          const delta = priceCents / 100;
          const medusaVariantId =
            option.dataset.variantId ||
            option.dataset.medusaVariantId ||
            option.getAttribute('data-variant-id') ||
            option.getAttribute('data-medusa-variant-id') ||
            null;
          const medusaOptionId =
            option.dataset.medusaOptionId ||
            option.getAttribute('data-medusa-option-id') ||
            null;
          const medusaOptionValueId =
            option.dataset.medusaOptionValueId ||
            option.getAttribute('data-medusa-option-value-id') ||
            null;
          addSelection(group, value, label, delta, {
            isUpgrade: isUpgradeField(select),
            medusaVariantId,
            medusaOptionId,
            medusaOptionValueId,
            priceCents
          });
        }
      }
      handled.add(node);
      return;
    }

    if (tag === 'input') {
      const input = node;
      const type = (input.type || 'text').toLowerCase();
      const baseDeltaCents = normalizeCents(
        input.dataset.priceCents ?? input.getAttribute('data-price-cents')
      );
      const baseDelta = baseDeltaCents / 100;
      const medusaOptionId =
        input.dataset.medusaOptionId || input.getAttribute('data-medusa-option-id') || null;
      const medusaOptionValueId =
        input.dataset.medusaOptionValueId ||
        input.getAttribute('data-medusa-option-value-id') ||
        null;

      if (type === 'radio') {
        const name = input.name || group;
        const selector = `input[type="radio"][name="${CSS?.escape?.(name) ?? name}"]`;
        Array.from(form.querySelectorAll(selector)).forEach((radio) => {
          handled.add(radio);
          if (radio.checked) {
            const value = radio.value || '';
            const label = radio.dataset.label || value;
            const priceCents = normalizeCents(
              radio.dataset.priceCents ?? radio.getAttribute('data-price-cents')
            );
            const delta = priceCents / 100;
            const medusaVariantId =
              radio.dataset.variantId ||
              radio.dataset.medusaVariantId ||
              radio.getAttribute('data-variant-id') ||
              radio.getAttribute('data-medusa-variant-id') ||
              null;
            const optionId =
              radio.dataset.medusaOptionId ||
              radio.getAttribute('data-medusa-option-id') ||
              null;
            const optionValueId =
              radio.dataset.medusaOptionValueId ||
              radio.getAttribute('data-medusa-option-value-id') ||
              null;
            addSelection(group, value, label, delta, {
              isUpgrade: isUpgradeField(radio),
              medusaVariantId,
              medusaOptionId: optionId,
              medusaOptionValueId: optionValueId,
              priceCents
            });
          }
        });
        return;
      }

      if (type === 'checkbox') {
        handled.add(input);
        if (input.checked) {
          const value = input.value || 'on';
          const label = input.dataset.label || value;
          addSelection(group, value, label, baseDelta, {
            isUpgrade: isUpgradeField(input),
            medusaOptionId,
            medusaOptionValueId,
            priceCents: baseDeltaCents
          });
        }
        return;
      }

      const val = (input.value || '').toString().trim();
      if (val.length > 0) {
        const label = input.dataset.label || val;
        addSelection(group, val, label, baseDelta, {
          isUpgrade: isUpgradeField(input),
          medusaOptionId,
          medusaOptionValueId,
          priceCents: baseDeltaCents
        });
      }
      handled.add(input);
      return;
    }
  });

  return result;
};

const renderConfiguredPrice = (price, comparePrice) => {
  const targets = document.querySelectorAll(
    '#price-total, [data-price-target="configured"], .js-configured-price'
  );
  const resolvedCompare = Number.isFinite(comparePrice) ? comparePrice : price;
  const hasCompare = resolvedCompare > price;
  const formattedPrice = formatCurrency(price);
  const formattedCompare = formatCurrency(resolvedCompare);

  targets.forEach((node) => {
    if (hasCompare) {
      node.innerHTML = `<span class="text-red-400">${formattedPrice}</span> <span class="ml-2 text-white/60 line-through">${formattedCompare}</span>`;
    } else {
      node.textContent = formattedPrice;
    }
  });
};

const updateConfiguredPriceUI = () => {
  const button = document.getElementById('add-to-cart-btn');
  const cfg = readConfiguredOptions();

  const saleBasePrice = button
    ? parsePrice(button.dataset.productPrice ?? button.dataset.productBasePrice, 0)
    : 0;
  const compareBasePrice = button
    ? parsePrice(
        button.dataset.productComparePrice ?? button.dataset.productBasePrice,
        saleBasePrice
      )
    : saleBasePrice;

  const extra = Number.isFinite(cfg?.extra) ? Math.max(0, Math.round(cfg.extra)) : 0;
  const configuredPrice = saleBasePrice + extra;
  const configuredComparePrice = compareBasePrice + extra;

  // Display the configured cents total on PDP so selected options/upgrades are visible before cart.
  renderConfiguredPrice(configuredPrice, configuredComparePrice);

  if (button) {
    button.dataset.configuredPrice = String(configuredPrice);
    button.dataset.configuredComparePrice =
      configuredComparePrice > 0 ? String(configuredComparePrice) : '';
  }

  return { total: configuredPrice, compareTotal: configuredComparePrice, cfg, extra };
};

const schedule = (() => {
  let raf = 0;
  return (fn) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      fn();
    });
  };
})();

const initStickyBar = () => {
  const sticky = document.getElementById('sticky-price');
  const total = document.getElementById('price-total');
  if (!sticky || !total) return;

  const sync = () => {
    sticky.textContent = total.textContent;
  };

  sync();

  try {
    const observer = new MutationObserver(sync);
    observer.observe(total, { childList: true, characterData: true, subtree: true });
  } catch {
    /* noop */
  }
};

const initStickyVisibility = () => {
  const bar = document.getElementById('mobile-add-to-cart');
  if (!bar) return;
  const hide = () => bar.classList.add('hidden');
  const show = () => bar.classList.remove('hidden');
  window.addEventListener('cart:open', hide);
  window.addEventListener('cart:close', show);
  window.addEventListener('menu:open', hide);
  window.addEventListener('menu:close', show);
};

const hydrateCartButtons = () => {
  const win = window;
  if (win.__fasProductInit) return;
  win.__fasProductInit = true;

  const validateButtons = () => {
    const buttons = Array.from(document.querySelectorAll('.add-to-cart'));
    buttons.forEach((button) => {
      const ds = button.dataset || {};
      const medusaVariantId = (ds.productMedusaVariantId || ds.productMedusaVariantID || '')
        .toString()
        .trim();
      if (!medusaVariantId) {
        button.setAttribute('aria-disabled', 'true');
        button.classList.add('opacity-60', 'cursor-not-allowed');
        button.setAttribute(
          'title',
          'This item is missing a required variant. Please contact support.'
        );
      }
    });
  };

  const handleClick = (event) => {
    const target = event.target;
    const button = target?.closest('.add-to-cart');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const form = document.getElementById('product-options');
    if (form) {
      let isValid = true;
      try {
        isValid = typeof form.checkValidity === 'function' ? form.checkValidity() : true;
      } catch {
        isValid = true;
      }
      if (!isValid) {
        try {
          if (typeof form.reportValidity === 'function') {
            form.reportValidity();
          }
        } catch {
          /* noop */
        }
        return;
      }
    }

    const { total, compareTotal, cfg, extra } = updateConfiguredPriceUI();
    const selections = Array.isArray(cfg.selections) ? cfg.selections : [];
    const upgradeSelections = Array.isArray(cfg.upgrades) ? cfg.upgrades : [];
    const selectedUpgrades = upgradeSelections
      .map((entry) => entry?.label || entry?.value || '')
      .filter(Boolean);
    const selectedUpgradesDetailed = upgradeSelections
      .map((entry) => ({
        label: entry?.label || entry?.value || '',
        priceCents: normalizeCents(entry?.priceCents),
        medusaOptionValueId: (entry?.medusaOptionValueId || '').toString().trim()
      }))
      .filter((entry) => entry.label);
    const selectedOptions = selections
      .filter((sel) => !sel?.isUpgrade)
      .map((sel) => sel?.label || sel?.value || '')
      .filter(Boolean);

    const ds = button.dataset || {};
    const saleLabel = ds.productSaleLabel || ds.saleLabel || '';
    const baseSalePrice = parsePrice(ds.productPrice || ds.productBasePrice, total);
    const baseComparePrice = parsePrice(
      ds.productComparePrice ?? ds.productBasePrice,
      baseSalePrice
    );
    const shippingClassRaw = (ds.productShippingClass || '').toString();
    const readFlag = (value) => {
      if (value == null) return undefined;
      const normalized = String(value).trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      return undefined;
    };
    const requiresShipping = readFlag(ds.productRequiresShipping);
    const callForQuote = readFlag(ds.productCallForQuote) === true;
    const installOnly =
      callForQuote || (typeof requiresShipping === 'boolean' && requiresShipping === false);
    const selectionVariantId =
      selections.map((sel) => sel?.medusaVariantId).find(Boolean) || '';
    const medusaVariantId = (
      selectionVariantId ||
      ds.productMedusaVariantId ||
      ds.productMedusaVariantID ||
      ''
    )
      .toString()
      .trim();
    if (!medusaVariantId) {
      return;
    }
    const unresolvedUpgrade = selectedUpgradesDetailed.find(
      (entry) => !entry.medusaOptionValueId
    );
    if (unresolvedUpgrade) {
      const friendlyMessage = `The option “${unresolvedUpgrade.label}” isn’t available for checkout right now. Please remove it and try again.`;
      try {
        window.alert(friendlyMessage);
      } catch {
        /* noop */
      }
      window.dispatchEvent(
        new CustomEvent('cart:validation-error', {
          detail: {
            message: friendlyMessage
          }
        })
      );
      return;
    }
    const normalizedExtra = Number.isFinite(extra) ? extra : 0;
    const originalPrice =
      compareTotal > total
        ? compareTotal
        : baseComparePrice > baseSalePrice
          ? baseComparePrice + normalizedExtra
          : undefined;
    const isOnSale =
      (originalPrice ?? 0) > total ||
      String(ds.productOnSale || '').toLowerCase() === 'true' ||
      String(ds.saleActive || '').toLowerCase() === 'true';
    const resolvedSaleLabel = saleLabel || (isOnSale && (originalPrice ?? 0) > total ? 'Sale' : undefined);

    const signature = JSON.stringify(
      selections
        .slice()
        .sort((a, b) => `${a.group}:${a.value}`.localeCompare(`${b.group}:${b.value}`))
    );

    const options = {};
    selections.forEach((selection) => {
      const group = selection.group || 'option';
      const label = selection.label || selection.value || 'Selected';
      if (options[group]) {
        if (!options[group].includes(label)) {
          options[group] = `${options[group]}, ${label}`;
        }
      } else {
        options[group] = label;
      }
    });

    const product = {
      id: `${ds.productId || ''}::${signature}`,
      name: ds.productName || 'Item',
      price: total,
      basePrice: baseSalePrice,
      originalPrice: originalPrice,
      isOnSale,
      saleLabel: resolvedSaleLabel,
      extra: normalizedExtra,
      image: ds.productImage || '',
      options,
      selections,
      upgrades: upgradeSelections.map((entry) => ({
        label: entry?.label || entry?.value || 'Upgrade',
        value: entry?.value || entry?.label || '',
        price: normalizeCents(entry?.priceCents),
        priceCents: normalizeCents(entry?.priceCents),
        medusaOptionValueId: entry?.medusaOptionValueId || undefined
      })),
      selectedOptions,
      selectedUpgrades,
      selectedUpgradesDetailed,
      signature,
      quantity: 1,
      installOnly,
      shippingClass: shippingClassRaw,
      medusaVariantId,
      productUrl: ds.productHref
    };

    const cart = getCart();
    const existing = cart.items.find((item) => item && item.id === product.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.price = product.price;
      existing.basePrice = product.basePrice;
      existing.extra = product.extra;
      existing.originalPrice = product.originalPrice;
      existing.isOnSale = product.isOnSale;
      existing.saleLabel = product.saleLabel;
      existing.options = product.options;
      existing.selections = product.selections;
      existing.upgrades = product.upgrades;
      existing.selectedUpgrades = selectedUpgrades;
      existing.selectedUpgradesDetailed = selectedUpgradesDetailed;
      existing.selectedOptions = selectedOptions;
      existing.installOnly = installOnly;
      existing.shippingClass = shippingClassRaw;
      if (medusaVariantId) existing.medusaVariantId = medusaVariantId;
      if (product.productUrl) existing.productUrl = product.productUrl;
    } else {
      cart.items.push(product);
    }

    setCart(cart);
    emitCartChanged(cart);
    try {
      emitAddToCartSuccess({ name: product.name });
    } catch (error) {
      void error;
    }

    const eventName = prefersDesktopOverlay() ? 'open-desktop-cart' : 'open-cart';
    try {
      window.dispatchEvent(new Event(eventName));
    } catch {
      /* noop */
    }
  };

  document.addEventListener('click', handleClick, true);
  validateButtons();

  const attachRecalcListeners = () => {
    const form = document.getElementById('product-options');
    if (!form) return;
    const recalc = (event) => {
      if (form.contains(event.target)) {
        schedule(updateConfiguredPriceUI);
      }
    };
    ['input', 'change'].forEach((evt) => document.addEventListener(evt, recalc, true));
    // Label clicks can toggle checkboxes/radios without immediate input event in some cases.
    document.addEventListener(
      'click',
      (event) => {
        if (form.contains(event.target)) {
          schedule(updateConfiguredPriceUI);
        }
      },
      true
    );
  };

  attachRecalcListeners();
  if (document.readyState !== 'complete') {
    window.addEventListener('load', attachRecalcListeners, { once: true });
  }

  window.addEventListener('load', () => {
    schedule(updateConfiguredPriceUI);
    setTimeout(() => schedule(updateConfiguredPriceUI), 0);
    setTimeout(() => schedule(updateConfiguredPriceUI), 200);
  });

  window.readConfiguredOptions = readConfiguredOptions;
  window.updateConfiguredPriceUI = updateConfiguredPriceUI;
};

const initProductPage = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  initStickyBar();
  initStickyVisibility();
  hydrateCartButtons();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductPage, { once: true });
} else {
  initProductPage();
}
