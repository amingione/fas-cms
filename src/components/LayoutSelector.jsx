import React, { useState, useEffect } from 'react';
import MobileBaseLayout from '../layouts/MobileBaseLayout';
import BaseLayout from '../layouts/BaseLayout.astro'; // Optional: remove if unused

function LayoutSelector({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return isMobile ? <MobileBaseLayout>{children}</MobileBaseLayout> : <>{children}</>;
}

export default LayoutSelector;