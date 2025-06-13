import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Reports from '@/pages/Reports';
import { hasMultipleMonthsOfData } from '@/services/monthlySnapshotService';
import { chartDataService } from '@/services/chartDataService';
import { useCurrency } from '@/contexts/CurrencyContext';

// Mock the services and contexts
vi.mock('@/services/monthlySnapshotService', () => ({
  hasMultipleMonthsOfData: vi.fn()
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Reports Page Integration', () => {
  const mockHasMultipleMonthsOfData = hasMultipleMonthsOfData as any;
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
    it('renders all chart components when user has multiple months of data', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      });
      
      // Check all chart components are rendered
      expect(screen.getByTestId('balance-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('income-expense-chart')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-totals-chart')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-history-viewer')).toBeInTheDocument();
    });

    it('renders time period filter when data is available', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('time-period-filter')).toBeInTheDocument();
      });
    });

    it('displays proper section headers and descriptions', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Balance Trend')).toBeInTheDocument();
        expect(screen.getByText('Income vs Expenses')).toBeInTheDocument();
        expect(screen.getByText('Monthly Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Monthly History Details')).toBeInTheDocument();
      });
      
      // Check descriptions
      expect(screen.getByText('Track your account balance progression over time')).toBeInTheDocument();
      expect(screen.getByText('Compare income and expense trends with detailed analysis')).toBeInTheDocument();
      expect(screen.getByText('Monthly income and expense totals with summary statistics')).toBeInTheDocument();
    });

    it('renders icons for each chart section', async () => {
      mockHasMultipleMonthsOfData.mockResolvedValue(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart-icon')).toBeInTheDocument();
        expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart-icon')).toBeInTheDocument();
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