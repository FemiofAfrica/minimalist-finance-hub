import { supabase } from '@/integrations/supabase/client';
import {
  InsightThresholds,
  SpendingPattern,
  FinancialAnomaly,
  InsightType,
  MonthlyAnalysis,
  InsightAnalysisResult
} from '@/types/insights';
import { detectSpike, detectMoMChange } from '@/services/insights/patternDetection';

// Default thresholds based on financial best practices
const DEFAULT_THRESHOLDS: InsightThresholds = {
  expenseIncreasePercent: 30,
  incomeDecreasePercent: 20,
  categorySpikePer: 50,
  balanceTrendMonths: 3,
  housingRatioPercent: 30,
  subscriptionThreshold: 10000 // 10k in base currency
};

export class InsightsAnalysisService {
  private thresholds: InsightThresholds;
  private userId: string;

  constructor(userId: string, customThresholds?: Partial<InsightThresholds>) {
    this.userId = userId;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }

  /**
   * Main analysis function that processes user's financial data
   */
  async analyzeUserInsights(): Promise<InsightAnalysisResult> {
    try {
      const currentMonth = await this.getCurrentMonthAnalysis();
      const previousMonth = await this.getPreviousMonthAnalysis();
      
      const insights = await this.generateInsights(currentMonth, previousMonth);
      
      return {
        userId: this.userId,
        analysisDate: new Date(),
        currentMonth,
        previousMonth,
        insights,
        summary: this.createInsightsSummary(insights)
      };
    } catch (error) {
      console.error('Error analyzing user insights:', error);
      throw new Error('Failed to analyze user insights');
    }
  }

  /**
   * Get current month's financial analysis
   */
  private async getCurrentMonthAnalysis(): Promise<MonthlyAnalysis> {
    const currentDate = new Date();
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    return this.getMonthAnalysis(monthKey);
  }

  /**
   * Get previous month's financial analysis
   */
  private async getPreviousMonthAnalysis(): Promise<MonthlyAnalysis | undefined> {
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const monthKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      return await this.getMonthAnalysis(monthKey);
    } catch (error) {
      console.warn('Previous month data not available:', error);
      return undefined;
    }
  }

  /**
   * Get financial analysis for a specific month
   */
  private async getMonthAnalysis(monthKey: string): Promise<MonthlyAnalysis> {
    // Get monthly snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', this.userId)
      .eq('month', monthKey)
      .single();

    if (snapshotError) {
      throw new Error(`Failed to fetch monthly snapshot: ${snapshotError.message}`);
    }

    // Get category breakdown for the month
    const categoryBreakdown = await this.getCategoryBreakdown(monthKey);
    
    // Calculate additional metrics
    const housingRatio = this.calculateHousingRatio(categoryBreakdown, snapshot.total_income);
    const subscriptionTotal = this.calculateSubscriptionTotal(categoryBreakdown);
    const anomalies = this.detectAnomalies(snapshot, categoryBreakdown);

    return {
      month: monthKey,
      totalIncome: snapshot.total_income,
      totalExpenses: snapshot.total_expenses,
      netAmount: snapshot.net_amount,
      categoryBreakdown,
      anomalies,
      balanceTrend: snapshot.balance_change,
      housingRatio,
      subscriptionTotal
    };
  }

  /**
   * Get spending breakdown by category for a month
   */
  private async getCategoryBreakdown(monthKey: string): Promise<SpendingPattern[]> {
    const startDate = new Date(monthKey + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories (
          id,
          name
        )
      `)
      .eq('user_id', this.userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .eq('type', 'expense');

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Group by category and calculate totals
    const categoryTotals: Record<string, { name: string; amount: number }> = {};
    
    transactions?.forEach(transaction => {
      const categoryId = transaction.category_id || 'uncategorized';
      const categoryName = transaction.categories?.name || 'Uncategorized';
      
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = { name: categoryName, amount: 0 };
      }
      categoryTotals[categoryId].amount += Math.abs(transaction.amount);
    });

    // Convert to SpendingPattern format
    return Object.entries(categoryTotals).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      currentAmount: data.amount,
      previousAmount: 0, // Will be filled when comparing with previous month
      changePercent: 0,
      trend: 'stable' as const,
      isAnomaly: false
    }));
  }

  /**
   * Calculate housing cost ratio
   */
  private calculateHousingRatio(categories: SpendingPattern[], totalIncome: number): number {
    const housingCategories = ['housing', 'rent', 'mortgage', 'utilities'];
    const housingTotal = categories
      .filter(cat => housingCategories.some(housing => 
        cat.categoryName.toLowerCase().includes(housing)
      ))
      .reduce((sum, cat) => sum + cat.currentAmount, 0);

    return totalIncome > 0 ? (housingTotal / totalIncome) * 100 : 0;
  }

  /**
   * Calculate total subscription/recurring expenses
   */
  private calculateSubscriptionTotal(categories: SpendingPattern[]): number {
    const subscriptionCategories = ['subscription', 'recurring', 'membership'];
    return categories
      .filter(cat => subscriptionCategories.some(sub => 
        cat.categoryName.toLowerCase().includes(sub)
      ))
      .reduce((sum, cat) => sum + cat.currentAmount, 0);
  }

  /**
   * Detect financial anomalies
   */
  private detectAnomalies(snapshot: any, categories: SpendingPattern[]): FinancialAnomaly[] {
    const anomalies: FinancialAnomaly[] = [];

    // Check for negative balance trend
    if (snapshot.balance_change < 0) {
      anomalies.push({
        type: 'balance_negative',
        severity: Math.abs(snapshot.balance_change) > snapshot.total_income * 0.5 ? 'high' : 'medium',
        description: `Your balance decreased by ${Math.abs(snapshot.balance_change).toLocaleString()} this month`,
        affectedAmount: Math.abs(snapshot.balance_change)
      });
    }

    return anomalies;
  }

  /**
   * Generate insights based on analysis
   */
  private async generateInsights(
    currentMonth: MonthlyAnalysis, 
    previousMonth?: MonthlyAnalysis
  ): Promise<InsightType[]> {
    const insights: InsightType[] = [];

    // Compare with previous month if available
    if (previousMonth) {
      insights.push(...this.generateComparativeInsights(currentMonth, previousMonth));
    }

    // Generate threshold-based insights
    insights.push(...this.generateThresholdInsights(currentMonth));

    // Generate achievement insights
    insights.push(...this.generateAchievementInsights(currentMonth, previousMonth));

    return insights;
  }

  /**
   * Generate insights by comparing current vs previous month
   */
  private generateComparativeInsights(current: MonthlyAnalysis, previous: MonthlyAnalysis): InsightType[] {
    const insights: InsightType[] = [];

    // -------- Expense increase MoM --------
    const { percentChange: expenseChange } = detectMoMChange([previous.totalExpenses, current.totalExpenses], this.thresholds.expenseIncreasePercent);
    if (Math.abs(expenseChange) > this.thresholds.expenseIncreasePercent) {
      insights.push({
        id: `expense-increase-${Date.now()}`,
        type: 'alert',
        title: 'Expenses Increased Significantly',
        description: `Your expenses increased by ${expenseChange.toFixed(1)}% this month (${current.totalExpenses.toLocaleString()} vs ${previous.totalExpenses.toLocaleString()}).`,
        severity: expenseChange > 2 * this.thresholds.expenseIncreasePercent ? 'high' : 'medium',
        category: 'spending',
        actionable: true,
        actionText: 'Review Transactions',
        actionUrl: '/transactions',
        dismissible: true,
        createdAt: new Date()
      });
    }

    // -------- Income decrease MoM --------
    const incomeChange = ((current.totalIncome - previous.totalIncome) / (previous.totalIncome || 1)) * 100;
    if (incomeChange < -this.thresholds.incomeDecreasePercent) {
      insights.push({
        id: `income-drop-${Date.now()}`,
        type: 'alert',
        title: 'Income Decreased',
        description: `Your income dropped by ${Math.abs(incomeChange).toFixed(1)}% this month (${current.totalIncome.toLocaleString()} vs ${previous.totalIncome.toLocaleString()}).`,
        severity: Math.abs(incomeChange) > this.thresholds.incomeDecreasePercent * 2 ? 'high' : 'medium',
        category: 'income',
        actionable: false,
        dismissible: true,
        createdAt: new Date()
      });
    }

    // -------- Category spending spikes --------
    current.categoryBreakdown.forEach(curCat => {
      const prevCat = previous.categoryBreakdown.find(c => c.categoryId === curCat.categoryId);
      if (prevCat && prevCat.currentAmount > 0) {
        if (detectSpike(curCat.currentAmount, prevCat.currentAmount, this.thresholds.categorySpikePer)) {
          const catChange = ((curCat.currentAmount - prevCat.currentAmount) / prevCat.currentAmount) * 100;
          insights.push({
            id: `category-spike-${curCat.categoryId}-${Date.now()}`,
            type: 'alert',
            title: `Spike in ${curCat.categoryName} spending`,
            description: `${curCat.categoryName} spending increased by ${catChange.toFixed(1)}% this month.`,
            severity: catChange > this.thresholds.categorySpikePer * 1.5 ? 'high' : 'medium',
            category: curCat.categoryName,
            actionable: true,
            actionText: 'Review Category',
            actionUrl: `/reports?category=${curCat.categoryId}`,
            dismissible: true,
            createdAt: new Date()
          });
        }
      }
    });

    return insights;
  }

  /**
   * Generate insights based on threshold violations
   */
  private generateThresholdInsights(current: MonthlyAnalysis): InsightType[] {
    const insights: InsightType[] = [];

    // ---- Housing cost ratio ----
    if (current.housingRatio > this.thresholds.housingRatioPercent) {
      insights.push({
        id: `housing-ratio-${Date.now()}`,
        type: 'tip',
        title: 'Housing Costs High',
        description: `Your housing costs are ${current.housingRatio.toFixed(1)}% of income. Financial experts recommend keeping this under ${this.thresholds.housingRatioPercent}%.`,
        severity: 'medium',
        category: 'budgeting',
        actionable: true,
        actionText: 'Review Housing Budget',
        dismissible: true,
        createdAt: new Date()
      });
    }

    // ---- Subscription cost alert ----
    if (current.subscriptionTotal > this.thresholds.subscriptionThreshold) {
      insights.push({
        id: `subscription-alert-${Date.now()}`,
        type: 'recommendation',
        title: 'High Recurring Expenses',
        description: `You have ₦${current.subscriptionTotal.toLocaleString()} in recurring charges this month. Consider reviewing subscriptions for potential savings.`,
        severity: 'low',
        category: 'subscriptions',
        actionable: true,
        actionText: 'Review Subscriptions',
        actionUrl: '/subscriptions',
        dismissible: true,
        createdAt: new Date()
      });
    }

    // ---- Cash flow warning ----
    if (current.totalExpenses > current.totalIncome * 0.9) {
      insights.push({
        id: `cashflow-warning-${Date.now()}`,
        type: 'alert',
        title: 'Cash Flow Warning',
        description: 'Your expenses are close to or exceed your income this month. Review discretionary spending to avoid negative cash flow.',
        severity: 'high',
        category: 'spending',
        actionable: true,
        actionText: 'View Spending',
        actionUrl: '/transactions',
        dismissible: true,
        createdAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Generate achievement insights for positive behaviors
   */
  private generateAchievementInsights(current: MonthlyAnalysis, previous?: MonthlyAnalysis): InsightType[] {
    const insights: InsightType[] = [];

    // Positive balance growth
    if (current.balanceTrend > 0) {
      insights.push({
        id: `balance-growth-${Date.now()}`,
        type: 'achievement',
        title: 'Great Job!',
        description: `Your balance grew by ${current.balanceTrend.toLocaleString()} this month. Keep up the good work!`,
        severity: 'low',
        category: 'achievement',
        actionable: false,
        dismissible: true,
        createdAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Create summary of insights
   */
  private createInsightsSummary(insights: InsightType[]) {
    return {
      totalInsights: insights.length,
      alertCount: insights.filter(i => i.type === 'alert').length,
      tipCount: insights.filter(i => i.type === 'tip').length,
      achievementCount: insights.filter(i => i.type === 'achievement').length,
      recommendationCount: insights.filter(i => i.type === 'recommendation').length
    };
  }
}

// Factory function for easy service creation
export const createInsightsAnalysisService = (userId: string, customThresholds?: Partial<InsightThresholds>) => {
  return new InsightsAnalysisService(userId, customThresholds);
};
