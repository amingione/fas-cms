import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADD_TO_CART_SUCCESS_EVENT, type AddToCartToastDetail } from '@/lib/add-to-cart-toast';

const AUTO_HIDE_DELAY = 2500;
const MOBILE_QUERY = '(max-width: 768px)';

export default function MobileAddToCartToast() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [detail, setDetail] = useState<AddToCartToastDetail | null>(null);
  const hideTimer = useRef<number | null>(null);
  const labelId = useMemo(
    () => `mobile-add-to-cart-toast-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleSuccess = (event: Event) => {
      if (!isMobile) return;

      const customEvent = event as CustomEvent<AddToCartToastDetail>;
      setDetail(customEvent?.detail || null);
      setVisible(true);

      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
      }, AUTO_HIDE_DELAY);
    };

    window.addEventListener(ADD_TO_CART_SUCCESS_EVENT, handleSuccess as EventListener);

    return () => {
      window.removeEventListener(ADD_TO_CART_SUCCESS_EVENT, handleSuccess as EventListener);
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [mounted, isMobile]);

  useEffect(() => {
    if (!mounted || !visible) return;

    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_DELAY);

    return () => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [visible, mounted]);

  if (!mounted || !isMobile) return null;

  const close = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(false);
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[140] flex justify-center px-4 pb-5">
      <div
        className={`flex w-full max-w-[360px] justify-center transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          aria-labelledby={`${labelId}-title`}
          aria-hidden={!visible}
          className="flex w-full items-start gap-2 rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[rgba(12,12,12,0.85)] px-3.5 py-3 shadow-[0_0_15px_rgba(56,189,255,0.25)] backdrop-blur-sm"
          style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
        >
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center">
            <svg className="h-5 w-5 text-[#5ab8ff]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 12l4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="flex-1 text-[13px] leading-tight text-white">
            <p id={`${labelId}-title`} className="text-sm font-semibold text-white">
              Item added to cart
            </p>
            {detail?.name ? <p className="sr-only">{detail.name}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href="/cart"
                className="inline-flex items-center justify-center rounded-md bg-[#5ab8ff] px-3 py-1.5 text-xs font-semibold text-black shadow-[0_4px_10px_rgba(56,189,255,0.18)] transition hover:bg-[#7dc9ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dc9ff]"
              >
                View Cart
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="ml-1 rounded-full p-1 text-white transition hover:text-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
          >
            <span className="sr-only">Close add to cart notification</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
