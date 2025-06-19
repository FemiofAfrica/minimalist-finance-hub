import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Lightbulb, 
  Trophy, 
  Target, 
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InsightCardData {
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

interface InsightCardProps {
  insight: InsightCardData;
  onDismiss?: (insightId: string) => void;
  onAction?: (insightId: string, actionUrl?: string) => void;
  className?: string;
}

export function InsightCard({ insight, onDismiss, onAction, className }: InsightCardProps) {
  const getInsightIcon = (type: InsightCardData['type']) => {
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

  const getInsightColors = (type: InsightCardData['type'], severity: InsightCardData['severity']) => {
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

  const colors = getInsightColors(insight.type, insight.severity);

  const handleDismiss = () => {
    if (onDismiss && insight.dismissible) {
      onDismiss(insight.id);
    }
  };

  const handleAction = () => {
    if (onAction && insight.actionable) {
      onAction(insight.id, insight.actionUrl);
    }
  };

  return (
    <Card 
      className={cn(
        'relative transition-all duration-200 hover:shadow-md',
        colors.card,
        className
      )}
      role="article"
      aria-labelledby={`insight-title-${insight.id}`}
      aria-describedby={`insight-description-${insight.id}`}
    >
      {insight.dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-white/50 z-10"
          onClick={handleDismiss}
          aria-label={`Dismiss ${insight.title} insight`}
          title="Dismiss insight"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div 
            className={cn('flex-shrink-0 mt-0.5', colors.icon)}
            aria-hidden="true"
          >
            {getInsightIcon(insight.type)}
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle 
                id={`insight-title-${insight.id}`}
                className="text-base font-semibold"
              >
                {insight.title}
              </CardTitle>
              <Badge 
                variant="secondary" 
                className={cn('text-xs', colors.badge)}
                aria-label={`Insight type: ${insight.type}`}
              >
                {insight.type}
              </Badge>
            </div>
            <p 
              id={`insight-description-${insight.id}`}
              className="text-sm text-gray-700 leading-relaxed"
            >
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
            onClick={handleAction}
            className="w-full sm:w-auto"
            aria-label={`${insight.actionText} for ${insight.title}`}
          >
            {insight.actionText}
          </Button>
        </CardContent>
      )}
    </Card>
  );
} 