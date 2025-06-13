import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrendBadge } from '@/components/ui/TrendBadge';

describe('TrendBadge', () => {
  describe('Component Composition', () => {
    it('renders both arrow and percentage by default', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('+15.5%');
    });

    it('renders only arrow when showPercentage is false', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          showPercentage={false}
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveTextContent('+15.5%');
    });

    it('renders only percentage when showArrow is false', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          showArrow={false}
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('+15.5%');
    });

    it('renders label when provided', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          label="Income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('Income');
      expect(badge).toHaveTextContent('+15.5%');
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          size="sm"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('applies medium size classes by default', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('px-2.5', 'py-1.5', 'text-sm');
    });

    it('applies large size classes', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          size="lg"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('px-3', 'py-2', 'text-base');
    });

    it('applies extra large size classes', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          size="xl"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('px-4', 'py-2.5', 'text-lg');
    });
  });

  describe('Layout Variants', () => {
    it('applies horizontal layout by default', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('flex-row');
    });

    it('applies vertical layout', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          layout="vertical"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('flex-col', 'gap-0.5');
    });

    it('applies compact layout', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          layout="compact"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('flex-row', 'gap-0.5');
    });
  });

  describe('Variant Styles', () => {
    it('applies default variant with background colors', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          variant="default"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('applies subtle variant with subtle background', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          variant="subtle"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-green-50');
    });

    it('applies strong variant with strong background', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          variant="strong"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-green-600');
    });

    it('applies outline variant with transparent background', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          variant="outline"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-transparent', 'text-green-600');
    });
  });

  describe('Context-based Colors', () => {
    it('applies positive colors for income increase', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-green-100', 'border-green-300');
    });

    it('applies negative colors for income decrease', () => {
      render(
        <TrendBadge 
          percentage={-15} 
          direction="down" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-red-100', 'border-red-300');
    });

    it('applies positive colors for expense decrease', () => {
      render(
        <TrendBadge 
          percentage={-15} 
          direction="down" 
          context="expenses"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-green-100', 'border-green-300');
    });

    it('applies negative colors for expense increase', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="expenses"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-red-100', 'border-red-300');
    });

    it('applies neutral colors for neutral direction', () => {
      render(
        <TrendBadge 
          percentage={0} 
          direction="neutral" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('bg-muted', 'border-muted');
    });
  });

  describe('Percentage Options', () => {
    it('respects showSign prop', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          showSign={false}
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('15.5%');
      expect(badge).not.toHaveTextContent('+15.5%');
    });

    it('respects precision prop', () => {
      render(
        <TrendBadge 
          percentage={15.678} 
          direction="up" 
          context="income"
          precision={2}
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('+15.68%');
    });

    it('respects maxValue prop', () => {
      render(
        <TrendBadge 
          percentage={1500} 
          direction="up" 
          context="income"
          maxValue={999}
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('+999%+');
    });
  });

  describe('Edge Cases', () => {
    it('handles infinite percentage values', () => {
      render(
        <TrendBadge 
          percentage={Infinity} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('N/A');
    });

    it('handles NaN percentage values', () => {
      render(
        <TrendBadge 
          percentage={NaN} 
          direction="neutral" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('N/A');
    });

    it('handles zero percentage', () => {
      render(
        <TrendBadge 
          percentage={0} 
          direction="neutral" 
          context="balance"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveTextContent('+0.0%');
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-label', 'income increased by 15.5%');
      expect(badge).toHaveAttribute('title', 'income increased by 15.5%');
    });

    it('generates proper description for expense decrease', () => {
      render(
        <TrendBadge 
          percentage={-12.3} 
          direction="down" 
          context="expenses"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveAttribute('aria-label', 'expenses decreased by 12.3%');
    });

    it('generates proper description for neutral change', () => {
      render(
        <TrendBadge 
          percentage={0} 
          direction="neutral" 
          context="balance"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveAttribute('aria-label', 'balance remained stable');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          className="custom-class"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('forwards other props to the div element', () => {
      render(
        <TrendBadge 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="trend-badge"
          id="custom-id"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to child components', () => {
      render(
        <TrendBadge 
          percentage={15.5} 
          direction="up" 
          context="income"
          strength="significant"
          size="lg"
          variant="subtle"
          data-testid="trend-badge"
        />
      );
      
      const badge = screen.getByTestId('trend-badge');
      expect(badge).toBeInTheDocument();
      
      // The child components should receive the correct props
      // This is tested indirectly through the rendered output
      expect(badge).toHaveTextContent('+15.5%');
    });
  });
}); 