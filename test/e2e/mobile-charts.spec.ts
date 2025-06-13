import { test, expect, Page } from '@playwright/test';

// Mobile-specific test helpers
class MobileChartHelpers {
  constructor(private page: Page) {}

  async setMobileViewport(deviceType: 'phone' | 'tablet' = 'phone') {
    const viewports = {
      phone: { width: 375, height: 667 }, // iPhone SE size
      tablet: { width: 768, height: 1024 } // iPad size
    };
    
    await this.page.setViewportSize(viewports[deviceType]);
  }

  async testTouchInteraction(selector: string) {
    const element = this.page.locator(selector);
    
    // Use tap instead of click for mobile
    await element.tap();
    await this.page.waitForTimeout(300);
  }

  async testSwipeGesture(selector: string, direction: 'left' | 'right' | 'up' | 'down') {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error('Element not found for swipe gesture');
    
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    let endX = startX;
    let endY = startY;
    
    const swipeDistance = 100;
    
    switch (direction) {
      case 'left':
        endX = startX - swipeDistance;
        break;
      case 'right':
        endX = startX + swipeDistance;
        break;
      case 'up':
        endY = startY - swipeDistance;
        break;
      case 'down':
        endY = startY + swipeDistance;
        break;
    }
    
    // Perform swipe gesture
    await this.page.touchscreen.tap(startX, startY);
    await this.page.touchscreen.tap(endX, endY);
  }

  async validateMobileLayout() {
    // Check if charts stack vertically on mobile
    const chartsContainer = this.page.locator('[data-testid="charts-container"]');
    const containerBox = await chartsContainer.boundingBox();
    
    if (!containerBox) throw new Error('Charts container not found');
    
    // On mobile, container should use full width
    const viewport = this.page.viewportSize();
    if (viewport) {
      expect(containerBox.width).toBeGreaterThan(viewport.width * 0.9);
    }
  }

  async validateTouchTargetSizes() {
    // All interactive elements should be at least 44px for touch
    const interactiveElements = [
      '[data-testid="time-period-filter"]',
      'button:has-text("Try again")',
      '[data-testid="chart-tooltip-trigger"]'
    ];
    
    for (const selector of interactiveElements) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const box = await element.boundingBox();
        
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }
    }
  }

  async testPinchZoom(selector: string) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error('Element not found for pinch zoom');
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Simulate pinch gesture (two finger touch)
    await this.page.touchscreen.tap(centerX - 50, centerY);
    await this.page.touchscreen.tap(centerX + 50, centerY);
    
    // Move fingers apart to simulate zoom
    await this.page.touchscreen.tap(centerX - 100, centerY);
    await this.page.touchscreen.tap(centerX + 100, centerY);
  }

  async validateMobilePerformance() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    return performanceMetrics;
  }
}

test.describe('Mobile Charts E2E Tests', () => {
  let helpers: MobileChartHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new MobileChartHelpers(page);
  });

  test.describe('Mobile Phone Layout', () => {
    test.beforeEach(async ({ page }) => {
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
    });

    test('should display charts in mobile-optimized layout', async ({ page }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Validate mobile layout
      await helpers.validateMobileLayout();
      
      // Charts should be vertically stacked
      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      const incomeExpenseChart = page.locator('[data-testid="income-expense-chart"]');
      
      await expect(balanceChart).toBeVisible();
      await expect(incomeExpenseChart).toBeVisible();
      
      // Check if charts are stacked (second chart should be below first)
      const balanceBox = await balanceChart.boundingBox();
      const incomeBox = await incomeExpenseChart.boundingBox();
      
      if (balanceBox && incomeBox) {
        expect(incomeBox.y).toBeGreaterThan(balanceBox.y + balanceBox.height);
      }
    });

    test('should have touch-friendly interface elements', async ({ page }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      await helpers.validateTouchTargetSizes();
    });

    test('should support touch interactions on charts', async ({ page, browserName }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      if (browserName === 'webkit') {
        // Test tap on chart to show tooltip
        await helpers.testTouchInteraction('[data-testid="balance-trend-chart"] svg');
        
        const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
        await expect(tooltip).toBeVisible({ timeout: 2000 });
      }
    });

    test('should optimize chart heights for mobile', async ({ page }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      const charts = [
        '[data-testid="balance-trend-chart"]',
        '[data-testid="income-expense-chart"]',
        '[data-testid="monthly-totals-chart"]'
      ];
      
      for (const chartSelector of charts) {
        const chart = page.locator(chartSelector);
        const box = await chart.boundingBox();
        
        if (box) {
          // Mobile charts should be shorter to fit screen better
          expect(box.height).toBeLessThan(350);
          expect(box.height).toBeGreaterThan(200);
        }
      }
    });

    test('should show mobile-optimized tooltips', async ({ page, browserName }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      if (browserName === 'webkit') {
        await helpers.testTouchInteraction('[data-testid="balance-trend-chart"] svg');
        
        const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
        await expect(tooltip).toBeVisible();
        
        // Mobile tooltips should be compact
        const tooltipBox = await tooltip.boundingBox();
        const viewport = page.viewportSize();
        
        if (tooltipBox && viewport) {
          // Tooltip should fit within mobile viewport
          expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
          expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(viewport.height);
        }
      }
    });

    test('should handle time period filter on mobile', async ({ page }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Time period filter should be full-width on mobile
      const filter = page.locator('[data-testid="time-period-filter"]');
      await expect(filter).toBeVisible();
      
      await helpers.testTouchInteraction('[data-testid="time-period-filter"]');
      
      // Dropdown should be mobile-friendly
      const dropdown = page.locator('[data-testid="time-period-options"]');
      await expect(dropdown).toBeVisible();
      
      // Test selecting an option
      await helpers.testTouchInteraction('[data-value="6"]');
      
      // Charts should update
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="balance-trend-chart"]')).toBeVisible();
    });
  });

  test.describe('Tablet Layout', () => {
    test.beforeEach(async ({ page }) => {
      await helpers.setMobileViewport('tablet');
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
    });

    test('should display charts in tablet-optimized layout', async ({ page }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // On tablet, charts might be side-by-side or stacked depending on design
      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      const incomeExpenseChart = page.locator('[data-testid="income-expense-chart"]');
      
      await expect(balanceChart).toBeVisible();
      await expect(incomeExpenseChart).toBeVisible();
      
      // Tablet charts should be larger than mobile
      const balanceBox = await balanceChart.boundingBox();
      if (balanceBox) {
        expect(balanceBox.height).toBeGreaterThan(250);
        expect(balanceBox.height).toBeLessThan(400);
      }
    });

    test('should support both touch and cursor interactions', async ({ page, browserName }) => {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Test hover interaction (cursor)
      await page.hover('[data-testid="balance-trend-chart"] svg');
      let tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
      await expect(tooltip).toBeVisible();
      
      if (browserName === 'webkit') {
        // Test touch interaction
        await helpers.testTouchInteraction('[data-testid="income-expense-chart"] svg');
        tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
        await expect(tooltip).toBeVisible();
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape orientation change', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return; // iOS Safari specific
      
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Verify charts work in portrait
      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      await expect(balanceChart).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow for layout recalculation
      
      // Charts should still be visible and functional
      await expect(balanceChart).toBeVisible();
      
      // Test interaction in landscape
      await helpers.testTouchInteraction('[data-testid="balance-trend-chart"] svg');
      const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
      await expect(tooltip).toBeVisible();
    });

    test('should handle landscape to portrait orientation change', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return; // iOS Safari specific
      
      // Start in landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Switch to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Validate layout adjusts correctly
      await helpers.validateMobileLayout();
      
      const charts = page.locator('[data-testid*="chart"]');
      const count = await charts.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile networks', async ({ page }) => {
      // Simulate 3G network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        route.continue();
      });
      
      await helpers.setMobileViewport('phone');
      
      const startTime = Date.now();
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 });
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even on slow network
      expect(loadTime).toBeLessThan(10000); // 10 seconds
      
      const performanceMetrics = await helpers.validateMobilePerformance();
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000);
    });

    test('should maintain smooth performance during interactions', async ({ page, browserName }) => {
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      if (browserName === 'webkit') {
        // Perform multiple rapid touch interactions
        for (let i = 0; i < 10; i++) {
          await helpers.testTouchInteraction('[data-testid="balance-trend-chart"] svg');
          await page.waitForTimeout(100);
        }
        
        // Page should remain responsive
        const chart = page.locator('[data-testid="balance-trend-chart"]');
        await expect(chart).toBeVisible();
      }
    });
  });

  test.describe('Touch Gestures', () => {
    test('should handle chart interactions with touch', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return; // Touch events are most relevant on iOS
      
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Test single tap to show tooltip
      await helpers.testTouchInteraction('[data-testid="balance-trend-chart"] svg');
      const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper');
      await expect(tooltip).toBeVisible();
      
      // Test tap away to hide tooltip
      await page.tap('h1');
      await expect(tooltip).not.toBeVisible();
    });

    test('should prevent accidental zoom on chart interactions', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return;
      
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Double tap on chart should not zoom the page
      const chart = page.locator('[data-testid="balance-trend-chart"] svg');
      await chart.tap();
      await chart.tap();
      
      // Verify page zoom level hasn't changed
      const zoomLevel = await page.evaluate(() => window.devicePixelRatio);
      expect(zoomLevel).toBeCloseTo(1, 1); // Should be close to 1 (no zoom)
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible via screen reader on mobile', async ({ page }) => {
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Check for proper ARIA labels
      const charts = page.locator('[role="img"], [role="graphics-document"]');
      const count = await charts.count();
      expect(count).toBeGreaterThan(0);
      
      // Charts should have descriptive labels
      const balanceChart = page.locator('[data-testid="balance-trend-chart"]');
      const ariaLabel = await balanceChart.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should support keyboard navigation on mobile with external keyboard', async ({ page }) => {
      await helpers.setMobileViewport('tablet'); // More likely to have external keyboard
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Test tab navigation through interactive elements
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      
      // Should be able to navigate through all interactive elements
      const interactiveElements = [
        '[data-testid="time-period-filter"]',
        'button:visible'
      ];
      
      for (const selector of interactiveElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          await page.keyboard.press('Tab');
          // Element should be focusable
          expect(await page.locator(':focus').count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Mobile Error Handling', () => {
    test('should show mobile-optimized error messages', async ({ page }) => {
      await helpers.setMobileViewport('phone');
      
      // Mock API error
      await page.route('**/api/chart-data/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Network error' })
        });
      });
      
      await page.goto('/reports');
      
      // Error messages should be visible and touch-friendly
      const errorMessage = page.locator('text=Failed to load');
      await expect(errorMessage).toBeVisible();
      
      const retryButton = page.locator('button:has-text("Try again")');
      await expect(retryButton).toBeVisible();
      
      // Button should be touch-friendly
      const buttonBox = await retryButton.boundingBox();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should handle network disconnection gracefully', async ({ page }) => {
      await helpers.setMobileViewport('phone');
      await page.goto('/reports');
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
      
      // Simulate network disconnection
      await page.context().setOffline(true);
      
      // Try to change time period (should trigger network request)
      await helpers.testTouchInteraction('[data-testid="time-period-filter"]');
      await helpers.testTouchInteraction('[data-value="12"]');
      
      // Should show appropriate offline message
      await expect(page.locator('text=network')).toBeVisible({ timeout: 5000 });
      
      // Restore network
      await page.context().setOffline(false);
    });
  });
}); 