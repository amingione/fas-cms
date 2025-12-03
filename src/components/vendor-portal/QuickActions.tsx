import React from 'react';

const actions = [
  { label: 'Submit New Order', href: '/vendor-portal/orders/new' },
  { label: 'Upload Invoice', href: '/vendor-portal/invoices' },
  { label: 'Send Message', href: '/vendor-portal/messages' },
  { label: 'View Reports', href: '/vendor-portal/analytics' },
  { label: 'Onboarding Guide', href: '/vendor-portal/onboarding' }
];

const QuickActions: React.FC = () => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-5 ">
      <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {actions.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="rounded-lg bg-primary/20 text-primary border border-primary/30 px-3 py-2 text-sm font-semibold hover:bg-primary/30 transition"
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
