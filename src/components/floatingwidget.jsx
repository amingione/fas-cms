import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './button';

/** variant: 'auto' | 'fab' | 'icon' */
export default function FloatingCartWidget({ variant = 'fab' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Ensure only ONE primary cart instance renders panel/backdrop & listeners
  const instanceIdRef = useRef(typeof Symbol === 'function' ? Symbol('fas-cart') : Math.random());
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Claim singleton role so only one cart panel/backdrop exists
  useEffect(() => {
    const key = '__fasCartSingleton';
    if (!window[key]) {
      window[key] = instanceIdRef.current;
      setIsPrimary(true);
    } else {
      setIsPrimary(window[key] === instanceIdRef.current);
    }
    return () => {
      // Release if we were the owner
      if (window[key] === instanceIdRef.current) {
        delete window[key];
      }
    };
  }, []);

  useEffect(() => {
    if (!isPrimary) return;
    const updateFromStorage = () => {
      const saved = localStorage.getItem('cart');
      const raw = saved ? JSON.parse(saved) : [];
      const parsed = Array.isArray(raw)
        ? raw.map((p, idx) => ({
            ...p,
            quantity: Number(p?.quantity ?? p?.qty ?? 1) || 1,
            signature: p?.signature || (Array.isArray(p?.options) ? JSON.stringify(p.options) : ''),
            __key: `${p?.id || 'item'}-${p?.signature || idx}`
          }))
        : [];

      const sameLength = parsed.length === cartItems.length;
      const sameItems =
        sameLength &&
        parsed.every(
          (p, i) =>
            p?.id === cartItems[i]?.id &&
            p?.signature === cartItems[i]?.signature &&
            Number(p?.quantity) === Number(cartItems[i]?.quantity) &&
            Number(p?.price) === Number(cartItems[i]?.price)
        );

      if (!sameItems) setCartItems(parsed);
      if (!loaded) setLoaded(true);
      if (parsed.length > 0) setIsOpen(true);
    };

    // Listen for custom app event (dispatched by ProductCard)
    window.addEventListener('cart:updated', updateFromStorage);

    return () => {
      window.removeEventListener('cart:updated', updateFromStorage);
    };
  }, [cartItems, loaded, isPrimary]);

  useEffect(() => {
    if (!isPrimary) {
      window.openFloatingCart = () => {
        window.dispatchEvent(new CustomEvent('cart:toggle'));
      };
      return;
    }
    const onToggle = () => setIsOpen((v) => !v);
    window.addEventListener('cart:toggle', onToggle);
    window.openFloatingCart = () => setIsOpen(true);
    return () => {
      window.removeEventListener('cart:toggle', onToggle);
      delete window.openFloatingCart;
    };
  }, [isPrimary]);

  useEffect(() => {
    if (!isPrimary) return;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart');
      const raw = saved ? JSON.parse(saved) : [];
      const parsed = Array.isArray(raw)
        ? raw.map((p, idx) => ({
            ...p,
            quantity: Number(p?.quantity ?? p?.qty ?? 1) || 1,
            signature: p?.signature || (Array.isArray(p?.options) ? JSON.stringify(p.options) : ''),
            __key: `${p?.id || 'item'}-${p?.signature || idx}`
          }))
        : [];
      setCartItems(parsed);
      setLoaded(true);
    }
  }, [isPrimary]);

  useEffect(() => {
    if (!isPrimary) return;
    if (!loaded) return; // avoid clobbering storage on first mount
    if (typeof window !== 'undefined') {
      const toSave = cartItems.map((p) => ({
        ...p,
        qty: p.quantity // keep legacy field for any older readers
      }));
      localStorage.setItem('cart', JSON.stringify(toSave));
      // Do NOT dispatch 'cart:updated' here to avoid event feedback loop.
      // ProductCard dispatches this event when it updates the cart.
    }
  }, [cartItems, loaded, isPrimary]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const Trigger = () => (
    <button
      onClick={() => {
        if (isPrimary) setIsOpen(true);
        else if (typeof window.openFloatingCart === 'function') window.openFloatingCart();
      }}
      className="fixed bottom-20 right-6 z-999 bg-white text-black p-4 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center"
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
                key={item.__key || `${item.id}-${item.signature || 'base'}`}
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
                          prev.map((ci, idx) =>
                            ci.id === item.id && (ci.signature || idx) === (item.signature || idx)
                              ? { ...ci, quantity: newQty }
                              : ci
                          )
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
                    onClick={() =>
                      setCartItems(
                        cartItems.filter(
                          (ci, idx) =>
                            !(
                              ci.id === item.id && (ci.signature || idx) === (item.signature || idx)
                            )
                        )
                      )
                    }
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
      {mounted && isPrimary ? createPortal(panel, document.body) : null}
    </>
  );
}
