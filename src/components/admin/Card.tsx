import React from 'react';
export default function Card({
  title,
  value,
  hint
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-white/80 mt-2">{hint}</div>}
    </div>
  );
}
