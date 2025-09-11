import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

type SidebarState = {
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  setExpanded: (v: boolean) => void;
  setHovered: (v: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

const SidebarCtx = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setExpanded] = useState<boolean>(true);
  const [isHovered, setHovered] = useState<boolean>(false);
  const [isMobileOpen, setMobileOpen] = useState<boolean>(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      isExpanded,
      isHovered,
      isMobileOpen,
      setExpanded,
      setHovered,
      openMobile,
      closeMobile,
      toggleMobile,
    }),
    [isExpanded, isHovered, isMobileOpen, openMobile, closeMobile, toggleMobile]
  );

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export default SidebarProvider;

