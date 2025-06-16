import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryReportsSection from '@/components/reports/CategoryReportsSection';
import type { CategoryAggregate, CategoryChange } from '@/types/analytics';

// Mock the contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' }
  })
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPossiblyConvertedCurrency: (amount: number) => `$${amount.toFixed(2)}`
  })
}));

vi.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    getResponsiveSpacing: () => ({ cardGap: 24, containerPadding: 16 })
  })
}));

// Mock chart components
vi.mock('@/components/charts/TopCategoriesChart', () => ({
  default: ({ data, variant }: any) => (
    <div data-testid="top-categories-chart" data-variant={variant}>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  )
}));

vi.mock('@/components/charts/CategoryTrendChart', () => ({
  default: ({ series }: any) => (
    <div data-testid="category-trend-chart">
      <div data-testid="trend-series">{JSON.stringify(series)}</div>
    </div>
  )
}));

// Mock analytics service
const mockCategoryData: CategoryAggregate[] = [
  {
    categoryId: 'groceries',
    categoryName: 'Groceries',
    total: 1200,
    percentage: 40,
    currency: 'NGN',
    type: 'expense'
  },
  {
    categoryId: 'transport',
    categoryName: 'Transportation',
    total: 800,
    percentage: 27,
    currency: 'NGN',
    type: 'expense'
  }
];

const mockCategoryChanges: CategoryChange[] = [
  {
    categoryId: 'groceries',
    categoryName: 'Groceries',
    type: 'expense',
    currentTotal: 1200,
    previousTotal: 1000,
    absoluteChange: 200,
    percentageChange: 20,
    isSignificant: true,
    currency: 'NGN',
    changeType: 'MoM'
  }
];

vi.mock('@/services/categoryAnalyticsService', () => ({
  categoryAnalyticsService: {
    getCategoryTotals: vi.fn(),
    getCategoryChanges: vi.fn()
  }
}));

import { categoryAnalyticsService } from '@/services/categoryAnalyticsService';

describe('CategoryReportsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (categoryAnalyticsService.getCategoryTotals as any).mockResolvedValue(mockCategoryData);
    (categoryAnalyticsService.getCategoryChanges as any).mockResolvedValue(mockCategoryChanges);
  });

  it('renders category analysis section', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    expect(screen.getByText('Category Analysis')).toBeInTheDocument();
    expect(screen.getByText('Filters & Settings')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('top-categories-chart')).toBeInTheDocument();
    });
  });

  it('loads category data on mount', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(categoryAnalyticsService.getCategoryTotals).toHaveBeenCalledWith('test-user-123', 3);
      expect(categoryAnalyticsService.getCategoryChanges).toHaveBeenCalledWith('test-user-123', 3);
    });
  });

  it('displays category insights when significant changes exist', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByText('Category Insights')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('+20.0%')).toBeInTheDocument();
    });
  });

  it('switches between chart variants', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByTestId('top-categories-chart')).toBeInTheDocument();
    });

    // Should be bar chart initially
    const chart = screen.getByTestId('top-categories-chart');
    expect(chart).toHaveAttribute('data-variant', 'bar');

    // Switch to pie chart
    const pieButton = screen.getByText('Pie');
    fireEvent.click(pieButton);

    expect(chart).toHaveAttribute('data-variant', 'pie');
  });

  it('filters categories by search', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-data')).toBeInTheDocument();
    });

    // Search for "grocery"
    const searchInput = screen.getByPlaceholderText('Search category names...');
    fireEvent.change(searchInput, { target: { value: 'grocery' } });

    // Chart should update with filtered data
    await waitFor(() => {
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '[]');
      expect(data).toHaveLength(1);
      expect(data[0].categoryName).toBe('Groceries');
    });
  });

  it('enables trend comparison mode', async () => {
    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Trend Comparison')).toBeInTheDocument();
    });

    // Enable trend comparison
    const trendToggle = screen.getByLabelText('Trend Comparison');
    fireEvent.click(trendToggle);

    // Should show category selection
    expect(screen.getByText('Select Categories for Trend Comparison')).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    (categoryAnalyticsService.getCategoryTotals as any).mockResolvedValue([]);
    (categoryAnalyticsService.getCategoryChanges as any).mockResolvedValue([]);

    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByText('No Category Data Available')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    (categoryAnalyticsService.getCategoryTotals as any).mockRejectedValue(new Error('API Error'));

    render(<CategoryReportsSection timePeriod={3} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Category Reports')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });
}); 