'use client';

import { useEffect, useRef, useState } from 'react';

function MobileNavContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <>
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
            <a href="/shop/categories/billet-parts/" className="mobile-nav-link" onClick={onNavigate}>
              Billet Parts
            </a>
            <div className="mobile-nav-sub">
              <a href="/shop/categories/billet-parts/" onClick={onNavigate}>
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
              <a href="/packages" onClick={onNavigate}>
                All Packages
              </a>
              <a href="/packages/powerPackages" onClick={onNavigate}>
                Power Packages
              </a>
              <a href="/packages/truckPackages" onClick={onNavigate}>
                Truck Packages
              </a>
            </div>
          </li>
          <li>
            <a href="/services" className="mobile-nav-link" onClick={onNavigate}>
              Services
            </a>
            <div className="mobile-nav-sub">
              <a href="/services/customFab" onClick={onNavigate}>
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
              <a href="/services/coreExchange" onClick={onNavigate}>
                Core Exchange
              </a>
              <a href="/schedule" onClick={onNavigate}>
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
          <li>
            <a href="/blog/" className="mobile-nav-link" onClick={onNavigate}>
              Blog
            </a>
          </li>
        </ul>
        <div className="mobile-nav-ctas">
          <a href="/shop/categories/billet-parts/" className="mobile-cta-primary" onClick={onNavigate}>
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

    const focusable = getFocusable();
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableItems = getFocusable();
      if (!focusableItems.length) return;

      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current) {
        triggerRef.current.focus();
      } else {
        previousActiveElement?.focus();
      }
    };
  }, [isOpen]);

  if (mode === 'inline') {
    return <MobileNavContent onNavigate={undefined} />;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        id="hamburger"
        ref={triggerRef}
        aria-label={isOpen ? 'Close mobile menu' : 'Open mobile menu'}
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <button
          type="button"
          onClick={close}
          className="mobile-nav-link"
          aria-label="Close navigation menu"
        >
          Close menu
        </button>
        <MobileNavContent onNavigate={close} />
      </div>
    </>
  );
}
