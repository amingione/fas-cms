import React, { useState, useEffect } from 'react';
import MobileBaseLayout from '../layouts/MobileBaseLayout';

function LayoutSelector({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return isMobile ? <MobileBaseLayout>{children}</MobileBaseLayout> : <>{children}</>;
}

export default LayoutSelector;
