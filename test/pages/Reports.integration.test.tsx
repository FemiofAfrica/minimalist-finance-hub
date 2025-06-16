import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Reports from '@/pages/Reports';
import { hasMultipleMonthsOfData } from '@/services/monthlySnapshotService';
import { chartDataService } from '@/services/chartDataService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import * as monthlySnapshotService from '@/services/monthlySnapshotService';
import React from 'react';

// Essential browser API mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    standalone: false,
    userAgent: 'test-agent',
  },
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock DOMMatrix for chart libraries
(global as any).DOMMatrix = class DOMMatrix {
  constructor() {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

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
  useCurrency: vi.fn(),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-currency-provider">{children}</div>
  )
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

// Mock Lucide React icons - comprehensive explicit mock
vi.mock('lucide-react', () => ({
  // Charts and Reports icons
  Target: () => <div data-testid="target-icon">Target</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down-icon">TrendingDown</div>,
  BarChart3: () => <div data-testid="bar-chart-icon">BarChart3</div>,
  LineChart: () => <div data-testid="line-chart-icon">LineChart</div>,
  PieChart: () => <div data-testid="pie-chart-icon">PieChart</div>,
  
  // Dashboard sidebar icons
  LayoutDashboard: () => <div data-testid="layout-dashboard-icon">LayoutDashboard</div>,
  CreditCard: () => <div data-testid="credit-card-icon">CreditCard</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  BookOpenText: () => <div data-testid="book-open-text-icon">BookOpenText</div>,
  Wallet: () => <div data-testid="wallet-icon">Wallet</div>,
  PiggyBank: () => <div data-testid="piggy-bank-icon">PiggyBank</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Home: () => <div data-testid="home-icon">Home</div>,
  DollarSign: () => <div data-testid="dollar-sign-icon">DollarSign</div>,
  
  // Header and UI icons
  Moon: () => <div data-testid="moon-icon">Moon</div>,
  Sun: () => <div data-testid="sun-icon">Sun</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  PanelLeft: () => <div data-testid="panel-left-icon">PanelLeft</div>,
  
  // Notification icons
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  BellIcon: () => <div data-testid="bell-icon">BellIcon</div>,
  XIcon: () => <div data-testid="x-icon">XIcon</div>,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon">ChevronDownIcon</div>,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon">ChevronUpIcon</div>,
  
  // Support banner icons  
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  X: () => <div data-testid="x-icon">X</div>,
  
  // Transaction modal icons
  Mic: () => <div data-testid="mic-icon">Mic</div>,
  FileUp: () => <div data-testid="file-up-icon">FileUp</div>,
  
  // Commonly used icons
  ChevronLeft: () => <div data-testid="chevron-left-icon">ChevronLeft</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash: () => <div data-testid="trash-icon">Trash</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Info: () => <div data-testid="info-icon">Info</div>
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

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true,
    loading: false,
    signOut: vi.fn()
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-auth-provider">{children}</div>
  )
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn()
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-theme-provider">{children}</div>
  )
}));

// Mock NotificationContext
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn()
  })),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-notification-provider">{children}</div>
  )
}));

// Mock hooks - make it configurable
const mockSetPeriod = vi.fn();
let mockCurrentPeriod = 6; // Default to 6 for most tests
let mockLoading = false; // Default to not loading

vi.mock('@/hooks/useTimePeriodData', () => ({
  useTimePeriodData: () => ({
    currentPeriod: mockCurrentPeriod,
    availableData: { months: 6, years: 1 },
    loading: mockLoading,
    setPeriod: mockSetPeriod
  })
}));

// Helper functions to update mock state
const setMockPeriod = (period: number) => {
  mockCurrentPeriod = period;
};

const setMockLoading = (loading: boolean) => {
  mockLoading = loading;
};

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

// Mock the problematic hooks directly
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

vi.mock('@/components/InstallPrompt', () => ({
  InstallPrompt: () => null
}));

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div 
      className={`animate-pulse rounded-md bg-muted ${className || ''}`} 
      data-testid="skeleton"
      {...props}
    />
  )
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
      exchangeRates: { NGN: 800 },
      currentCurrency: { code: "USD", symbol: "$", name: "US Dollar" },
      setCurrentCurrency: vi.fn(),
      isLiveConversionEnabled: true,
      setIsLiveConversionEnabled: vi.fn()
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
      
      // Set loading state
      setMockLoading(true);

      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show loading skeletons
        const skeletons = screen.getAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(0); // Should include skeleton for components
      });
      
      // Reset loading state
      setMockLoading(false);
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
      
      // Set up the mock to respond to period changes
      mockSetPeriod.mockImplementation((newPeriod) => {
        mockCurrentPeriod = newPeriod;
      });
      
      const { rerender } = render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('time-period-filter')).toBeInTheDocument();
      });
      
      // Change time period to 12
      mockCurrentPeriod = 12;
      
      // Force re-render to reflect the period change
      rerender(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
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
      
      // Set period loading state to trigger ChartsLoadingSkeleton
      setMockLoading(true);
      
      render(
        <TestWrapper>
          <Reports />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      });
      
      // Should show multiple loading skeletons from ChartsLoadingSkeleton
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(1);
      
      // Reset loading state
      setMockLoading(false);
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

  // Note: Legacy Component Integration tests removed as these components
  // (MonthlyHistoryViewer, Historical Data Details) are not part of the current Reports implementation

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