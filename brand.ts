/**
 * Kpege Brand Design System
 * 
 * This file contains all design tokens, colors, typography, spacing, and styling
 * constants for the Kpege mobile application to ensure consistency with the web app.
 * 
 * Usage:
 * import { Colors, Typography, Spacing, Shadows, etc. } from '@/brand';
 */

// ============================================================================
// COLORS
// ============================================================================

export const Colors = {
  // Primary Brand Colors
  primary: {
    50: '#E8F1DF',   // Light green background (used in emails/cards)
    100: '#93E3A3',  // Lighter green
    200: '#6EE787',  // Light green
    DEFAULT: '#15803D', // Main Kpege green (primary brand color)
    600: '#166534',  // Darker green
    700: '#14532D',  // Even darker green
    800: '#12805D',  // Alternative primary from App.css
    900: '#0F5132',  // Darkest green
    950: '#0C3A22',  // Deepest green
  },

  // Secondary Colors
  secondary: {
    DEFAULT: '#FF5C35', // Orange secondary color
    light: '#FF7A5A',
    dark: '#E5441F',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    DEFAULT: '#22C55E', // Income green (charts)
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    DEFAULT: '#EF4444', // Expense red (charts)
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    DEFAULT: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    DEFAULT: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Chart-specific colors
  chart: {
    income: '#22C55E',      // Green for income bars
    expense: '#EF4444',     // Red for expense bars
    net: '#8B5CF6',         // Purple for net bars (must be different from income)
    background: '#F8FAFC',
    gridLines: '#E2E8F0',
    text: '#64748B',
  },

  // Neutral/Gray Scale
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Text Colors
  text: {
    primary: '#333333',     // Main text color
    secondary: '#666666',   // Secondary text
    tertiary: '#888888',    // Lighter text
    muted: '#94A3B8',      // Muted text
    inverse: '#FFFFFF',     // White text
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',     // Main background
    secondary: '#F9FAFB',   // Alternative background
    tertiary: '#F8FAFC',    // Card backgrounds
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  },

  // Border Colors
  border: {
    light: '#E2E8F0',
    DEFAULT: '#CBD5E1',
    dark: '#94A3B8',
  },

  // Status Colors (for notifications, badges, etc.)
  status: {
    online: '#10B981',
    offline: '#6B7280',
    pending: '#F59E0B',
    error: '#EF4444',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const Typography = {
  // Font Families
  fontFamily: {
    primary: 'Open Sans',           // Main font for body text
    heading: 'Montserrat',          // Font for headings
    mono: 'JetBrains Mono',         // Monospace font
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Font Sizes (in px for React Native)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// ============================================================================
// SPACING & SIZING
// ============================================================================

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Spacing scale
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,

  // Specific use-case spacing
  cardPadding: 16,
  sectionPadding: 24,
  screenPadding: 20,
  buttonPadding: 12,
  inputPadding: 12,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const BorderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999, // For circular elements
  
  // Specific use-cases
  button: 8,
  card: 12,
  input: 8,
  modal: 16,
} as const;

// ============================================================================
// SHADOWS & ELEVATION
// ============================================================================

export const Shadows = {
  // iOS-style shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  DEFAULT: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// ============================================================================
// COMPONENT STYLES
// ============================================================================

export const Components = {
  // Button Styles
  button: {
    primary: {
      backgroundColor: Colors.primary.DEFAULT,
      borderRadius: BorderRadius.button,
      paddingVertical: Spacing.buttonPadding,
      paddingHorizontal: Spacing.lg,
      ...Shadows.sm,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: Colors.primary.DEFAULT,
      borderWidth: 2,
      borderRadius: BorderRadius.button,
      paddingVertical: Spacing.buttonPadding,
      paddingHorizontal: Spacing.lg,
    },
    destructive: {
      backgroundColor: Colors.error.DEFAULT,
      borderRadius: BorderRadius.button,
      paddingVertical: Spacing.buttonPadding,
      paddingHorizontal: Spacing.lg,
      ...Shadows.sm,
    },
  },

  // Card Styles
  card: {
    default: {
      backgroundColor: Colors.background.tertiary,
      borderRadius: BorderRadius.card,
      padding: Spacing.cardPadding,
      ...Shadows.DEFAULT,
    },
    elevated: {
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.card,
      padding: Spacing.cardPadding,
      ...Shadows.lg,
    },
  },

  // Input Styles
  input: {
    default: {
      backgroundColor: Colors.background.primary,
      borderColor: Colors.border.DEFAULT,
      borderWidth: 1,
      borderRadius: BorderRadius.input,
      paddingVertical: Spacing.inputPadding,
      paddingHorizontal: Spacing.md,
      fontSize: Typography.fontSize.base,
      color: Colors.text.primary,
    },
    focused: {
      borderColor: Colors.primary.DEFAULT,
      borderWidth: 2,
      ...Shadows.sm,
    },
    error: {
      borderColor: Colors.error.DEFAULT,
      borderWidth: 1,
    },
  },

  // Modal Styles
  modal: {
    overlay: {
      backgroundColor: Colors.background.overlay,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.screenPadding,
    },
    content: {
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.modal,
      padding: Spacing.sectionPadding,
      width: '100%',
      maxWidth: 400,
      ...Shadows.xl,
    },
  },
} as const;

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const Layout = {
  // Screen dimensions and breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1200,
    maxWidth: 1200,
  },

  // Header heights
  header: {
    height: 60,
    heightLarge: 80,
  },

  // Tab bar
  tabBar: {
    height: 80,
    paddingBottom: 20, // Safe area padding
  },

  // Common dimensions
  buttonHeight: 48,
  inputHeight: 48,
  listItemHeight: 60,
  avatarSize: 40,
  iconSize: 24,
} as const;

// ============================================================================
// ANIMATION & TIMING
// ============================================================================

export const Animation = {
  // Duration in milliseconds
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Easing functions
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },

  // Common animation configs for React Native
  timing: {
    fast: { duration: 150, useNativeDriver: true },
    normal: { duration: 300, useNativeDriver: true },
    slow: { duration: 500, useNativeDriver: true },
  },
} as const;

// ============================================================================
// BRAND ASSETS
// ============================================================================

export const Brand = {
  // Logo configurations
  logo: {
    primary: '/kpege-logo.svg',        // Dark logo for light backgrounds
    light: '/kpege-logo-light.svg',    // Light logo for dark backgrounds
    main: '/main-kpege-logo.svg',      // Main brand logo
  },

  // Brand name and tagline
  name: 'Kpege',
  tagline: 'Smart Finance Management',
  
  // App metadata
  appName: 'Kpege Finance',
  description: 'Take control of your finances with smart budgeting, expense tracking, and financial insights.',
} as const;

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

export const Theme = {
  light: {
    colors: {
      primary: Colors.primary.DEFAULT,
      background: Colors.background.primary,
      surface: Colors.background.tertiary,
      text: Colors.text.primary,
      textSecondary: Colors.text.secondary,
      border: Colors.border.DEFAULT,
      success: Colors.success.DEFAULT,
      error: Colors.error.DEFAULT,
      warning: Colors.warning.DEFAULT,
      info: Colors.info.DEFAULT,
    },
    shadows: Shadows,
  },
  
  dark: {
    colors: {
      primary: Colors.primary[400],
      background: Colors.neutral[900],
      surface: Colors.neutral[800],
      text: Colors.background.primary,
      textSecondary: Colors.neutral[300],
      border: Colors.neutral[700],
      success: Colors.success[400],
      error: Colors.error[400],
      warning: Colors.warning[400],
      info: Colors.info[400],
    },
    shadows: {
      ...Shadows,
      // Adjust shadow opacity for dark theme
      sm: { ...Shadows.sm, shadowOpacity: 0.3 },
      DEFAULT: { ...Shadows.DEFAULT, shadowOpacity: 0.3 },
      md: { ...Shadows.md, shadowOpacity: 0.3 },
      lg: { ...Shadows.lg, shadowOpacity: 0.3 },
      xl: { ...Shadows.xl, shadowOpacity: 0.3 },
    },
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get spacing value by key
 */
export const getSpacing = (size: keyof typeof Spacing): number => {
  return Spacing[size];
};

/**
 * Get color value by path (e.g., 'primary.500', 'text.primary')
 */
export const getColor = (path: string, theme: 'light' | 'dark' = 'light'): string => {
  const parts = path.split('.');
  let value: any = theme === 'light' ? Theme.light.colors : Theme.dark.colors;
  
  // Try theme colors first
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      // Fallback to Colors object
      value = Colors;
      for (const p of parts) {
        if (value && typeof value === 'object' && p in value) {
          value = value[p];
        } else {
          return Colors.primary.DEFAULT; // Fallback color
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : Colors.primary.DEFAULT;
};

/**
 * Create consistent component styles
 */
export const createComponentStyle = (baseStyle: any, variants?: any) => {
  return {
    base: baseStyle,
    variants: variants || {},
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Components,
  Layout,
  Animation,
  Brand,
  Theme,
  getSpacing,
  getColor,
  createComponentStyle,
};

// Type exports for TypeScript
export type ColorPalette = typeof Colors;
export type TypographyConfig = typeof Typography;
export type SpacingConfig = typeof Spacing;
export type ThemeConfig = typeof Theme; 