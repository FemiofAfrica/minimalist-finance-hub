# PBI-8: Add Privacy Policy Page and Footer Navigation Links

## Overview
This PBI delivers a dedicated Privacy Policy page and updates the global footer so that users can quickly access legal information (Privacy Policy) and the existing Blog.

## Problem Statement
Users currently have no way to review KPEGE's privacy practices or navigate to the Blog from within the application. Lack of visible privacy information undermines trust and may violate legal requirements.

## User Stories
- **As a finance-app user**, I want to open a clearly labelled Privacy Policy page so that I understand how my data is collected, stored, and used by KPEGE.
- **As a finance-app user**, I want to access the Blog directly from the footer so that I can read articles and updates without searching externally.

## Technical Approach
1. Build a static route `/privacy` that renders branded privacy-policy content.
2. Reuse the existing Blog page at route `/blog` (already present).
3. Update the `Footer` component to include two navigational links:
   - "Privacy" → `/privacy`
   - "Blog" → `/blog`
4. Ensure links appear on all pages (public and authenticated) that include the shared footer.

## UX/UI Considerations
- Match typography and spacing of existing static pages (e.g., AboutUs, Terms if any).
- Page title: "Privacy Policy – KPEGE".
- Footer links use existing link styling.

## Acceptance Criteria
- Navigating to `/privacy` shows a full privacy policy branded "IRIRI | KPEGE".
- Footer contains working "Privacy" and "Blog" links on every page using the `Footer` component.
- Lighthouse accessibility score ≥ 90 for the new page.
- E2E test opens footer links and verifies navigation.

## Dependencies
- None external.

## Open Questions
- None at this time.

## Related Tasks
[See Tasks](./tasks.md)

[View in Backlog](../backlog.md#user-content-pbi-8) 