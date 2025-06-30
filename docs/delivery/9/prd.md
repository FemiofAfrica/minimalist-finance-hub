# PBI-9: Restore Groq API Integration

## Overview
Groq-powered AI features are currently failing due to an invalid or expired API key and lack of robust error handling. This PBI aims to restore functionality and add safeguards.

## Problem Statement
AI-driven features (e.g., advanced parsing, insights) depend on Groq. The API key appears invalid, breaking those features and causing test failures.

## User Stories
- **As a user**, I want AI-driven features to work reliably so I can benefit from enhanced insights.
- **As a developer**, I want clear error messages when the Groq key is invalid so I can troubleshoot quickly.

## Technical Approach
1. Obtain/refresh Groq API key (stored securely in Vercel env vars).
2. Update `src/integrations/groq/client.ts` to read key from env and throw clear errors if missing.
3. Add retry/backoff wrapper and graceful degradation when Groq unavailable.

## UX/UI Considerations
- Show user-friendly fallback messages if AI feature temporarily unavailable.

## Acceptance Criteria
- Groq client authenticates successfully in production and staging.
- Unit test validates client returns mocked response when key absent.
- Feature tests that depend on Groq pass.

## Dependencies
- Valid Groq account/key.

## Open Questions
- None.

## Related Tasks
[See Tasks](./tasks.md)

[View in Backlog](../backlog.md#user-content-pbi-9) 