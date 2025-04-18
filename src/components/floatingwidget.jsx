import { useState, useEffect } from 'react';

export default function FloatingCartWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fas_cart');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('fas_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 bg-white text-black p-4 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h11.1M7 13L5.4 5M16 16a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      </button>

      <div
        id="side-cart"
        className={`fixed top-0 right-0 w-full sm:w-[450px] h-full bg-black/90 text-white z-50 transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b border-white/10">
          <h2 className="text-xl font-bold font-captain">Cart</h2>
          <button onClick={() => setIsOpen(false)} className="text-white text-2xl">×</button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-12rem)]">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-400">
              <p className="mb-4">Your cart is empty.</p>
              <a
                href="/shop"
                className="inline-block bg-white text-black px-4 py-2 rounded font-bold transition-all hover:bg-primary hover:!text-white focus:!text-white active:!text-white"
              >
                Shop Now
              </a>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b border-white/10 py-3">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity}x • ${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">${(item.quantity * item.price).toFixed(2)}</p>
                  <button
                    onClick={() => setCartItems(cartItems.filter(ci => ci.id !== item.id))}
                    className="text-red-400 hover:text-red-600 text-lg"
                    title="Remove"
                  >
                    ×
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
          <button
            onClick={async () => {
             const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
              sessionId: window.localStorage.getItem('fas_session') || 'guest-session',
        }),
     });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Unable to start checkout. Please try again.');
    }
  }}
  className="block w-full bg-primary text-black py-3 rounded hover:opacity-90 transition-all font-bold tracking-wide"
>
  Proceed to Checkout
</button>
        </div>
      </div>
    </>
  );
}