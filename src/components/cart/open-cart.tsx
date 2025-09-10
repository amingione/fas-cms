import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function OpenCart({
  className,
  quantity
}: {
  className?: string;
  quantity?: number;
}) {
  const count = typeof quantity === 'number' ? Math.max(0, quantity) : 0;

  return (
    <div
      className={clsx(
        'relative flex h-11 w-11 items-center justify-center rounded-fx-md text-white transition-colors rounded-full hover:bg-white/10',
        className
      )}
    >
      <ShoppingCartIcon className="h-5 w-5 bg-white/10 text-white/90 transition-all ease-in-out group-hover:scale-110" />

      {count > 0 && (
        <div className="absolute right-0 top-0 -mr-2 -mt-2 flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-primary text-[11px] font-bold text-accent shadow">
          {count}
        </div>
      )}
    </div>
  );
}
