import { test, expect, Page } from '@playwright/test';

class InsightsHelpers {
  constructor(private page: Page) {}

  async navigateToReports() {
    await this.page.goto('/reports');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForInsights() {
    const section = this.page.locator('h2:has-text("Smart Insights")');
    await expect(section).toBeVisible();
    // Wait for loading skeletons to disappear if present
    await this.page.waitForSelector('[data-testid="insights-loading"]', { state: 'detached', timeout: 10000 }).catch(() => {});
  }

  insightCards() {
    return this.page.locator('[data-testid="insight-card"]');
  }
}

test.describe('Smart Insights E2E Tests', () => {
  let helpers: InsightsHelpers;

  test.beforeEach(async ({ page }) => {
    // Assume auth cookie exists from global setup
    helpers = new InsightsHelpers(page);
  });

  test('should display Smart Insights section with maximum 5 insights', async ({ page }) => {
    await helpers.navigateToReports();
    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(5);
  });

  test('each insight card should contain priority badge and formatted amount', async ({ page }) => {
    await helpers.navigateToReports();
    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      await expect(card.locator('[data-testid="insight-priority"]')).toBeVisible();
      await expect(card).toContainText('NGN'); // currency visible
    }
  });

  test('should not classify income categories like Salary as spending insights', async ({ page }) => {
    await helpers.navigateToReports();
    await helpers.waitForInsights();

    const cards = helpers.insightCards();
    const texts = await cards.allInnerTexts();
    const hasSalarySpike = texts.some(text => /salary/i.test(text) && /spike|drop/i.test(text));
    expect(hasSalarySpike).toBe(false);
  });
}); 