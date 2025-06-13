import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Reports from '@/pages/Reports';
import { hasMultipleMonthsOfData } from '@/services/monthlySnapshotService';
import { chartDataService } from '@/services/chartDataService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import * as monthlySnapshotService from '@/services/monthlySnapshotService';

// Mock the services and contexts
vi.mock('@/services/monthlySnapshotService', () => ({
  hasMultipleMonthsOfData: vi.fn(),
  getMonthlySnapshotWithComparative: vi.fn()
}));

vi.mock('@/services/chartDataService', () => ({
  chartDataService: {
    getHistoricalBalanceData: vi.fn(),
    getIncomeExpenseData: vi.fn(),
    getMonthlyTotalsData: vi.fn()
  }
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

// Mock the chart components
vi.mock('@/components/BalanceTrendChart', () => ({
  default: ({ timePeriod }: any) => (
    <div data-testid="balance-trend-chart" data-time-period={timePeriod}>
      Balance Trend Chart
    </div>
  )
}));

vi.mock('@/components/IncomeExpenseChart', () => ({
  default: ({ timePeriod, showNetArea, showAverageLines }: any) => (
    <div 
      data-testid="income-expense-chart" 
      data-time-period={timePeriod}
      data-net-area={showNetArea}
      data-average-lines={showAverageLines}
    >
      Income Expense Chart
    </div>
  )
}));

vi.mock('@/components/MonthlyTotalsBarChart', () => ({
  default: ({ timePeriod, showNetIndicators }: any) => (
    <div 
      data-testid="monthly-totals-chart" 
      data-time-period={timePeriod}
      data-net-indicators={showNetIndicators}
    >
      Monthly Totals Chart
    </div>
  )
}));

vi.mock('@/components/dashboard/MonthlyHistoryViewer', () => ({
  default: () => <div data-testid="monthly-history-viewer">Monthly History Viewer</div>
}));

vi.mock('@/components/filters', () => ({
  TimePeriodFilter: ({ currentPeriod, onPeriodChange }: any) => (
    <div data-testid="time-period-filter" data-current-period={currentPeriod}>
      <button onClick={() => onPeriodChange(12)}>Change to 12 months</button>
    </div>
  )
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  differenceInMonths: vi.fn(() => 6),
  format: vi.fn(() => '2024-01'),
  parseISO: vi.fn((date) => new Date(date))
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Target: () => <div data-testid="target-icon">Target</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  BarChart3: () => <div data-testid="bar-chart-icon">BarChart3</div>,
  LineChart: () => <div data-testid="line-chart-icon">LineChart</div>,
  PieChart: () => <div data-testid="pie-chart-icon">PieChart</div>
}));

// Mock the ComparisonMetrics component
vi.mock('@/components/dashboard/ComparisonMetrics', () => ({
  default: ({ showCurrentMonth, showDetailed, className }: any) => (
    <div 
      data-testid="comparison-metrics" 
      data-current-month={showCurrentMonth}
      data-detailed={showDetailed}
      className={className}
    >
      Comparison Metrics Component
    </div>
  )
}));

// Mock hooks
vi.mock('@/hooks/useTimePeriodData', () => ({
  useTimePeriodData: () => ({
    currentPeriod: 3,
    availableData: { months: 3, years: 1 },
    loading: false,
    setPeriod: vi.fn()
  })
}));

vi.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    getResponsiveSpacing: () => ({
      cardGap: '1rem',
      containerPadding: '1rem'
    })
  })
}));

vi.mock('@/utils/performance', () => ({
  usePerformanceMetrics: () => ({
    startMeasurement: vi.fn(),
    endMeasurement: vi.fn()
  })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <CurrencyProvider>
      {children}
    </CurrencyProvider>
  </BrowserRouter>
);

describe('Reports Page Integration', () => {
  const mockHasMultipleMonthsOfData = vi.mocked(monthlySnapshotService.hasMultipleMonthsOfData);
  const mockGetMonthlySnapshotWithComparative = vi.mocked(monthlySnapshotService.getMonthlySnapshotWithComparative);
  const mockChartDataService = chartDataService as any;
  const mockUseCurrency = useCurrency as any;

  const mockHistoricalData = [
    { month: '2024-01', balance: 1000 },
    { month: '2024-02', balance: 1200 },
    { month: '2024-03', balance: 1100 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default currency context mock
    mockUseCurrency.mockReturnValue({
      formatPossiblyConvertedCurrency: vi.fn((amount) => `$${amount.toFixed(2)}`),
      exchangeRates: { NGN: 800 }
    });
    
    // Default chart data service mocks
    mockChartDataService.getHistoricalBalanceData.mockResolvedValue(mockHistoricalData);
    mockChartDataService.getIncomeExpenseData.mockResolvedValue([]);
    mockChartDataService.getMonthlyTotalsData.mockResolvedValue([]);
    
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

  describe('Enhanced Reports Layout', () => {
    beforeEach(() => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue({
        id: '1',
        user_id: 'user1',
        year: 2025,
        month: 1,
        total_income: 5000,
        total_expenses: 3000,
        net_balance: 2000,
        transaction_count: 25,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z',
        comparative: {
          monthOverMonth: {
            income: {
              current: 5000,
              previous: 4000,
              absoluteDifference: 1000,
              percentageChange: 25,
              trend: 'up',
              dataAvailable: true
            },
            expenses: {
              current: 3000,
              previous: 3500,
              absoluteDifference: -500,
              percentageChange: -14.3,
              trend: 'down',
              dataAvailable: true
            },
            balance: {
              current: 2000,
              previous: 500,
              absoluteDifference: 1500,
              percentageChange: 300,
              trend: 'up',
              dataAvailable: true
            }
          }
        }
      });
    });

    it('should render all chart components including ComparisonMetrics', async () => {
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      });

      // Check that all chart components are rendered
      expect(screen.getByTestId('balance-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('income-expense-chart')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-totals-chart')).toBeInTheDocument();
      
      // Check that ComparisonMetrics is rendered
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
    });

    it('should pass correct props to ComparisonMetrics component', async () => {
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        const comparisonMetrics = screen.getByTestId('comparison-metrics');
        expect(comparisonMetrics).toBeInTheDocument();
        expect(comparisonMetrics).toHaveAttribute('data-current-month', 'true');
        expect(comparisonMetrics).toHaveAttribute('data-detailed', 'true'); // Not mobile
        expect(comparisonMetrics).toHaveClass('w-full');
      });
    });

    it('should render ComparisonMetrics between charts and future reports section', async () => {
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        const chartsContainer = screen.getByTestId('charts-container');
        expect(chartsContainer).toBeInTheDocument();
        
        // Check that ComparisonMetrics is within the charts container
        const comparisonMetrics = screen.getByTestId('comparison-metrics');
        expect(chartsContainer).toContainElement(comparisonMetrics);
        
        // Check that "More Analytics Coming Soon" section is also present
        expect(screen.getByText('More Analytics Coming Soon!')).toBeInTheDocument();
      });
    });

    it('should maintain proper layout structure with ComparisonMetrics', async () => {
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check header
        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
        expect(screen.getByText('Comprehensive visual analytics of your financial data')).toBeInTheDocument();
        
        // Check all sections are present
        expect(screen.getByText('Balance Trend')).toBeInTheDocument();
        expect(screen.getByText('Income vs Expenses')).toBeInTheDocument();
        expect(screen.getByText('Monthly Breakdown')).toBeInTheDocument();
        expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
        expect(screen.getByText('More Analytics Coming Soon!')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Reports Layout', () => {
    beforeEach(() => {
      mockHasMultipleMonthsOfData.mockResolvedValue(false);
    });

    it('should not render ComparisonMetrics when no historical data', async () => {
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Historical Data Yet')).toBeInTheDocument();
      });

      // ComparisonMetrics should not be rendered
      expect(screen.queryByTestId('comparison-metrics')).not.toBeInTheDocument();
      
      // Charts should not be rendered either
      expect(screen.queryByTestId('balance-trend-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('income-expense-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monthly-totals-chart')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should include ComparisonMetrics skeleton in loading state', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      // Mock the useTimePeriodData hook to return loading state
      vi.doMock('@/hooks/useTimePeriodData', () => ({
        useTimePeriodData: () => ({
          currentPeriod: 3,
          availableData: { months: 3, years: 1 },
          loading: true, // Loading state
          setPeriod: vi.fn()
        })
      }));

      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show loading skeletons
        const skeletons = screen.getAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(3); // Should include skeleton for ComparisonMetrics
      });
    });
  });

  describe('Time Period Coordination', () => {
    it('passes the same time period to all chart components', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        const balanceChart = screen.getByTestId('balance-trend-chart');
        const incomeExpenseChart = screen.getByTestId('income-expense-chart');
        const monthlyTotalsChart = screen.getByTestId('monthly-totals-chart');
        
        // All should have the same default period (6)
        expect(balanceChart).toHaveAttribute('data-time-period', '6');
        expect(incomeExpenseChart).toHaveAttribute('data-time-period', '6');
        expect(monthlyTotalsChart).toHaveAttribute('data-time-period', '6');
      });
    });

    it('updates all charts when time period changes', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('time-period-filter')).toBeInTheDocument();
      });
      
      // Change time period
      const changeButton = screen.getByText('Change to 12 months');
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        const balanceChart = screen.getByTestId('balance-trend-chart');
        const incomeExpenseChart = screen.getByTestId('income-expense-chart');
        const monthlyTotalsChart = screen.getByTestId('monthly-totals-chart');
        
        // All should now have period 12
        expect(balanceChart).toHaveAttribute('data-time-period', '12');
        expect(incomeExpenseChart).toHaveAttribute('data-time-period', '12');
        expect(monthlyTotalsChart).toHaveAttribute('data-time-period', '12');
      });
    });
  });

  describe('Chart Configuration', () => {
    it('configures chart components with correct props', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        // Check Income vs Expenses chart configuration
        const incomeExpenseChart = screen.getByTestId('income-expense-chart');
        expect(incomeExpenseChart).toHaveAttribute('data-net-area', 'true');
        expect(incomeExpenseChart).toHaveAttribute('data-average-lines', 'true');
        
        // Check Monthly Totals chart configuration
        const monthlyTotalsChart = screen.getByTestId('monthly-totals-chart');
        expect(monthlyTotalsChart).toHaveAttribute('data-net-indicators', 'true');
      });
    });
  });

  describe('No Data State', () => {
    it('shows no data message when user has no historical data', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(false);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('No Historical Data Yet')).toBeInTheDocument();
        expect(screen.getByText('View Current Month Data')).toBeInTheDocument();
      });
      
      // Should not render chart components
      expect(screen.queryByTestId('balance-trend-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('income-expense-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monthly-totals-chart')).not.toBeInTheDocument();
    });

    it('includes link to dashboard when no data available', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(false);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /view current month data/i });
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton while checking for historical data', () => {
      // Make the check hang
      mockHasMultipleMonthsOfData.mockImplementation(() => new Promise(() => {}));
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      // Should show loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows charts loading skeleton when period data is loading', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      // Make chart data service hang
      mockChartDataService.getHistoricalBalanceData.mockImplementation(() => new Promise(() => {}));
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      });
      
      // Should show multiple loading skeletons
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    it('handles service errors gracefully', async () => {
      mockHasMultipleMonthsOfData.mockRejectedValue(new Error('Service error'));
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        // Should show no data state as fallback
        expect(screen.getByText('No Historical Data Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    it('uses responsive grid classes for charts', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        // Check for responsive grid container
        const gridContainer = screen.getByTestId('income-expense-chart').closest('.grid');
        expect(gridContainer).toHaveClass('grid-cols-1', 'xl:grid-cols-2');
      });
    });

    it('includes responsive header layout', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        const headerContainer = screen.getByText('Financial Reports').closest('.flex');
        expect(headerContainer).toHaveClass('flex-col', 'sm:flex-row');
      });
    });
  });

  describe('Legacy Component Integration', () => {
    it('maintains MonthlyHistoryViewer integration', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('monthly-history-viewer')).toBeInTheDocument();
      });
      
      // Should have section description
      expect(screen.getByText('Detailed month-by-month breakdown with transaction summaries')).toBeInTheDocument();
    });

    it('includes separator before legacy section', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Historical Data Details')).toBeInTheDocument();
      });
    });
  });

  describe('Future Reports Section', () => {
    it('renders enhanced future reports section', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('More Analytics Coming Soon!')).toBeInTheDocument();
        expect(screen.getByText(/category breakdowns, spending patterns/)).toBeInTheDocument();
        expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      });
    });

    it('includes contact email link', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        const emailLink = screen.getByText('Send them to hello@kpege.com');
        expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:hello@kpege.com?subject=Report%20Suggestions');
      });
    });
  });
}); 