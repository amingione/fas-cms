'use client';
import { ChevronDoubleDownIcon } from '@heroicons/react/20/solid';

export default function LeftLabel() {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-2 bg-gray-900 pr-3 text-sm text-gray-400">
        Continue
        <ChevronDoubleDownIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div aria-hidden="true" className="flex-1 border-t border-white/15" />
    </div>
  );
}
