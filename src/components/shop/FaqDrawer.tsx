'use client';

import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/24/outline'; // Add this to your import block
import { type Product } from '../../lib/sanity-utils';
import PortableTextRenderer from '../../components/PortableTextRenderer.jsx';

interface Props {
  href?: string;
  title?: string;
  image?: string;
  product?: Product;
}
type FAQEntry = {
  question: string;
  answer: any;
};

type AccordionSectionId = 'faq';

type AccordionSection = {
  id: AccordionSectionId;
  title: string;
  defaultOpen?: boolean;
};

export default function FaqDrawer({ href, title, image, product }: Props = {}) {
  // Extract FAQ entries from product
  let faqEntries: FAQEntry[] = [];

  if (product) {
    const possibleFaqCollections = [
      (product as any)?.faqEntries,
      (product as any)?.faq,
      (product as any)?.faqs,
      (product as any)?.faqList,
      (product as any)?.faqBlocks,
      (product as any)?.faqSection
    ];
    const faqSource = possibleFaqCollections.find(
      (value) => Array.isArray(value) && value.length > 0
    ) as any[] | undefined;
    if (faqSource) {
      faqEntries = faqSource
        .map((entry: any) => {
          const question =
            entry?.question ||
            entry?.title ||
            entry?.prompt ||
            entry?.heading ||
            entry?.label ||
            entry?.q ||
            '';
          if (!question) return null;
          const answer =
            entry?.answer ??
            entry?.response ??
            entry?.a ??
            entry?.content ??
            entry?.body ??
            entry?.copy ??
            entry?.description ??
            entry?.value ??
            null;
          if (!answer) return null;
          return {
            question,
            answer
          } satisfies FAQEntry;
        })
        .filter((entry): entry is FAQEntry => Boolean(entry));
    }
  }
  const [open, setOpen] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggleIndex = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="group rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-white/20 inline-flex items-center"
      >
        FAQ
        <ArrowRightIcon
          className="ml-1 h-5 w-5 transition-transform duration-300 ease-in-out transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
      <Dialog open={open} onClose={setOpen} className="relative z-10">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/70 transition-opacity duration-500 ease-in-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel
                transition
                className="pointer-events-auto relative w-full max-w-lg transform rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl transition duration-500 ease-in-out data-closed:opacity-0 
  sm:duration-500
  sm:data-closed:translate-y-4
  md:data-closed:translate-y-6
  md:translate-y-0
  mobile:fixed mobile:bottom-0 mobile:w-full mobile:rounded-t-2xl mobile:data-closed:translate-y-full"
              >
                <TransitionChild>
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full bg-white/5 p-2 text-white hover:bg-white/10"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </TransitionChild>
                <div className="relative h-full overflow-y-auto p-6 text-white">
                  <div className="space-y-6 pb-16">
                    <div>
                      <div className="relative aspect-square object-contain contain flex pb-10 justify-center bg-black/30 backdrop-blur-sm">
                        {image && (
                          <img
                            src={image}
                            alt={title}
                            className="max-h-[78%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <div className="mt-4 flex items-start justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-white">
                            <span className="sr-only">Details for </span>
                            {title}
                          </h2>
                          <p className="text-sm font-medium text-gray-400">
                            Frequently asked questions
                          </p>
                        </div>
                        <button
                          type="button"
                          className="relative ml-4 flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                          <span className="absolute -inset-1.5" />
                          <QuestionMarkCircleIcon aria-hidden="true" className="size-6" />
                          <span className="sr-only">Favorite</span>
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
                      {faqEntries.map((entry, index) => (
                        <div key={index} className="bg-black/40 backdrop-blur">
                          <button
                            type="button"
                            onClick={() => toggleIndex(index)}
                            className="w-full flex justify-between items-center px-4 py-4 text-left"
                          >
                            <span className="text-white font-semibold">{entry.question}</span>
                            <ArrowRightIcon
                              className={`h-5 w-5 text-white/70 transform transition-transform duration-300 ${
                                openIndex === index ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          {openIndex === index && (
                            <div className="px-4 pb-4 text-sm text-white/90">
                              {entry.answer.type === 'portable' ? (
                                <PortableTextRenderer value={entry.answer.value as any[]} />
                              ) : (
                                <p>{entry.answer.value as string}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
