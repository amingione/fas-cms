import { useMemo, useState } from 'react';

type FAQItem = {
  category: string;
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    category: 'Account',
    question: 'How do I reset my password?',
    answer:
      'Click "Forgot Password" on the login page, enter your email, and follow the reset link. If you were invited, the reset link also arrives in your setup email.'
  },
  {
    category: 'Account',
    question: 'Can multiple team members access the portal?',
    answer:
      'Yes. Add users under Settings → Team. Assign roles for ordering, invoicing, or analytics-only access.'
  },
  {
    category: 'Orders',
    question: 'Where can I see order status updates?',
    answer:
      'Go to Orders → select an order. Status badges show Pending, In Production, Shipped, or Complete, and you can subscribe to alerts per order.'
  },
  {
    category: 'Orders',
    question: 'How do I reorder from history?',
    answer:
      'Open any completed order and click "Reorder". You can adjust quantities before submitting.'
  },
  {
    category: 'Inventory',
    question: 'What file type should I use for bulk inventory updates?',
    answer:
      'Use the CSV template in Documents & Resources. Include SKU, availableQty, backorderQty, and leadTimeDays.'
  },
  {
    category: 'Invoices',
    question: 'Which formats do you accept for invoices?',
    answer: 'We support PDF, PNG, JPG, and XLSX uploads. PDFs are preferred for clarity.'
  },
  {
    category: 'Payments',
    question: 'What are your payment terms?',
    answer:
      'Standard terms are Net 30 unless otherwise stated in your agreement. Payment status is visible on each invoice card.'
  },
  {
    category: 'Communication',
    question: 'How quickly does the team respond to messages?',
    answer:
      'During business hours we target responses within 2 hours. Mark a message as Priority to flag time-sensitive items.'
  },
  {
    category: 'Analytics',
    question: 'Can I export reports?',
    answer:
      'Yes. Use Analytics → Exports to download CSV or XLSX files for your selected date range.'
  },
  {
    category: 'Support',
    question: 'Where do I get live help?',
    answer:
      'Email vendors@fasmotorsports.com or call (812) 200-9012 during business hours. For quick questions, start a Portal Message from Communication.'
  }
];

export default function FAQ() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(faqs.map((faq) => faq.category)))],
    []
  );

  const filtered = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = category === 'All' || faq.category === category;
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
        <label className="text-black relative">
          <span className="sr-only text-black">Search FAQs</span>
          <input
            type="search"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 text-black"
          />
          <span className="pointer-events-none absolute right-3 top-3 text-black text-xs">
            Cmd/Ctrl+K
          </span>
        </label>
        <label className="text-black block">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No answers yet. Try a different search or contact support.
          </div>
        )}

        {filtered.map((faq, i) => {
          const isOpen = expanded === i;
          return (
            <div
              key={`${faq.question}-${i}`}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full text-left px-4 py-3 font-semibold flex justify-between items-center text-white hover:bg-primary/5 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {faq.category}
                  </span>
                  <span>{faq.question}</span>
                </div>
                <span className="text-xl text-primary">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-gray-300 text-sm leading-relaxed">{faq.answer}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
