import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Visual Charts E2E Testing
 * 
 * This configuration supports:
 * - Cross-browser testing (Chromium, Firefox, WebKit)
 * - Mobile and tablet device testing
 * - Visual regression testing
 * - Performance monitoring
 * - Parallel test execution
 */
export default defineConfig({
  // Test directory structure
  testDir: './test/e2e',
  
  // Timeout configurations
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000 // 5 seconds for expect assertions
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // Prevent .only() in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Limit workers in CI
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
    ['json', { outputFile: 'test-results/json-results.json' }],
    ['list'] // Console output
  ],
  
  // Global test configuration
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Browser settings
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Tracing and debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Default headers for all requests
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Reduce motion for more stable visual tests
    reducedMotion: 'reduce'
  },
  
  // Projects for different browsers and devices
  projects: [
    // ==================
    // DESKTOP BROWSERS
    // ==================
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        'reports-charts.spec.ts',
        'chart-interactions.spec.ts',
        'performance-charts.spec.ts'
      ]
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        'reports-charts.spec.ts',
        'chart-interactions.spec.ts'
      ]
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        'reports-charts.spec.ts',
        'chart-interactions.spec.ts'
      ]
    },
    
    // ==================
    // MOBILE DEVICES
    // ==================
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true
      },
      testMatch: [
        'mobile-charts.spec.ts',
        'reports-charts.spec.ts'
      ]
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true
      },
      testMatch: [
        'mobile-charts.spec.ts',
        'reports-charts.spec.ts'
      ]
    },
    
    {
      name: 'mobile-samsung',
      use: { 
        ...devices['Galaxy S8'],
        isMobile: true,
        hasTouch: true
      },
      testMatch: [
        'mobile-charts.spec.ts'
      ]
    },
    
    // ==================
    // TABLET DEVICES
    // ==================
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true
      },
      testMatch: [
        'mobile-charts.spec.ts',
        'chart-interactions.spec.ts'
      ]
    },
    
    {
      name: 'tablet-android',
      use: {
        ...devices['Galaxy Tab S4'],
        isMobile: true,
        hasTouch: true
      },
      testMatch: [
        'mobile-charts.spec.ts'
      ]
    },
    
    // ==================
    // VISUAL REGRESSION
    // ==================
    {
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testDir: './test/visual',
      testMatch: 'charts-regression.spec.ts'
    },
    
    {
      name: 'visual-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testDir: './test/visual',
      testMatch: 'charts-regression.spec.ts'
    },
    
    {
      name: 'visual-webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
      testDir: './test/visual',
      testMatch: 'charts-regression.spec.ts'
    },
    
    // ==================
    // PERFORMANCE TESTS
    // ==================
    {
      name: 'performance-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: 'performance-charts.spec.ts'
    },
    
    // ==================
    // ACCESSIBILITY TESTS
    // ==================
    {
      name: 'accessibility-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        'reports-charts.spec.ts',
        'chart-interactions.spec.ts'
      ]
    },
    
    // ==================
    // ADDITIONAL CHROMIUM VARIANTS (Arc, Edge, Dia)
    // ==================
    {
      name: 'arc-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Arc/1.29.0 Chrome/117.0.0.0 Safari/537.36'
      },
      testMatch: [
        'smoke-layout.spec.ts'
      ]
    },
    {
      name: 'edge-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.0.0'
      },
      testMatch: [
        'smoke-layout.spec.ts'
      ]
    },
    {
      name: 'dia-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Dia/1.0 Chrome/117.0.0.0 Safari/537.36'
      },
      testMatch: [
        'smoke-layout.spec.ts'
      ]
    },
    // Explicit Safari desktop alias for separate reporting
    {
      name: 'safari-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        'smoke-layout.spec.ts'
      ]
    }
  ],
  
  // Web server configuration for local development
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    stdout: 'pipe',
    stderr: 'pipe'
  },
  
  // Output directories
  outputDir: 'test-results/artifacts',
  
  // Additional settings
  metadata: {
    testType: 'e2e',
    framework: 'playwright',
    application: 'minimalist-finance-hub',
    feature: 'visual-charts'
  }
});

// Environment-specific configurations
// if (process.env.GITHUB_ACTIONS) {
//   // GitHub Actions specific settings
// }
// if (process.env.HEADLESS === 'false') {
//   // Development mode overrides handled via CLI flags
// } 