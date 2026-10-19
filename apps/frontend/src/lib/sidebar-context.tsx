'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isOpen: boolean;            // Mobile drawer state
  isCollapsed: boolean;       // Desktop collapsed/hidden state
  toggleSidebar: () => void;  // Toggles mobile drawer or desktop collapse based on screen
  toggleCollapse: () => void; // Desktop collapse toggle
  closeMobile: () => void;    // Close mobile drawer
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  toggleSidebar: () => {},
  toggleCollapse: () => {},
  closeMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Load saved desktop preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aegis_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    // If mobile screen, toggle mobile drawer
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen((prev) => !prev);
    } else {
      // On desktop, toggle collapse
      setIsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('aegis_sidebar_collapsed', String(next));
        } catch (e) {}
        return next;
      });
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aegis_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const closeMobile = () => setIsOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        toggleSidebar,
        toggleCollapse,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
