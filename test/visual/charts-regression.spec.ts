import { test, expect, Page } from '@playwright/test';

// Visual regression test helpers
class VisualRegressionHelpers {
  constructor(private page: Page) {}

  async preparePageForScreenshot() {
    // Wait for all content to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 });
    
    // Wait for fonts to load
    await this.page.waitForFunction(() => document.fonts.ready);
    
    // Allow charts to settle
    await this.page.waitForTimeout(1000);
  }

  async takeChartScreenshot(chartSelector: string, name: string) {
    const chart = this.page.locator(chartSelector);
    await expect(chart).toBeVisible();
    
    return await chart.screenshot({
      path: `test-results/visual/${name}.png`,
      animations: 'disabled'
    });
  }

  async takeFullPageScreenshot(name: string) {
    return await this.page.screenshot({
      path: `test-results/visual/${name}-full.png`,
      fullPage: true,
      animations: 'disabled'
    });
  }

  async hideVolatileElements() {
    // Hide elements that change frequently (timestamps, random IDs, etc.)
    await this.page.addStyleTag({
      content: `
        [data-testid="current-time"],
        .timestamp,
        .loading-animation {
          visibility: hidden !important;
        }
        
        /* Ensure consistent chart animations */
        .recharts-animation {
          animation: none !important;
          transition: none !important;
        }
      `
    });
  }

  async setConsistentViewport(deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop') {
    const viewports = {
      desktop: { width: 1280, height: 720 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };
    
    await this.page.setViewportSize(viewports[deviceType]);
  }

  async mockConsistentData() {
    // Mock API to return consistent data for visual tests
    const consistentData = [
      { month: '2024-01', balance: 5000, income: 3000, expenses: 2000 },
      { month: '2024-02', balance: 6000, income: 3500, expenses: 2500 },
      { month: '2024-03', balance: 5500, income: 3200, expenses: 3700 },
      { month: '2024-04', balance: 7000, income: 4000, expenses: 2500 },
      { month: '2024-05', balance: 8500, income: 4500, expenses: 3000 },
      { month: '2024-06', balance: 9000, income: 5000, expenses: 4500 }
    ];

    await this.page.route('**/api/chart-data/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(consistentData)
      });
    });
  }
}

test.describe('Visual Regression Tests', () => {
  let helpers: VisualRegressionHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new VisualRegressionHelpers(page);
    await helpers.mockConsistentData();
    await helpers.hideVolatileElements();
  });

  test.describe('Desktop Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      await helpers.setConsistentViewport('desktop');
    });

    test('should match baseline for complete Reports page layout', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Take full page screenshot
      await expect(page).toHaveScreenshot('reports-page-desktop.png', {
        fullPage: true,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match baseline for Balance Trend Chart', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      const chart = page.locator('[data-testid="balance-trend-chart"]');
      await expect(chart).toHaveScreenshot('balance-trend-chart-desktop.png', {
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match baseline for Income vs Expenses Chart', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      const chart = page.locator('[data-testid="income-expense-chart"]');
      await expect(chart).toHaveScreenshot('income-expense-chart-desktop.png', {
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match baseline for Monthly Totals Chart', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      const chart = page.locator('[data-testid="monthly-totals-chart"]');
      await expect(chart).toHaveScreenshot('monthly-totals-chart-desktop.png', {
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match baseline for Time Period Filter', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Test closed state
      const filter = page.locator('[data-testid="time-period-filter"]');
      await expect(filter).toHaveScreenshot('time-period-filter-closed-desktop.png', {
        threshold: 0.2
      });

      // Test open state
      await filter.click();
      await page.waitForTimeout(300);
      
      const dropdown = page.locator('[data-testid="time-period-options"]');
      await expect(dropdown).toHaveScreenshot('time-period-filter-open-desktop.png', {
        threshold: 0.2
      });
    });

    test('should match baseline for chart tooltips', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Hover on Balance Trend Chart to show tooltip
      await page.hover('[data-testid="balance-trend-chart"] svg', { position: { x: 200, y: 100 } });
      await page.waitForTimeout(500);

      const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
      await expect(tooltip).toHaveScreenshot('chart-tooltip-desktop.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Tablet Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      await helpers.setConsistentViewport('tablet');
    });

    test('should match baseline for tablet layout', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      await expect(page).toHaveScreenshot('reports-page-tablet.png', {
        fullPage: true,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should show proper chart sizing on tablet', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      await expect(balanceChart).toHaveScreenshot('balance-chart-tablet.png', {
        threshold: 0.2,
        animations: 'disabled'
      });
    });
  });

  test.describe('Mobile Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      await helpers.setConsistentViewport('mobile');
    });

    test('should match baseline for mobile layout', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      await expect(page).toHaveScreenshot('reports-page-mobile.png', {
        fullPage: true,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should show stacked chart layout on mobile', async ({ page }) => {
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Charts should be stacked vertically
      const chartsContainer = page.locator('[data-testid="charts-container"]');
      await expect(chartsContainer).toHaveScreenshot('charts-mobile-stacked.png', {
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should show mobile-optimized tooltips', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return; // Mobile tooltips most relevant on Safari

      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      await page.tap('[data-testid="balance-trend-chart"] svg');
      await page.waitForTimeout(500);

      const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
      await expect(tooltip).toHaveScreenshot('chart-tooltip-mobile.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Theme and Color Consistency', () => {
    test('should maintain consistent chart colors', async ({ page }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Test color consistency in different chart types
      const charts = [
        { selector: '[data-testid="balance-trend-chart"]', name: 'balance-colors' },
        { selector: '[data-testid="income-expense-chart"]', name: 'income-expense-colors' },
        { selector: '[data-testid="monthly-totals-chart"]', name: 'monthly-totals-colors' }
      ];

      for (const chart of charts) {
        const element = page.locator(chart.selector);
        await expect(element).toHaveScreenshot(`${chart.name}-desktop.png`, {
          threshold: 0.1, // Stricter threshold for color consistency
          animations: 'disabled'
        });
      }
    });

    test('should maintain consistent typography', async ({ page }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Focus on text elements for typography consistency
      const textElements = page.locator('h1, h2, h3, p, .chart-title, .axis-label');
      await expect(textElements.first()).toHaveScreenshot('typography-consistency.png', {
        threshold: 0.1
      });
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Take browser-specific screenshots
      await expect(page).toHaveScreenshot(`reports-${browserName}.png`, {
        fullPage: true,
        threshold: 0.3, // Allow for browser rendering differences
        animations: 'disabled'
      });
    });

    test('should handle chart rendering differences gracefully', async ({ page, browserName }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      await expect(balanceChart).toHaveScreenshot(`balance-chart-${browserName}.png`, {
        threshold: 0.3,
        animations: 'disabled'
      });
    });
  });

  test.describe('State-Dependent Visuals', () => {
    test('should show consistent loading states', async ({ page }) => {
      // Mock slow API to capture loading state
      await page.route('**/api/chart-data/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });

      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');

      // Capture loading state
      const loadingIndicator = page.locator('.animate-spin');
      await expect(loadingIndicator.first()).toHaveScreenshot('loading-state.png', {
        threshold: 0.2
      });
    });

    test('should show consistent error states', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chart-data/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error' })
        });
      });

      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await page.waitForTimeout(2000);

      const errorMessage = page.locator('text=Failed to load');
      await expect(errorMessage.first()).toHaveScreenshot('error-state.png', {
        threshold: 0.2
      });
    });

    test('should show consistent empty states', async ({ page }) => {
      // Mock empty data
      await page.route('**/api/chart-data/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await page.waitForTimeout(2000);

      const emptyMessage = page.locator('text=No balance data available');
      await expect(emptyMessage.first()).toHaveScreenshot('empty-state.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Interactive State Visuals', () => {
    test('should show consistent hover states', async ({ page }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Hover on chart element
      await page.hover('[data-testid="balance-trend-chart"] svg', { position: { x: 200, y: 100 } });
      await page.waitForTimeout(300);

      const chart = page.locator('[data-testid="balance-trend-chart"]');
      await expect(chart).toHaveScreenshot('chart-hover-state.png', {
        threshold: 0.2
      });
    });

    test('should show consistent active/selected states', async ({ page }) => {
      await helpers.setConsistentViewport('desktop');
      await page.goto('/reports');
      await helpers.preparePageForScreenshot();

      // Click on time period filter
      await page.click('[data-testid="time-period-filter"]');
      await page.waitForTimeout(300);

      const filter = page.locator('[data-testid="time-period-filter"]');
      await expect(filter).toHaveScreenshot('filter-active-state.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Responsive Visual Breakpoints', () => {
    const breakpoints = [
      { name: 'mobile-sm', width: 320, height: 568 },
      { name: 'mobile-md', width: 375, height: 667 },
      { name: 'mobile-lg', width: 414, height: 896 },
      { name: 'tablet-sm', width: 768, height: 1024 },
      { name: 'tablet-lg', width: 1024, height: 768 },
      { name: 'desktop-sm', width: 1280, height: 720 },
      { name: 'desktop-lg', width: 1920, height: 1080 }
    ];

    breakpoints.forEach(({ name, width, height }) => {
      test(`should render correctly at ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/reports');
        await helpers.preparePageForScreenshot();

        await expect(page).toHaveScreenshot(`reports-${name}.png`, {
          fullPage: true,
          threshold: 0.2,
          animations: 'disabled'
        });
      });
    });
  });
}); 