import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { TrendDirection } from "@/types/comparativeData";
import { getTrendColors, MetricContext, getTrendDescription } from "@/utils/trendHelpers";
import { TrendArrow } from "./TrendArrow";
import { PercentageChange } from "./PercentageChange";

const trendBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-2.5 py-1.5 text-sm",
        lg: "px-3 py-2 text-base",
        xl: "px-4 py-2.5 text-lg"
      },
      variant: {
        default: "",
        subtle: "",
        strong: "",
        outline: "bg-transparent"
      },
      layout: {
        horizontal: "flex-row",
        vertical: "flex-col gap-0.5",
        compact: "flex-row gap-0.5"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
      layout: "horizontal"
    }
  }
);

export interface TrendBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof trendBadgeVariants> {
  percentage: number;
  direction: TrendDirection['direction'];
  context: MetricContext;
  strength?: TrendDirection['strength'];
  showArrow?: boolean;
  showPercentage?: boolean;
  showSign?: boolean;
  precision?: number;
  maxValue?: number;
  label?: string;
}

const TrendBadge = React.forwardRef<HTMLDivElement, TrendBadgeProps>(
  ({ 
    className,
    percentage,
    direction,
    context,
    strength = 'moderate',
    size,
    variant = 'default',
    layout = 'horizontal',
    showArrow = true,
    showPercentage = true,
    showSign = true,
    precision = 1,
    maxValue = 999,
    label,
    ...props 
  }, ref) => {
    const colors = getTrendColors(direction, context, variant);
    
    // Generate accessible description
    const accessibleDescription = getTrendDescription(direction, percentage, context);
    
    // Determine arrow and text sizes based on badge size
    const getComponentSizes = () => {
      switch (size) {
        case 'sm':
          return { arrow: 'sm' as const, text: 'sm' as const };
        case 'lg':
          return { arrow: 'lg' as const, text: 'lg' as const };
        case 'xl':
          return { arrow: 'xl' as const, text: 'xl' as const };
        default:
          return { arrow: 'md' as const, text: 'md' as const };
      }
    };

    const componentSizes = getComponentSizes();

    return (
      <div
        ref={ref}
        className={cn(
          trendBadgeVariants({ size, variant, layout }),
          variant !== 'outline' && [colors.background, colors.border],
          variant === 'outline' && [colors.text, colors.border],
          className
        )}
        role="status"
        aria-label={accessibleDescription}
        title={accessibleDescription}
        {...props}
      >
        {showArrow && (
          <TrendArrow
            direction={direction}
            context={context}
            strength={strength}
            size={componentSizes.arrow}
            variant={variant === 'outline' ? 'default' : variant}
          />
        )}
        
        {label && (
          <span className={cn(
            "font-medium",
            variant === 'outline' ? colors.text : "text-inherit"
          )}>
            {label}
          </span>
        )}
        
        {showPercentage && (
          <PercentageChange
            percentage={percentage}
            direction={direction}
            context={context}
            size={componentSizes.text}
            variant={variant === 'outline' ? 'default' : variant}
            showSign={showSign}
            precision={precision}
            maxValue={maxValue}
          />
        )}
      </div>
    );
  }
);

TrendBadge.displayName = "TrendBadge";

export { TrendBadge, trendBadgeVariants };