import type { 
  FinancialExplanation, 
  ExplanationType, 
  ChangeSignificance, 
  ExplanationContext, 
  ExplanationConfig 
} from '@/types/chartData';
import type { ComparativeInsights } from '@/types/comparativeData';
import { isValidNumber, sanitizeNumber } from '@/utils/dataValidation';
import { safeCurrencyFormat } from '@/utils/safeCalculations';

// Default configuration for explanation generation
const DEFAULT_CONFIG: ExplanationConfig = {
  significanceThresholds: {
    minor: 0.05,      // 5%
    moderate: 0.15,   // 15%
    significant: 0.25, // 25%
    major: 0.50       // 50%
  },
  minimumConfidence: 0.7,
  maxExplanationsPerMetric: 3,
  enableRecommendations: true
};

/**
 * Service for generating contextual explanations for financial data changes
 */
export class ExplanationService {
  private config: ExplanationConfig;

  constructor(config: Partial<ExplanationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate explanations for comparative insights
   */
  generateExplanations(
    insights: ComparativeInsights,
    context: ExplanationContext
  ): FinancialExplanation[] {
    const explanations: FinancialExplanation[] = [];

    // Generate explanations for month-over-month data
    if (insights.monthOverMonth) {
      // Generate income explanations
      if (insights.monthOverMonth.income) {
        const incomeExplanations = this.generateIncomeExplanations(insights.monthOverMonth.income, context);
        explanations.push(...incomeExplanations);
      }

      // Generate expense explanations
      if (insights.monthOverMonth.expenses) {
        const expenseExplanations = this.generateExpenseExplanations(insights.monthOverMonth.expenses, context);
        explanations.push(...expenseExplanations);
      }

      // Generate balance explanations
      if (insights.monthOverMonth.balance) {
        const balanceExplanations = this.generateBalanceExplanations(insights.monthOverMonth.balance, context);
        explanations.push(...balanceExplanations);
      }
    }

    // Filter by confidence and limit results
    return explanations
      .filter(exp => exp.confidence >= this.config.minimumConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxExplanationsPerMetric * 3); // Max per category
  }

  /**
   * Generate explanations for income changes
   */
  private generateIncomeExplanations(
    incomeData: any,
    context: ExplanationContext
  ): FinancialExplanation[] {
    const explanations: FinancialExplanation[] = [];
    
    // Validate percentage change using safe validation
    if (!isValidNumber(incomeData?.percentageChange)) {
      return this.generateDataLimitationExplanation('income', context);
    }

    const changePercent = Math.abs(sanitizeNumber(incomeData.percentageChange, 0));
    const isIncrease = incomeData.percentageChange > 0;
    const significance = this.determineSignificance(changePercent);

    if (significance === 'minor') return explanations;

    // Validate current and previous values
    const currentValue = sanitizeNumber(incomeData.current, 0);
    const previousValue = sanitizeNumber(incomeData.previous, 0);

    const explanation: FinancialExplanation = {
      id: `income-${Date.now()}`,
      type: this.determineExplanationType(incomeData.percentageChange, 'income'),
      significance,
      title: this.generateIncomeTitle(isIncrease, significance),
      description: this.generateIncomeDescription(incomeData, isIncrease, significance, context),
      confidence: this.calculateConfidence(significance, context),
      category: 'income',
      metadata: {
        changePercentage: sanitizeNumber(incomeData.percentageChange, 0),
        previousValue,
        currentValue,
        timeframe: `${context.previousMonth} to ${context.currentMonth}`
      }
    };

    if (this.config.enableRecommendations) {
      explanation.recommendation = this.generateIncomeRecommendation(incomeData, isIncrease, significance);
    }

    explanations.push(explanation);
    return explanations;
  }

  /**
   * Generate explanations for expense changes
   */
  private generateExpenseExplanations(
    expenseData: any,
    context: ExplanationContext
  ): FinancialExplanation[] {
    const explanations: FinancialExplanation[] = [];
    
    if (!expenseData.percentageChange || isNaN(expenseData.percentageChange)) {
      return this.generateDataLimitationExplanation('expenses', context);
    }

    const changePercent = Math.abs(expenseData.percentageChange);
    const isIncrease = expenseData.percentageChange > 0;
    const significance = this.determineSignificance(changePercent);

    if (significance === 'minor') return explanations;

    const explanation: FinancialExplanation = {
      id: `expenses-${Date.now()}`,
      type: this.determineExplanationType(expenseData.percentageChange, 'expenses'),
      significance,
      title: this.generateExpenseTitle(isIncrease, significance),
      description: this.generateExpenseDescription(expenseData, isIncrease, significance, context),
      confidence: this.calculateConfidence(significance, context),
      category: 'expenses',
      metadata: {
        changePercentage: expenseData.percentageChange,
        previousValue: expenseData.previous,
        currentValue: expenseData.current,
        timeframe: `${context.previousMonth} to ${context.currentMonth}`
      }
    };

    if (this.config.enableRecommendations) {
      explanation.recommendation = this.generateExpenseRecommendation(expenseData, isIncrease, significance);
    }

    explanations.push(explanation);
    return explanations;
  }

  /**
   * Generate explanations for balance changes
   */
  private generateBalanceExplanations(
    balanceData: any,
    context: ExplanationContext
  ): FinancialExplanation[] {
    const explanations: FinancialExplanation[] = [];
    
    if (!balanceData.percentageChange || isNaN(balanceData.percentageChange)) {
      return this.generateDataLimitationExplanation('balance', context);
    }

    const changePercent = Math.abs(balanceData.percentageChange);
    const isIncrease = balanceData.percentageChange > 0;
    const significance = this.determineSignificance(changePercent);

    if (significance === 'minor') return explanations;

    const explanation: FinancialExplanation = {
      id: `balance-${Date.now()}`,
      type: this.determineExplanationType(balanceData.percentageChange, 'balance'),
      significance,
      title: this.generateBalanceTitle(isIncrease, significance),
      description: this.generateBalanceDescription(balanceData, isIncrease, significance, context),
      confidence: this.calculateConfidence(significance, context),
      category: 'balance',
      metadata: {
        changePercentage: balanceData.percentageChange,
        previousValue: balanceData.previous,
        currentValue: balanceData.current,
        timeframe: `${context.previousMonth} to ${context.currentMonth}`
      }
    };

    if (this.config.enableRecommendations) {
      explanation.recommendation = this.generateBalanceRecommendation(balanceData, isIncrease, significance);
    }

    explanations.push(explanation);
    return explanations;
  }

  /**
   * Generate explanations for data limitations
   */
  private generateDataLimitationExplanation(
    category: 'income' | 'expenses' | 'balance',
    context: ExplanationContext
  ): FinancialExplanation[] {
    if (context.hasHistoricalData) return [];

    return [{
      id: `${category}-limitation-${Date.now()}`,
      type: 'neutral',
      significance: 'minor',
      title: 'Limited Historical Data',
      description: `Comparison for ${category} is limited due to insufficient historical data. More data will improve the accuracy of these insights.`,
      confidence: 0.9,
      category,
      recommendation: 'Continue tracking your finances to build a comprehensive history for better insights.'
    }];
  }

  /**
   * Determine the significance level of a change
   */
  private determineSignificance(changePercent: number): ChangeSignificance {
    const { significanceThresholds } = this.config;
    
    // Convert percentage to decimal for comparison (e.g., 25% -> 0.25)
    const changeDecimal = changePercent / 100;
    
    if (changeDecimal >= significanceThresholds.major) return 'major';
    if (changeDecimal >= significanceThresholds.significant) return 'significant';
    if (changeDecimal >= significanceThresholds.moderate) return 'moderate';
    return 'minor';
  }

  /**
   * Determine the explanation type based on change and category
   */
  private determineExplanationType(
    percentageChange: number, 
    category: 'income' | 'expenses' | 'balance'
  ): ExplanationType {
    const isIncrease = percentageChange > 0;
    
    switch (category) {
      case 'income':
        return isIncrease ? 'positive' : 'negative';
      case 'expenses':
        return isIncrease ? 'warning' : 'positive';
      case 'balance':
        return isIncrease ? 'positive' : 'negative';
      default:
        return 'neutral';
    }
  }

  /**
   * Calculate confidence based on significance and context
   */
  private calculateConfidence(
    significance: ChangeSignificance,
    context: ExplanationContext
  ): number {
    let baseConfidence = 0.8;

    // Adjust based on significance
    switch (significance) {
      case 'major':
        baseConfidence = 0.95;
        break;
      case 'significant':
        baseConfidence = 0.9;
        break;
      case 'moderate':
        baseConfidence = 0.8;
        break;
      case 'minor':
        baseConfidence = 0.7;
        break;
    }

    // Adjust based on data quality
    switch (context.dataQuality) {
      case 'excellent':
        baseConfidence *= 1.0;
        break;
      case 'good':
        baseConfidence *= 0.95;
        break;
      case 'limited':
        baseConfidence *= 0.85;
        break;
      case 'poor':
        baseConfidence *= 0.7;
        break;
    }

    return Math.min(1.0, Math.max(0.0, baseConfidence));
  }

  // Title generation methods
  private generateIncomeTitle(isIncrease: boolean, significance: ChangeSignificance): string {
    const direction = isIncrease ? 'increased' : 'decreased';
    const intensity = significance === 'major' ? 'dramatically' : 
                     significance === 'significant' ? 'significantly' : 
                     significance === 'moderate' ? 'moderately' : '';
    
    return `Income ${direction} ${intensity}`.trim();
  }

  private generateExpenseTitle(isIncrease: boolean, significance: ChangeSignificance): string {
    const direction = isIncrease ? 'increased' : 'decreased';
    const intensity = significance === 'major' ? 'dramatically' : 
                     significance === 'significant' ? 'significantly' : 
                     significance === 'moderate' ? 'moderately' : '';
    
    return `Expenses ${direction} ${intensity}`.trim();
  }

  private generateBalanceTitle(isIncrease: boolean, significance: ChangeSignificance): string {
    const direction = isIncrease ? 'improved' : 'declined';
    const intensity = significance === 'major' ? 'dramatically' : 
                     significance === 'significant' ? 'significantly' : 
                     significance === 'moderate' ? 'moderately' : '';
    
    return `Net balance ${direction} ${intensity}`.trim();
  }

  // Description generation methods
  private generateIncomeDescription(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance,
    context: ExplanationContext
  ): string {
    const changePercent = Math.abs(data.percentageChange).toFixed(1);
    const direction = isIncrease ? 'increase' : 'decrease';
    
    return `Your income showed a ${changePercent}% ${direction} compared to ${context.previousMonth}. ` +
           `This ${significance} change suggests ${isIncrease ? 'positive' : 'concerning'} trends in your earning patterns.`;
  }

  private generateExpenseDescription(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance,
    context: ExplanationContext
  ): string {
    const changePercent = Math.abs(data.percentageChange).toFixed(1);
    const direction = isIncrease ? 'increase' : 'decrease';
    
    return `Your expenses showed a ${changePercent}% ${direction} compared to ${context.previousMonth}. ` +
           `This ${significance} change in spending ${isIncrease ? 'may require attention' : 'is a positive development'}.`;
  }

  private generateBalanceDescription(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance,
    context: ExplanationContext
  ): string {
    const changePercent = Math.abs(data.percentageChange).toFixed(1);
    const direction = isIncrease ? 'improvement' : 'decline';
    
    return `Your net balance showed a ${changePercent}% ${direction} compared to ${context.previousMonth}. ` +
           `This ${significance} change reflects the combined impact of your income and expense patterns.`;
  }

  // Recommendation generation methods
  private generateIncomeRecommendation(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance
  ): string {
    if (isIncrease) {
      return significance === 'major' 
        ? 'Consider saving or investing this additional income to build long-term wealth.'
        : 'Great progress! Consider allocating some of this increase to your savings goals.';
    } else {
      return significance === 'major'
        ? 'Review your income sources and consider diversifying or finding additional revenue streams.'
        : 'Monitor this trend closely and consider ways to stabilize or increase your income.';
    }
  }

  private generateExpenseRecommendation(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance
  ): string {
    if (isIncrease) {
      return significance === 'major'
        ? 'Review your spending categories to identify areas where you can reduce expenses.'
        : 'Consider reviewing your budget to ensure this spending increase aligns with your goals.';
    } else {
      return significance === 'major'
        ? 'Excellent cost management! Consider maintaining these spending habits.'
        : 'Good progress on expense control. Keep monitoring to maintain this trend.';
    }
  }

  private generateBalanceRecommendation(
    data: any, 
    isIncrease: boolean, 
    significance: ChangeSignificance
  ): string {
    if (isIncrease) {
      return significance === 'major'
        ? 'Outstanding financial progress! Consider setting aside this surplus for emergency funds or investments.'
        : 'Your financial health is improving. Consider increasing your savings rate while maintaining this momentum.';
    } else {
      return significance === 'major'
        ? 'Focus on both increasing income and reducing expenses to improve your financial position.'
        : 'Review your budget to identify opportunities for improvement in both income and expenses.';
    }
  }
}

// Export singleton instance
export const explanationService = new ExplanationService();

// Export utility functions
export const createExplanationContext = (
  currentMonth: string,
  previousMonth: string,
  availableMonths: number
): ExplanationContext => ({
  currentMonth,
  previousMonth,
  hasHistoricalData: availableMonths >= 2,
  dataQuality: availableMonths >= 6 ? 'excellent' :
               availableMonths >= 4 ? 'good' :
               availableMonths >= 2 ? 'limited' : 'poor',
  availableMonths
}); 