import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Database,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataAvailabilityProps {
  /** Main message to display */
  message: string;
  /** Suggestion or additional context */
  suggestion?: string;
  /** Variant for styling */
  variant?: 'info' | 'warning' | 'error' | 'neutral';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed information */
  showDetailed?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

const DataAvailability: React.FC<DataAvailabilityProps> = ({
  message,
  suggestion,
  variant = 'info',
  className = '',
  showDetailed = false,
  icon
}) => {
  // Get variant-specific styling and icons
  const getVariantConfig = (variant: string) => {
    switch (variant) {
      case 'error':
        return {
          alertVariant: 'destructive' as const,
          icon: <AlertCircle className="h-4 w-4" />,
          badgeVariant: 'destructive' as const,
          badgeText: 'Error',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950/20'
        };
      case 'warning':
        return {
          alertVariant: 'default' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          badgeVariant: 'secondary' as const,
          badgeText: 'Limited Data',
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50 dark:bg-amber-950/20'
        };
      case 'neutral':
        return {
          alertVariant: 'default' as const,
          icon: <Database className="h-4 w-4" />,
          badgeVariant: 'outline' as const,
          badgeText: 'No Data',
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20'
        };
      case 'info':
      default:
        return {
          alertVariant: 'default' as const,
          icon: <Info className="h-4 w-4" />,
          badgeVariant: 'secondary' as const,
          badgeText: 'Info',
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20'
        };
    }
  };

  const config = getVariantConfig(variant);
  const displayIcon = icon || config.icon;

  if (showDetailed) {
    return (
      <div className={cn("space-y-4", className)}>
        <Alert variant={config.alertVariant}>
          {displayIcon}
          <AlertDescription className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-medium">{message}</p>
                {suggestion && (
                  <p className="text-sm text-muted-foreground">{suggestion}</p>
                )}
              </div>
              <Badge variant={config.badgeVariant} className="flex-shrink-0">
                {config.badgeText}
              </Badge>
            </div>
            
            {/* Additional context for comparative insights */}
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Data Requirements
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Month-over-month: 2+ months of data</li>
                    <li>• Year-over-year: 12+ months of data</li>
                    <li>• Trend analysis: 3+ data points</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    What You'll Get
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Percentage change calculations</li>
                    <li>• Trend direction indicators</li>
                    <li>• Visual comparison charts</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Alert variant={config.alertVariant} className={cn(className)}>
      {displayIcon}
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p>{message}</p>
          {suggestion && (
            <p className="text-sm text-muted-foreground">{suggestion}</p>
          )}
        </div>
        <Badge variant={config.badgeVariant} className="flex-shrink-0">
          {config.badgeText}
        </Badge>
      </AlertDescription>
    </Alert>
  );
};

export default DataAvailability; 