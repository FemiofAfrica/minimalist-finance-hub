import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Comparative Insights Feature (PBI-2)
 * 
 * This test suite validates all Conditions of Satisfaction for the
 * comparative insights feature, including:
 * - Month-over-month and year-over-year comparisons
 * - Visual trend indicators
 * - Contextual explanations
 * - Responsive design
 * - Accessibility compliance
 * - Edge case handling
 */

// Test data setup helpers
const setupTestData = {
  // Empty account - no transactions
  emptyAccount: async (page: Page) => {
    // Navigate to a clean state
    await page.goto('/reports');
    // Ensure no existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  // Single month data - insufficient for comparison
  singleMonth: async (page: Page) => {
    await page.goto('/reports');
    // Mock single month of transactions
    await page.evaluate(() => {
      const mockData = {
        transactions: [
          { amount: 5000, type: 'income', date: new Date().toISOString() },
          { amount: -2000, type: 'expense', date: new Date().toISOString() }
        ]
      };
      localStorage.setItem('testData', JSON.stringify(mockData));
    });
  },

  // Multi-month data - sufficient for comparison
  multiMonth: async (page: Page) => {
    await page.goto('/reports');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 15);
    
    await page.evaluate((dates) => {
      const mockData = {
        transactions: [
          // Current month
          { amount: 6000, type: 'income', date: dates.current },
          { amount: -3000, type: 'expense', date: dates.current },
          // Last month
          { amount: 5000, type: 'income', date: dates.lastMonth },
          { amount: -2500, type: 'expense', date: dates.lastMonth },
          // Two months ago
          { amount: 4500, type: 'income', date: dates.twoMonthsAgo },
          { amount: -2000, type: 'expense', date: dates.twoMonthsAgo }
        ]
      };
      localStorage.setItem('testData', JSON.stringify(mockData));
    }, {
      current: now.toISOString(),
      lastMonth: lastMonth.toISOString(),
      twoMonthsAgo: twoMonthsAgo.toISOString()
    });
  },

  // Edge case data - zeros, extremes, missing data
  edgeCaseData: async (page: Page) => {
    await page.goto('/reports');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    
    await page.evaluate((dates) => {
      const mockData = {
        transactions: [
          // Current month - zero income
          { amount: 0, type: 'income', date: dates.current },
          { amount: -1000, type: 'expense', date: dates.current },
          // Last month - zero expenses
          { amount: 5000, type: 'income', date: dates.lastMonth },
          { amount: 0, type: 'expense', date: dates.lastMonth }
        ]
      };
      localStorage.setItem('testData', JSON.stringify(mockData));
    }, {
      current: now.toISOString(),
      lastMonth: lastMonth.toISOString()
    });
  }
};

// Helper functions
const waitForComparativeInsights = async (page: Page) => {
  await page.waitForSelector('[data-testid="comparative-insights"]', { timeout: 10000 });
};

const getMetricCardValue = async (page: Page, metric: string) => {
  const selector = `[data-testid="metric-card-${metric}"] [data-testid="metric-value"]`;
  return await page.textContent(selector);
};

const getMetricCardPercentage = async (page: Page, metric: string) => {
  const selector = `[data-testid="metric-card-${metric}"] [data-testid="metric-percentage"]`;
  return await page.textContent(selector);
};

test.describe('Comparative Insights E2E Tests', () => {
  
  test.describe('Scenario 1: New User with No Data', () => {
    test('should display appropriate no-data messaging', async ({ page }) => {
      await setupTestData.emptyAccount(page);
      
      // Navigate to Reports page
      await page.goto('/reports');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check for comparative insights section
      const comparativeSection = page.locator('[data-testid="comparative-insights"]');
      await expect(comparativeSection).toBeVisible();
      
      // Verify no-data messaging
      const noDataMessage = page.locator('[data-testid="no-data-message"]');
      await expect(noDataMessage).toBeVisible();
      await expect(noDataMessage).toContainText('Historical data is needed');
      
      // Ensure no broken UI elements
      const errorElements = page.locator('[data-testid*="error"]');
      await expect(errorElements).toHaveCount(0);
      
      // Check for helpful guidance
      const guidanceText = page.locator('[data-testid="data-guidance"]');
      await expect(guidanceText).toBeVisible();
      await expect(guidanceText).toContainText('at least 2 months');
    });
  });

  test.describe('Scenario 2: Single Month Data', () => {
    test('should handle insufficient comparison data gracefully', async ({ page }) => {
      await setupTestData.singleMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      
      // Check for comparative insights section
      await waitForComparativeInsights(page);
      
      // Verify insufficient data messaging
      const insufficientDataMessage = page.locator('[data-testid="insufficient-data-message"]');
      await expect(insufficientDataMessage).toBeVisible();
      
      // Ensure no calculation errors
      const calculationErrors = page.locator('[data-testid*="calculation-error"]');
      await expect(calculationErrors).toHaveCount(0);
      
      // UI should encourage adding more data
      const encouragementText = page.locator('[data-testid="add-data-encouragement"]');
      await expect(encouragementText).toBeVisible();
    });
  });

  test.describe('Scenario 3: Normal Multi-Month Data', () => {
    test('should display all comparative metrics correctly', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      
      // Wait for comparative insights to load
      await waitForComparativeInsights(page);
      
      // Verify all metric cards are present
      const incomeCard = page.locator('[data-testid="metric-card-income"]');
      const expensesCard = page.locator('[data-testid="metric-card-expenses"]');
      const balanceCard = page.locator('[data-testid="metric-card-balance"]');
      
      await expect(incomeCard).toBeVisible();
      await expect(expensesCard).toBeVisible();
      await expect(balanceCard).toBeVisible();
      
      // Verify currency formatting (no "NGNNaN")
      const incomeValue = await getMetricCardValue(page, 'income');
      expect(incomeValue).toMatch(/₦[\d,]+\.\d{2}/);
      expect(incomeValue).not.toContain('NaN');
      expect(incomeValue).not.toContain('Infinity');
      
      // Verify percentage changes are displayed
      const incomePercentage = await getMetricCardPercentage(page, 'income');
      expect(incomePercentage).toMatch(/[\d.]+%/);
      expect(incomePercentage).not.toContain('NaN');
      
      // Verify trend indicators
      const trendIndicators = page.locator('[data-testid*="trend-indicator"]');
      await expect(trendIndicators).toHaveCount(3); // Income, expenses, balance
      
      // Check trend colors (should be green, red, or gray)
      const trendColors = await trendIndicators.evaluateAll(elements => 
        elements.map(el => getComputedStyle(el).color)
      );
      trendColors.forEach(color => {
        expect(color).toMatch(/(rgb\(34, 197, 94\)|rgb\(239, 68, 68\)|rgb\(107, 114, 128\))/);
      });
    });

    test('should display contextual explanations', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Check for explanation cards
      const explanationCards = page.locator('[data-testid*="explanation-card"]');
      await expect(explanationCards.first()).toBeVisible();
      
      // Verify explanation content
      const explanationTitle = page.locator('[data-testid="explanation-title"]').first();
      await expect(explanationTitle).toBeVisible();
      await expect(explanationTitle).not.toBeEmpty();
      
      const explanationDescription = page.locator('[data-testid="explanation-description"]').first();
      await expect(explanationDescription).toBeVisible();
      await expect(explanationDescription).not.toBeEmpty();
    });
  });

  test.describe('Scenario 4: Edge Case Data Testing', () => {
    test('should handle zero values without "NGNNaN" issues', async ({ page }) => {
      await setupTestData.edgeCaseData(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Check all displayed values for "NGNNaN" or similar issues
      const allTextContent = await page.textContent('body');
      expect(allTextContent).not.toContain('NGNNaN');
      expect(allTextContent).not.toContain('NaN');
      expect(allTextContent).not.toContain('Infinity');
      expect(allTextContent).not.toContain('undefined');
      
      // Verify zero values display correctly
      const metricValues = page.locator('[data-testid*="metric-value"]');
      const values = await metricValues.allTextContents();
      
      values.forEach(value => {
        // Should either be a valid currency format or "N/A"
        expect(value).toMatch(/(₦[\d,]+\.\d{2}|N\/A)/);
      });
      
      // Verify percentage calculations handle division by zero
      const percentageValues = page.locator('[data-testid*="metric-percentage"]');
      const percentages = await percentageValues.allTextContents();
      
      percentages.forEach(percentage => {
        // Should either be a valid percentage or safe fallback
        expect(percentage).toMatch(/([\d.]+%|0\.0%|N\/A)/);
      });
    });

    test('should handle extreme values safely', async ({ page }) => {
      // Set up extreme values
      await page.goto('/reports');
      await page.evaluate(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
        
        const mockData = {
          transactions: [
            // Current month - extreme income
            { amount: 1000000000, type: 'income', date: now.toISOString() },
            { amount: -1000, type: 'expense', date: now.toISOString() },
            // Last month - small values
            { amount: 1, type: 'income', date: lastMonth.toISOString() },
            { amount: -1, type: 'expense', date: lastMonth.toISOString() }
          ]
        };
        localStorage.setItem('testData', JSON.stringify(mockData));
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify extreme percentages are capped
      const percentageValues = page.locator('[data-testid*="metric-percentage"]');
      const percentages = await percentageValues.allTextContents();
      
      percentages.forEach(percentage => {
        if (percentage.includes('%')) {
          const numericValue = parseFloat(percentage.replace('%', ''));
          expect(Math.abs(numericValue)).toBeLessThanOrEqual(999999);
        }
      });
    });
  });

  test.describe('Scenario 5: Responsive Design Testing', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify all content is accessible
      const comparativeSection = page.locator('[data-testid="comparative-insights"]');
      await expect(comparativeSection).toBeVisible();
      
      // Check that metric cards stack vertically on mobile
      const metricCards = page.locator('[data-testid*="metric-card"]');
      const cardCount = await metricCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Verify touch targets are adequate (44px minimum)
      const interactiveElements = page.locator('button, [role="button"], a');
      const elementSizes = await interactiveElements.evaluateAll(elements => 
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
      );
      
      elementSizes.forEach(size => {
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(size.height).toBeGreaterThanOrEqual(44);
      });
      
      // Verify no horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should adapt layout on tablet devices', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify responsive grid layout
      const comparativeSection = page.locator('[data-testid="comparative-insights"]');
      await expect(comparativeSection).toBeVisible();
      
      // Check that content adapts to tablet size
      const metricCards = page.locator('[data-testid*="metric-card"]');
      await expect(metricCards.first()).toBeVisible();
      
      // Verify text remains readable
      const textElements = page.locator('p, span, div');
      const fontSizes = await textElements.evaluateAll(elements => 
        elements.map(el => parseFloat(getComputedStyle(el).fontSize))
      );
      
      fontSizes.forEach(fontSize => {
        expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
      });
    });

    test('should work correctly on desktop', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify full desktop layout
      const comparativeSection = page.locator('[data-testid="comparative-insights"]');
      await expect(comparativeSection).toBeVisible();
      
      // Check that metric cards display in grid layout
      const metricCards = page.locator('[data-testid*="metric-card"]');
      const cardPositions = await metricCards.evaluateAll(elements => 
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y };
        })
      );
      
      // On desktop, cards should be arranged horizontally
      if (cardPositions.length > 1) {
        expect(cardPositions[1].x).toBeGreaterThan(cardPositions[0].x);
      }
    });
  });

  test.describe('Scenario 6: Accessibility Testing', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Verify focus indicators are visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check that all interactive elements are keyboard accessible
      const interactiveElements = page.locator('button, [role="button"], a, [tabindex="0"]');
      const elementCount = await interactiveElements.count();
      
      for (let i = 0; i < elementCount; i++) {
        await page.keyboard.press('Tab');
        const currentFocus = page.locator(':focus');
        await expect(currentFocus).toBeVisible();
      }
    });

    test('should have proper ARIA labels and descriptions', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Check for ARIA labels on metric cards
      const metricCards = page.locator('[data-testid*="metric-card"]');
      const ariaLabels = await metricCards.evaluateAll(elements => 
        elements.map(el => el.getAttribute('aria-label'))
      );
      
      ariaLabels.forEach(label => {
        expect(label).toBeTruthy();
        expect(label).not.toBeNull();
      });
      
      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingLevels = await headings.evaluateAll(elements => 
        elements.map(el => parseInt(el.tagName.charAt(1)))
      );
      
      // Verify logical heading hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1);
      }
    });

    test('should meet color contrast requirements', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Check color contrast for text elements
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
      const contrastRatios = await textElements.evaluateAll(elements => {
        return elements.map(el => {
          const style = getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          
          // Simple contrast check (in real implementation, use proper contrast calculation)
          return {
            color,
            backgroundColor,
            element: el.tagName
          };
        });
      });
      
      // Verify that text elements have proper contrast
      // (This is a simplified check - in practice, use a proper contrast calculation library)
      contrastRatios.forEach(ratio => {
        expect(ratio.color).not.toBe(ratio.backgroundColor);
      });
    });
  });

  test.describe('Scenario 7: Performance Testing', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      const startTime = Date.now();
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Set up large dataset
      await page.goto('/reports');
      await page.evaluate(() => {
        const transactions = [];
        const now = new Date();
        
        // Generate 12 months of transaction data
        for (let month = 0; month < 12; month++) {
          const date = new Date(now.getFullYear(), now.getMonth() - month, 15);
          
          // Add multiple transactions per month
          for (let i = 0; i < 50; i++) {
            transactions.push({
              amount: Math.random() * 5000 + 1000,
              type: 'income',
              date: date.toISOString()
            });
            transactions.push({
              amount: -(Math.random() * 3000 + 500),
              type: 'expense',
              date: date.toISOString()
            });
          }
        }
        
        localStorage.setItem('testData', JSON.stringify({ transactions }));
      });
      
      const startTime = Date.now();
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      const loadTime = Date.now() - startTime;
      
      // Should still load efficiently with large dataset
      expect(loadTime).toBeLessThan(5000);
      
      // Verify calculations completed successfully
      const metricCards = page.locator('[data-testid*="metric-card"]');
      await expect(metricCards.first()).toBeVisible();
      
      // Check that values are displayed (not loading states)
      const metricValues = page.locator('[data-testid*="metric-value"]');
      const values = await metricValues.allTextContents();
      
      values.forEach(value => {
        expect(value).not.toContain('Loading');
        expect(value).not.toContain('...');
      });
    });
  });

  test.describe('Scenario 8: Integration Testing', () => {
    test('should integrate seamlessly with Reports page', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      
      // Verify Reports page loads
      const reportsTitle = page.locator('h1, h2').filter({ hasText: /reports/i });
      await expect(reportsTitle).toBeVisible();
      
      // Verify comparative insights section is present
      await waitForComparativeInsights(page);
      
      // Check integration with other report components
      const reportSections = page.locator('[data-testid*="report-section"]');
      const sectionCount = await reportSections.count();
      expect(sectionCount).toBeGreaterThan(0);
      
      // Verify consistent styling
      const comparativeSection = page.locator('[data-testid="comparative-insights"]');
      const sectionStyles = await comparativeSection.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          fontFamily: style.fontFamily,
          color: style.color
        };
      });
      
      // Should use consistent design system
      expect(sectionStyles.fontFamily).toBeTruthy();
      expect(sectionStyles.color).toBeTruthy();
    });

    test('should maintain functionality during navigation', async ({ page }) => {
      await setupTestData.multiMonth(page);
      
      // Navigate to Reports page
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify initial state
      const initialMetricValue = await getMetricCardValue(page, 'income');
      expect(initialMetricValue).toBeTruthy();
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await waitForComparativeInsights(page);
      
      // Verify data persists
      const finalMetricValue = await getMetricCardValue(page, 'income');
      expect(finalMetricValue).toBe(initialMetricValue);
    });
  });
}); 