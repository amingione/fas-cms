import clsx from 'clsx';
import Image from 'next/image';
import LogoIcon from '/images/faslogochroma.png';

export default function LogoSquare({ size }: { size?: 'sm' | undefined }) {
  return (
    <div
      className={clsx(
        'flex flex-none items-center justify-center border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-black',
        size === 'sm' ? 'h-[30px] w-[30px] rounded-lg' : 'h-[40px] w-[44px] rounded-xl'
      )}
    >
      <Image
        src={LogoIcon}
        alt="Logo"
        className={clsx(size === 'sm' ? 'h-[10px] w-[10px]' : 'h-[16px] w-[16px]')}
        width={size === 'sm' ? 10 : 16}
        height={size === 'sm' ? 10 : 16}
      />
    </div>
  );
}
