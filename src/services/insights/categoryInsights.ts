import type { 
  CategoryAggregate, 
  CategoryChange, 
  CategoryInsight, 
  InsightGenerationContext,
  InsightType,
  InsightSeverity,
  InsightPriority
} from '@/types/analytics';

// Statistical thresholds for insight generation
const THRESHOLDS = {
  SPENDING_SPIKE: 50, // 50% increase is considered unusual
  SPENDING_DROP: 40,  // 40% decrease is significant
  HIGH_VARIANCE: 30,  // 30% coefficient of variation suggests budgeting need
  SIGNIFICANT_AMOUNT: 1000, // NGN 1000+ changes are noteworthy
  NEW_CATEGORY_MIN: 500, // NGN 500+ for new category alerts
  Z_SCORE_THRESHOLD: 2.0, // 2 standard deviations for anomaly detection
} as const;

/**
 * Generates actionable insights from category spending data
 */
export async function generateCategoryInsights(
  context: InsightGenerationContext
): Promise<CategoryInsight[]> {
  const insights: CategoryInsight[] = [];
  
  try {
    // Generate insights from category changes (MoM/YoY analysis)
    const changeInsights = generateChangeBasedInsights(context);
    insights.push(...changeInsights);
    
    // Generate insights from spending patterns
    const patternInsights = generatePatternBasedInsights(context);
    insights.push(...patternInsights);
    
    // Generate budget optimization insights
    const optimizationInsights = generateOptimizationInsights(context);
    insights.push(...optimizationInsights);
    
    // Generate comparative insights
    const comparativeInsights = generateComparativeInsights(context);
    insights.push(...comparativeInsights);
    
    // Sort insights by priority and relevance
    return prioritizeInsights(insights);
    
  } catch (error) {
    console.error('Error generating category insights:', error);
    return [];
  }
}

/**
 * Generate insights based on category changes (significant increases/decreases)
 */
function generateChangeBasedInsights(context: InsightGenerationContext): CategoryInsight[] {
  const insights: CategoryInsight[] = [];
  const { categoryChanges, timePeriod } = context;
  
  for (const change of categoryChanges) {
    // Skip if change is not significant enough
    if (!change.isSignificant) continue;
    
    const absChange = Math.abs(change.percentageChange);
    const isIncrease = change.percentageChange > 0;
    
    // Spending spike detection
    if (isIncrease && change.percentageChange >= THRESHOLDS.SPENDING_SPIKE) {
      insights.push(createInsight({
        type: 'spending_spike',
        severity: absChange > 100 ? 'error' : 'warning',
        priority: absChange > 150 ? 'critical' : absChange > 75 ? 'high' : 'medium',
        categoryId: change.categoryId,
        categoryName: change.categoryName,
        title: `Unusual spike in ${change.categoryName}`,
        description: `Your ${change.categoryName.toLowerCase()} spending increased by ${change.percentageChange.toFixed(1)}% this ${change.changeType === 'MoM' ? 'month' : 'year'}.`,
        actionSuggestion: `Review recent ${change.categoryName.toLowerCase()} transactions to identify the cause and consider if this trend should continue.`,
        metadata: {
          currentAmount: change.currentTotal,
          previousAmount: change.previousTotal,
          percentageChange: change.percentageChange,
          currency: change.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
    
    // Spending drop detection  
    if (!isIncrease && absChange >= THRESHOLDS.SPENDING_DROP) {
      insights.push(createInsight({
        type: 'spending_drop',
        severity: 'success',
        priority: absChange > 70 ? 'high' : 'medium',
        categoryId: change.categoryId,
        categoryName: change.categoryName,
        title: `Reduced ${change.categoryName} spending`,
        description: `Great job! Your ${change.categoryName.toLowerCase()} spending decreased by ${absChange.toFixed(1)}% this ${change.changeType === 'MoM' ? 'month' : 'year'}.`,
        actionSuggestion: `Consider maintaining this spending pattern or reallocating these savings to other financial goals.`,
        metadata: {
          currentAmount: change.currentTotal,
          previousAmount: change.previousTotal,
          percentageChange: change.percentageChange,
          currency: change.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
    
    // New category detection
    if (change.previousTotal === 0 && change.currentTotal >= THRESHOLDS.NEW_CATEGORY_MIN) {
      insights.push(createInsight({
        type: 'new_category',
        severity: 'info',
        priority: 'medium',
        categoryId: change.categoryId,
        categoryName: change.categoryName,
        title: `New spending category: ${change.categoryName}`,
        description: `You started spending in a new category: ${change.categoryName} (${formatCurrency(change.currentTotal, change.currency)}).`,
        actionSuggestion: `Consider setting a budget for this new category to track future spending.`,
        metadata: {
          currentAmount: change.currentTotal,
          previousAmount: change.previousTotal,
          percentageChange: change.percentageChange,
          currency: change.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
    
    // Missing category detection
    if (change.currentTotal === 0 && change.previousTotal >= THRESHOLDS.NEW_CATEGORY_MIN) {
      insights.push(createInsight({
        type: 'missing_category',
        severity: 'info',
        priority: 'low',
        categoryId: change.categoryId,
        categoryName: change.categoryName,
        title: `No ${change.categoryName} spending this period`,
        description: `You didn't spend anything on ${change.categoryName.toLowerCase()} this ${change.changeType === 'MoM' ? 'month' : 'year'}, compared to ${formatCurrency(change.previousTotal, change.currency)} previously.`,
        actionSuggestion: `This might be intentional savings or a missed regular expense. Review if this is expected.`,
        metadata: {
          currentAmount: change.currentTotal,
          previousAmount: change.previousTotal,
          percentageChange: change.percentageChange,
          currency: change.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
  }
  
  return insights;
}

/**
 * Generate insights based on spending patterns and distributions
 */
function generatePatternBasedInsights(context: InsightGenerationContext): CategoryInsight[] {
  const insights: CategoryInsight[] = [];
  const { categoryData, timePeriod } = context;
  
  // Find top spending categories for pattern analysis
  const topCategories = categoryData.slice(0, 5);
  
  for (const category of topCategories) {
    // High concentration detection
    if (category.percentage > 50) {
      insights.push(createInsight({
        type: 'comparative_alert',
        severity: 'warning',
        priority: 'high',
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        title: `${category.categoryName} dominates your spending`,
        description: `${category.categoryName} accounts for ${category.percentage.toFixed(1)}% of your total spending.`,
        actionSuggestion: `Consider diversifying your spending or reviewing if this concentration aligns with your financial goals.`,
        metadata: {
          currentAmount: category.total,
          percentageChange: category.percentage,
          currency: category.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
    
    // Positive spending trends for essential categories
    if (['Groceries', 'Utilities', 'Transportation', 'Health'].includes(category.categoryName) && 
        category.percentage >= 10 && category.percentage <= 30) {
      insights.push(createInsight({
        type: 'trend_positive',
        severity: 'success',
        priority: 'low',
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        title: `Balanced ${category.categoryName} spending`,
        description: `Your ${category.categoryName.toLowerCase()} spending (${category.percentage.toFixed(1)}% of total) appears well-balanced.`,
        actionSuggestion: `Continue maintaining this spending level as it represents good financial balance.`,
        metadata: {
          currentAmount: category.total,
          percentageChange: category.percentage,
          currency: category.currency,
          timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
  }
  
  return insights;
}

/**
 * Generate budget optimization and suggestion insights
 */
function generateOptimizationInsights(context: InsightGenerationContext): CategoryInsight[] {
  const insights: CategoryInsight[] = [];
  const { categoryData, categoryChanges, timePeriod } = context;
  
  // Calculate spending variability for budget suggestions
  const highVariabilityCategories = categoryChanges.filter(change => 
    Math.abs(change.percentageChange) >= THRESHOLDS.HIGH_VARIANCE && 
    change.currentTotal >= THRESHOLDS.SIGNIFICANT_AMOUNT
  );
  
  for (const category of highVariabilityCategories) {
    insights.push(createInsight({
      type: 'budget_suggestion',
      severity: 'info',
      priority: 'medium',
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      title: `Consider budgeting for ${category.categoryName}`,
      description: `Your ${category.categoryName.toLowerCase()} spending varies significantly (${Math.abs(category.percentageChange).toFixed(1)}% change).`,
      actionSuggestion: `Setting a monthly budget for ${category.categoryName.toLowerCase()} could help you plan better and reduce financial surprises.`,
      metadata: {
        currentAmount: category.currentTotal,
        previousAmount: category.previousTotal,
        percentageChange: category.percentageChange,
        currency: category.currency,
        timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
      }
    }));
  }
  
  // Optimization tips for discretionary spending
  const discretionaryCategories = categoryData.filter(cat => 
    ['Entertainment', 'Dining', 'Shopping', 'Hobbies', 'Subscription'].some(disc => 
      cat.categoryName.toLowerCase().includes(disc.toLowerCase())
    ) && cat.percentage > 15
  );
  
  for (const category of discretionaryCategories) {
    insights.push(createInsight({
      type: 'optimization_tip',
      severity: 'info',
      priority: 'low',
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      title: `Optimization opportunity in ${category.categoryName}`,
      description: `${category.categoryName} represents ${category.percentage.toFixed(1)}% of your spending.`,
      actionSuggestion: `Consider reviewing ${category.categoryName.toLowerCase()} expenses for potential savings opportunities.`,
      metadata: {
        currentAmount: category.total,
        percentageChange: category.percentage,
        currency: category.currency,
        timeframe: `${timePeriod} month${timePeriod > 1 ? 's' : ''}`
      }
    }));
  }
  
  return insights;
}

/**
 * Generate comparative analysis insights
 */
function generateComparativeInsights(context: InsightGenerationContext): CategoryInsight[] {
  const insights: CategoryInsight[] = [];
  const { categoryData } = context;
  
  // Find unusual distribution patterns
  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.total, 0);
  const expenseCategories = categoryData.filter(cat => cat.type === 'expense');
  
  if (expenseCategories.length >= 3) {
    const topCategory = expenseCategories[0];
    const secondCategory = expenseCategories[1];
    
    // Alert if top category is disproportionately large
    if (topCategory.total > secondCategory.total * 3) {
      insights.push(createInsight({
        type: 'comparative_alert',
        severity: 'warning',
        priority: 'medium',
        categoryId: topCategory.categoryId,
        categoryName: topCategory.categoryName,
        title: `${topCategory.categoryName} significantly outpaces other spending`,
        description: `${topCategory.categoryName} spending is ${(topCategory.total / secondCategory.total).toFixed(1)}x larger than your second-highest category (${secondCategory.categoryName}).`,
        actionSuggestion: `Review if this spending distribution aligns with your priorities and consider rebalancing if needed.`,
        metadata: {
          currentAmount: topCategory.total,
          currency: topCategory.currency,
          timeframe: context.timePeriod + ` month${context.timePeriod > 1 ? 's' : ''}`
        }
      }));
    }
  }
  
  return insights;
}

/**
 * Helper function to create a standardized insight object
 */
function createInsight(params: {
  type: InsightType;
  severity: InsightSeverity;
  priority: InsightPriority;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  actionSuggestion?: string;
  metadata: Partial<CategoryInsight['metadata']>;
}): CategoryInsight {
  return {
    id: generateInsightId(params.type, params.categoryId),
    type: params.type,
    severity: params.severity,
    priority: params.priority,
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    title: params.title,
    description: params.description,
    actionSuggestion: params.actionSuggestion,
    metadata: {
      currentAmount: 0,
      currency: 'NGN',
      timeframe: '1 month',
      ...params.metadata
    } as CategoryInsight['metadata'],
    createdAt: new Date().toISOString()
  };
}

/**
 * Generate a unique identifier for insights
 */
function generateInsightId(type: InsightType, categoryId: string): string {
  const timestamp = Date.now();
  return `${type}_${categoryId}_${timestamp}`;
}

/**
 * Prioritize and sort insights for optimal user experience
 */
function prioritizeInsights(insights: CategoryInsight[]): CategoryInsight[] {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  
  return insights
    .sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by amount (larger amounts first)
      return (b.metadata.currentAmount || 0) - (a.metadata.currentAmount || 0);
    })
    // Limit to top 5 insights to avoid overwhelming users
    .slice(0, 5);
}

/**
 * Format currency amounts for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate statistical measures for anomaly detection
 */
export function calculateZScore(values: number[], targetValue: number): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  if (standardDeviation === 0) return 0;
  return (targetValue - mean) / standardDeviation;
}

/**
 * Calculate coefficient of variation for spending patterns
 */
export function calculateVariationCoefficient(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  return (standardDeviation / mean) * 100;
} 