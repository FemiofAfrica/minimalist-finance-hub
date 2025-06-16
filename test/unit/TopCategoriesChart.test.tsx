import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopCategoriesChart from '@/components/charts/TopCategoriesChart';
import type { CategoryAggregate } from '@/types/analytics';

// Mock the contexts and hooks
vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPossiblyConvertedCurrency: (amount: number, options?: any) => 
      options?.compact ? `$${(amount / 1000).toFixed(0)}k` : `$${amount.toFixed(2)}`,
    exchangeRates: { NGN: 1500 } // Mock exchange rate
  })
}));

vi.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    getChartHeight: (height: number) => height,
    getResponsiveSpacing: () => ({ top: 20, right: 30, left: 20, bottom: 5 }),
    getResponsiveFontSizes: () => ({ small: 12, medium: 14, large: 16 })
  })
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, children, onClick }: any) => (
    <div data-testid="bar" data-key={dataKey} onClick={onClick}>
      {children}
    </div>
  ),
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, dataKey, children }: any) => (
    <div data-testid="pie" data-key={dataKey} data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

const mockCategoryData: CategoryAggregate[] = [
  {
    categoryId: '1',
    categoryName: 'Groceries',
    total: 5000,
    percentage: 35.0,
    transactionCount: 25,
    currency: 'NGN'
  },
  {
    categoryId: '2',
    categoryName: 'Transportation',
    total: 3000,
    percentage: 21.0,
    transactionCount: 15,
    currency: 'NGN'
  },
  {
    categoryId: '3',
    categoryName: 'Entertainment',
    total: 2500,
    percentage: 17.5,
    transactionCount: 10,
    currency: 'NGN'
  },
  {
    categoryId: '4',
    categoryName: 'Utilities',
    total: 2000,
    percentage: 14.0,
    transactionCount: 8,
    currency: 'NGN'
  },
  {
    categoryId: '5',
    categoryName: 'Healthcare',
    total: 1500,
    percentage: 10.5,
    transactionCount: 5,
    currency: 'NGN'
  },
  {
    categoryId: '6',
    categoryName: 'Shopping and Personal Care Items',
    total: 1000,
    percentage: 7.0,
    transactionCount: 12,
    currency: 'NGN'
  }
];

describe('TopCategoriesChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bar Chart Variant', () => {
    it('renders bar chart with correct data', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
        />
      );

      expect(screen.getByTestId('top-categories-bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('limits categories to maxCategories prop', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
          maxCategories={3}
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(3);
      expect(chartData[0].categoryName).toBe('Groceries'); // Highest value first
      expect(chartData[1].categoryName).toBe('Transportation');
      expect(chartData[2].categoryName).toBe('Entertainment');
    });

    it('sorts categories by total amount (highest first)', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      // Verify sorting by total (descending)
      for (let i = 0; i < chartData.length - 1; i++) {
        expect(chartData[i].total).toBeGreaterThanOrEqual(chartData[i + 1].total);
      }
    });

    it('handles click events', () => {
      const mockOnClick = vi.fn();
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
          onCategoryClick={mockOnClick}
        />
      );

      const bar = screen.getByTestId('bar');
      fireEvent.click(bar);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pie Chart Variant', () => {
    it('renders pie chart with correct data', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="pie" 
        />
      );

      expect(screen.getByTestId('top-categories-pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders correct number of pie slices', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="pie" 
          maxCategories={4}
        />
      );

      const pie = screen.getByTestId('pie');
      const chartData = JSON.parse(pie.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(4);
      
      // Since cells are rendered as children inside the component, 
      // we check the data length instead of individual cell elements
      expect(chartData.every(item => item.color)).toBe(true);
    });

    it('assigns colors to pie slices', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="pie" 
          maxCategories={3}
        />
      );

      const pie = screen.getByTestId('pie');
      const chartData = JSON.parse(pie.getAttribute('data-chart-data') || '[]');
      
      // Verify each item has a valid hex color
      chartData.forEach((item: any) => {
        expect(item.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('Common Functionality', () => {
    it('handles empty data gracefully', () => {
      render(
        <TopCategoriesChart 
          data={[]} 
          variant="bar" 
        />
      );

      expect(screen.getByText('No category data available')).toBeInTheDocument();
      expect(screen.getByText('Add some transactions to see your top categories')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
          className="custom-class"
        />
      );

      const chartContainer = screen.getByTestId('top-categories-bar-chart');
      expect(chartContainer).toHaveClass('custom-class');
    });

    it('uses default maxCategories of 10', () => {
      const largeDataSet = Array.from({ length: 15 }, (_, i) => ({
        categoryId: `${i + 1}`,
        categoryName: `Category ${i + 1}`,
        total: 1000 * (15 - i), // Decreasing totals
        percentage: 100 / 15,
        transactionCount: 5,
        currency: 'NGN'
      }));

      render(
        <TopCategoriesChart 
          data={largeDataSet} 
          variant="bar" 
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(10); // Default MAX_CATEGORIES
    });

    it('truncates long category names for display', () => {
      const longNameData: CategoryAggregate[] = [{
        categoryId: '1',
        categoryName: 'Very Long Category Name That Should Be Truncated',
        total: 5000,
        percentage: 100,
        transactionCount: 10,
        currency: 'NGN'
      }];

      render(
        <TopCategoriesChart 
          data={longNameData} 
          variant="bar" 
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].displayName).toMatch(/\.\.\.$/); // Should end with ...
      expect(chartData[0].displayName.length).toBeLessThanOrEqual(15);
    });

    it('uses value property for chart data key', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
        />
      );

      const bar = screen.getByTestId('bar');
      expect(bar.getAttribute('data-key')).toBe('value');
    });
  });

  describe('Accessibility', () => {
    it('provides proper data-testid for testing', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="bar" 
        />
      );

      expect(screen.getByTestId('top-categories-bar-chart')).toBeInTheDocument();
    });

    it('includes tooltip for accessibility', () => {
      render(
        <TopCategoriesChart 
          data={mockCategoryData} 
          variant="pie" 
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });
}); 