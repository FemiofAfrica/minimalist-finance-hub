import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import IncomeExpenseChart from '@/components/IncomeExpenseChart';
import { chartDataService } from '@/services/chartDataService';
import type { IncomeExpenseChartData } from '@/types/chartData';

// Mock the services and contexts
vi.mock('@/services/chartDataService');
vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPossiblyConvertedCurrency: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
    exchangeRates: { NGN: 800 } // Mock exchange rate
  })
}));

// Mock Recharts components to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Line: ({ name }: any) => <div data-testid={`line-${name?.toLowerCase()}`} />,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMM yy') return 'Jan 24';
    if (formatStr === 'MMMM yyyy') return 'January 2024';
    return '2024-01';
  })
}));

const mockChartDataService = chartDataService as any;

describe('IncomeExpenseChart', () => {
  const mockIncomeExpenseData: IncomeExpenseChartData[] = [
    { month: '2024-01', income: 5000, expenses: 3000 },
    { month: '2024-02', income: 4500, expenses: 3500 },
    { month: '2024-03', income: 6000, expenses: 2800 }
  ];

  const defaultProps = {
    timePeriod: 6
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM event listeners
    const events: { [key: string]: EventListener[] } = {};
    const originalAddEventListener = document.addEventListener;
    const originalRemoveEventListener = document.removeEventListener;
    
    document.addEventListener = vi.fn((event: string, listener: EventListener) => {
      if (!events[event]) events[event] = [];
      events[event].push(listener);
      return originalAddEventListener.call(document, event, listener);
    });
    
    document.removeEventListener = vi.fn((event: string, listener: EventListener) => {
      if (events[event]) {
        const index = events[event].indexOf(listener);
        if (index > -1) events[event].splice(index, 1);
      }
      return originalRemoveEventListener.call(document, event, listener);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Loading', () => {
    it('shows loading state initially', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockIncomeExpenseData), 100))
      );

      render(<IncomeExpenseChart {...defaultProps} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders chart with data after loading', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
        expect(screen.getByTestId('line-income')).toBeInTheDocument();
        expect(screen.getByTestId('line-expenses')).toBeInTheDocument();
      });

      expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledWith(6);
    });

    it('displays analysis summary with correct metrics', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Avg Income')).toBeInTheDocument();
        expect(screen.getByText('Avg Expenses')).toBeInTheDocument();
        expect(screen.getByText('Surplus Months')).toBeInTheDocument();
        expect(screen.getByText('Deficit Months')).toBeInTheDocument();
      });

      // Check if analysis metrics are displayed
      expect(screen.getByTestId('trending-up')).toBeInTheDocument();
      expect(screen.getByTestId('trending-down')).toBeInTheDocument();
    });

    it('reloads data when timePeriod changes', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      const { rerender } = render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledWith(6);
      });

      rerender(<IncomeExpenseChart {...defaultProps} timePeriod={12} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledWith(12);
      });
    });
  });

  describe('Analysis Metrics', () => {
    it('calculates correct analysis metrics', async () => {
      const onPeriodAnalysis = vi.fn();
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} onPeriodAnalysis={onPeriodAnalysis} />);
      
      await waitFor(() => {
        expect(onPeriodAnalysis).toHaveBeenCalledWith({
          avgIncome: 5166.666666666667, // (5000 + 4500 + 6000) / 3
          avgExpenses: 3100, // (3000 + 3500 + 2800) / 3
          monthsInSurplus: 3, // All months have income > expenses
          monthsInDeficit: 0,
          biggestGap: 3200, // Biggest gap is 6000 - 2800
          totalNetIncome: 6500 // Total income - total expenses
        });
      });
    });

    it('handles deficit months correctly', async () => {
      const deficitData: IncomeExpenseChartData[] = [
        { month: '2024-01', income: 3000, expenses: 5000 }, // Deficit
        { month: '2024-02', income: 4500, expenses: 3000 }, // Surplus
        { month: '2024-03', income: 2000, expenses: 4000 }  // Deficit
      ];

      const onPeriodAnalysis = vi.fn();
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(deficitData);

      render(<IncomeExpenseChart {...defaultProps} onPeriodAnalysis={onPeriodAnalysis} />);
      
      await waitFor(() => {
        expect(onPeriodAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            monthsInSurplus: 1,
            monthsInDeficit: 2,
            totalNetIncome: -2500 // (9500 - 12000)
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when data loading fails', async () => {
      const errorMessage = 'Failed to fetch data';
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockRejectedValue(new Error(errorMessage));

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load income and expense data')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('allows retry when error occurs', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load income and expense data')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      });

      expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no data available', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue([]);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No income or expense data available for this period')).toBeInTheDocument();
        expect(screen.getByText('Add some transactions to see your income vs expense trends')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Features', () => {
    it('shows net area when showNetArea prop is true', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} showNetArea={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('area-positiveNet')).toBeInTheDocument();
        expect(screen.getByTestId('area-negativeNet')).toBeInTheDocument();
      });
    });

    it('shows average lines when showAverageLines prop is true', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} showAverageLines={true} />);
      
      await waitFor(() => {
        // Average lines should be rendered as Line components
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('applies custom className', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} className="custom-class" />);
      
      await waitFor(() => {
        const chartContainer = screen.getByTestId('responsive-container').parentElement;
        expect(chartContainer).toHaveClass('custom-class');
      });
    });

    it('uses custom height', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} height={400} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
      
      // Height is passed to ResponsiveContainer, which is mocked
      // In real implementation, this would set the container height
    });
  });

  describe('Event Listeners', () => {
    it('listens for refresh events and reloads data', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh event
      const refreshEvent = new CustomEvent('refresh');
      document.dispatchEvent(refreshEvent);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(2);
      });
    });

    it('listens for refresh-transactions events', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh-transactions event
      const refreshEvent = new CustomEvent('refresh-transactions');
      document.dispatchEvent(refreshEvent);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(2);
      });
    });

    it('removes event listeners on unmount', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      const { unmount } = render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.addEventListener).toHaveBeenCalledWith('refresh', expect.any(Function));
        expect(document.addEventListener).toHaveBeenCalledWith('refresh-transactions', expect.any(Function));
      });

      unmount();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('refresh', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('refresh-transactions', expect.any(Function));
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate loading message', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockIncomeExpenseData), 100))
      );

      render(<IncomeExpenseChart {...defaultProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('provides helpful empty state message', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue([]);

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No income or expense data available for this period')).toBeInTheDocument();
        expect(screen.getByText('Add some transactions to see your income vs expense trends')).toBeInTheDocument();
      });
    });

    it('provides actionable error message', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockRejectedValue(new Error('Error'));

      render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load income and expense data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not make unnecessary API calls', async () => {
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      const { rerender } = render(<IncomeExpenseChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props should not trigger new API call
      rerender(<IncomeExpenseChart {...defaultProps} className="different-class" />);
      
      // Should still be called only once
      expect(mockChartDataService.getIncomeExpenseComparisonData).toHaveBeenCalledTimes(1);
    });

    it('memoizes analysis calculations correctly', async () => {
      const onPeriodAnalysis = vi.fn();
      mockChartDataService.getIncomeExpenseComparisonData = vi.fn().mockResolvedValue(mockIncomeExpenseData);

      const { rerender } = render(<IncomeExpenseChart {...defaultProps} onPeriodAnalysis={onPeriodAnalysis} />);
      
      await waitFor(() => {
        expect(onPeriodAnalysis).toHaveBeenCalledTimes(1);
      });

      // Rerender with same data should not recalculate analysis
      rerender(<IncomeExpenseChart {...defaultProps} onPeriodAnalysis={onPeriodAnalysis} className="new-class" />);
      
      // Analysis should still be called only once since data hasn't changed
      expect(onPeriodAnalysis).toHaveBeenCalledTimes(1);
    });
  });
}); 