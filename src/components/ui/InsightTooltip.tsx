import React from 'react';
import { Info, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import type { FinancialExplanation, ExplanationType } from '@/types/chartData';

interface InsightTooltipProps {
  explanation: FinancialExplanation;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const getExplanationIcon = (type: ExplanationType) => {
  switch (type) {
    case 'positive':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'negative':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'neutral':
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const getExplanationColors = (type: ExplanationType) => {
  switch (type) {
    case 'positive':
      return {
        border: 'border-green-200',
        bg: 'bg-green-50',
        text: 'text-green-900'
      };
    case 'negative':
      return {
        border: 'border-red-200',
        bg: 'bg-red-50',
        text: 'text-red-900'
      };
    case 'warning':
      return {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        text: 'text-yellow-900'
      };
    case 'neutral':
    default:
      return {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-900'
      };
  }
};

export default function InsightTooltip({ 
  explanation, 
  children, 
  side = 'top',
  className = '' 
}: InsightTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const colors = getExplanationColors(explanation.type);
  const icon = getExplanationIcon(explanation.type);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let x = 0;
    let y = 0;

    switch (side) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.bottom + 8;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
    }

    // Ensure tooltip stays within viewport
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8));

    setPosition({ x, y });
  }, [side]);

  React.useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        role="button"
        aria-describedby={`tooltip-${explanation.id}`}
        aria-label="Show insight details"
      >
        {children}
      </div>

      {isVisible && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsVisible(false)}
          />
          
          {/* Tooltip */}
          <div
            ref={tooltipRef}
            id={`tooltip-${explanation.id}`}
            className={`
              fixed z-50 max-w-sm p-4 rounded-lg shadow-lg border
              ${colors.bg} ${colors.border} ${colors.text}
              animate-in fade-in-0 zoom-in-95 duration-200
            `}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
            role="tooltip"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight">
                  {explanation.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-75 capitalize">
                    {explanation.significance} change
                  </span>
                  <span className="text-xs opacity-60">
                    {Math.round(explanation.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed mb-3 opacity-90">
              {explanation.description}
            </p>

            {/* Recommendation */}
            {explanation.recommendation && (
              <div className="pt-2 border-t border-current border-opacity-20">
                <p className="text-xs font-medium opacity-75 mb-1">
                  💡 Recommendation
                </p>
                <p className="text-xs leading-relaxed opacity-80">
                  {explanation.recommendation}
                </p>
              </div>
            )}

            {/* Metadata */}
            {explanation.metadata?.changePercentage && (
              <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                <div className="flex justify-between items-center text-xs opacity-60">
                  <span>Change:</span>
                  <span className="font-mono">
                    {explanation.metadata.changePercentage > 0 ? '+' : ''}
                    {explanation.metadata.changePercentage.toFixed(1)}%
                  </span>
                </div>
                {explanation.metadata.timeframe && (
                  <div className="flex justify-between items-center text-xs opacity-60 mt-1">
                    <span>Period:</span>
                    <span>{explanation.metadata.timeframe}</span>
                  </div>
                )}
              </div>
            )}

            {/* Arrow pointer */}
            <div
              className={`
                absolute w-2 h-2 transform rotate-45 ${colors.bg} border
                ${side === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
                ${side === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
                ${side === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
                ${side === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
                ${colors.border}
              `}
            />
          </div>
        </>
      )}
    </>
  );
} 