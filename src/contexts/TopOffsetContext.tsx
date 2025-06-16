import React, { createContext, useContext, useEffect, useState } from 'react';

interface TopOffsetContextValue {
  topOffset: number; // pixels
}

// Helper to read CSS variable --banner-offset from the <body>
function readBannerOffset(): number {
  if (typeof window === 'undefined') return 0;
  const bodyStyles = getComputedStyle(document.body);
  const raw = bodyStyles.getPropertyValue('--banner-offset').trim();
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// In the future we may include env(safe-area-inset-top) via visual viewport API.
function getCurrentOffset(): number {
  return readBannerOffset();
}

const TopOffsetContext = createContext<TopOffsetContextValue>({ topOffset: 0 });

export const TopOffsetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topOffset, setTopOffset] = useState<number>(() => getCurrentOffset());

  useEffect(() => {
    const update = () => setTopOffset(getCurrentOffset());

    // Listen for custom event dispatched by SupportBanner
    document.addEventListener('banner-visibility-change', update);
    // Update on resize/orientation change as safe-area might shift
    window.addEventListener('resize', update);

    return () => {
      document.removeEventListener('banner-visibility-change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <TopOffsetContext.Provider value={{ topOffset }}>
      {children}
    </TopOffsetContext.Provider>
  );
};

export const useTopOffset = (): number => {
  const ctx = useContext(TopOffsetContext);
  return ctx.topOffset;
}; 