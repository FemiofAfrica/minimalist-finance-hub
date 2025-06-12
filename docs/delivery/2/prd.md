# PBI-2: Comparative Insights with Trend Indicators

[View in Backlog](../backlog.md#user-content-pbi-2)

## Overview

Add intelligent comparative analysis to help users understand how their financial situation is changing over time. This includes month-over-month and year-over-year comparisons with clear visual indicators and percentage changes.

## Problem Statement

Users currently see isolated monthly data without context about how their financial situation is evolving. They cannot easily answer questions like:
- "How did this month compare to last month?"
- "Am I spending more or less than the same month last year?"
- "What's the trend direction for my expenses?"
- "Are my finances improving or declining?"

## User Stories

1. As a user, I want to see month-over-month percentage changes with up/down arrows so I can quickly understand if my situation is improving
2. As a user, I want to see year-over-year comparisons so I can understand seasonal patterns and long-term trends
3. As a user, I want visual trend indicators (colors, arrows, icons) so I can immediately see positive vs negative changes
4. As a user, I want contextual explanations of significant changes so I understand what the numbers mean

## Technical Approach

- Extend existing `MonthlySnapshot` calculations to include comparative metrics
- Create new service functions for calculating percentage changes and trends
- Add new UI components for displaying comparison metrics with visual indicators
- Integrate trend analysis into existing reports layout
- Use existing currency conversion and formatting systems

## UX/UI Considerations

- Clear visual hierarchy with primary metrics prominently displayed
- Color coding: green for positive changes, red for negative changes, gray for neutral
- Arrow icons pointing up/down to reinforce trend direction
- Percentage changes should be easily scannable
- Context explanations should be concise but helpful
- Responsive design for all screen sizes

## Acceptance Criteria

1. **Month-over-Month Comparisons**
   - Show percentage change from previous month for income, expenses, and balance
   - Visual indicators (arrows, colors) for trend direction
   - Absolute amount changes alongside percentages
   - Handle edge cases (previous month = 0, no previous data)

2. **Year-over-Year Comparisons**
   - Compare current month to same month previous year
   - Seasonal trend indicators
   - Long-term growth/decline patterns
   - Clear labeling of comparison periods

3. **Visual Trend Indicators**
   - Up/down arrows for positive/negative changes
   - Color coding consistent across all metrics
   - Icons that are accessible and clear
   - Proper contrast ratios for accessibility

4. **Contextual Explanations**
   - Brief explanations for significant changes (>20% change)
   - Suggested actions for concerning trends
   - Celebration of positive improvements
   - Educational content about trend interpretation

5. **Responsive Integration**
   - Seamlessly integrate with existing reports layout
   - Work on mobile and desktop
   - Fast loading and smooth transitions
   - Graceful degradation for missing data

## Dependencies

- Monthly snapshots historical data
- Existing currency conversion system
- UI component library
- Calculation services for percentage changes

## Open Questions

1. What threshold should trigger "significant change" explanations?
2. Should we include 3-month rolling averages for smoother trend analysis?
3. How should we handle users with less than 12 months of data for YoY comparisons?
4. Should trend indicators be customizable by user preference?

## Related Tasks

Tasks will be created upon PBI approval covering:
- Comparative calculation services
- Trend indicator components
- Reports layout integration
- Data validation and edge cases
- Testing and accessibility compliance 