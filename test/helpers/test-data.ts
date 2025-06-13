/**
 * Test Data Generation Helpers
 * 
 * Provides consistent and reproducible test data for chart testing
 * across all E2E test scenarios, including edge cases and performance testing.
 */

export interface ChartDataPoint {
  month: string;
  balance: number;
  income: number;
  expenses: number;
}

export interface TestScenario {
  name: string;
  description: string;
  data: ChartDataPoint[];
  expectedPattern: string;
  testNotes: string[];
}

/**
 * Test data generator class with various scenarios
 */
export class TestDataGenerator {
  /**
   * Generate steady growth financial data
   */
  static generateSteadyGrowth(months: number = 12): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    let balance = 5000;
    const baseIncome = 3000;
    const baseExpenses = 2000;
    
    for (let i = 0; i < months; i++) {
      const date = new Date(2024, i, 1);
      const month = date.toISOString().slice(0, 7);
      
      // Gradual increase in income and expenses
      const income = baseIncome + (i * 100);
      const expenses = baseExpenses + (i * 50);
      balance += (income - expenses);
      
      data.push({
        month,
        balance: Math.round(balance),
        income: Math.round(income),
        expenses: Math.round(expenses)
      });
    }
    
    return data;
  }
  
  /**
   * Generate volatile/irregular financial data
   */
  static generateVolatileFinances(months: number = 24): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    let balance = 3000;
    
    // Set random seed for reproducible results
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let i = 0; i < months; i++) {
      const date = new Date(2023, i % 12, 1);
      const month = date.toISOString().slice(0, 7);
      
      // Irregular income and expenses with seasonal patterns
      const seasonalMultiplier = 1 + Math.sin(i / 6) * 0.3;
      const income = (2000 + random() * 3000) * seasonalMultiplier;
      const expenses = (1500 + random() * 2500) * seasonalMultiplier;
      balance += (income - expenses);
      
      data.push({
        month,
        balance: Math.round(Math.max(0, balance)),
        income: Math.round(income),
        expenses: Math.round(expenses)
      });
    }
    
    return data;
  }
  
  /**
   * Generate minimal data for new users
   */
  static generateNewUserData(): ChartDataPoint[] {
    return [
      {
        month: '2024-05',
        balance: 1000,
        income: 1500,
        expenses: 500
      },
      {
        month: '2024-06',
        balance: 1800,
        income: 2000,
        expenses: 1200
      }
    ];
  }
  
  /**
   * Generate large dataset for performance testing
   */
  static generateLargeDataset(months: number = 60): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    let balance = 10000;
    
    for (let i = 0; i < months; i++) {
      const year = 2019 + Math.floor(i / 12);
      const month = (i % 12) + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      // Complex pattern with trends and cycles
      const trendMultiplier = 1 + (i / months) * 0.5; // Overall growth trend
      const cyclicalPattern = Math.sin(i / 6) * 0.3; // 6-month cycles
      const randomVariation = (Math.sin(i * 7) + Math.cos(i * 11)) * 0.1;
      
      const income = (3000 + cyclicalPattern * 1000 + randomVariation * 500) * trendMultiplier;
      const expenses = (2500 + cyclicalPattern * 800 + randomVariation * 400) * trendMultiplier;
      balance += (income - expenses);
      
      data.push({
        month: monthStr,
        balance: Math.round(balance),
        income: Math.round(income),
        expenses: Math.round(expenses)
      });
    }
    
    return data;
  }
  
  /**
   * Generate edge case data scenarios
   */
  static generateEdgeCases(): { [key: string]: ChartDataPoint[] } {
    return {
      emptyData: [],
      
      singleDataPoint: [{
        month: '2024-06',
        balance: 5000,
        income: 3000,
        expenses: 2000
      }],
      
      allZeros: Array.from({ length: 6 }, (_, i) => ({
        month: `2024-${String(i + 1).padStart(2, '0')}`,
        balance: 0,
        income: 0,
        expenses: 0
      })),
      
      negativeBalance: [
        { month: '2024-01', balance: 1000, income: 2000, expenses: 1500 },
        { month: '2024-02', balance: -500, income: 1000, expenses: 3000 },
        { month: '2024-03', balance: -1000, income: 1500, expenses: 2000 }
      ],
      
      extremeValues: [
        { month: '2024-01', balance: 1000000, income: 500000, expenses: 200000 },
        { month: '2024-02', balance: 0.01, income: 0.50, expenses: 0.25 }
      ],
      
      inconsistentDates: [
        { month: '2024-01', balance: 1000, income: 2000, expenses: 1500 },
        { month: '2024-03', balance: 1500, income: 2500, expenses: 2000 }, // Missing February
        { month: '2024-06', balance: 2000, income: 3000, expenses: 2500 }  // Missing Apr, May
      ]
    };
  }
  
  /**
   * Get all test scenarios
   */
  static getAllScenarios(): TestScenario[] {
    return [
      {
        name: 'steady-growth',
        description: 'User with consistent financial growth over 12 months',
        data: this.generateSteadyGrowth(12),
        expectedPattern: 'increasing_trend',
        testNotes: [
          'Balance should show steady upward trend',
          'Income growth should be visible',
          'Positive cash flow throughout'
        ]
      },
      
      {
        name: 'volatile-finances',
        description: 'User with irregular income and expenses over 24 months',
        data: this.generateVolatileFinances(24),
        expectedPattern: 'irregular_pattern',
        testNotes: [
          'Balance should show ups and downs',
          'Seasonal patterns may be visible',
          'Some months may have negative cash flow'
        ]
      },
      
      {
        name: 'new-user',
        description: 'New user with minimal financial history',
        data: this.generateNewUserData(),
        expectedPattern: 'minimal_data',
        testNotes: [
          'Only 2 months of data',
          'Charts should handle limited data gracefully',
          'Basic trend should be visible'
        ]
      },
      
      {
        name: 'large-dataset',
        description: 'User with extensive 5-year financial history',
        data: this.generateLargeDataset(60),
        expectedPattern: 'long_term_trend',
        testNotes: [
          'Performance should remain good with large dataset',
          'Long-term trends should be clear',
          'Charts should be responsive with 60+ data points'
        ]
      },
      
      {
        name: 'empty-data',
        description: 'User with no financial data',
        data: [],
        expectedPattern: 'empty_state',
        testNotes: [
          'Should show appropriate empty state messages',
          'No chart elements should be rendered',
          'Error handling should be graceful'
        ]
      }
    ];
  }
  
  /**
   * Get scenario by name
   */
  static getScenario(name: string): TestScenario | undefined {
    return this.getAllScenarios().find(scenario => scenario.name === name);
  }
  
  /**
   * Generate test data for specific time periods
   */
  static generateForTimePeriod(months: 3 | 6 | 12 | 24): ChartDataPoint[] {
    switch (months) {
      case 3:
        return this.generateSteadyGrowth(3);
      case 6:
        return this.generateSteadyGrowth(6);
      case 12:
        return this.generateSteadyGrowth(12);
      case 24:
        return this.generateVolatileFinances(24);
      default:
        return this.generateSteadyGrowth(12);
    }
  }
  
  /**
   * Generate data with specific patterns for visual regression testing
   */
  static generateConsistentVisualData(): ChartDataPoint[] {
    // Fixed data for consistent visual regression testing
    return [
      { month: '2024-01', balance: 5000, income: 3000, expenses: 2000 },
      { month: '2024-02', balance: 6000, income: 3500, expenses: 2500 },
      { month: '2024-03', balance: 5500, income: 3200, expenses: 3700 },
      { month: '2024-04', balance: 7000, income: 4000, expenses: 2500 },
      { month: '2024-05', balance: 8500, income: 4500, expenses: 3000 },
      { month: '2024-06', balance: 9000, income: 5000, expenses: 4500 }
    ];
  }
  
  /**
   * Generate API response mocks
   */
  static generateAPIResponse(scenario: string, timePeriod?: string) {
    const scenarios = this.getAllScenarios();
    const selectedScenario = scenarios.find(s => s.name === scenario);
    
    if (!selectedScenario) {
      throw new Error(`Unknown test scenario: ${scenario}`);
    }
    
    let data = selectedScenario.data;
    
    // Filter by time period if specified
    if (timePeriod && ['3', '6', '12', '24'].includes(timePeriod)) {
      const monthsToShow = parseInt(timePeriod);
      data = data.slice(-monthsToShow); // Take last N months
    }
    
    return {
      success: true,
      data,
      metadata: {
        scenario: selectedScenario.name,
        description: selectedScenario.description,
        dataPoints: data.length,
        timePeriod: timePeriod || 'all'
      }
    };
  }
}

/**
 * Mock API helpers for testing
 */
export class MockAPIHelpers {
  /**
   * Setup API mocks for specific test scenario
   */
  static async setupScenario(page: any, scenarioName: string) {
    const scenario = TestDataGenerator.getScenario(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }
    
    await page.route('**/api/chart-data/**', (route: any) => {
      const url = new URL(route.request().url());
      const timePeriod = url.searchParams.get('period');
      
      const response = TestDataGenerator.generateAPIResponse(scenarioName, timePeriod);
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response.data)
      });
    });
  }
  
  /**
   * Setup API error scenarios
   */
  static async setupErrorScenario(page: any, errorType: 'timeout' | 'server-error' | 'network-error') {
    await page.route('**/api/chart-data/**', async (route: any) => {
      switch (errorType) {
        case 'timeout':
          await new Promise(resolve => setTimeout(resolve, 10000));
          route.abort();
          break;
          
        case 'server-error':
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
          break;
          
        case 'network-error':
          route.abort('failed');
          break;
      }
    });
  }
  
  /**
   * Setup slow API response for performance testing
   */
  static async setupSlowAPI(page: any, delayMs: number = 2000) {
    await page.route('**/api/chart-data/**', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
  }
}

/**
 * Test assertions helpers
 */
export class TestAssertions {
  /**
   * Validate chart data accuracy
   */
  static validateChartData(actualData: any, expectedScenario: TestScenario) {
    const expected = expectedScenario.data;
    
    if (expected.length === 0) {
      return actualData.length === 0;
    }
    
    // Basic validation
    if (actualData.length !== expected.length) {
      return false;
    }
    
    // Validate data points
    for (let i = 0; i < expected.length; i++) {
      const actual = actualData[i];
      const expect = expected[i];
      
      if (actual.month !== expect.month ||
          Math.abs(actual.balance - expect.balance) > 1 ||
          Math.abs(actual.income - expect.income) > 1 ||
          Math.abs(actual.expenses - expect.expenses) > 1) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate performance metrics
   */
  static validatePerformance(metrics: any, benchmarks: any) {
    const issues = [];
    
    if (metrics.loadTime > benchmarks.maxLoadTime) {
      issues.push(`Load time ${metrics.loadTime}ms exceeds benchmark ${benchmarks.maxLoadTime}ms`);
    }
    
    if (metrics.renderTime > benchmarks.maxRenderTime) {
      issues.push(`Render time ${metrics.renderTime}ms exceeds benchmark ${benchmarks.maxRenderTime}ms`);
    }
    
    if (metrics.memoryUsage > benchmarks.maxMemoryUsage) {
      issues.push(`Memory usage ${metrics.memoryUsage}MB exceeds benchmark ${benchmarks.maxMemoryUsage}MB`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
} 