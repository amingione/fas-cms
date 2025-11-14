const CART_KEY = 'fas_cart_v1';

type CartItem = {
  id: string;
  name: string;
  price: number;
  basePrice: number;
  extra: number;
  image: string;
  options: Record<string, string>;
  selections: Array<{ group: string; value: string; label: string; priceDelta: number }>;
  signature: string;
  quantity: number;
  installOnly: boolean;
  shippingClass: string;
  productUrl?: string;
};

type Cart = {
  items: CartItem[];
};

const getCart = (): Cart => {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items as CartItem[] };
    }
  } catch {
    /* noop */
  }
  return { items: [] };
};

const setCart = (cart: Cart) => {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    (window as any).cart = cart;
  } catch {
    /* noop */
  }
};

const emitCartChanged = (cart: Cart) => {
  try {
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart } }));
  } catch {
    /* noop */
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

const normalizeDelta = (value: unknown) => {
  if (value == null) return 0;
  const numeric = parseFloat(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

type SelectionResult = {
  selections: Array<{ group: string; value: string; label: string; priceDelta: number }>;
  extra: number;
};

const readConfiguredOptions = (): SelectionResult => {
  const result: SelectionResult = { selections: [], extra: 0 };
  const form = document.getElementById('product-options');
  if (!form) return result;
  const handled = new Set<Element>();
  const elements = Array.from(form.querySelectorAll<HTMLElement>('[data-group]'));

  const addSelection = (group: string, value: string, label: string, delta: number) => {
    const numericDelta = Number.isFinite(delta) ? delta : 0;
    result.selections.push({ group, value, label, priceDelta: numericDelta });
    result.extra += numericDelta;
  };

  elements.forEach((node) => {
    if (handled.has(node)) return;
    const group = node.getAttribute('data-group') || node.getAttribute('name') || 'option';
    const tag = (node.tagName || '').toLowerCase();

    if (tag === 'select') {
      const select = node as HTMLSelectElement;
      const option = select.options[select.selectedIndex];
      if (option) {
        const value = option.value || '';
        const label = option.dataset.label || option.text || value;
        const delta = normalizeDelta(option.dataset.price ?? option.getAttribute('data-price'));
        addSelection(group, value, label, delta);
      }
      handled.add(node);
      return;
    }

    if (tag === 'input') {
      const input = node as HTMLInputElement;
      const type = (input.type || 'text').toLowerCase();
      const baseDelta = normalizeDelta(input.dataset.price ?? input.getAttribute('data-price'));

      if (type === 'radio') {
        const name = input.name || group;
        const selector = `input[type="radio"][name="${CSS?.escape?.(name) ?? name}"]`;
        Array.from(form.querySelectorAll<HTMLInputElement>(selector)).forEach((radio) => {
          handled.add(radio);
          if (radio.checked) {
            const value = radio.value || '';
            const label = radio.dataset.label || value;
            const delta = normalizeDelta(radio.dataset.price ?? radio.getAttribute('data-price'));
            addSelection(group, value, label, delta);
          }
        });
        return;
      }

      if (type === 'checkbox') {
        handled.add(input);
        if (input.checked) {
          const value = input.value || 'on';
          const label = input.dataset.label || value;
          addSelection(group, value, label, baseDelta);
        }
        return;
      }

      const val = (input.value || '').toString().trim();
      if (val.length > 0) {
        const label = input.dataset.label || val;
        addSelection(group, val, label, baseDelta);
      }
      handled.add(input);
      return;
    }
  });

  return result;
};

const updateConfiguredPriceUI = () => {
  const button = document.getElementById('add-to-cart-btn');
  if (!button) return { total: 0, cfg: readConfiguredOptions() };
  const basePrice = parseFloat(String(button.dataset.productBasePrice || '0')) || 0;
  const cfg = readConfiguredOptions();
  const total = Math.max(0, basePrice + (cfg.extra || 0));

  const targets = document.querySelectorAll<HTMLElement>('#price-total, [data-price-target="configured"], .js-configured-price');
  targets.forEach((node) => {
    node.textContent = `$ ${total.toFixed(2)}`;
  });

  button.dataset.productPrice = String(total);
  return { total, cfg };
};

const schedule = (() => {
  let raf = 0;
  return (fn: () => void) => {
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
  const win = window as any;
  if (win.__fasProductInit) return;
  win.__fasProductInit = true;

  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.add-to-cart');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const { total, cfg } = updateConfiguredPriceUI();
    const selections = Array.isArray(cfg.selections) ? cfg.selections : [];

    const ds = button.dataset || {};
    const basePrice = parseFloat(ds.productBasePrice || ds.productPrice || '0') || 0;
    const shippingClassRaw = (ds.productShippingClass || '').toString();
    const normalizedShipping = shippingClassRaw.toLowerCase().replace(/[^a-z]/g, '');
    const installOnly = String(ds.productInstallOnly || '').toLowerCase() === 'true' || normalizedShipping.includes('installonly');

    const signature = JSON.stringify(
      selections
        .slice()
        .sort((a, b) => `${a.group}:${a.value}`.localeCompare(`${b.group}:${b.value}`))
    );

    const options: Record<string, string> = {};
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

    const product: CartItem = {
      id: `${ds.productId || ''}::${signature}`,
      name: ds.productName || 'Item',
      price: total,
      basePrice,
      extra: total - basePrice,
      image: ds.productImage || '',
      options,
      selections,
      signature,
      quantity: 1,
      installOnly,
      shippingClass: shippingClassRaw,
      productUrl: ds.productHref
    };

    const cart = getCart();
    const existing = cart.items.find((item) => item && item.id === product.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.price = product.price;
      existing.basePrice = product.basePrice;
      existing.extra = product.extra;
      existing.options = product.options;
      existing.installOnly = installOnly;
      existing.shippingClass = shippingClassRaw;
    } else {
      cart.items.push(product);
    }

    setCart(cart);
    emitCartChanged(cart);

    const eventName = prefersDesktopOverlay() ? 'open-desktop-cart' : 'open-cart';
    try {
      window.dispatchEvent(new Event(eventName));
    } catch {
      /* noop */
    }
  };

  document.addEventListener('click', handleClick, true);

  const attachRecalcListeners = () => {
    const form = document.getElementById('product-options');
    if (!form) return;
    const recalc = (event: Event) => {
      if (form.contains(event.target as Node)) {
        schedule(updateConfiguredPriceUI);
      }
    };
    ['input', 'change'].forEach((evt) => document.addEventListener(evt, recalc, true));
  };

  if (document.readyState === 'complete') {
    attachRecalcListeners();
  } else {
    window.addEventListener('load', attachRecalcListeners, { once: true });
  }

  window.addEventListener('load', () => {
    schedule(updateConfiguredPriceUI);
    setTimeout(() => schedule(updateConfiguredPriceUI), 0);
    setTimeout(() => schedule(updateConfiguredPriceUI), 200);
  });

  (window as any).readConfiguredOptions = readConfiguredOptions;
  (window as any).updateConfiguredPriceUI = updateConfiguredPriceUI;
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

export {};
