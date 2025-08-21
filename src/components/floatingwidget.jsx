import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './button';

/** variant: 'auto' | 'fab' | 'icon' */
export default function FloatingCartWidget({ variant = 'auto' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const svgRef = useRef(null);
  const [useEmoji, setUseEmoji] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = svgRef.current;
    if (!el) return;
    try {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const hidden = cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0';
      if (hidden || rect.width < 4 || rect.height < 4) {
        setUseEmoji(true);
      }
    } catch (_) {}
  }, [mounted]);

  useEffect(() => {
    const updateFromStorage = () => {
      const saved = localStorage.getItem('cart');
      const parsed = saved ? JSON.parse(saved) : [];

      // Shallow compare to avoid unnecessary re-renders
      const sameLength = Array.isArray(parsed) && parsed.length === cartItems.length;
      const sameItems =
        sameLength &&
        parsed.every(
          (p, i) =>
            p?.id === cartItems[i]?.id &&
            Number(p?.quantity) === Number(cartItems[i]?.quantity) &&
            Number(p?.price) === Number(cartItems[i]?.price)
        );

      if (!sameItems) {
        setCartItems(parsed);
      }
      if (!loaded) setLoaded(true);
      if (parsed.length > 0) setIsOpen(true);
    };

    // Listen for custom app event (dispatched by ProductCard)
    window.addEventListener('cart:updated', updateFromStorage);

    return () => {
      window.removeEventListener('cart:updated', updateFromStorage);
    };
  }, [cartItems, loaded]);

  useEffect(() => {
    const onToggle = () => setIsOpen((v) => !v);
    window.addEventListener('cart:toggle', onToggle);
    window.openFloatingCart = () => setIsOpen(true);
    return () => {
      window.removeEventListener('cart:toggle', onToggle);
      delete window.openFloatingCart;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart');
      setCartItems(saved ? JSON.parse(saved) : []);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return; // avoid clobbering storage on first mount
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      // Do NOT dispatch 'cart:updated' here to avoid event feedback loop.
      // ProductCard dispatches this event when it updates the cart.
    }
  }, [cartItems, loaded]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const wantIcon = variant === 'icon' || (variant === 'auto' && isMobile);
  const Trigger = () =>
    wantIcon ? (
      <button
        onClick={() => setIsOpen(true)}
        className="cart-icon-btn relative z-50 inline-flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] shrink-0 text-white focus:outline-none focus:ring-2 focus:ring-white/40 overflow-visible pointer-events-auto bg-transparent hover:bg-transparent"
        aria-label="Cart"
        style={{ width: 36, height: 36, WebkitTapHighlightColor: 'transparent' }}
      >
        {useEmoji ? (
          <span aria-hidden className="text-lg leading-none">
            🛒
          </span>
        ) : (
          <span
            aria-hidden
            className="cart-icon-bg"
            style={{
              width: 20,
              height: 20,
              display: 'block',
              position: 'relative',
              zIndex: 1,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: '20px 20px',
              backgroundColor: 'transparent',
              filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.85))',
              outline: '1px solid rgba(255,255,255,0.15)', // TEMP debug: remove later
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='21' r='1'/%3E%3Ccircle cx='20' cy='21' r='1'/%3E%3Cpath d='M1 1h3l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6'/%3E%3C/svg%3E\")"
            }}
          />
        )}
      </button>
    ) : (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 bg-white text-black p-4 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center"
        aria-label="Cart"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h11.1M7 13L5.4 5M16 16a2 2 0 100 4 2 2 0 000-4zm-8 0a 2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
      </button>
    );

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[75] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      />

      {/* Side Cart Panel (portaled to body to ignore header transforms) */}
      <div
        id="side-cart"
        className={`fixed top-0 right-0 w-full sm:w-[450px] h-full bg-black/90 text-white z-[80] transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        <div className="p-4 flex justify-between items-center border-b border-white/10">
          <h2 className="text-xl font-bold font-captain">Cart</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white text-2xl"
            aria-label="Close cart"
          >
            {'\u00D7'}
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-12rem)]">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-400">
              <p className="mb-4">Your cart is empty.</p>
              <Button href="/shop" text="Shop Now" />
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b border-white/10 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQty = Math.max(1, parseInt(e.target.value) || 1);
                        setCartItems((prev) =>
                          prev.map((ci) => (ci.id === item.id ? { ...ci, quantity: newQty } : ci))
                        );
                      }}
                      className="w-12 text-sm text-black px-1 rounded"
                    />
                    <span className="text-xs text-gray-400">
                      • ${(Number(item.price) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">
                    ${((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}
                  </p>
                  <button
                    onClick={() => setCartItems(cartItems.filter((ci) => ci.id !== item.id))}
                    className="text-red-400 hover:text-red-600 text-lg"
                    title="Remove"
                  >
                    {'\u00D7'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-lg">Subtotal</span>
            <span className="font-bold text-primary text-lg">${subtotal.toFixed(2)}</span>
          </div>
          <Button
            href="#"
            text="Proceed to Checkout"
            onClick={async (e) => {
              e.preventDefault();
              const cart = JSON.parse(localStorage.getItem('cart') || '[]');

              if (!cart.length) {
                alert('Your cart is empty.');
                return;
              }

              try {
                const res = await fetch('/api/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cart })
                });

                if (!res.ok) {
                  alert('Checkout failed. Please try again.');
                  return;
                }

                const data = await res.json();
                if (data.url) {
                  window.location.href = data.url;
                } else {
                  alert('Unable to proceed to checkout. Please try again later.');
                }
              } catch (err) {
                console.error('Checkout error:', err);
                alert('An error occurred during checkout.');
              }
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <Trigger />
      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}
