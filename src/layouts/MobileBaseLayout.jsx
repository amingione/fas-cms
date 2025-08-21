import React, { useEffect, useRef, useState } from 'react';
import '../styles/global.css';
import Dashboard from '@/pages/dashboard.astro';
import FloatingWidget from '@/components/floatingwidget.jsx';

const MobileBaseLayout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const firstLinkRef = useRef(null);

  // Close on ESC and basic focus management when opening
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    if (drawerOpen && firstLinkRef.current) {
      // Focus the first interactive element for accessibility
      firstLinkRef.current.focus();
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const [path, setPath] = useState('/');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPath(window.location.pathname || '/');
    }
  }, []);

  const isActive = (href) => path === href;

  // Utility: compose class names
  const cx = (...cls) => cls.filter(Boolean).join(' ');

  const [hideUI, setHideUI] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const currY = window.scrollY;
      if (currY > lastY + 10) setHideUI(true);
      else if (currY < lastY - 10) setHideUI(false);
      lastY = currY;
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative bg-black text-white font-sans min-h-screen pb-20">
      {/* Floating Logo */}
      <div className="fixed top-4 left-4 z-40">
        <img src="/images/faslogochroma.png" alt="FAS Logo" className="w-16 h-auto opacity-80" />
      </div>

      {/* Floating Controls (Cart + Menu) */}
      <div
        className={cx(
          'fixed top-0 right-0 z-[60] flex items-center gap-2 transition-transform duration-300',
          hideUI ? '-translate-y-8 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        )}
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right))'
        }}
      >
        <div
          className={cx(
            'relative z-[60] inline-flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] overflow-visible ml-1',
            drawerOpen ? 'pointer-events-none opacity-40' : 'pointer-events-auto'
          )}
          aria-hidden={drawerOpen}
        >
          <FloatingWidget variant="icon" />
        </div>
        <button
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white"
        >
          ☰
        </button>
      </div>

      {/* Page Content */}
      <main
        className="pt-20 px-4"
        style={{
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          paddingTop: 'calc(6rem + env(safe-area-inset-top))'
        }}
      >
        {children}
      </main>

      {/* Backdrop overlay for drawer */}
      <button
        aria-hidden={!drawerOpen}
        tabIndex={drawerOpen ? 0 : -1}
        onClick={() => setDrawerOpen(false)}
        className={cx(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Bottom Navigation */}
      <nav
        role="navigation"
        aria-label="Primary"
        className={cx(
          'fixed bottom-0 left-0 w-full bg-[#111111] text-white flex justify-around py-3 border-t border-white/10 z-50 transition-transform duration-300',
          hideUI ? 'translate-y-full' : 'translate-y-0'
        )}
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <a
          href="/"
          className={cx(
            'btn-glass btn-dark btn-xs inline-flex flex-col items-center gap-0.5',
            isActive('/') && 'ring-1 ring-white/15'
          )}
        >
          <span aria-hidden className="text-base leading-none">
            🏠
          </span>
          <span className="text-[0.72rem] leading-tight">Home</span>
        </a>
        <a
          href="/shop"
          className={cx(
            'btn-glass btn-dark btn-xs inline-flex flex-col items-center gap-0.5',
            isActive('/shop') && 'ring-1 ring-white/15'
          )}
        >
          <span aria-hidden className="text-base leading-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h3l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"></path>
            </svg>
          </span>
          <span className="text-[0.72rem] leading-tight">Shop</span>
        </a>
        <button
          aria-controls="mobileMenuDrawer"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className={cx('btn-glass btn-dark btn-xs inline-flex flex-col items-center gap-0.5')}
        >
          <span aria-hidden className="text-base leading-none">
            👤
          </span>
          <span className="text-[0.72rem] leading-tight">Account</span>
        </button>
      </nav>

      {/* Full-Screen Menu Drawer */}
      <section
        id="mobileMenuDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobileMenuTitle"
        className={cx(
          'fixed inset-0 bg-white text-black z-[90] transform transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-3">
            <a href="/dashboard" aria-label="Account">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </a>
            <h2 id="mobileMenuTitle" className="text-lg font-bold">
              F.A.S. Motorsports
            </h2>
          </div>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>
        <nav className="p-6 space-y-6 text-2xl font-medium">
          <a href="/" className="block">
            Home
          </a>
          <a href="/shop" className="block">
            Shop
          </a>
          <a href="/builds" className="block">
            Builds
          </a>
          <a href="/packages" className="block">
            Packages
          </a>
          <a href="/portfolio" className="block">
            Portfolio
          </a>
          <a href="/about" className="block">
            About
          </a>
          <a href="/faq" className="block">
            FAQ
          </a>
          <a href="/contact" className="block">
            Contact
          </a>
        </nav>
      </section>
    </div>
  );
};

export default MobileBaseLayout;
