# PBI-6: Global Layout & Spacing Optimisation

## Overview
Unify safe-area, banner, and header spacing across the entire application so no element is ever hidden and visual hierarchy feels consistent.

## Problem Statement
SupportBanner (fixed top) + device safe-area insets + various layout-specific paddings have grown organically. This leads to overlaps (e.g., Dashboard sidebar, content behind banner). We need a single authoritative spacing system.

## User Stories
*As a finance-app user* I want every screen to show its content clearly without being covered by banners, sidebars, or browser chrome so that the experience feels professional on every device.

## Technical Approach
1. Create a small React context / hook that exposes `topOffset = safeAreaInsetTop + bannerHeight` (banner can toggle visibility).
2. Expose a CSS utility for non-React contexts (e.g., auth pages already handled).
3. Refactor top-level layouts (DashboardLayout, SettingsLayout, etc.) to consume the helper instead of bespoke inline styles.

## UX/UI Considerations
• Must work in both light/dark themes.  
• Adds smooth transitions when banner appears/disappears.

## Acceptance Criteria
1. No overlap of banner with any sidebar/header on mobile & desktop.  
2. Public pages continue to respect safe-area.  
3. Automated Lighthouse audit shows no "content not visible" issues.

## Dependencies
Relies on existing `SupportBanner` height constant.

## Related Tasks
See tasks.md 