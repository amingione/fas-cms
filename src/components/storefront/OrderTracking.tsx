import * as React from 'react';

type TrackingEvent = {
  status?: string;
  message?: string;
  location?: string;
  timestamp?: string;
};

type Fulfillment = {
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  service?: string;
  estimatedDelivery?: string;
  trackingEvents?: TrackingEvent[];
};

const statusIcons: Record<string, string> = {
  unfulfilled: '📦',
  processing: '⏳',
  label_created: '🏷️',
  shipped: '📮',
  in_transit: '🚚',
  out_for_delivery: '📬',
  delivered: '✅',
  exception: '⚠️'
};

export function OrderTracking({ fulfillment }: { fulfillment: Fulfillment }) {
  return (
    <div className="tracking space-y-4">
      <div className="status flex items-center gap-2 text-lg font-semibold">
        <span className="icon text-xl">{statusIcons[fulfillment.status] || '📦'}</span>
        <span className="label">{fulfillment.status.replace('_', ' ').toUpperCase()}</span>
      </div>

      {fulfillment.trackingNumber && (
        <div className="tracking-info text-sm space-y-1">
          <p>Tracking: {fulfillment.trackingNumber}</p>
          <p>
            {fulfillment.carrier} {fulfillment.service}
          </p>
          {fulfillment.trackingUrl && (
            <a href={fulfillment.trackingUrl} target="_blank" rel="noreferrer" className="text-primary">
              Track Package →
            </a>
          )}
        </div>
      )}

      {fulfillment.estimatedDelivery && (
        <p className="text-sm">Estimated Delivery: {new Date(fulfillment.estimatedDelivery).toLocaleDateString()}</p>
      )}

      {fulfillment.trackingEvents?.length ? (
        <div className="tracking-timeline space-y-3">
          <h4 className="font-semibold">Tracking History</h4>
          {fulfillment.trackingEvents.map((event, i) => (
            <div key={`${event.timestamp}-${i}`} className="event text-sm space-y-0.5 border-l pl-3">
              <span className="block text-xs text-gray-500">
                {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
              </span>
              <span className="block font-medium">{event.message || event.status}</span>
              {event.location && <span className="block text-gray-600">{event.location}</span>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default OrderTracking;
