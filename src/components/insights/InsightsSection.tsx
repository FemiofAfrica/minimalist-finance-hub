import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createInsightsAnalysisService } from '@/services/insights/insightsAnalysisService';
import { InsightCard, type InsightCardData } from './InsightCard';

interface InsightsSectionProps {
  className?: string;
}

export function InsightsSection({ className }: InsightsSectionProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<InsightCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

  // Mock insights for demonstration - in real implementation this would come from the analysis service
  const mockInsights: InsightCardData[] = [
    {
      id: 'expense-increase-1',
      type: 'alert',
      title: 'Expenses Increased Significantly',
      description: 'Your expenses increased by 35% this month. Consider reviewing your Transport (↑45%) and Dining (↑28%) spending.',
      severity: 'high',
      category: 'spending',
      actionable: true,
      actionText: 'Review Transactions',
      actionUrl: '/transactions',
      dismissible: true,
      createdAt: new Date()
    },
    {
      id: 'housing-ratio-1',
      type: 'tip',
      title: 'Housing Costs High',
      description: 'Your housing costs are 45% of income. Financial experts recommend keeping this under 30%.',
      severity: 'medium',
      category: 'budgeting',
      actionable: true,
      actionText: 'Review Housing Budget',
      dismissible: true,
      createdAt: new Date()
    },
    {
      id: 'balance-growth-1',
      type: 'achievement',
      title: 'Great Job!',
      description: "Your balance grew by ₦25,000 this month. You've maintained positive growth for 3 consecutive months!",
      severity: 'low',
      category: 'achievement',
      actionable: false,
      dismissible: true,
      createdAt: new Date()
    },
    {
      id: 'subscription-review-1',
      type: 'recommendation',
      title: 'Review Subscriptions',
      description: 'You have ₦15,000 in recurring monthly charges. Consider reviewing your subscriptions for potential savings.',
      severity: 'low',
      category: 'optimization',
      actionable: true,
      actionText: 'Review Subscriptions',
      dismissible: true,
      createdAt: new Date()
    }
  ];

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const service = createInsightsAnalysisService(user.id);
        const result = await service.analyzeUserInsights();
        setInsights(result.insights as any);
      } catch (error) {
        console.error('Failed to load insights:', error);
        // fallback to mock until analysis service stabilises
        setInsights(mockInsights);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => [...prev, insightId]);
    setInsights(prev => prev.filter(insight => insight.id !== insightId));
  };

  const handleAction = (insightId: string, actionUrl?: string) => {
    if (actionUrl) {
      // In a real app, this would use React Router or Next.js router
      window.location.href = actionUrl;
    }
  };

  const visibleInsights = insights.filter(insight => !dismissedInsights.includes(insight.id));

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Financial Insights</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Financial Insights</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">
                No new insights at the moment. Keep tracking your finances and we'll provide personalized tips.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Financial Insights</h2>
        </div>
        <Badge variant="secondary" className="text-xs">
          {visibleInsights.length} insights
        </Badge>
      </div>

      <div className="grid gap-4">
        {visibleInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={handleDismiss}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Summary stats */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {visibleInsights.filter(i => i.type === 'alert').length}
              </div>
              <div className="text-xs text-gray-600">Alerts</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {visibleInsights.filter(i => i.type === 'tip').length}
              </div>
              <div className="text-xs text-gray-600">Tips</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {visibleInsights.filter(i => i.type === 'achievement').length}
              </div>
              <div className="text-xs text-gray-600">Achievements</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {visibleInsights.filter(i => i.type === 'recommendation').length}
              </div>
              <div className="text-xs text-gray-600">Recommendations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 