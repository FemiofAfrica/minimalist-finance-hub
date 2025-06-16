# PBI-7: Automated Test Suite Remediation

## Overview
Multiple tests currently fail due to syntax errors, environment issues, or outdated imports. This PBI aims to restore a fully passing test suite so CI can reliably catch regressions.

## Problem Statement
Developers are unable to trust CI results because existing failures mask new problems.

## User Stories
- As a developer, I need the unit and integration test suites to pass so that I can ensure new features don't break existing behaviour.

## Technical Approach
1. Fix syntax error in `MonthlyTotalsBarChart.test.tsx`.
2. Stub ESM loader for `https:` imports in edge-function tests.
3. Provide `DOMMatrix` polyfill or mock for PDF utilities.
4. Update relevant mocks and snapshots.

## UX/UI Considerations
N/A

## Acceptance Criteria
- `npm test` exits with 0 failures on clean install.
- No skipped tests hide legitimate failures.

## Dependencies
None

## Open Questions
- Should we migrate PDF utils to worker tests?

## Related Tasks
See tasks list.

[View in Backlog](../backlog.md#user-content-PBI-7) 