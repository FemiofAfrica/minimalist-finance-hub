import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BalanceTrendChart from '@/components/BalanceTrendChart';
import { chartDataService } from '@/services/chartDataService';
import type { BalanceChartData } from '@/types/chartData';

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
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>
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

describe('BalanceTrendChart', () => {
  const mockBalanceData: BalanceChartData[] = [
    { month: '2024-01', balance: 1000 },
    { month: '2024-02', balance: 1500 },
    { month: '2024-03', balance: 2000 }
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
      mockChartDataService.getBalanceTrendData = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockBalanceData), 100))
      );

      render(<BalanceTrendChart {...defaultProps} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders chart with data after loading', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        expect(screen.getByTestId('area')).toBeInTheDocument();
      });

      expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledWith(6);
    });

    it('calls onDataLoad callback with data length', async () => {
      const onDataLoad = vi.fn();
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} onDataLoad={onDataLoad} />);
      
      await waitFor(() => {
        expect(onDataLoad).toHaveBeenCalledWith(3);
      });
    });

    it('reloads data when timePeriod changes', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      const { rerender } = render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledWith(6);
      });

      rerender(<BalanceTrendChart {...defaultProps} timePeriod={12} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledWith(12);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when data loading fails', async () => {
      const errorMessage = 'Failed to fetch data';
      mockChartDataService.getBalanceTrendData = vi.fn().mockRejectedValue(new Error(errorMessage));

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load balance data')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('allows retry when error occurs', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load balance data')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });

      expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(2);
    });

    it('calls onDataLoad with 0 when error occurs', async () => {
      const onDataLoad = vi.fn();
      mockChartDataService.getBalanceTrendData = vi.fn().mockRejectedValue(new Error('Error'));

      render(<BalanceTrendChart {...defaultProps} onDataLoad={onDataLoad} />);
      
      await waitFor(() => {
        expect(onDataLoad).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no data available', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue([]);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No balance data available for this period')).toBeInTheDocument();
        expect(screen.getByText('Add some transactions to see your balance trend')).toBeInTheDocument();
      });
    });
  });

  describe('Event Listeners', () => {
    it('listens for refresh events and reloads data', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh event
      const refreshEvent = new CustomEvent('refresh');
      document.dispatchEvent(refreshEvent);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(2);
      });
    });

    it('listens for refresh-transactions events', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh-transactions event
      const refreshEvent = new CustomEvent('refresh-transactions');
      document.dispatchEvent(refreshEvent);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(2);
      });
    });

    it('removes event listeners on unmount', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      const { unmount } = render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.addEventListener).toHaveBeenCalledWith('refresh', expect.any(Function));
        expect(document.addEventListener).toHaveBeenCalledWith('refresh-transactions', expect.any(Function));
      });

      unmount();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('refresh', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('refresh-transactions', expect.any(Function));
    });
  });

  describe('Props Handling', () => {
    it('applies custom className', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} className="custom-class" />);
      
      await waitFor(() => {
        const chartContainer = screen.getByTestId('responsive-container').parentElement;
        expect(chartContainer).toHaveClass('custom-class');
      });
    });

    it('uses custom height', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart {...defaultProps} height={400} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
      
      // Height is passed to ResponsiveContainer, which is mocked
      // In real implementation, this would set the container height
    });

    it('uses default props when not provided', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      render(<BalanceTrendChart timePeriod={6} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate loading message', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockBalanceData), 100))
      );

      render(<BalanceTrendChart {...defaultProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('provides helpful empty state message', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue([]);

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No balance data available for this period')).toBeInTheDocument();
        expect(screen.getByText('Add some transactions to see your balance trend')).toBeInTheDocument();
      });
    });

    it('provides actionable error message', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockRejectedValue(new Error('Error'));

      render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load balance data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not make unnecessary API calls', async () => {
      mockChartDataService.getBalanceTrendData = vi.fn().mockResolvedValue(mockBalanceData);

      const { rerender } = render(<BalanceTrendChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props should not trigger new API call
      rerender(<BalanceTrendChart {...defaultProps} className="different-class" />);
      
      // Should still be called only once
      expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
    });
  });
}); 