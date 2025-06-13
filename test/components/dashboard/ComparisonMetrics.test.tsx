import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import ComparisonMetrics from '@/components/dashboard/ComparisonMetrics';
import * as monthlySnapshotService from '@/services/monthlySnapshotService';
import type { MonthlySnapshotWithComparative } from '@/types/chartData';
import type { ComparativeInsights } from '@/types/comparativeData';

// Mock the monthly snapshot service
vi.mock('@/services/monthlySnapshotService', () => ({
  getMonthlySnapshotWithComparative: vi.fn()
}));

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>
}));

// Mock child components
vi.mock('@/components/dashboard/MetricCard', () => ({
  default: ({ title, value, percentage, trend, context, period, dataAvailable }: any) => (
    <div data-testid="metric-card">
      <span data-testid="metric-title">{title}</span>
      <span data-testid="metric-value">{value}</span>
      <span data-testid="metric-percentage">{percentage}</span>
      <span data-testid="metric-trend">{trend}</span>
      <span data-testid="metric-context">{context}</span>
      <span data-testid="metric-period">{period}</span>
      <span data-testid="metric-available">{dataAvailable.toString()}</span>
    </div>
  )
}));

vi.mock('@/components/dashboard/ComparisonPeriod', () => ({
  default: ({ year, month }: any) => (
    <div data-testid="comparison-period">
      {month}/{year}
    </div>
  )
}));

vi.mock('@/components/dashboard/DataAvailability', () => ({
  default: ({ message, suggestion, variant }: any) => (
    <div data-testid="data-availability" data-variant={variant}>
      <span data-testid="availability-message">{message}</span>
      {suggestion && <span data-testid="availability-suggestion">{suggestion}</span>}
    </div>
  )
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <CurrencyProvider>
    {children}
  </CurrencyProvider>
);

describe('ComparisonMetrics', () => {
  const mockGetMonthlySnapshotWithComparative = vi.mocked(monthlySnapshotService.getMonthlySnapshotWithComparative);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createMockComparativeData = (): ComparativeInsights => ({
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
    },
    yearOverYear: {
      income: {
        current: 5000,
        previous: 4500,
        absoluteDifference: 500,
        percentageChange: 11.1,
        trend: 'up',
        dataAvailable: true
      },
      expenses: {
        current: 3000,
        previous: 2800,
        absoluteDifference: 200,
        percentageChange: 7.1,
        trend: 'up',
        dataAvailable: true
      },
      balance: {
        current: 2000,
        previous: 1700,
        absoluteDifference: 300,
        percentageChange: 17.6,
        trend: 'up',
        dataAvailable: true
      }
    }
  });

  const createMockSnapshot = (comparative?: ComparativeInsights): MonthlySnapshotWithComparative => ({
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
    comparative
  });

  describe('Loading State', () => {
    it('should show loading skeletons while fetching data', async () => {
      mockGetMonthlySnapshotWithComparative.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      expect(screen.getByText('Comparative Insights')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton')).toHaveLength(7); // 1 for period + 6 for metrics
    });
  });

  describe('Error State', () => {
    it('should show error message when data fetch fails', async () => {
      mockGetMonthlySnapshotWithComparative.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText('Failed to load comparative insights. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('No Data State', () => {
    it('should show no data message when snapshot is null', async () => {
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(null);

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('data-availability')).toBeInTheDocument();
        expect(screen.getByTestId('availability-message')).toHaveTextContent('No data available for the selected period');
      });
    });

    it('should show no comparative data message when comparative is null', async () => {
      const mockSnapshot = createMockSnapshot();
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('data-availability')).toBeInTheDocument();
        expect(screen.getByTestId('availability-message')).toHaveTextContent('Comparative insights not available');
      });
    });
  });

  describe('Data Display', () => {
    it('should display month-over-month comparisons correctly', async () => {
      const mockComparative = createMockComparativeData();
      const mockSnapshot = createMockSnapshot(mockComparative);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Month-over-Month Changes')).toBeInTheDocument();
        
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards).toHaveLength(6); // 3 MoM + 3 YoY
        
        // Check income metric
        const incomeCard = metricCards.find(card => 
          card.querySelector('[data-testid="metric-title"]')?.textContent === 'Income Change' &&
          card.querySelector('[data-testid="metric-period"]')?.textContent === 'month-over-month'
        );
        expect(incomeCard).toBeInTheDocument();
        expect(incomeCard?.querySelector('[data-testid="metric-percentage"]')).toHaveTextContent('25');
        expect(incomeCard?.querySelector('[data-testid="metric-trend"]')).toHaveTextContent('up');
      });
    });

    it('should display year-over-year comparisons when showDetailed is true', async () => {
      const mockComparative = createMockComparativeData();
      const mockSnapshot = createMockSnapshot(mockComparative);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics showDetailed={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Year-over-Year Changes')).toBeInTheDocument();
        
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards).toHaveLength(6); // 3 MoM + 3 YoY
      });
    });

    it('should not display year-over-year comparisons when showDetailed is false', async () => {
      const mockComparative = createMockComparativeData();
      const mockSnapshot = createMockSnapshot(mockComparative);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics showDetailed={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Year-over-Year Changes')).not.toBeInTheDocument();
        
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards).toHaveLength(3); // Only MoM
      });
    });
  });

  describe('Props Handling', () => {
    it('should use current month when showCurrentMonth is true', async () => {
      const mockSnapshot = createMockSnapshot(createMockComparativeData());
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      render(
        <TestWrapper>
          <ComparisonMetrics showCurrentMonth={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetMonthlySnapshotWithComparative).toHaveBeenCalledWith(currentYear, currentMonth);
      });
    });

    it('should use provided year and month when showCurrentMonth is false', async () => {
      const mockSnapshot = createMockSnapshot(createMockComparativeData());
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics year={2024} month={6} showCurrentMonth={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetMonthlySnapshotWithComparative).toHaveBeenCalledWith(2024, 6);
      });
    });

    it('should apply custom className', async () => {
      const mockSnapshot = createMockSnapshot(createMockComparativeData());
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      const { container } = render(
        <TestWrapper>
          <ComparisonMetrics className="custom-class" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  describe('Data Availability Handling', () => {
    it('should show data availability notice when some data is limited', async () => {
      const mockComparative = createMockComparativeData();
      // Make some data unavailable
      mockComparative.monthOverMonth!.income.dataAvailable = false;
      
      const mockSnapshot = createMockSnapshot(mockComparative);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('data-availability')).toBeInTheDocument();
        expect(screen.getByTestId('availability-message')).toHaveTextContent('Some comparative data is limited');
      });
    });
  });

  describe('Integration', () => {
    it('should pass correct props to MetricCard components', async () => {
      const mockComparative = createMockComparativeData();
      const mockSnapshot = createMockSnapshot(mockComparative);
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics />
        </TestWrapper>
      );

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        
        // Check income card props
        const incomeCard = metricCards.find(card => 
          card.querySelector('[data-testid="metric-context"]')?.textContent === 'income' &&
          card.querySelector('[data-testid="metric-period"]')?.textContent === 'month-over-month'
        );
        
        expect(incomeCard).toBeInTheDocument();
        expect(incomeCard?.querySelector('[data-testid="metric-title"]')).toHaveTextContent('Income Change');
        expect(incomeCard?.querySelector('[data-testid="metric-percentage"]')).toHaveTextContent('25');
        expect(incomeCard?.querySelector('[data-testid="metric-trend"]')).toHaveTextContent('up');
        expect(incomeCard?.querySelector('[data-testid="metric-available"]')).toHaveTextContent('true');
      });
    });

    it('should display comparison period correctly', async () => {
      const mockSnapshot = createMockSnapshot(createMockComparativeData());
      mockGetMonthlySnapshotWithComparative.mockResolvedValue(mockSnapshot);

      render(
        <TestWrapper>
          <ComparisonMetrics year={2025} month={1} showCurrentMonth={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('comparison-period')).toHaveTextContent('1/2025');
      });
    });
  });
}); 