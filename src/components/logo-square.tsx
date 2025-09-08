import clsx from 'clsx';
import Image from 'next/image';
import LogoIcon from '/images/faslogochroma.png';

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
      <Image
        src={LogoIcon}
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
