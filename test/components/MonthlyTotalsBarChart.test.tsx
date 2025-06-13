import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MonthlyTotalsBarChart from '@/components/MonthlyTotalsBarChart';
import { chartDataService } from '@/services/chartDataService';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { MonthlyTotalsChartData } from '@/types/chartData';

// Mock the chart data service
vi.mock('@/services/chartDataService', () => ({
  chartDataService: {
    getMonthlyTotalsData: vi.fn()
  }
}));

// Mock the currency context
vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

// Mock Recharts with simplified components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, name }: any) => <div data-testid={`bar-${dataKey}`} data-name={name}></div>,
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  Tooltip: () => <div data-testid="tooltip"></div>,
  Legend: () => <div data-testid="legend"></div>,
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill}></div>
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
  TrendingUp: () => <div data-testid="trending-up">↗</div>,
  TrendingDown: () => <div data-testid="trending-down">↘</div>,
  AlertTriangle: () => <div data-testid="alert-triangle">⚠</div>
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMM yy') return 'Jan 24';
    if (formatStr === 'MMMM yyyy') return 'January 2024';
    return 'Jan 2024';
  })
}));

describe('MonthlyTotalsBarChart', () => {
  const mockFormatCurrency = vi.fn((amount: number) => `$${amount.toFixed(2)}`);
  const mockUseCurrency = useCurrency as any;
  const mockChartDataService = chartDataService as any;

  const mockMonthlyTotalsData: MonthlyTotalsChartData[] = [
    { month: '2024-01', income: 5000, expenses: 3500 },
    { month: '2024-02', income: 6000, expenses: 4200 },
    { month: '2024-03', income: 4500, expenses: 5000 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseCurrency.mockReturnValue({
      formatPossiblyConvertedCurrency: mockFormatCurrency,
      exchangeRates: { NGN: 800 }
    });
    
    mockChartDataService.getMonthlyTotalsData.mockResolvedValue(mockMonthlyTotalsData);
    
    global.document.addEventListener = vi.fn();
    global.document.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders loading state initially', () => {
      mockChartDataService.getMonthlyTotalsData.mockImplementation(() => new Promise(() => {}));
      
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('renders chart components after data loads', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-income')).toBeInTheDocument();
      expect(screen.getByTestId('bar-expenses')).toBeInTheDocument();
    });

    it('handles service errors gracefully', async () => {
      mockChartDataService.getMonthlyTotalsData.mockRejectedValue(new Error('Failed'));
      
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load monthly totals data')).toBeInTheDocument();
      });
    });

    it('shows empty state when no data available', async () => {
      mockChartDataService.getMonthlyTotalsData.mockResolvedValue([]);
      
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('No monthly data available for this period')).toBeInTheDocument();
      });
    });
  });

  describe('Summary Statistics', () => {
    it('calculates total income correctly', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Income')).toBeInTheDocument();
      });
      
      // Total: 15500 NGN / 800 = 19.375 USD
      expect(mockFormatCurrency).toHaveBeenCalledWith(19.375);
    });

    it('calculates total expenses correctly', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      });
      
      // Total: 12700 NGN / 800 = 15.875 USD
      expect(mockFormatCurrency).toHaveBeenCalledWith(15.875);
    });

    it('calculates deficit months correctly', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('Deficit Months')).toBeInTheDocument();
      });
      
      // Only March has expenses > income
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('renders with net indicators when enabled', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} showNetIndicators={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-net')).toBeInTheDocument();
      });
    });

    it('hides net indicators when disabled', async () => {
      render(<MonthlyTotalsBarChart timePeriod={12} showNetIndicators={false} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-income')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('bar-net')).not.toBeInTheDocument();
    });
  });

  describe('Currency Conversion', () => {
    it('handles missing exchange rates gracefully', async () => {
      mockUseCurrency.mockReturnValue({
        formatPossiblyConvertedCurrency: mockFormatCurrency,
        exchangeRates: null
      });
      
      render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('calls service with correct time period', () => {
      render(<MonthlyTotalsBarChart timePeriod={24} />);
      
      expect(mockChartDataService.getMonthlyTotalsData).toHaveBeenCalledWith(24);
    });

    it('reloads data when time period changes', async () => {
      const { rerender } = render(<MonthlyTotalsBarChart timePeriod={12} />);
      
      await waitFor(() => {
        expect(mockChartDataService.getMonthlyTotalsData).toHaveBeenCalledWith(12);
      });
      
      rerender(<MonthlyTotalsBarChart timePeriod={24} />);
      
      expect(mockChartDataService.getMonthlyTotalsData).toHaveBeenCalledWith(24);
    });
  });
}); 
}); 