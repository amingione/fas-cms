import clsx from 'clsx';

/**
 * LoadingDots — FAS theme
 *
 * Animated ellipsis dots used for buttons/checkout loaders.
 * Uses Tailwind keyframes `animate-bounce` style stagger.
 */

const dotBase = 'mx-[1px] inline-block h-2 w-2 rounded-full bg-current opacity-70';

export default function LoadingDots({ className = 'text-white' }: { className?: string }) {
  return (
    <span className="mx-2 inline-flex items-center">
      <span className={clsx(dotBase, className, 'animate-bounce [animation-delay:0ms]')} />
      <span className={clsx(dotBase, className, 'animate-bounce [animation-delay:150ms]')} />
      <span className={clsx(dotBase, className, 'animate-bounce [animation-delay:300ms]')} />
    </span>
  );
}
