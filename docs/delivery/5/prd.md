# PBI-5: Safe-Area Display Fix for Public Pages

## Overview
Certain public pages (Sign-in, Sign-up, Reset-password, etc.) can be partially hidden under the browser's status-bar / notch on some devices, leading to a poor first-impression and making controls inaccessible.

## Problem Statement
When viewed on devices with a safe-area inset (e.g. iPhone with notch, Android with status-bar), the top of the page—including the logo and heading—can be covered because our layouts don't reserve `env(safe-area-inset-top)` space.

## User Stories
*As a finance app user* I want every public page to respect the safe-area so that no content is hidden by the system UI and the app looks polished on all devices.

## Technical Approach
1. Add a global CSS helper (`.safe-top`) that applies `padding-top: env(safe-area-inset-top)`.
2. Apply this helper to the outer wrapper in `PublicLayout`.
3. Regression-test Dashboard layout (banner + sidebar) to ensure no conflict.

## UX/UI Considerations
• Change must be invisible on desktop and non-notch devices (env() resolves to 0).  
• Should not introduce extra blank space where the support banner already adjusts padding.

## Acceptance Criteria
1. On iPhone notch devices (Safari) the Kpege logo and headings are fully visible on Sign-in, Sign-up, Reset-password pages.  
2. Same pages on desktop / non-notch mobile show no excess blank space.  
3. Dashboard pages remain visually unchanged.

## Dependencies
None

## Open Questions
* None at this time.

## Related Tasks
Will be listed in `tasks.md`. 