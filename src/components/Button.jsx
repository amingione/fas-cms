import React from 'react';

const Button = ({ href, text, type = 'button', variant = 'primary', onClick, rounded = true }) => {
  const baseStyle = `relative inline-block px-6 py-3 overflow-hidden ${
    rounded ? 'rounded' : 'rounded-none'
  } font-bold font-cyber text-center transition-all duration-300 group`;

  const variants = {
    'swipe-left': 'border border-white text-white',
    'swipe-center': 'border border-white text-white',
    primary: 'bg-primary text-black hover:bg-white hover:text-black',
    outline: 'border border-white text-white hover:bg-primary hover:text-black',
  };

  const className = `${baseStyle} ${variants[variant] || variants.primary}`;

  const overlay = {
    'swipe-left': (
      <span className="absolute inset-0 left-0 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-full z-0" />
    ),
    'swipe-center': (
      <span className="absolute inset-y-0 left-1/2 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-full group-hover:left-0 z-0" />
    ),
  };

  const content = (
    <>
      {overlay[variant]}
      <span className="relative z-10 group-hover:text-black transition-colors duration-300">{text}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={className} onClick={onClick}>
      {content}
    </button>
  );
};


export default Button;