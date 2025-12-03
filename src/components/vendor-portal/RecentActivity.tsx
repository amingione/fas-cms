import React from 'react';

type ActivityItem = {
  _type?: string;
  _updatedAt?: string;
  status?: string;
  priority?: string;
  subject?: string;
  poNumber?: string;
  invoiceNumber?: string;
  description?: string;
  amount?: number;
};

interface Props {
  activity: ActivityItem[];
}

const labelForType = (type?: string) => {
  switch (type) {
    case 'purchaseOrder':
      return 'Order';
    case 'invoice':
      return 'Invoice';
    case 'vendorMessage':
      return 'Message';
    case 'bill':
      return 'Payment';
    default:
      return 'Update';
  }
};

const RecentActivity: React.FC<Props> = ({ activity }) => {
  if (!activity?.length) {
    return <p className="text-white/70">No recent activity.</p>;
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Recent Activity</h2>
      <ul className="space-y-3">
        {activity.map((item, idx) => (
          <li key={idx} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
            <div>
              <p className="text-sm font-semibold text-white">
                {labelForType(item._type)}{' '}
                {item.poNumber || item.invoiceNumber || item.subject || ''}
              </p>
              <p className="text-xs text-white/60">
                {item.status || item.priority || ''} {item.description ? `• ${item.description}` : ''}
              </p>
            </div>
            <div className="text-right text-xs text-white/60">
              {item._updatedAt ? new Date(item._updatedAt).toLocaleString() : ''}
              {item.amount ? <div className="text-white/80 mt-1">${item.amount.toFixed(2)}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;
