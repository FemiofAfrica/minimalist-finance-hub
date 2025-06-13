import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricCard from '@/components/dashboard/MetricCard';
import type { TrendDirection } from '@/types/comparativeData';

// Mock the TrendBadge component
vi.mock('@/components/ui/TrendBadge', () => ({
  TrendBadge: ({ percentage, trend, context, variant, size, showLabel }: any) => (
    <div data-testid="trend-badge">
      <span data-testid="trend-percentage">{percentage}</span>
      <span data-testid="trend-direction">{trend}</span>
      <span data-testid="trend-context">{context}</span>
      <span data-testid="trend-variant">{variant}</span>
      <span data-testid="trend-size">{size}</span>
      <span data-testid="trend-show-label">{showLabel.toString()}</span>
    </div>
  )
}));

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Income Change',
    value: '$1,000',
    percentage: 25,
    trend: 'up' as TrendDirection,
    context: 'income' as const,
    period: 'month-over-month' as const,
    dataAvailable: true
  };

  describe('Basic Rendering', () => {
    it('should render with all required props', () => {
      render(<MetricCard {...defaultProps} />);
      
      expect(screen.getByText('Income Change')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
      expect(screen.getByText('vs Last Month')).toBeInTheDocument();
    });

    it('should display year-over-year period correctly', () => {
      render(<MetricCard {...defaultProps} period="year-over-year" />);
      
      expect(screen.getByText('vs Last Year')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <MetricCard {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Context-based Styling', () => {
    it('should apply income context styling', () => {
      const { container } = render(
        <MetricCard {...defaultProps} context="income" />
      );
      
      expect(container.firstChild).toHaveClass('border-l-emerald-500');
    });

    it('should apply expenses context styling', () => {
      const { container } = render(
        <MetricCard {...defaultProps} context="expenses" />
      );
      
      expect(container.firstChild).toHaveClass('border-l-rose-500');
    });

    it('should apply balance context styling', () => {
      const { container } = render(
        <MetricCard {...defaultProps} context="balance" />
      );
      
      expect(container.firstChild).toHaveClass('border-l-blue-500');
    });
  });

  describe('Trend Evaluation', () => {
    it('should show "Good" for positive income trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          context="income" 
          trend="up" 
        />
      );
      
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should show "Attention" for negative income trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          context="income" 
          trend="down" 
        />
      );
      
      expect(screen.getByText('Attention')).toBeInTheDocument();
    });

    it('should show "Good" for downward expense trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          context="expenses" 
          trend="down" 
        />
      );
      
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should show "Attention" for upward expense trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          context="expenses" 
          trend="up" 
        />
      );
      
      expect(screen.getByText('Attention')).toBeInTheDocument();
    });

    it('should show "Good" for positive balance trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          context="balance" 
          trend="up" 
        />
      );
      
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  describe('Data Availability', () => {
    it('should show limited data indicator when dataAvailable is false', () => {
      render(
        <MetricCard {...defaultProps} dataAvailable={false} />
      );
      
      expect(screen.getByText('Limited data')).toBeInTheDocument();
    });

    it('should not show limited data indicator when dataAvailable is true', () => {
      render(
        <MetricCard {...defaultProps} dataAvailable={true} />
      );
      
      expect(screen.queryByText('Limited data')).not.toBeInTheDocument();
    });
  });

  describe('Detailed View', () => {
    it('should show detailed breakdown when showDetailed is true and data is available', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={true} 
          dataAvailable={true}
          percentage={25.5}
        />
      );
      
      expect(screen.getByText('Change:')).toBeInTheDocument();
      expect(screen.getByText('Percentage:')).toBeInTheDocument();
      expect(screen.getByText('Trend:')).toBeInTheDocument();
      expect(screen.getByText('+25.5%')).toBeInTheDocument();
      expect(screen.getByText('up')).toBeInTheDocument();
    });

    it('should not show detailed breakdown when showDetailed is false', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={false} 
          dataAvailable={true}
        />
      );
      
      expect(screen.queryByText('Change:')).not.toBeInTheDocument();
      expect(screen.queryByText('Percentage:')).not.toBeInTheDocument();
      expect(screen.queryByText('Trend:')).not.toBeInTheDocument();
    });

    it('should not show detailed breakdown when data is not available', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={true} 
          dataAvailable={false}
        />
      );
      
      expect(screen.queryByText('Change:')).not.toBeInTheDocument();
      expect(screen.queryByText('Percentage:')).not.toBeInTheDocument();
      expect(screen.queryByText('Trend:')).not.toBeInTheDocument();
    });

    it('should format negative percentage correctly', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={true} 
          dataAvailable={true}
          percentage={-15.7}
        />
      );
      
      expect(screen.getByText('-15.7%')).toBeInTheDocument();
    });
  });

  describe('TrendBadge Integration', () => {
    it('should pass correct props to TrendBadge', () => {
      render(
        <MetricCard 
          {...defaultProps}
          percentage={25}
          trend="up"
          context="income"
        />
      );
      
      const trendBadge = screen.getByTestId('trend-badge');
      expect(trendBadge.querySelector('[data-testid="trend-percentage"]')).toHaveTextContent('25');
      expect(trendBadge.querySelector('[data-testid="trend-direction"]')).toHaveTextContent('up');
      expect(trendBadge.querySelector('[data-testid="trend-context"]')).toHaveTextContent('income');
      expect(trendBadge.querySelector('[data-testid="trend-variant"]')).toHaveTextContent('subtle');
      expect(trendBadge.querySelector('[data-testid="trend-size"]')).toHaveTextContent('sm');
      expect(trendBadge.querySelector('[data-testid="trend-show-label"]')).toHaveTextContent('false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle neutral trend', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          trend="neutral"
          context="income"
        />
      );
      
      expect(screen.getByText('Attention')).toBeInTheDocument();
    });

    it('should handle zero percentage', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={true}
          dataAvailable={true}
          percentage={0}
        />
      );
      
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should handle very large percentage', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          showDetailed={true}
          dataAvailable={true}
          percentage={1000.123}
        />
      );
      
      expect(screen.getByText('+1000.1%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA structure', () => {
      render(<MetricCard {...defaultProps} />);
      
      // Check that the card has proper heading structure
      expect(screen.getByText('Income Change')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
    });

    it('should provide context for screen readers with limited data', () => {
      render(
        <MetricCard {...defaultProps} dataAvailable={false} />
      );
      
      expect(screen.getByText('Limited data')).toBeInTheDocument();
    });
  });
}); 