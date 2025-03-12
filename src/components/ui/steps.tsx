import * as React from "react";
import { cn } from "@/lib/utils";

interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const Steps = React.forwardRef<HTMLDivElement, StepsProps>(
  ({ steps, currentStep, onStepClick, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex w-full items-center justify-between", className)}
        {...props}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          // Don't pass any props to React.Fragment, only use the key
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(index)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    {
                      "border-primary bg-primary text-primary-foreground":
                        isCompleted || isCurrent,
                      "border-muted-foreground": !isCompleted && !isCurrent,
                    }
                  )}
                  disabled={!onStepClick}
                >
                  {isCompleted ? (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span
                      className={cn({
                        "text-primary-foreground": isCurrent,
                        "text-muted-foreground": !isCurrent,
                      })}
                    >
                      {index + 1}
                    </span>
                  )}
                </button>
                <span
                  className={cn("mt-2 text-sm font-medium", {
                    "text-primary": isCompleted || isCurrent,
                    "text-muted-foreground": !isCompleted && !isCurrent,
                  })}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn("h-[2px] flex-1", {
                    "bg-primary": index < currentStep,
                    "bg-muted": index >= currentStep,
                  })}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

Steps.displayName = "Steps";

export { Steps };