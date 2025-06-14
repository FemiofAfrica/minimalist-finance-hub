import React from 'react';
import { ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import type { FinancialExplanation, ExplanationType } from '@/types/chartData';

interface ExplanationCardProps {
  explanations: FinancialExplanation[];
  title?: string;
  className?: string;
  defaultExpanded?: boolean;
  showConfidence?: boolean;
  maxVisible?: number;
}

const getExplanationIcon = (type: ExplanationType) => {
  switch (type) {
    case 'positive':
      return <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />;
    case 'negative':
      return <TrendingDown className="w-4 h-4 text-red-500" aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" aria-hidden="true" />;
    case 'neutral':
    default:
      return <Info className="w-4 h-4 text-blue-500" aria-hidden="true" />;
  }
};

const getExplanationColors = (type: ExplanationType) => {
  switch (type) {
    case 'positive':
      return {
        border: 'border-l-green-400',
        bg: 'bg-green-50 dark:bg-green-900/10',
        text: 'text-green-900 dark:text-green-100'
      };
    case 'negative':
      return {
        border: 'border-l-red-400',
        bg: 'bg-red-50 dark:bg-red-900/10',
        text: 'text-red-900 dark:text-red-100'
      };
    case 'warning':
      return {
        border: 'border-l-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/10',
        text: 'text-yellow-900 dark:text-yellow-100'
      };
    case 'neutral':
    default:
      return {
        border: 'border-l-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        text: 'text-blue-900 dark:text-blue-100'
      };
  }
};

const getSignificanceBadge = (significance: string, isMobile: boolean) => {
  const colors = {
    major: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    significant: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    minor: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium border",
      isMobile ? "px-2 py-1 text-xs" : "px-2 py-1 text-xs",
      colors[significance as keyof typeof colors] || colors.minor
    )}>
      {significance}
    </span>
  );
};

export default function ExplanationCard({
  explanations,
  title = "Financial Insights",
  className = "",
  defaultExpanded = false,
  showConfidence = false,
  maxVisible = 3
}: ExplanationCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [showAll, setShowAll] = React.useState(false);
  const { isMobile, isTablet } = useResponsive();

  if (!explanations || explanations.length === 0) {
    return null;
  }

  const visibleExplanations = showAll ? explanations : explanations.slice(0, maxVisible);
  const hasMore = explanations.length > maxVisible;

  // Generate unique IDs for accessibility
  const headerId = React.useId();
  const contentId = React.useId();

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}>
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-lg",
          // Responsive padding and touch targets
          isMobile ? "p-3 min-h-[56px]" : "p-4"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-describedby={headerId}
      >
        <div className={cn(
          "flex items-center gap-3",
          // Responsive layout
          isMobile ? "flex-1 min-w-0" : ""
        )}>
          <Info className={cn(
            "text-blue-500 flex-shrink-0",
            isMobile ? "w-5 h-5" : "w-5 h-5"
          )} aria-hidden="true" />
          <h3 
            id={headerId}
            className={cn(
              "font-semibold text-gray-900 dark:text-gray-100",
              isMobile ? "text-sm truncate" : "text-base"
            )}
          >
            {title}
          </h3>
          <span 
            className={cn(
              "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium rounded-full flex-shrink-0",
              isMobile ? "text-xs px-2 py-1" : "text-xs px-2 py-1"
            )}
            aria-label={`${explanations.length} insights available`}
          >
            {explanations.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={cn(
            "text-gray-400 flex-shrink-0",
            isMobile ? "w-5 h-5" : "w-5 h-5"
          )} aria-hidden="true" />
        ) : (
          <ChevronDown className={cn(
            "text-gray-400 flex-shrink-0",
            isMobile ? "w-5 h-5" : "w-5 h-5"
          )} aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div 
          id={contentId} 
          className="border-t border-gray-200 dark:border-gray-700"
          role="region"
          aria-label="Financial insights content"
        >
          <div className={cn(
            "space-y-4",
            // Responsive padding
            isMobile ? "p-3" : "p-4"
          )}>
            {visibleExplanations.map((explanation, index) => {
              const colors = getExplanationColors(explanation.type);
              const icon = getExplanationIcon(explanation.type);

              return (
                <div
                  key={explanation.id}
                  className={cn(
                    "rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm",
                    colors.border,
                    colors.bg,
                    // Responsive padding
                    isMobile ? "p-3" : "p-4"
                  )}
                  role="article"
                  aria-labelledby={`explanation-title-${index}`}
                >
                  {/* Explanation Header */}
                  <div className={cn(
                    "flex items-start gap-3 mb-2",
                    // Stack on mobile for better readability
                    isMobile ? "flex-col gap-2" : "justify-between"
                  )}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {icon}
                      <div className="flex-1 min-w-0">
                        <h4 
                          id={`explanation-title-${index}`}
                          className={cn(
                            "font-semibold",
                            colors.text,
                            isMobile ? "text-sm" : "text-sm"
                          )}
                        >
                          {explanation.title}
                        </h4>
                        <div className={cn(
                          "flex items-center gap-2 mt-1",
                          // Stack badges on mobile
                          isMobile ? "flex-col items-start gap-1" : "flex-wrap"
                        )}>
                          {getSignificanceBadge(explanation.significance, isMobile)}
                          {showConfidence && (
                            <span className={cn(
                              "text-gray-600 dark:text-gray-400",
                              isMobile ? "text-xs" : "text-xs"
                            )}>
                              {Math.round(explanation.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={cn(
                    "leading-relaxed mb-3 opacity-90",
                    colors.text,
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {explanation.description}
                  </p>

                  {/* Recommendation */}
                  {explanation.recommendation && (
                    <div className={cn(
                      "rounded-md bg-white dark:bg-gray-800 bg-opacity-60 border border-current border-opacity-20",
                      isMobile ? "p-2" : "p-3"
                    )}>
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          isMobile ? "text-sm" : "text-sm"
                        )} role="img" aria-label="Recommendation">💡</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-gray-700 dark:text-gray-300 mb-1",
                            isMobile ? "text-xs" : "text-xs"
                          )}>
                            Recommendation
                          </p>
                          <p className={cn(
                            "opacity-80",
                            colors.text,
                            isMobile ? "text-sm" : "text-sm"
                          )}>
                            {explanation.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {explanation.metadata && (
                    <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                      <div className={cn(
                        "gap-4 text-xs",
                        // Stack metadata on mobile
                        isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-2"
                      )}>
                        {explanation.metadata.changePercentage !== undefined && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Change:</span>
                            <span className={cn(
                              "ml-1 font-mono font-medium",
                              colors.text
                            )}>
                              {explanation.metadata.changePercentage > 0 ? '+' : ''}
                              {explanation.metadata.changePercentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {explanation.metadata.timeframe && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Period:</span>
                            <span className={cn(
                              "ml-1",
                              colors.text
                            )}>
                              {explanation.metadata.timeframe}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Show More/Less Button */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(!showAll);
                  }}
                  className={cn(
                    "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md",
                    // Ensure minimum touch target
                    isMobile ? "text-sm px-4 py-2 min-h-[44px] flex items-center justify-center mx-auto" : "text-sm"
                  )}
                  aria-expanded={showAll}
                  aria-label={showAll ? "Show fewer insights" : `Show ${explanations.length - maxVisible} more insights`}
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-4 h-4 inline mr-1" aria-hidden="true" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 inline mr-1" aria-hidden="true" />
                      Show {explanations.length - maxVisible} More
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 