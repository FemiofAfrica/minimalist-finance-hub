import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TimePeriodFilter from '@/components/filters/TimePeriodFilter';
import { chartDataService } from '@/services/chartDataService';
import type { HistoricalBalanceData } from '@/types/chartData';

// Mock date-fns
vi.mock('date-fns', () => ({
  differenceInMonths: vi.fn((end: Date, start: Date) => {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }),
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM') {
      return '2024-01';
    }
    if (formatStr === 'MMM yyyy') {
      return 'Jan 2024';
    }
    return '2024-01';
  }),
  parseISO: vi.fn((dateStr) => new Date(dateStr))
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Info: () => <div data-testid="info-icon">Info</div>
}));

// Mock UI components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      <button onClick={() => onValueChange && onValueChange('6')}>
        {value ? `${value} months` : 'Select period'}
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, disabled }: any) => (
    <div data-testid={`select-item-${value}`} data-disabled={disabled}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: any) => <div data-testid="select-value">{children}</div>
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  )
}));

// Mock chartDataService before component import resolution
vi.mock('@/services/chartDataService', () => ({
  chartDataService: {
    getBalanceTrendData: vi.fn(),
    getHistoricalBalanceData: vi.fn()
  }
}));

describe('TimePeriodFilter', () => {
  const mockChartDataService = chartDataService as any;
  const defaultProps = {
    currentPeriod: 6,
    onPeriodChange: vi.fn()
  };

  const mockHistoricalData: HistoricalBalanceData[] = [
    { month: '2023-01', balance: 1000 },
    { month: '2023-02', balance: 1200 },
    { month: '2023-03', balance: 1100 },
    { month: '2023-04', balance: 1300 },
    { month: '2023-05', balance: 1250 },
    { month: '2023-06', balance: 1400 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockChartDataService.getBalanceTrendData.mockResolvedValue(mockHistoricalData);
    mockChartDataService.getHistoricalBalanceData.mockResolvedValue(mockHistoricalData);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the time period filter with all elements', async () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByText('Period:')).toBeInTheDocument();
      expect(screen.getByTestId('select')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      // Make the service call hang
      mockChartDataService.getBalanceTrendData.mockImplementation(() => new Promise(() => {}));
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-filter-class';
      const { container } = render(<TimePeriodFilter {...defaultProps} className={customClass} />);
      expect((container.firstChild as HTMLElement)).toHaveClass(customClass);
    });
  });

  describe('Data Loading', () => {
    it('loads data availability on mount', async () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledWith(24);
      });
    });

    it('handles empty historical data', async () => {
      mockChartDataService.getBalanceTrendData.mockResolvedValue([]);
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0 months')).toBeInTheDocument();
      });
    });

    it('handles service errors gracefully', async () => {
      mockChartDataService.getBalanceTrendData.mockRejectedValue(new Error('Service error'));
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        // Should show fallback data (1 month)
        expect(screen.getByText('1 months')).toBeInTheDocument();
      });
    });

    it('uses provided availableData prop when given', async () => {
      const providedData = {
        totalMonths: 12,
        earliestMonth: '2023-01',
        latestMonth: '2023-12'
      };

      render(<TimePeriodFilter {...defaultProps} availableData={providedData} />);
      
      await waitFor(() => {
        expect(screen.getByText('12 months')).toBeInTheDocument();
      });
      
      // Should not call the service when data is provided
      expect(mockChartDataService.getBalanceTrendData).not.toHaveBeenCalled();
    });
  });

  describe('Period Selection', () => {
    it('calls onPeriodChange when period is selected', async () => {
      const onPeriodChange = vi.fn();
      render(<TimePeriodFilter {...defaultProps} onPeriodChange={onPeriodChange} />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
      
      // Click the select button (mocked to call onValueChange with '6')
      const selectButton = screen.getByRole('button');
      fireEvent.click(selectButton);
      
      expect(onPeriodChange).toHaveBeenCalledWith(6);
    });

    it('saves period to localStorage when changed', async () => {
      const onPeriodChange = vi.fn();
      render(<TimePeriodFilter {...defaultProps} onPeriodChange={onPeriodChange} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
      
      const selectButton = screen.getByRole('button');
      fireEvent.click(selectButton);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('fintrack-preferred-time-period', '6');
    });

    it('displays current period correctly', () => {
      render(<TimePeriodFilter {...defaultProps} currentPeriod={12} />);
      
      const select = screen.getByTestId('select');
      expect(select).toHaveAttribute('data-value', '12');
    });
  });

  describe('Disabled State', () => {
    it('disables select when disabled prop is true', () => {
      render(<TimePeriodFilter {...defaultProps} disabled={true} />);
      
      const select = screen.getByTestId('select');
      expect(select).toHaveAttribute('data-disabled', 'true');
    });

    it('disables select during loading', async () => {
      mockChartDataService.getBalanceTrendData.mockImplementation(() => new Promise(() => {}));
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('select');
        expect(select).toHaveAttribute('data-disabled', 'true');
      });
    });
  });

  describe('Data Info Display', () => {
    it('shows data info by default', async () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        expect(screen.getAllByText('6 months').length).toBeGreaterThan(0);
      });
    });

    it('hides data info when showDataInfo is false', async () => {
      render(<TimePeriodFilter {...defaultProps} showDataInfo={false} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument();
      });
    });

    it('calculates total months correctly', async () => {
      // Mock data spans 6 months (2023-01 to 2023-06)
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('6 months')).toBeInTheDocument();
      });
    });
  });

  describe('Period Options', () => {
    it('renders all period options', async () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('select-content')).toBeInTheDocument();
      });
      
      // Should have options for 3, 6, 12, 24 months
      expect(screen.getByTestId('select-item-3')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-6')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-12')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-24')).toBeInTheDocument();
    });

    it('disables options that exceed available data', async () => {
      // Mock data with only 6 months available
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('select-item-3')).toHaveAttribute('data-disabled', 'false');
        expect(screen.getByTestId('select-item-6')).toHaveAttribute('data-disabled', 'false');
        expect(screen.getByTestId('select-item-12')).toHaveAttribute('data-disabled', 'true');
        expect(screen.getByTestId('select-item-24')).toHaveAttribute('data-disabled', 'true');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles chart service errors gracefully', async () => {
      mockChartDataService.getBalanceTrendData.mockRejectedValue(new Error('Network error'));
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        // Should still render the component with fallback data
        expect(screen.getByTestId('select')).toBeInTheDocument();
        expect(screen.getByText('1 months')).toBeInTheDocument();
      });
    });

    it('handles invalid date formats gracefully', async () => {
      const invalidData = [
        { month: 'invalid-date', balance: 1000 }
      ];
      
      mockChartDataService.getBalanceTrendData.mockResolvedValue(invalidData);
      
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        // Should not crash and show some data
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not make unnecessary data calls on re-renders', async () => {
      const { rerender } = render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
      });
      
      // Re-render with different props
      rerender(<TimePeriodFilter {...defaultProps} className="different" />);
      
      // Should not call service again
      expect(mockChartDataService.getBalanceTrendData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA structure', () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      // The select component should be accessible
      expect(screen.getByTestId('select')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('provides tooltip information', async () => {
      render(<TimePeriodFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('tooltip').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('tooltip-content').length).toBeGreaterThan(0);
      });
    });
  });
}); 