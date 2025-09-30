import clsx from 'clsx';
import Price from '@components/storefront/Price.tsx';

const Label = ({
  title,
  amount,
  currencyCode = 'USD',
  position = 'bottom',
  showPrice = true
}: {
  title: string;
  amount: number;
  currencyCode?: string;
  position?: 'bottom' | 'center';
  showPrice?: boolean;
}) => {
  return (
    <div
      className={clsx('absolute bottom-0 left-0 flex w-full px-6 pb-6 @container/label', {
        'lg:px-20 lg:pb-[35%]': position === 'center'
      })}
    >
      <div className="flex max-w-[88%] items-center gap-3 min-h-[48px] rounded-full border bg-black/20 px-3 py-2 text-sm font-semibold text-white/70 backdrop-blur-md shadow-inner shadow-white/20">
        <h3 className="min-w-0 flex-1 mr-2 pl-1 text-sm leading-snug tracking-tight overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
          {title}
        </h3>
        {showPrice && (
          <Price
            className="flex-none font-bold text-base rounded-full bg-primary px-3 py-1.5 text-black"
            amount={amount}
            currencyCode={currencyCode}
            currencyCodeClassName="hidden @[275px]/label:inline"
          />
        )}
      </div>
    </div>
  );
};

export default Label;
