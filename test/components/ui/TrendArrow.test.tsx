import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrendArrow } from '@/components/ui/TrendArrow';

describe('TrendArrow', () => {
  describe('Direction Icons', () => {
    it('renders trending up icon for up direction', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income" 
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveAttribute('aria-label', 'Trend up (moderate)');
    });

    it('renders trending down icon for down direction', () => {
      render(
        <TrendArrow 
          direction="down" 
          context="expenses" 
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveAttribute('aria-label', 'Trend down (moderate)');
    });

    it('renders minus icon for neutral direction', () => {
      render(
        <TrendArrow 
          direction="neutral" 
          context="balance" 
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveAttribute('aria-label', 'Trend neutral (moderate)');
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income" 
          size="sm"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('h-3', 'w-3');
    });

    it('applies medium size classes by default', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('h-4', 'w-4');
    });

    it('applies large size classes', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income" 
          size="lg"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('h-5', 'w-5');
    });

    it('applies extra large size classes', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income" 
          size="xl"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Context-based Colors', () => {
    it('applies positive colors for income increase', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('text-green-600');
    });

    it('applies negative colors for income decrease', () => {
      render(
        <TrendArrow 
          direction="down" 
          context="income"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('text-red-600');
    });

    it('applies positive colors for expense decrease', () => {
      render(
        <TrendArrow 
          direction="down" 
          context="expenses"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('text-green-600');
    });

    it('applies negative colors for expense increase', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="expenses"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('text-red-600');
    });

    it('applies neutral colors for neutral direction', () => {
      render(
        <TrendArrow 
          direction="neutral" 
          context="income"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('text-muted-foreground');
    });
  });

  describe('Background Option', () => {
    it('shows background when showBackground is true', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          showBackground={true}
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('bg-green-100', 'rounded-full', 'p-1');
    });

    it('does not show background by default', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).not.toHaveClass('bg-green-100', 'rounded-full', 'p-1');
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income" 
          strength="significant"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveAttribute('role', 'img');
      expect(arrow).toHaveAttribute('aria-label', 'Trend up (significant)');
    });

    it('includes strength in aria-label when provided', () => {
      render(
        <TrendArrow 
          direction="down" 
          context="expenses" 
          strength="minimal"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveAttribute('aria-label', 'Trend down (minimal)');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          className="custom-class"
          data-testid="trend-arrow"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveClass('custom-class');
    });

    it('forwards other props to the div element', () => {
      render(
        <TrendArrow 
          direction="up" 
          context="income"
          data-testid="trend-arrow"
          title="Custom title"
        />
      );
      
      const arrow = screen.getByTestId('trend-arrow');
      expect(arrow).toHaveAttribute('title', 'Custom title');
    });
  });
}); 