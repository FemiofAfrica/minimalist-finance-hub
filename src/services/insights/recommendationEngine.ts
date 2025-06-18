import { InsightType, SpendingPattern, MonthlyAnalysis } from '@/types/insights';

export interface RecommendationRule {
  id: string;
  name: string;
  condition: (data: FinancialData) => boolean;
  generateRecommendation: (data: FinancialData) => InsightType;
  priority: number; // 1-10, higher = more important
}

export interface FinancialData {
  currentMonth: MonthlyAnalysis;
  previousMonth?: MonthlyAnalysis;
  userProfile?: {
    age?: number;
    income?: number;
    goals?: string[];
  };
}

export class RecommendationEngine {
  private rules: RecommendationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Generate recommendations based on user's financial data
   */
  generateRecommendations(data: FinancialData): InsightType[] {
    const recommendations: InsightType[] = [];
    
    // Apply all rules and collect recommendations
    this.rules.forEach(rule => {
      try {
        if (rule.condition(data)) {
          const recommendation = rule.generateRecommendation(data);
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.warn(`Error applying rule ${rule.id}:`, error);
      }
    });

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => {
        const priorityA = this.getRecommendationPriority(a.severity);
        const priorityB = this.getRecommendationPriority(b.severity);
        return priorityB - priorityA;
      })
      .slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Initialize all recommendation rules
   */
  private initializeRules(): void {
    this.rules = [
      this.createEmergencyFundRule(),
      this.createHighSpendingRule(),
      this.createIncomeDeclineRule(),
      this.createSavingsGoalRule(),
      this.createDebtReductionRule(),
      this.createSubscriptionOptimizationRule(),
      this.createBudgetingRule(),
      this.createInvestmentRule()
    ];
  }

  /**
   * Emergency fund recommendation
   */
  private createEmergencyFundRule(): RecommendationRule {
    return {
      id: 'emergency-fund',
      name: 'Emergency Fund',
      priority: 9,
      condition: (data) => {
        const monthlyExpenses = data.currentMonth.totalExpenses;
        const currentBalance = data.currentMonth.netAmount;
        const emergencyFundTarget = monthlyExpenses * 3; // 3 months of expenses
        
        return currentBalance < emergencyFundTarget;
      },
      generateRecommendation: (data) => {
        const monthlyExpenses = data.currentMonth.totalExpenses;
        const emergencyFundTarget = monthlyExpenses * 3;
        const currentBalance = Math.max(0, data.currentMonth.netAmount);
        const shortfall = emergencyFundTarget - currentBalance;
        
        return {
          id: `emergency-fund-${Date.now()}`,
          type: 'recommendation',
          title: 'Build Your Emergency Fund',
          description: `You need ${shortfall.toLocaleString()} more to reach a 3-month emergency fund. Consider saving ${(shortfall / 6).toLocaleString()} per month to build this safety net.`,
          severity: 'high',
          category: 'savings',
          actionable: true,
          actionText: 'Set Up Automatic Savings',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * High spending alert and recommendation
   */
  private createHighSpendingRule(): RecommendationRule {
    return {
      id: 'high-spending',
      name: 'High Spending Alert',
      priority: 8,
      condition: (data) => {
        if (!data.previousMonth) return false;
        
        const currentExpenses = data.currentMonth.totalExpenses;
        const previousExpenses = data.previousMonth.totalExpenses;
        const increasePercent = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
        
        return increasePercent > 25; // 25% increase threshold
      },
      generateRecommendation: (data) => {
        const currentExpenses = data.currentMonth.totalExpenses;
        const previousExpenses = data.previousMonth!.totalExpenses;
        const increasePercent = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
        
        return {
          id: `high-spending-${Date.now()}`,
          type: 'alert',
          title: 'Spending Increased Significantly',
          description: `Your expenses increased by ${increasePercent.toFixed(1)}% this month. Review your recent transactions to identify areas where you can cut back.`,
          severity: 'medium',
          category: 'spending',
          actionable: true,
          actionText: 'Review Transactions',
          actionUrl: '/transactions',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Income decline recommendation
   */
  private createIncomeDeclineRule(): RecommendationRule {
    return {
      id: 'income-decline',
      name: 'Income Decline',
      priority: 10,
      condition: (data) => {
        if (!data.previousMonth) return false;
        
        const currentIncome = data.currentMonth.totalIncome;
        const previousIncome = data.previousMonth.totalIncome;
        const declinePercent = ((previousIncome - currentIncome) / previousIncome) * 100;
        
        return declinePercent > 15; // 15% decline threshold
      },
      generateRecommendation: (data) => {
        const currentIncome = data.currentMonth.totalIncome;
        const previousIncome = data.previousMonth!.totalIncome;
        const declinePercent = ((previousIncome - currentIncome) / previousIncome) * 100;
        
        return {
          id: `income-decline-${Date.now()}`,
          type: 'alert',
          title: 'Income Decreased',
          description: `Your income decreased by ${declinePercent.toFixed(1)}% this month. Consider reviewing your budget and reducing non-essential expenses.`,
          severity: 'high',
          category: 'income',
          actionable: true,
          actionText: 'Review Budget',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Savings goal recommendation
   */
  private createSavingsGoalRule(): RecommendationRule {
    return {
      id: 'savings-goal',
      name: 'Savings Goal',
      priority: 6,
      condition: (data) => {
        const savingsRate = data.currentMonth.netAmount / data.currentMonth.totalIncome;
        return savingsRate < 0.1; // Less than 10% savings rate
      },
      generateRecommendation: (data) => {
        const currentSavingsRate = (data.currentMonth.netAmount / data.currentMonth.totalIncome) * 100;
        const targetSavingsRate = 20;
        const additionalSavingsNeeded = (data.currentMonth.totalIncome * (targetSavingsRate - currentSavingsRate)) / 100;
        
        return {
          id: `savings-goal-${Date.now()}`,
          type: 'tip',
          title: 'Increase Your Savings Rate',
          description: `You're currently saving ${currentSavingsRate.toFixed(1)}% of your income. Try to save ${additionalSavingsNeeded.toLocaleString()} more monthly to reach the recommended 20% savings rate.`,
          severity: 'medium',
          category: 'savings',
          actionable: true,
          actionText: 'Set Savings Goal',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Debt reduction recommendation
   */
  private createDebtReductionRule(): RecommendationRule {
    return {
      id: 'debt-reduction',
      name: 'Debt Reduction',
      priority: 7,
      condition: (data) => {
        // Look for debt-related categories
        const debtCategories = data.currentMonth.categoryBreakdown.filter(cat =>
          cat.categoryName.toLowerCase().includes('loan') ||
          cat.categoryName.toLowerCase().includes('credit') ||
          cat.categoryName.toLowerCase().includes('debt')
        );
        
        const totalDebtPayments = debtCategories.reduce((sum, cat) => sum + cat.currentAmount, 0);
        const debtToIncomeRatio = totalDebtPayments / data.currentMonth.totalIncome;
        
        return debtToIncomeRatio > 0.3; // More than 30% of income going to debt
      },
      generateRecommendation: (data) => {
        const debtCategories = data.currentMonth.categoryBreakdown.filter(cat =>
          cat.categoryName.toLowerCase().includes('loan') ||
          cat.categoryName.toLowerCase().includes('credit') ||
          cat.categoryName.toLowerCase().includes('debt')
        );
        
        const totalDebtPayments = debtCategories.reduce((sum, cat) => sum + cat.currentAmount, 0);
        const debtToIncomeRatio = (totalDebtPayments / data.currentMonth.totalIncome) * 100;
        
        return {
          id: `debt-reduction-${Date.now()}`,
          type: 'recommendation',
          title: 'Focus on Debt Reduction',
          description: `${debtToIncomeRatio.toFixed(1)}% of your income goes to debt payments. Consider the debt avalanche method: pay minimums on all debts, then put extra money toward the highest interest rate debt.`,
          severity: 'high',
          category: 'debt',
          actionable: true,
          actionText: 'Learn About Debt Strategies',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Subscription optimization recommendation
   */
  private createSubscriptionOptimizationRule(): RecommendationRule {
    return {
      id: 'subscription-optimization',
      name: 'Subscription Optimization',
      priority: 5,
      condition: (data) => {
        return data.currentMonth.subscriptionTotal > data.currentMonth.totalIncome * 0.15; // More than 15% on subscriptions
      },
      generateRecommendation: (data) => {
        const subscriptionPercent = (data.currentMonth.subscriptionTotal / data.currentMonth.totalIncome) * 100;
        
        return {
          id: `subscription-optimization-${Date.now()}`,
          type: 'tip',
          title: 'Review Your Subscriptions',
          description: `You're spending ${subscriptionPercent.toFixed(1)}% of your income on subscriptions (${data.currentMonth.subscriptionTotal.toLocaleString()}). Review and cancel unused subscriptions to free up money for savings.`,
          severity: 'low',
          category: 'subscriptions',
          actionable: true,
          actionText: 'Review Subscriptions',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Budgeting recommendation
   */
  private createBudgetingRule(): RecommendationRule {
    return {
      id: 'budgeting',
      name: 'Budgeting',
      priority: 4,
      condition: (data) => {
        // Recommend budgeting if spending is highly variable
        const categoryVariability = data.currentMonth.categoryBreakdown.filter(cat => cat.trend === 'volatile').length;
        return categoryVariability > 3; // More than 3 volatile categories
      },
      generateRecommendation: (data) => {
        return {
          id: `budgeting-${Date.now()}`,
          type: 'tip',
          title: 'Consider Creating a Budget',
          description: 'Your spending patterns show high variability across multiple categories. A monthly budget can help you gain better control over your finances and achieve your goals.',
          severity: 'low',
          category: 'budgeting',
          actionable: true,
          actionText: 'Start Budget Planning',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Investment recommendation
   */
  private createInvestmentRule(): RecommendationRule {
    return {
      id: 'investment',
      name: 'Investment',
      priority: 3,
      condition: (data) => {
        const savingsRate = data.currentMonth.netAmount / data.currentMonth.totalIncome;
        const hasEmergencyFund = data.currentMonth.netAmount > (data.currentMonth.totalExpenses * 3);
        
        return savingsRate > 0.2 && hasEmergencyFund; // Good savings rate and emergency fund
      },
      generateRecommendation: (data) => {
        return {
          id: `investment-${Date.now()}`,
          type: 'achievement',
          title: 'Ready to Invest!',
          description: 'Great job! You have a solid emergency fund and strong savings rate. Consider exploring investment options to grow your wealth over time.',
          severity: 'low',
          category: 'investment',
          actionable: true,
          actionText: 'Learn About Investing',
          dismissible: true,
          createdAt: new Date()
        };
      }
    };
  }

  /**
   * Get priority score for recommendation severity
   */
  private getRecommendationPriority(severity: string): number {
    switch (severity) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Add custom rule
   */
  addRule(rule: RecommendationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }
} 