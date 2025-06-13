import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { TrendDirection } from "@/types/comparativeData";
import { getTrendColors, MetricContext, formatPercentageChange } from "@/utils/trendHelpers";

const percentageChangeVariants = cva(
  "inline-flex items-center font-medium transition-colors",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg"
      },
      variant: {
        default: "",
        subtle: "",
        strong: ""
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default"
    }
  }
);

export interface PercentageChangeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof percentageChangeVariants> {
  percentage: number;
  direction: TrendDirection['direction'];
  context: MetricContext;
  showSign?: boolean;
  precision?: number;
  maxValue?: number;
  prefix?: string;
  suffix?: string;
}

const PercentageChange = React.forwardRef<HTMLSpanElement, PercentageChangeProps>(
  ({ 
    className,
    percentage,
    direction,
    context,
    size,
    variant = 'default',
    showSign = true,
    precision = 1,
    maxValue = 999,
    prefix,
    suffix,
    ...props 
  }, ref) => {
    const colors = getTrendColors(direction, context, variant);
    
    const formattedPercentage = formatPercentageChange(percentage, {
      showSign,
      precision,
      maxValue
    });

    const displayText = `${prefix || ''}${formattedPercentage}${suffix || ''}`;
    
    // Create accessible description
    const ariaLabel = React.useMemo(() => {
      if (!isFinite(percentage)) {
        return "No data available";
      }
      
      const absPercentage = Math.abs(percentage);
      const changeType = direction === 'up' ? 'increase' : direction === 'down' ? 'decrease' : 'no change';
      
      return `${absPercentage.toFixed(precision)} percent ${changeType}`;
    }, [percentage, direction, precision]);

    return (
      <span
        ref={ref}
        className={cn(
          percentageChangeVariants({ size, variant }),
          colors.text,
          className
        )}
        aria-label={ariaLabel}
        title={ariaLabel}
        {...props}
      >
        {displayText}
      </span>
    );
  }
);

PercentageChange.displayName = "PercentageChange";

export { PercentageChange, percentageChangeVariants }; 