import React from 'react';
import '../styles/global.css';

const MobileBaseLayout = ({ children }) => {
  return (
    <div className="relative bg-black text-white font-sans min-h-screen pb-20">
      {/* Floating Logo */}
      <div className="fixed top-4 left-4 z-40">
        <img src="/images/faslogochroma.png" alt="FAS Logo" className="w-16 h-auto opacity-80" />
      </div>

      {/* Page Content */}
      <main className="pt-24 px-4">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#111111] text-white flex justify-around py-3 border-t border-white/10 z-50">
        <a href="/" className="flex flex-col items-center text-sm hover:text-primary">
          <span>🏠</span>
          <span>Home</span>
        </a>
        <a href="/shop" className="flex flex-col items-center text-sm hover:text-primary">
          <span>🛒</span>
          <span>Shop</span>
        </a>
        <button
          onClick={() => {
            const panel = document.getElementById('mobileAccountDrawer');
            if (panel) panel.classList.remove('translate-y-full');
          }}
          className="flex flex-col items-center text-sm hover:text-primary"
        >
          <span>👤</span>
          <span>Account</span>
        </button>
      </nav>

      {/* Bottom Drawer Account Panel */}
      <div
        id="mobileAccountDrawer"
        className="fixed bottom-0 left-0 w-full h-[70vh] bg-[#1a1a1a] text-white rounded-t-xl z-50 transform translate-y-full transition-transform duration-300 ease-in-out shadow-xl p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">My Account</h2>
          <button
            onClick={() => {
              const panel = document.getElementById('mobileAccountDrawer');
              if (panel) panel.classList.add('translate-y-full');
            }}
          >
            ✕
          </button>
        </div>
        <ul className="space-y-3 text-sm">
          <li><a href="/account" className="block">Dashboard</a></li>
          <li><a href="#" className="block">Orders (Coming Soon)</a></li>
          <li><a href="#" className="block">Settings (Coming Soon)</a></li>
          <li><a href="#" className="block">Garage Dashboard (Coming Soon)</a></li>
          <li><button className="text-red-500">Logout</button></li>
        </ul>
      </div>
    </div>
  );
};

export default MobileBaseLayout;