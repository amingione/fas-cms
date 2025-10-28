import React from 'react';

/**
 * @typedef {"sm" | "md" | "lg" | "default"} ButtonSize
 */

/**
 * @typedef {Object} ButtonProps
 * @property {string} [href]
 * @property {React.ReactNode} [text]
 * @property {React.ReactNode} [children]
 * @property {string} [className]
 * @property {ButtonSize} [size]
 * @property {function} [onClick]
 */

/**
 * Button component
 */
export default function Button({
  href,
  text,
  children,
  className = '',
  size = 'md',
  onClick,
  ...rest
}) {
  /** @type {{[key in ButtonSize]: string}} */
  const sizeMap = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  const baseClasses =
    'relative inline-flex fas-label items-center justify-center overflow-hidden font-cyber-italic text-white transition-all duration-300 rounded-fx-md border-2 border-white group tracking-wide shadow-fx-xs';

  const normalizedSize = size === 'default' ? 'md' : size;
  const classes = [baseClasses, sizeMap[normalizedSize] || sizeMap.md, className].join(' ').trim();
  const content = children ?? text ?? '';

  const innerContent = (
    <>
      <span className="absolute inset-0 w-full h-full transform scale-x-0 origin-left bg-white transition-transform duration-300 group-hover:scale-x-100"></span>
      <span className="relative flex items-center space-x-2 group-hover:text-primary">
        <span>{content}</span>
        <svg
          className="w-5 h-5 transition-transform duration-300 transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {innerContent}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes} {...rest}>
      {innerContent}
    </button>
  );
}
