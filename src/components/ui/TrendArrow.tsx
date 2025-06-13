import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { TrendDirection } from "@/types/comparativeData";
import { getTrendColors, MetricContext } from "@/utils/trendHelpers";

const trendArrowVariants = cva(
  "inline-flex items-center justify-center transition-colors",
  {
    variants: {
      size: {
        sm: "h-3 w-3",
        md: "h-4 w-4", 
        lg: "h-5 w-5",
        xl: "h-6 w-6"
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

export interface TrendArrowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof trendArrowVariants> {
  direction: TrendDirection['direction'];
  context: MetricContext;
  strength?: TrendDirection['strength'];
  showBackground?: boolean;
}

const TrendArrow = React.forwardRef<HTMLDivElement, TrendArrowProps>(
  ({ 
    className, 
    direction, 
    context, 
    strength = 'moderate',
    size, 
    variant = 'default',
    showBackground = false,
    ...props 
  }, ref) => {
    const colors = getTrendColors(direction, context, variant);
    
    const getIcon = () => {
      switch (direction) {
        case 'up':
          return TrendingUp;
        case 'down':
          return TrendingDown;
        case 'neutral':
        default:
          return Minus;
      }
    };

    const Icon = getIcon();
    
    const ariaLabel = `Trend ${direction}${strength ? ` (${strength})` : ''}`;

    return (
      <div
        ref={ref}
        className={cn(
          trendArrowVariants({ size, variant }),
          colors.text,
          showBackground && [colors.background, "rounded-full p-1"],
          className
        )}
        role="img"
        aria-label={ariaLabel}
        {...props}
      >
        <Icon className="h-full w-full" />
      </div>
    );
  }
);

TrendArrow.displayName = "TrendArrow";

export { TrendArrow, trendArrowVariants }; 