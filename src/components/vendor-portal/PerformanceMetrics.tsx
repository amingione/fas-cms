import React from 'react';

type MetricProps = {
  onTimeDelivery?: number;
  fulfillmentRate?: number;
  responseTimeHours?: number;
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
    <p className="text-xl font-bold text-white mt-1">{value}</p>
  </div>
);

const PerformanceMetrics: React.FC<MetricProps> = ({
  onTimeDelivery = 0.96,
  fulfillmentRate = 0.98,
  responseTimeHours = 4
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="On-time delivery" value={`${Math.round(onTimeDelivery * 100)}%`} />
      <MetricCard label="Fulfillment rate" value={`${Math.round(fulfillmentRate * 100)}%`} />
      <MetricCard label="Avg response time" value={`${responseTimeHours.toFixed(1)} hrs`} />
    </div>
  );
};

export default PerformanceMetrics;
