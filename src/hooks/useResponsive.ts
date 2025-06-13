import { useState, useEffect } from 'react';

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface ResponsiveConfig {
  // Breakpoints
  mobileMaxWidth: number;
  tabletMaxWidth: number;
  
  // Chart heights by device type
  chartHeights: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  
  // Touch interaction settings
  touchSettings: {
    minTouchTarget: number;
    tooltipOffset: number;
    gesturesEnabled: boolean;
  };
}

const DEFAULT_CONFIG: ResponsiveConfig = {
  mobileMaxWidth: 768,
  tabletMaxWidth: 1024,
  chartHeights: {
    mobile: 250,
    tablet: 300,
    desktop: 350
  },
  touchSettings: {
    minTouchTarget: 44,
    tooltipOffset: 10,
    gesturesEnabled: true
  }
};

export const useResponsive = (config: Partial<ResponsiveConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape'
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      isMobile: width <= finalConfig.mobileMaxWidth,
      isTablet: width > finalConfig.mobileMaxWidth && width <= finalConfig.tabletMaxWidth,
      isDesktop: width > finalConfig.tabletMaxWidth,
      orientation: height > width ? 'portrait' : 'landscape'
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isMobile: width <= finalConfig.mobileMaxWidth,
        isTablet: width > finalConfig.mobileMaxWidth && width <= finalConfig.tabletMaxWidth,
        isDesktop: width > finalConfig.tabletMaxWidth,
        orientation: height > width ? 'portrait' : 'landscape'
      });
    };

    // Add resize listener with debouncing for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [finalConfig.mobileMaxWidth, finalConfig.tabletMaxWidth]);

  // Get optimal chart height based on device
  const getChartHeight = (baseHeight?: number): number => {
    if (baseHeight) return baseHeight;
    
    if (screenSize.isMobile) return finalConfig.chartHeights.mobile;
    if (screenSize.isTablet) return finalConfig.chartHeights.tablet;
    return finalConfig.chartHeights.desktop;
  };

  // Get responsive margin/padding values
  const getResponsiveSpacing = () => ({
    chartMargin: screenSize.isMobile 
      ? { top: 5, right: 10, left: 10, bottom: 5 }
      : { top: 5, right: 20, left: 20, bottom: 5 },
    containerPadding: screenSize.isMobile ? '1rem' : '1.5rem',
    cardGap: screenSize.isMobile ? '1rem' : '1.5rem'
  });

  // Get responsive font sizes
  const getResponsiveFontSizes = () => ({
    chartAxis: screenSize.isMobile ? 10 : 12,
    chartTitle: screenSize.isMobile ? '1.1rem' : '1.25rem',
    cardTitle: screenSize.isMobile ? '1.2rem' : '1.5rem',
    tooltipText: screenSize.isMobile ? '0.75rem' : '0.875rem'
  });

  // Check if touch device (for gesture handling)
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  return {
    ...screenSize,
    config: finalConfig,
    getChartHeight,
    getResponsiveSpacing,
    getResponsiveFontSizes,
    isTouchDevice: isTouchDevice()
  };
};

export default useResponsive; 