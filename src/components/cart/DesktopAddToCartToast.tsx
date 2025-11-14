'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { ADD_TO_CART_SUCCESS_EVENT, type AddToCartToastDetail } from '@/lib/add-to-cart-toast';

const AUTO_HIDE_MS = 2800;
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

export default function DesktopAddToCartToast() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AddToCartToastDetail | null>(null);
  const timerRef = useRef<number | null>(null);
  const labelId = useMemo(
    () => `desktop-add-to-cart-toast-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = () => setIsDesktop(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleSuccess = (event: Event) => {
      if (!isDesktop) return;

      const customEvent = event as CustomEvent<AddToCartToastDetail>;
      setDetail(customEvent?.detail ?? null);
      setOpen(true);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    };

    window.addEventListener(ADD_TO_CART_SUCCESS_EVENT, handleSuccess as EventListener);

    return () => {
      window.removeEventListener(ADD_TO_CART_SUCCESS_EVENT, handleSuccess as EventListener);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mounted, isDesktop]);

  useEffect(() => {
    if (!mounted || !open) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), AUTO_HIDE_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, mounted]);

  const close = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
  };

  if (!mounted) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[150] flex items-end justify-end px-6 pb-6"
    >
      <Transition
        show={isDesktop && open}
        enter="transform transition ease-out duration-200"
        enterFrom="translate-y-2 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transform transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <div className="pointer-events-auto">
          <div
            role="alert"
            aria-atomic="true"
            aria-labelledby={`${labelId}-title`}
            aria-hidden={!open}
            className="w-full min-w-[280px] max-w-[320px] rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(12,12,12,0.85)] px-3 py-3 shadow-[0_0_15px_rgba(56,189,255,0.25)] backdrop-blur-sm"
            style={{ fontFamily: "'Roboto', 'Inter', sans-serif" }}
          >
            <div className="flex items-start gap-2">
              <CheckCircleIcon aria-hidden="true" className="h-5 w-5 text-[#5ab8ff]" />
              <div className="flex-1 pt-0.5 text-sm">
                <p id={`${labelId}-title`} className="text-[14px] font-semibold text-white">
                  Item added to cart
                </p>
                {detail?.name ? (
                  <p className="sr-only">{detail.name}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1 text-white transition hover:text-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30"
              >
                <span className="sr-only">Close notification</span>
                <XMarkIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <a
                href="/cart"
                className="inline-flex h-[30px] items-center rounded-md bg-[#5ab8ff] px-3 py-1 text-[12px] font-semibold text-black shadow-[0_4px_10px_-6px_rgba(56,189,255,0.5)] transition hover:bg-[#74c5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#74c5ff]"
              >
                View Cart
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
