'use client';

import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon as SolidIcon } from '@heroicons/react/20/solid';
import { ExclamationTriangleIcon as OutlineIcon } from '@heroicons/react/24/outline';
import PortableTextRenderer from '@/components/PortableTextRenderer.jsx';

type ImportantNotesDescriptor =
  | { type: 'portable'; value: any[]; field?: string }
  | { type: 'text'; value: string; field?: string };

type ServiceDisclaimerNoticeProps = {
  message: string;
  title?: string;
  importantNotes?: ImportantNotesDescriptor | null;
};

const renderImportantNotes = (descriptor?: ImportantNotesDescriptor | null) => {
  if (!descriptor) return null;
  if (descriptor.type === 'portable') {
    return <PortableTextRenderer value={descriptor.value} />;
  }
  return <p className="leading-relaxed">{descriptor.value}</p>;
};

export default function ServiceDisclaimerNotice({
  message,
  title = 'Professional installation required',
  importantNotes
}: ServiceDisclaimerNoticeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasImportantNotes = Boolean(importantNotes);

  return (
    <>
      <div className="rounded-xl border border-amber-500/40 bg-black/40 p-3 text-xs sm:p-4 sm:text-sm shadow-md backdrop-blur">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="shrink-0">
            <SolidIcon aria-hidden="true" className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" />
          </div>
          <div className="flex-1 text-amber-100 flex items-start">
            <p className="m-0 inline-flex flex-row flex-wrap items-center gap-2 w-full">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="btn-plain font-italic text-8px px-2 border border-amber-400/40 bg-amber-400/10 text-amber-200 transition hover:bg-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
              >
                Learn more
              </button>
              {hasImportantNotes && (
                <span className="text-[0.6rem] uppercase tracking-wide text-amber-300/80 sm:text-xs">
                  Important information
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onClose={setIsOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm transition duration-300 data-[closed]:opacity-0" />

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <DialogPanel className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-black/80 px-4 pt-5 pb-4 text-left shadow-2xl backdrop-blur transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[enter]:ease-out data-[leave]:duration-200 data-[leave]:ease-in sm:my-8 sm:px-6 sm:py-5 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 sm:mx-0 sm:h-10 sm:w-10">
                  <OutlineIcon aria-hidden="true" className="h-6 w-6 text-amber-300" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" className="text-base font-semibold text-white">
                    {title}
                  </DialogTitle>
                  <div className="mt-2 space-y-4">
                    <p className="text-sm leading-relaxed text-white/80">{message}</p>
                    {hasImportantNotes && (
                      <div className="rounded-xl border border-amber-500/30 bg-[#140e05] px-4 py-3 text-sm text-amber-100 shadow-inner">
                        {renderImportantNotes(importantNotes)}
                      </div>
                    )}
                    <p className="text-xs text-white/60">
                      Vehicle drop-off at F.A.S. Motorsports is required for all install-only
                      offerings. Our team will confirm scheduling, lead times, and optional upgrades
                      after checkout.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 sm:w-auto"
                >
                  Close
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
