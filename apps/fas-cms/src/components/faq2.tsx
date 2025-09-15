import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.15,
        ease: 'easeOut'
      }}
      className={cn(
        'group rounded-lg border-[0.5px] border-gray-200/50 dark:border-gray-800/50',
        'transition-all duration-200 ease-in-out',
        isOpen
          ? 'bg-linear-to-br from-white via-gray-50/50 to-white dark:from-white/5 dark:via-white/2 dark:to-white/5'
          : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4"
      >
        <h3
          className={cn(
            'text-base font-medium transition-colors duration-200 text-left',
            'text-white',
            isOpen && 'text-white/70 dark:text-white'
          )}
        >
          {question}
        </h3>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut'
          }}
          className={cn(
            'p-0.5 rounded-full shrink-0',
            'transition-colors duration-200',
            isOpen ? 'text-primary' : 'text-white/80'
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: {
                  duration: 0.4,
                  ease: [0.04, 0.62, 0.23, 0.98]
                },
                opacity: {
                  duration: 0.25,
                  delay: 0.1
                }
              }
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  duration: 0.3,
                  ease: 'easeInOut'
                },
                opacity: {
                  duration: 0.25
                }
              }
            }}
          >
            <div className="px-6 pb-4 pt-2">
              <motion.p
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut'
                }}
                className="text-sm text-gray-600 dark:text-white/70 leading-relaxed"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Faq02() {
  const faqs: Omit<FAQItemProps, 'index'>[] = [
    {
      question: 'What services do you offer?',
      answer:
        'We specialize in performance upgrades for late‑model domestic platforms (Dodge/Jeep SRT & Hellcat, GM LS/LT, etc.). Services include supercharger and bolt‑on installs, ECU calibration, cylinder head porting, custom fabrication, braking and suspension, diagnostics, and track prep.'
    },
    {
      question: 'How do I book an appointment or request a quote?',
      answer:
        'Use the Schedule page to request a date, or submit a quote request from any product/service page. Our team will confirm timing and details by email or phone.'
    },
    {
      question: 'What are typical lead times?',
      answer:
        'Lead times vary by season and parts availability. Common bolt‑on installs are often completed same day to 1–2 days once parts are on hand. Engine/transmission work, custom fab, and porting require more time. We will provide an estimated timeline before work begins.'
    },
    {
      question: 'Do you tune stock ECUs? Do you offer remote tuning?',
      answer:
        'Yes—most late‑model Dodge/Jeep and GM platforms are supported for calibration. We prefer in‑house dyno/road tuning for best results, but limited remote tuning may be available on a case‑by‑case basis.'
    },
    {
      question: 'Is your work covered by a warranty?',
      answer:
        'All workmanship is backed by our quality guarantee. Manufacturer warranties apply to the parts themselves. We will review warranty terms for your specific job before starting.'
    },
    {
      question: 'Can I bring my own parts?',
      answer:
        'Customer‑supplied parts are accepted case‑by‑case. Parts must be new, authentic, and appropriate for the application. Labor is warrantied for fitment only; we cannot extend part warranties for customer‑supplied components.'
    },
    {
      question: 'Do you ship parts and assemblies?',
      answer:
        'Yes—most items on our store can be shipped within the U.S. Some items (engines, transmissions, or large assemblies) may require freight and additional handling time. Tracking is provided when your order ships.'
    },
    {
      question: 'What is your return and refund policy?',
      answer:
        'Returns are handled per our published policy. Certain items (electrical, custom‑built, special order) may be final sale. Please review the Return & Refund Policy page before purchasing.'
    },
    {
      question: 'How does the core exchange program work?',
      answer:
        'Eligible parts can be purchased with a refundable core deposit. Return your core within the stated window in rebuildable condition and we will process the refund after inspection.'
    },
    {
      question: 'Are your upgrades emissions compliant?',
      answer:
        'Compliance depends on your location and the parts selected. Some products are for off‑road/competition use only. California and CARB‑regulated regions require parts with an EO where applicable. Ask us if you are unsure.'
    },
    {
      question: 'Do you install IGLA Anti‑Theft systems?',
      answer:
        'Yes—we are experienced with IGLA installation and configuration. Installation time varies by platform; contact us with your vehicle details to get a quote and scheduling.'
    },
    {
      question: 'Which payment methods do you accept?',
      answer:
        'We accept major credit/debit cards and bank transfer for larger jobs. Some financing options may be available for qualifying purchases—ask our team for details.'
    },
    {
      question: 'How should I prepare my vehicle for an appointment?',
      answer:
        'Arrive with adequate fuel (as instructed), remove personal items from the cabin and trunk, and bring all keys. If the visit involves tuning, ensure the vehicle is in good mechanical condition (no misfires or fluid leaks).'
    },
    {
      question: 'Where can I find your address and hours?',
      answer:
        'Visit the Contact page for our current address, hours, and the best ways to reach us.'
    }
  ];

  return (
    <section className="py-16 w-full bg-linear-to-b from-transparent via-gray-50/50 to-transparent dark:from-transparent dark:via-white/[0.02] dark:to-transparent">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl font-semibold mb-3 bg-linear-to-r from-gray-100 via-gray-200 to-gray-400 font-ethno dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-sm font-ethno text-white/80 dark:text-white/80">
            Everything you need to know about our platform
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={cn('max-w-md mx-auto mt-12 p-6 rounded-lg text-center')}
        >
          <div className="inline-flex items-center justify-center p-1.5 rounded-full  mb-4">
            <Mail className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-white/90 mb-1">Still have questions?</p>
          <p className="text-xs text-gray-600 dark:text-white/70 mb-4">We're here to help you</p>
          <a
            href="/contact"
            className={cn(
              'px-4 py-2 text-sm rounded-md',
              'bg-gray-900 dark:bg-white text-black dark:text-black',
              'hover:bg-gray-800 dark:hover:bg-gray-100',
              'transition-colors duration-200',
              'font-medium'
            )}
          >
            Contact Support
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default Faq02;
