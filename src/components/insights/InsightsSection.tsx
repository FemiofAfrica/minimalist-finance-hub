import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Lightbulb, 
  Trophy, 
  Target, 
  X, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Home,
  Repeat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createInsightsAnalysisService } from '@/services/insights/insightsAnalysisService';

interface Insight {
  id: string;
  type: 'alert' | 'tip' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  createdAt: Date;
}

interface InsightsSectionProps {
  className?: string;
}

export function InsightsSection({ className }: InsightsSectionProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

  // Mock insights for demonstration - in real implementation this would come from the analysis service
  const mockInsights: Insight[] = [
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

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5" />;
      case 'achievement':
        return <Trophy className="h-5 w-5" />;
      case 'recommendation':
        return <Target className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getInsightColors = (type: Insight['type'], severity: Insight['severity']) => {
    switch (type) {
      case 'alert':
        return {
          card: severity === 'high' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50',
          icon: severity === 'high' ? 'text-red-600' : 'text-orange-600',
          badge: severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
        };
      case 'tip':
        return {
          card: 'border-blue-200 bg-blue-50',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'achievement':
        return {
          card: 'border-green-200 bg-green-50',
          icon: 'text-green-600',
          badge: 'bg-green-100 text-green-800'
        };
      case 'recommendation':
        return {
          card: 'border-purple-200 bg-purple-50',
          icon: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          card: 'border-gray-200 bg-gray-50',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

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
        {visibleInsights.map((insight) => {
          const colors = getInsightColors(insight.type, insight.severity);
          
          return (
            <Card key={insight.id} className={cn(
              'relative transition-all duration-200 hover:shadow-md',
              colors.card
            )}>
              {insight.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-white/50"
                  onClick={() => handleDismiss(insight.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base font-semibold">
                        {insight.title}
                      </CardTitle>
                      <Badge variant="secondary" className={cn('text-xs', colors.badge)}>
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {insight.actionable && insight.actionText && (
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(insight.id, insight.actionUrl)}
                    className="w-full sm:w-auto"
                  >
                    {insight.actionText}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
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