import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PercentageChange } from '@/components/ui/PercentageChange';

describe('PercentageChange', () => {
  describe('Percentage Formatting', () => {
    it('displays positive percentage with plus sign by default', () => {
      render(
        <PercentageChange 
          percentage={15.5} 
          direction="up" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('+15.5%');
    });

    it('displays negative percentage with minus sign', () => {
      render(
        <PercentageChange 
          percentage={-12.3} 
          direction="down" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('-12.3%');
    });

    it('displays percentage without sign when showSign is false', () => {
      render(
        <PercentageChange 
          percentage={25.7} 
          direction="up" 
          context="income"
          showSign={false}
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('25.7%');
    });

    it('respects precision setting', () => {
      render(
        <PercentageChange 
          percentage={15.678} 
          direction="up" 
          context="income"
          precision={2}
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('+15.68%');
    });

    it('handles zero precision', () => {
      render(
        <PercentageChange 
          percentage={15.678} 
          direction="up" 
          context="income"
          precision={0}
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('+16%');
    });
  });

  describe('Edge Cases', () => {
    it('displays N/A for infinite values', () => {
      render(
        <PercentageChange 
          percentage={Infinity} 
          direction="up" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('N/A');
    });

    it('displays N/A for NaN values', () => {
      render(
        <PercentageChange 
          percentage={NaN} 
          direction="neutral" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('N/A');
    });

    it('handles very large values with maxValue limit', () => {
      render(
        <PercentageChange 
          percentage={1500} 
          direction="up" 
          context="income"
          maxValue={999}
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('+999%+');
    });

    it('handles very large negative values with maxValue limit', () => {
      render(
        <PercentageChange 
          percentage={-1500} 
          direction="down" 
          context="income"
          maxValue={999}
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('999%+');
    });
  });

  describe('Size Variants', () => {
    it('applies small text size', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          size="sm"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-xs');
    });

    it('applies medium text size by default', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-sm');
    });

    it('applies large text size', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          size="lg"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-base');
    });
  });

  describe('Context-based Colors', () => {
    it('applies positive colors for income increase', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-green-600');
    });

    it('applies negative colors for income decrease', () => {
      render(
        <PercentageChange 
          percentage={-15} 
          direction="down" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-red-600');
    });

    it('applies positive colors for expense decrease', () => {
      render(
        <PercentageChange 
          percentage={-15} 
          direction="down" 
          context="expenses"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-green-600');
    });

    it('applies negative colors for expense increase', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="expenses"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-red-600');
    });

    it('applies neutral colors for neutral direction', () => {
      render(
        <PercentageChange 
          percentage={0} 
          direction="neutral" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('text-muted-foreground');
    });
  });

  describe('Prefix and Suffix', () => {
    it('displays prefix when provided', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          prefix="Change: "
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('Change: +15.0%');
    });

    it('displays suffix when provided', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          suffix=" vs last month"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('+15.0% vs last month');
    });

    it('displays both prefix and suffix', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          prefix="("
          suffix=")"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveTextContent('(+15.0%)');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for positive change', () => {
      render(
        <PercentageChange 
          percentage={15.5} 
          direction="up" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveAttribute('aria-label', '15.5 percent increase');
      expect(percentage).toHaveAttribute('title', '15.5 percent increase');
    });

    it('has proper aria-label for negative change', () => {
      render(
        <PercentageChange 
          percentage={-12.3} 
          direction="down" 
          context="expenses"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveAttribute('aria-label', '12.3 percent decrease');
      expect(percentage).toHaveAttribute('title', '12.3 percent decrease');
    });

    it('has proper aria-label for neutral change', () => {
      render(
        <PercentageChange 
          percentage={0} 
          direction="neutral" 
          context="balance"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveAttribute('aria-label', '0.0 percent no change');
    });

    it('has proper aria-label for invalid data', () => {
      render(
        <PercentageChange 
          percentage={NaN} 
          direction="neutral" 
          context="income"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveAttribute('aria-label', 'No data available');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          className="custom-class"
          data-testid="percentage"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveClass('custom-class');
    });

    it('forwards other props to the span element', () => {
      render(
        <PercentageChange 
          percentage={15} 
          direction="up" 
          context="income"
          data-testid="percentage"
          id="custom-id"
        />
      );
      
      const percentage = screen.getByTestId('percentage');
      expect(percentage).toHaveAttribute('id', 'custom-id');
    });
  });
}); 