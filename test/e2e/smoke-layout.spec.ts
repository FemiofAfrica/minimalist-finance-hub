import { test, expect } from '@playwright/test';

// List of routes to smoke-test for safe-area & banner spacing
const routes = ['/', '/dashboard', '/reports', '/settings'];

test.describe('Layout smoke test – safe-area and banner', () => {
  for (const path of routes) {
    test(`page ${path} renders without off-screen content`, async ({ page, baseURL }) => {
      // Navigate to page
      await page.goto(`${baseURL}${path}`);
      // Wait for network idle to ensure all assets loaded
      await page.waitForLoadState('networkidle');

      // Evaluate DOM to ensure no visible element sits above viewport after spacing helper
      const offscreenCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter(el => {
            if (!el.offsetParent) return false; // skip invisible elements
            const rect = el.getBoundingClientRect();
            return rect.top < 0;
          }).length;
      });

      expect(offscreenCount, 'no element should be clipped above viewport').toBe(0);
    });
  }
}); 