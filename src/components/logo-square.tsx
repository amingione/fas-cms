import clsx from 'clsx';
// Replaced Next.js Image with native img tag for Astro/React
import LogoIcon from '/logo/faslogochroma.webp';

export default function LogoSquare({ size }: { size?: 'sm' | undefined }) {
  return (
    <div
      className={clsx(
        'flex flex-none items-center justify-center border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-black',
        {
          'h-[40px] rounded-xl': !size,
          'h-[30px] rounded-lg': size === 'sm'
        }
      )}
    >
      <img
        src={LogoIcon as unknown as string}
        alt="Logo"
        className={clsx({
          'h-[16px] w-[16px]': !size,
          'h-[10px] w-[10px]': size === 'sm'
        })}
        width={size === 'sm' ? 10 : 16}
        height={size === 'sm' ? 10 : 16}
      />
    </div>
  );
}
