import React from 'react';

type FAQ = { question: string; answer: string };

const HelpCenter: React.FC<{ faqs: FAQ[] }> = ({ faqs }) => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Help Center</h1>
      <div className="rounded-lg border border-white/10 bg-white/5 divide-y divide-white/10">
        {faqs.map((faq, idx) => (
          <div key={idx} className="p-4">
            <p className="text-sm font-semibold text-white">{faq.question}</p>
            <p className="text-sm text-white/70 mt-1 whitespace-pre-wrap">{faq.answer}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Need more help? Send a message from the Messages tab and our team will respond.
      </div>
    </div>
  );
};

export default HelpCenter;
