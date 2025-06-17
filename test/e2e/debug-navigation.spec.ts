import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  test('should be able to navigate to home page first', async ({ page }) => {
    console.log('Trying to navigate to home page...');
    
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Successfully loaded home page');
      
      const title = await page.title();
      const url = page.url();
      console.log(`Page title: ${title}, URL: ${url}`);
      
      // Try to screenshot
      await page.screenshot({ path: 'debug-home.png' });
      console.log('Screenshot saved as debug-home.png');
      
    } catch (error) {
      console.error('Failed to load home page:', error.message);
    }
  });

  test('should be able to navigate to reports after home', async ({ page }) => {
    console.log('Trying to navigate to home first, then reports...');
    
    try {
      // First go to home
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Loaded home page');
      
      // Then navigate to reports
      await page.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Successfully navigated to reports');
      
      const title = await page.title();
      const url = page.url();
      console.log(`Page title: ${title}, URL: ${url}`);
      
      // Check if we're on the reports page or redirected
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText?.substring(0, 300));
      
      // Try to screenshot
      await page.screenshot({ path: 'debug-reports.png' });
      console.log('Screenshot saved as debug-reports.png');
      
    } catch (error) {
      console.error('Failed to navigate:', error.message);
    }
  });

  test('should check if we can directly access reports', async ({ page }) => {
    console.log('Trying direct navigation to reports...');
    
    try {
      await page.goto('/reports', { 
        waitUntil: 'networkidle', 
        timeout: 60000 
      });
      console.log('Successfully navigated directly to reports');
      
      const title = await page.title();
      const url = page.url();
      console.log(`Final page title: ${title}, URL: ${url}`);
      
      // Get full body content
      const bodyText = await page.locator('body').textContent();
      console.log('Full page content length:', bodyText?.length);
      console.log('Page content preview:', bodyText?.substring(0, 500));
      
      // Try to screenshot
      await page.screenshot({ path: 'debug-direct-reports.png' });
      console.log('Screenshot saved as debug-direct-reports.png');
      
    } catch (error) {
      console.error('Failed direct navigation to reports:', error.message);
    }
  });
}); 