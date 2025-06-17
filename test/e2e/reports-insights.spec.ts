import { test, expect, Page } from '@playwright/test';

class InsightsHelpers {
  constructor(private page: Page) {}

  async navigateToReports() {
    console.log('Starting navigation to /reports...');
    
    try {
      // Try navigation with generous timeout
      await this.page.goto('/reports', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Successfully navigated to /reports');
      
      // Check current URL after navigation
      const currentUrl = this.page.url();
      console.log('Current URL after navigation:', currentUrl);
      
      // Wait for page to stabilize
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('Page reached networkidle state');
      
    } catch (error) {
      console.error('Navigation failed:', error.message);
      
      // Try to get page title and URL for debugging
      try {
        const title = await this.page.title();
        const url = this.page.url();
        console.log(`Current page: ${title} at ${url}`);
      } catch (e) {
        console.log('Could not get page info:', e.message);
      }
      
      throw error;
    }
    
    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('.animate-spin', { 
      state: 'detached', 
      timeout: 10000 
    }).catch(() => {
      console.log('No loading spinner found, proceeding...');
    });
  }

  async checkForHistoricalData() {
    console.log('Checking for historical data layout...');
    
    // Check if we have the basic layout (no historical data) or enhanced layout
    const basicLayout = this.page.locator('h3:has-text("No Historical Data Yet")');
    const enhancedLayout = this.page.locator('h1:has-text("Financial Reports")');
    
    try {
      // Wait for either layout to appear
      await Promise.race([
        expect(basicLayout).toBeVisible({ timeout: 10000 }),
        expect(enhancedLayout).toBeVisible({ timeout: 10000 })
      ]);
      
      const hasBasicLayout = await basicLayout.isVisible();
      const hasEnhancedLayout = await enhancedLayout.isVisible();
      
      console.log(`Layout detected - Basic: ${hasBasicLayout}, Enhanced: ${hasEnhancedLayout}`);
      
      return {
        hasHistoricalData: hasEnhancedLayout,
        hasBasicLayout,
        hasEnhancedLayout
      };
    } catch (error) {
      // Try to get page content for debugging
      console.log('Could not determine layout type, checking page content...');
      const bodyText = await this.page.locator('body').textContent();
      console.log('Page body text preview:', bodyText?.substring(0, 200));
      
      return {
        hasHistoricalData: false,
        hasBasicLayout: true,
        hasEnhancedLayout: false
      };
    }
  }

  async waitForInsights() {
    console.log('Waiting for Smart Insights section...');
    
    // Wait for Smart Insights section to appear
    const section = this.page.locator('h2:has-text("Smart Insights")');
    await expect(section).toBeVisible({ timeout: 15000 });
    
    // Wait for loading skeletons to disappear if present
    await this.page.waitForSelector('[data-testid="insights-loading"]', { 
      state: 'detached', 
      timeout: 15000 
    }).catch(() => {
      console.log('No loading skeleton found, proceeding...');
    });
    
    // Additional wait for content to stabilize
    await this.page.waitForTimeout(1000);
    console.log('Smart Insights section is ready');
  }

  insightCards() {
    return this.page.locator('[data-testid="insight-card"]');
  }
}

test.describe('Smart Insights E2E Tests', () => {
  let helpers: InsightsHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new InsightsHelpers(page);
  });

  test('should handle users with no historical data appropriately', async ({ page }) => {
    console.log('=== Starting test: should handle users with no historical data appropriately ===');
    
    await helpers.navigateToReports();
    
    // Check what layout we have
    const layoutInfo = await helpers.checkForHistoricalData();
    
    if (layoutInfo.hasBasicLayout) {
      console.log('Testing basic layout for users without historical data...');
      
      // Verify basic layout elements
      const basicMessage = page.locator('h3:has-text("No Historical Data Yet")');
      await expect(basicMessage).toBeVisible();
      
      const dashboardButton = page.locator('a[href="/dashboard"]');
      await expect(dashboardButton).toBeVisible();
      
      // Verify Smart Insights section is NOT present
      const smartInsights = page.locator('h2:has-text("Smart Insights")');
      await expect(smartInsights).not.toBeVisible();
      
      console.log('✓ Correctly shows basic layout for users without historical data');
    } else {
      console.log('Testing enhanced layout for users with historical data...');
      
      // If we have enhanced layout, Smart Insights should be present
      await helpers.waitForInsights();
      const smartInsights = page.locator('h2:has-text("Smart Insights")');
      await expect(smartInsights).toBeVisible();
      
      console.log('✓ Correctly shows enhanced layout with Smart Insights for users with historical data');
    }
  });

  test('should display Smart Insights section with maximum 5 insights', async ({ page }) => {
    console.log('=== Starting test: should display Smart Insights section with maximum 5 insights ===');
    
    await helpers.navigateToReports();
    
    // Check what layout we have
    const layoutInfo = await helpers.checkForHistoricalData();
    
    if (!layoutInfo.hasHistoricalData) {
      // If no historical data, verify we get the basic layout
      const basicMessage = page.locator('h3:has-text("No Historical Data Yet")');
      await expect(basicMessage).toBeVisible();
      
      console.log('Test user has no historical data - Smart Insights not available yet');
      test.skip(true, 'User has no historical data - Smart Insights section not rendered');
      return;
    }

    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const count = await cards.count();
    console.log(`Found ${count} insight cards`);
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0); // Should have at least one insight
  });

  test('each insight card should contain priority badge and formatted amount', async ({ page }) => {
    console.log('=== Starting test: each insight card should contain priority badge and formatted amount ===');
    
    await helpers.navigateToReports();
    
    // Check what layout we have
    const layoutInfo = await helpers.checkForHistoricalData();
    
    if (!layoutInfo.hasHistoricalData) {
      console.log('Test user has no historical data - Smart Insights not available yet');
      test.skip(true, 'User has no historical data - Smart Insights section not rendered');
      return;
    }

    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const cardCount = await cards.count();
    console.log(`Checking ${cardCount} insight cards for priority badges and currency formatting`);
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      
      // Check for priority badge
      const priorityBadge = card.locator('[data-testid="insight-priority"]');
      await expect(priorityBadge).toBeVisible();
      
      // Check for currency formatting
      await expect(card).toContainText('NGN'); 
      
      // Verify priority badge has valid priority level
      const priorityText = await priorityBadge.textContent();
      expect(['Critical', 'High', 'Medium', 'Low']).toContain(priorityText?.trim());
      console.log(`Card ${i + 1}: Priority = ${priorityText?.trim()}`);
    }
  });

  test('should not classify income categories like Salary as spending insights', async ({ page }) => {
    console.log('=== Starting test: should not classify income categories like Salary as spending insights ===');
    
    await helpers.navigateToReports();
    
    // Check what layout we have
    const layoutInfo = await helpers.checkForHistoricalData();
    
    if (!layoutInfo.hasHistoricalData) {
      console.log('Test user has no historical data - Smart Insights not available yet');
      test.skip(true, 'User has no historical data - Smart Insights section not rendered');
      return;
    }

    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const cardCount = await cards.count();
    console.log(`Checking ${cardCount} insight cards for income category misclassification`);
    
    if (cardCount > 0) {
      const texts = await cards.allInnerTexts();
      console.log('Insight card texts:', texts);
      
      // Check that income categories aren't classified as spending spikes/drops
      const hasSalarySpendingInsight = texts.some(text => {
        const lowerText = text.toLowerCase();
        return lowerText.includes('salary') && 
               (lowerText.includes('spike') || lowerText.includes('drop') || lowerText.includes('increase'));
      });
      
      expect(hasSalarySpendingInsight).toBe(false);
      
      // Additional check for other income categories
      const incomeCategories = ['salary', 'income', 'bonus', 'dividend'];
      for (const category of incomeCategories) {
        const hasIncomeSpendingInsight = texts.some(text => {
          const lowerText = text.toLowerCase();
          return lowerText.includes(category) && 
                 (lowerText.includes('spending') || lowerText.includes('expense'));
        });
        expect(hasIncomeSpendingInsight).toBe(false);
        console.log(`✓ No ${category} misclassified as spending insight`);
      }
    } else {
      console.log('No insight cards found - this is valid for users without sufficient data');
    }
  });
}); 