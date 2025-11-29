/**
 * Responsive Design Utilities
 * 
 * Helpers for responsive design and mobile detection
 */

import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Get responsive grid columns based on screen size
 */
export function getResponsiveGridCols(count: number): string {
  // Mobile: 1 column
  // Tablet: 2 columns
  // Desktop: full count
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2';
  if (count <= 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}

/**
 * Hook to get responsive values
 */
export function useResponsive() {
  const isMobileDevice = useIsMobile();
  
  return {
    isMobile: isMobileDevice,
    isTablet: !isMobileDevice && typeof window !== 'undefined' && window.innerWidth < 1024,
    isDesktop: typeof window !== 'undefined' && window.innerWidth >= 1024,
    gridCols: (count: number) => getResponsiveGridCols(count),
  };
}

/**
 * Responsive breakpoints (matching Tailwind)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Check if current width is above a breakpoint
 */
export function isAboveBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

