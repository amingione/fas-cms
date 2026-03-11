'use client';

import { useEffect, useState } from 'react';

function MobileNavContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Internal sticky drawer header */}
      <div className="mobile-nav-header">
        <a href="/" className="mobile-nav-logo" onClick={onNavigate} aria-label="F.A.S. Motorsports home">
          <img src="/logo/fas-logo500.webp" alt="F.A.S. Motorsports" height="36" />
        </a>
        <div className="mobile-nav-header-actions">
          <a href="/cart" className="mobile-nav-cart-pill" onClick={onNavigate}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
              width="15"
              height="15"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            Cart
          </a>
          <button
            className="mobile-nav-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable nav content */}
      <div className="mobile-nav-inner">
        <ul>
          <li>
            <a href="/shop" className="mobile-nav-link" onClick={onNavigate}>
              Shop
            </a>
            <div className="mobile-nav-sub">
              <a href="/shop/performance-packages" onClick={onNavigate}>
                Performance Packages
              </a>
              <a href="/wheels" onClick={onNavigate}>
                Wheels &amp; Tires
              </a>
              <a href="/shop" onClick={onNavigate}>
                All Products
              </a>
            </div>
          </li>
          <li>
            <a href="/shop/categories/billet-parts" className="mobile-nav-link" onClick={onNavigate}>
              Billet Parts
            </a>
            <div className="mobile-nav-sub">
              <a href="/shop/categories/billet-parts" onClick={onNavigate}>
                Shop Billet Parts
              </a>
              <a href="/specs/PredatorPulley" onClick={onNavigate}>
                Predator Pulley
              </a>
              <a href="/specs/PulleyHub" onClick={onNavigate}>
                Pulley Hub
              </a>
              <a href="/specs/BilletBearingPlate" onClick={onNavigate}>
                Billet Bearing Plate
              </a>
              <a href="/specs/BilletSnout" onClick={onNavigate}>
                Billet Snout
              </a>
            </div>
          </li>
          <li>
            <a href="/packages" className="mobile-nav-link" onClick={onNavigate}>
              Packages
            </a>
            <div className="mobile-nav-sub">
              <a href="/packages/truck" onClick={onNavigate}>
                Truck Packages
              </a>
              <a href="/packages/power" onClick={onNavigate}>
                Power Packages
              </a>
              <a href="/packages/diesel" onClick={onNavigate}>
                Diesel Builds
              </a>
            </div>
          </li>
          <li>
            <a href="/services" className="mobile-nav-link" onClick={onNavigate}>
              Services
            </a>
            <div className="mobile-nav-sub">
              <a href="/services/custom-fab" onClick={onNavigate}>
                Custom Fabrication
              </a>
              <a href="/services/porting" onClick={onNavigate}>
                Porting
              </a>
              <a href="/services/welding" onClick={onNavigate}>
                Welding
              </a>
              <a href="/services/igla" onClick={onNavigate}>
                IGLA Security
              </a>
              <a href="/services/core-exchange" onClick={onNavigate}>
                Core Exchange
              </a>
              <a href="/services/schedule" onClick={onNavigate}>
                Schedule Service
              </a>
            </div>
          </li>
          <li>
            <a href="/about" className="mobile-nav-link" onClick={onNavigate}>
              About
            </a>
          </li>
          <li>
            <a href="/contact" className="mobile-nav-link" onClick={onNavigate}>
              Contact
            </a>
          </li>
        </ul>
        <div className="mobile-nav-ctas">
          <a href="/shop/billet-parts" className="mobile-cta-primary" onClick={onNavigate}>
            Shop Billet Parts
          </a>
          <a href="/vendor-portal/login" className="mobile-cta-outline" onClick={onNavigate}>
            Vendor Portal Login
          </a>
        </div>
      </div>
    </>
  );
}

export default function MobileMenu({ mode = 'standalone' }: { mode?: 'standalone' | 'inline' }) {
  const [isOpen, setIsOpen] = useState(false);

  // Body scroll lock when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on resize to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 980) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const close = () => setIsOpen(false);

  if (mode === 'inline') {
    return <MobileNavContent onNavigate={undefined} onClose={undefined} />;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open mobile menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        className={`homepage-hamburger ${isOpen ? 'is-open' : ''}`}
        type="button"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div
        className={`mobile-nav ${isOpen ? 'open' : ''}`}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <MobileNavContent onNavigate={close} onClose={close} />
      </div>
    </>
  );
}
