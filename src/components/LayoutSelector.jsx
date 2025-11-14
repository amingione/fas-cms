import React, { useState, useEffect } from 'react';
import MobileBaseLayout from '../layouts/MobileBaseLayout';
import MobileAddToCartToast from './cart/MobileAddToCartToast';
import DesktopAddToCartToast from './cart/DesktopAddToCartToast';

function LayoutSelector({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const content = isMobile ? <MobileBaseLayout>{children}</MobileBaseLayout> : <>{children}</>;

  return (
    <>
      {content}
      <MobileAddToCartToast />
      <DesktopAddToCartToast />
    </>
  );
}

export default LayoutSelector;
