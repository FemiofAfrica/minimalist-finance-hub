# PBI-3: Category-Level Spending Reports

[View in Backlog](../backlog.md#user-content-pbi-3)

## Overview

Provide detailed insights into spending patterns by category, showing users exactly where their money goes and highlighting significant changes in spending behavior across different categories.

## Problem Statement

Users currently lack visibility into their spending patterns at the category level, making it difficult to:
- Understand which categories consume the most money
- Identify categories where spending has increased or decreased significantly
- Make informed decisions about budget allocation
- Spot unusual spending patterns that might indicate problems
- Track progress on category-specific financial goals

## User Stories

1. As a user, I want to see my top spending categories for each month so I can understand where most of my money goes
2. As a user, I want to see which categories had the biggest spending changes so I can identify significant shifts in my behavior
3. As a user, I want to compare category spending across different time periods so I can track my progress
4. As a user, I want visual representations of category breakdowns so I can quickly grasp my spending distribution

## Technical Approach

- Leverage existing category data from transactions table
- Extend `dashboardService` category functions for historical analysis
- Create new service for category trend analysis and comparisons
- Build new chart components for category visualization (treemap, stacked bars, enhanced pie charts)
- Integrate category insights into reports page with filtering capabilities

## UX/UI Considerations

- Multiple visualization options: pie charts, bar charts, treemaps for different perspectives
- Color-coded categories with consistent theming
- Interactive elements allowing drill-down into specific categories
- Clear sorting and filtering options (by amount, by change, by time period)
- Highlight significant changes with visual emphasis
- Mobile-friendly responsive design

## Acceptance Criteria

1. **Top Spending Categories**
   - Show top 10 spending categories for selected time period
   - Display both absolute amounts and percentages of total spending
   - Sort by spending amount (highest to lowest)
   - Include visual indicators (progress bars, pie slices)

2. **Category Change Analysis**
   - Calculate month-over-month and year-over-year changes per category
   - Highlight categories with significant changes (>25% increase/decrease)
   - Show "biggest movers" - categories with largest absolute and percentage changes
   - Provide context for what constitutes a significant change

3. **Historical Category Comparison**
   - Compare category spending across multiple months
   - Show trending categories (consistently increasing/decreasing)
   - Provide category performance over time (line charts per category)
   - Enable comparison between different time periods

4. **Visual Category Breakdown**
   - Enhanced pie charts with better labeling and interactivity
   - Bar charts showing category totals with comparison periods
   - Treemap visualization for hierarchical category view
   - Consistent color coding across all visualizations

5. **Interactive Filtering**
   - Filter by time period (1, 3, 6, 12 months)
   - Filter by category type (show only expenses, income, or transfers)
   - Search/filter specific categories
   - Toggle between different visualization types

6. **Actionable Insights**
   - Alert users to unusual category spending patterns
   - Suggest budget allocation based on spending patterns
   - Highlight categories that might need attention
   - Provide educational tips about category management

## Dependencies

- Transaction data with category associations
- Existing category management system
- Chart visualization library (Recharts)
- Currency conversion system
- Historical data from monthly snapshots

## Open Questions

1. Should we group similar categories together (e.g., "Food" includes "Dining" and "Groceries")?
2. How many categories should we show by default vs. "View All" option?
3. Should we allow users to set category-specific goals/budgets from this view?
4. What's the best way to handle "Uncategorized" transactions in reports?

## Related Tasks

Tasks will be created upon PBI approval covering:
- Category analysis service development
- Enhanced visualization components
- Interactive filtering system
- Reports page category section
- Data aggregation optimization
- Testing and performance validation 