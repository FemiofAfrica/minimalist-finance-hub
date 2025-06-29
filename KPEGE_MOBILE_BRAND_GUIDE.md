# Kpege Mobile App Brand Guide

This comprehensive brand guide ensures visual consistency between the Kpege web application and the new React Native mobile application.

## 📁 Files

- **`brand.ts`** - Complete design system with all tokens, colors, typography, and styling constants
- **`KPEGE_MOBILE_BRAND_GUIDE.md`** - This documentation file

## 🎨 Color Palette

### Primary Brand Colors
- **Main Green**: `#15803D` - Primary brand color used for CTAs, headers, and key UI elements
- **Light Green Background**: `#E8F1DF` - Used in cards, email templates, and subtle backgrounds
- **Secondary Orange**: `#FF5C35` - Accent color for highlights and secondary actions

### Chart Colors (Critical for Financial Data)
```typescript
chart: {
  income: '#22C55E',    // Green for income bars/data
  expense: '#EF4444',   // Red for expense bars/data  
  net: '#8B5CF6',       // Purple for net bars (MUST be different from income)
}
```

> ⚠️ **Important**: Income and net colors must never be the same for clear visual distinction in financial charts.

### Semantic Colors
- **Success**: `#22C55E` (matches income green)
- **Error**: `#EF4444` (matches expense red)
- **Warning**: `#F59E0B`
- **Info**: `#3B82F6`

## 🔤 Typography

### Font Families
- **Primary**: `Open Sans` - Used for body text, descriptions, and general content
- **Headings**: `Montserrat` - Used for titles, headers, and emphasis
- **Monospace**: `JetBrains Mono` - Used for code, numbers, and data display

### Font Sizes (React Native)
```typescript
fontSize: {
  xs: 12,     // Small text, captions
  sm: 14,     // Secondary text
  base: 16,   // Body text (default)
  lg: 18,     // Slightly larger text
  xl: 20,     // Subheadings
  '2xl': 24,  // Section headers
  '3xl': 30,  // Page titles
  '4xl': 36,  // Large titles
  '5xl': 48,  // Hero text
  '6xl': 60,  // Display text
}
```

### Font Weights
- **Light**: `300` - Subtle text
- **Normal**: `400` - Body text
- **Medium**: `500` - Slightly emphasized
- **Semibold**: `600` - Section headers
- **Bold**: `700` - Important headings

## 📐 Spacing System

Based on 4px units for consistent spacing:

```typescript
Spacing = {
  xs: 4,      // Tight spacing
  sm: 8,      // Small gaps
  md: 16,     // Standard spacing
  lg: 24,     // Large spacing
  xl: 32,     // Extra large spacing
  '2xl': 40,  // Section spacing
  '3xl': 48,  // Major spacing
  '4xl': 64,  // Large sections
}
```

### Specific Use Cases
- **Card Padding**: `16px`
- **Section Padding**: `24px`
- **Screen Padding**: `20px`
- **Button Padding**: `12px`
- **Input Padding**: `12px`

## 🔘 Border Radius

```typescript
BorderRadius = {
  sm: 4,       // Small elements
  DEFAULT: 8,  // Standard radius
  md: 12,      // Cards, larger elements
  lg: 16,      // Modals, containers
  xl: 24,      // Large containers
  full: 9999,  // Circular elements
}
```

## 🌫️ Shadows & Elevation

iOS-style shadows with Android elevation support:

```typescript
// Example: Default shadow
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2, // Android
}
```

Available: `sm`, `DEFAULT`, `md`, `lg`, `xl`

## 🎯 Component Styles

### Buttons
```typescript
// Primary Button
{
  backgroundColor: Colors.primary.DEFAULT,
  borderRadius: BorderRadius.button,
  paddingVertical: 12,
  paddingHorizontal: 24,
  ...Shadows.sm,
}

// Secondary Button  
{
  backgroundColor: 'transparent',
  borderColor: Colors.primary.DEFAULT,
  borderWidth: 2,
  borderRadius: BorderRadius.button,
  paddingVertical: 12,
  paddingHorizontal: 24,
}
```

### Cards
```typescript
// Standard Card
{
  backgroundColor: Colors.background.tertiary,
  borderRadius: BorderRadius.card,
  padding: Spacing.cardPadding,
  ...Shadows.DEFAULT,
}
```

### Inputs
```typescript
// Default Input
{
  backgroundColor: Colors.background.primary,
  borderColor: Colors.border.DEFAULT,
  borderWidth: 1,
  borderRadius: BorderRadius.input,
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontSize: Typography.fontSize.base,
}
```

## 📱 Layout Constants

```typescript
Layout = {
  // Common dimensions
  buttonHeight: 48,
  inputHeight: 48,
  listItemHeight: 60,
  avatarSize: 40,
  iconSize: 24,
  
  // Header heights
  header: {
    height: 60,
    heightLarge: 80,
  },
  
  // Tab bar
  tabBar: {
    height: 80,
    paddingBottom: 20, // Safe area
  },
}
```

## 🌙 Theme Support

### Light Theme
- Background: `#FFFFFF`
- Text: `#333333`
- Surface: `#F8FAFC`
- Primary: `#15803D`

### Dark Theme
- Background: `#0F172A`
- Text: `#FFFFFF`
- Surface: `#1E293B`
- Primary: `#4ADE80` (lighter for contrast)

## 🏷️ Brand Assets

### Logo Usage
- **Light backgrounds**: Use `/kpege-logo.svg`
- **Dark backgrounds**: Use `/kpege-logo-light.svg`
- **Main brand**: Use `/main-kpege-logo.svg`

### Brand Information
- **App Name**: "Kpege Finance"
- **Tagline**: "Smart Finance Management"
- **Description**: "Take control of your finances with smart budgeting, expense tracking, and financial insights."

## 🔧 Usage Examples

### Import the Design System
```typescript
import { 
  Colors, 
  Typography, 
  Spacing, 
  Shadows, 
  Components,
  getColor,
  getSpacing 
} from '@/brand';
```

### Using Colors
```typescript
// Direct usage
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderColor: Colors.border.DEFAULT,
  },
  
  primaryButton: {
    backgroundColor: Colors.primary.DEFAULT,
    color: Colors.text.inverse,
  },
  
  incomeText: {
    color: Colors.chart.income, // Green
  },
  
  expenseText: {
    color: Colors.chart.expense, // Red
  },
  
  netText: {
    color: Colors.chart.net, // Purple
  },
});

// Using utility functions
const dynamicColor = getColor('primary.DEFAULT', 'light');
```

### Using Typography
```typescript
const textStyles = StyleSheet.create({
  heading: {
    fontFamily: Typography.fontFamily.heading,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.tight,
  },
  
  body: {
    fontFamily: Typography.fontFamily.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.lineHeight.normal,
  },
});
```

### Using Spacing
```typescript
const layoutStyles = StyleSheet.create({
  container: {
    padding: Spacing.screenPadding,
    marginBottom: Spacing.lg,
  },
  
  card: {
    padding: Spacing.cardPadding,
    marginVertical: Spacing.sm,
  },
});

// Using utility function
const dynamicSpacing = getSpacing('xl');
```

### Using Component Styles
```typescript
const buttonStyles = StyleSheet.create({
  primary: {
    ...Components.button.primary,
  },
  
  secondary: {
    ...Components.button.secondary,
  },
});
```

### Using Shadows
```typescript
const cardStyles = StyleSheet.create({
  elevated: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.card,
    ...Shadows.lg,
  },
});
```

## 🎨 Financial Chart Guidelines

When creating financial charts in the mobile app:

1. **Always use these specific colors**:
   - Income: `Colors.chart.income` (`#22C55E`)
   - Expenses: `Colors.chart.expense` (`#EF4444`)
   - Net: `Colors.chart.net` (`#8B5CF6`)

2. **Never use the same color** for income and net data
3. **Background**: Use `Colors.chart.background` for chart backgrounds
4. **Grid lines**: Use `Colors.chart.gridLines`
5. **Chart text**: Use `Colors.chart.text`

## 📐 Responsive Design

### Breakpoints
```typescript
breakpoints: {
  sm: 640,   // Small tablets
  md: 768,   // Tablets
  lg: 1024,  // Large tablets
  xl: 1280,  // Desktop (if supporting)
}
```

### Safe Areas
Always account for safe areas on iOS devices:
- Use `paddingTop: Layout.tabBar.paddingBottom` for bottom tabs
- Add safe area padding for headers and content

## ✨ Animation Guidelines

### Timing
- **Fast**: 150ms - Micro-interactions, hover states
- **Normal**: 300ms - Standard transitions, modals
- **Slow**: 500ms - Page transitions, complex animations

### Usage
```typescript
// React Native Animated
Animated.timing(animatedValue, {
  ...Animation.timing.normal,
  toValue: 1,
}).start();
```

## 🔍 Accessibility

### Color Contrast
All color combinations meet WCAG AA standards:
- Text on backgrounds has minimum 4.5:1 contrast ratio
- Large text has minimum 3:1 contrast ratio

### Touch Targets
- Minimum touch target: 44x44 points (iOS) / 48x48 dp (Android)
- Use `Layout.buttonHeight` and `Layout.inputHeight` for consistent sizing

## 🚀 Implementation Checklist

- [ ] Install and configure custom fonts (Open Sans, Montserrat)
- [ ] Set up the brand.ts file in your project
- [ ] Configure TypeScript paths for easy imports
- [ ] Create theme provider for light/dark mode support
- [ ] Implement consistent component library using brand tokens
- [ ] Set up chart components with correct financial colors
- [ ] Test color contrast ratios for accessibility
- [ ] Implement safe area handling for iOS
- [ ] Set up animation configurations
- [ ] Create style guide documentation for your team

## 📚 Additional Resources

- [Kpege Web App Repository](link-to-repo) - Reference implementation
- [React Native Design Guidelines](https://reactnative.dev/docs/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://material.io/design)

---

**Need Help?** This brand guide ensures your mobile app maintains the same professional, consistent look and feel as the Kpege web application. Follow these guidelines to create a seamless user experience across platforms. 