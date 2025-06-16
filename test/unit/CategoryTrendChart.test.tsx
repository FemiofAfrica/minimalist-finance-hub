import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryTrendChart from '@/components/charts/CategoryTrendChart';
import type { CategoryTrendSeries } from '@/types/analytics';

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

// Mock date-fns format function
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'MMM yy') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
    }
    return date.toISOString();
  }
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data, onClick }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} onClick={onClick}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data, onClick }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)} onClick={onClick}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid="line" data-key={dataKey} data-stroke={stroke} />
  ),
  Area: ({ dataKey, fill, stroke }: any) => (
    <div data-testid="area" data-key={dataKey} data-fill={fill} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

const mockTrendSeries: CategoryTrendSeries[] = [
  {
    categoryId: 'groceries',
    categoryName: 'Groceries',
    type: 'expense',
    currency: 'NGN',
    color: '#3498DB',
    data: [
      { month: '2024-01', amount: 5000, percentageChange: 0 },
      { month: '2024-02', amount: 5500, percentageChange: 10 },
      { month: '2024-03', amount: 4800, percentageChange: -12.7 }
    ]
  },
  {
    categoryId: 'transport',
    categoryName: 'Transportation',
    type: 'expense',
    currency: 'NGN',
    color: '#2ECC71',
    data: [
      { month: '2024-01', amount: 3000, percentageChange: 0 },
      { month: '2024-02', amount: 3200, percentageChange: 6.7 },
      { month: '2024-03', amount: 2900, percentageChange: -9.4 }
    ]
  }
];

const singleSeriesMock: CategoryTrendSeries[] = [
  {
    categoryId: 'entertainment',
    categoryName: 'Entertainment',
    type: 'expense',
    currency: 'NGN',
    color: '#F1C40F',
    data: [
      { month: '2024-01', amount: 2000 },
      { month: '2024-02', amount: 2500, percentageChange: 25 }
    ]
  }
];

describe('CategoryTrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Line Chart Mode', () => {
    it('renders line chart with correct data', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="line" 
        />
      );

      expect(screen.getByTestId('category-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders correct number of line series', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="line" 
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(2);
      
      // Check first line (groceries)
      expect(lines[0]).toHaveAttribute('data-key', 'groceries');
      expect(lines[0]).toHaveAttribute('data-stroke', '#3498DB');
      
      // Check second line (transport)
      expect(lines[1]).toHaveAttribute('data-key', 'transport');
      expect(lines[1]).toHaveAttribute('data-stroke', '#2ECC71');
    });

    it('processes chart data correctly for multiple series', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="line" 
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(3); // 3 months
      
      // Check first month data
      expect(chartData[0]).toEqual({
        month: '2024-01',
        displayMonth: 'Jan 24',
        groceries: 5000,
        groceries_percentageChange: 0,
        groceries_name: 'Groceries',
        transport: 3000,
        transport_percentageChange: 0,
        transport_name: 'Transportation'
      });
      
      // Check second month data
      expect(chartData[1]).toEqual({
        month: '2024-02',
        displayMonth: 'Feb 24',
        groceries: 5500,
        groceries_percentageChange: 10,
        groceries_name: 'Groceries',
        transport: 3200,
        transport_percentageChange: 6.7,
        transport_name: 'Transportation'
      });
    });
  });

  describe('Area Chart Mode', () => {
    it('renders area chart with correct data', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="area" 
        />
      );

      expect(screen.getByTestId('category-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('renders correct number of area series', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="area" 
        />
      );

      const areas = screen.getAllByTestId('area');
      expect(areas).toHaveLength(2);
      
      // Check areas have correct properties
      expect(areas[0]).toHaveAttribute('data-key', 'groceries');
      expect(areas[0]).toHaveAttribute('data-fill', '#3498DB');
      expect(areas[0]).toHaveAttribute('data-stroke', '#3498DB');
    });
  });

  describe('Mode Toggle', () => {
    it('enables mode toggle by default', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
        />
      );

      expect(screen.getByText('Line')).toBeInTheDocument();
      expect(screen.getByText('Area')).toBeInTheDocument();
    });

    it('can disable mode toggle', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          enableModeToggle={false}
        />
      );

      expect(screen.queryByText('Line')).not.toBeInTheDocument();
      expect(screen.queryByText('Area')).not.toBeInTheDocument();
    });

    it('switches between line and area modes', () => {
      render(
        <CategoryTrendChart 
          series={mockTrendSeries} 
          mode="line"
        />
      );

      // Start with line chart
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();

      // Click Area button
      fireEvent.click(screen.getByText('Area'));
      
      // Should now show area chart
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();

      // Click Line button
      fireEvent.click(screen.getByText('Line'));
      
      // Should be back to line chart
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('handles series with different month ranges', () => {
      const unevenSeries: CategoryTrendSeries[] = [
        {
          categoryId: 'category1',
          categoryName: 'Category 1',
          type: 'expense',
          currency: 'NGN',
          color: '#3498DB',
          data: [
            { month: '2024-01', amount: 1000 },
            { month: '2024-03', amount: 1200 }
          ]
        },
        {
          categoryId: 'category2',
          categoryName: 'Category 2',
          type: 'expense',
          currency: 'NGN',
          color: '#2ECC71',
          data: [
            { month: '2024-02', amount: 800 },
            { month: '2024-03', amount: 900 }
          ]
        }
      ];

      render(
        <CategoryTrendChart series={unevenSeries} />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(3); // Should include all months
      
      // Check that missing data points are filled with 0
      expect(chartData[0]).toMatchObject({
        month: '2024-01',
        category1: 1000,
        category2: 0 // Missing data filled with 0
      });
      
      expect(chartData[1]).toMatchObject({
        month: '2024-02',
        category1: 0, // Missing data filled with 0
        category2: 800
      });
    });

    it('sorts months chronologically', () => {
      const unsortedSeries: CategoryTrendSeries[] = [
        {
          categoryId: 'test',
          categoryName: 'Test',
          type: 'expense',
          currency: 'NGN',
          color: '#3498DB',
          data: [
            { month: '2024-03', amount: 300 },
            { month: '2024-01', amount: 100 },
            { month: '2024-02', amount: 200 }
          ]
        }
      ];

      render(
        <CategoryTrendChart series={unsortedSeries} />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].month).toBe('2024-01');
      expect(chartData[1].month).toBe('2024-02');
      expect(chartData[2].month).toBe('2024-03');
    });
  });

  describe('Empty States', () => {
    it('handles empty series array', () => {
      render(
        <CategoryTrendChart series={[]} />
      );

      expect(screen.getByText('No trend data available')).toBeInTheDocument();
      expect(screen.getByText('Add some transactions to see category trends over time')).toBeInTheDocument();
    });

    it('handles series with no data points', () => {
      const emptyDataSeries: CategoryTrendSeries[] = [
        {
          categoryId: 'empty',
          categoryName: 'Empty',
          type: 'expense',
          currency: 'NGN',
          color: '#3498DB',
          data: []
        }
      ];

      render(
        <CategoryTrendChart series={emptyDataSeries} />
      );

      expect(screen.getByText('No trend data points available')).toBeInTheDocument();
      expect(screen.getByText('Data needs at least one month of transactions')).toBeInTheDocument();
    });
  });

  describe('Customization Props', () => {
    it('applies custom className', () => {
      render(
        <CategoryTrendChart 
          series={singleSeriesMock} 
          className="custom-trend-chart"
        />
      );

      const chartContainer = screen.getByTestId('category-trend-chart');
      expect(chartContainer).toHaveClass('custom-trend-chart');
    });

    it('uses custom height', () => {
      render(
        <CategoryTrendChart 
          series={singleSeriesMock} 
          height={600}
        />
      );

      // The height would be applied to the ResponsiveContainer
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('handles initial mode prop', () => {
      render(
        <CategoryTrendChart 
          series={singleSeriesMock} 
          mode="area"
        />
      );

      // Should start with area chart
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('handles click events', () => {
      const mockOnClick = vi.fn();
      render(
        <CategoryTrendChart 
          series={singleSeriesMock} 
          onDataPointClick={mockOnClick}
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      
      // Simulate click with mock event data
      const mockClickData = {
        activePayload: [{ dataKey: 'entertainment' }]
      };
      
      fireEvent.click(lineChart);
      // Note: The actual click handling would need proper event simulation
      // This tests the component structure for click handling
    });
  });

  describe('Accessibility', () => {
    it('provides proper data-testid for testing', () => {
      render(
        <CategoryTrendChart series={singleSeriesMock} />
      );

      expect(screen.getByTestId('category-trend-chart')).toBeInTheDocument();
    });

    it('includes tooltip for accessibility', () => {
      render(
        <CategoryTrendChart series={singleSeriesMock} />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('includes legend for series identification', () => {
      render(
        <CategoryTrendChart series={mockTrendSeries} />
      );

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });
}); 