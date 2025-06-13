import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E testing
 * 
 * This setup runs once before all tests and handles:
 * - Environment validation
 * - Test data preparation
 * - Database seeding
 * - Authentication setup
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Suite Global Setup...');
  
  try {
    // ==================
    // ENVIRONMENT VALIDATION
    // ==================
    await validateEnvironment();
    
    // ==================
    // TEST DATA PREPARATION
    // ==================
    await prepareTestData();
    
    // ==================
    // APPLICATION WARM-UP
    // ==================
    await warmUpApplication(config.projects[0].use.baseURL || 'http://localhost:3000');
    
    // ==================
    // AUTHENTICATION SETUP
    // ==================
    await setupAuthentication();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Validate that the environment is ready for testing
 */
async function validateEnvironment() {
  console.log('🔍 Validating test environment...');
  
  // Check required environment variables
  const requiredVars = ['NODE_ENV', 'BASE_URL'];
  for (const varName of requiredVars) {
    if (!process.env[varName] && varName !== 'BASE_URL') {
      console.warn(`⚠️ Environment variable ${varName} is not set`);
    }
  }
  
  // Validate Node.js version
  const nodeVersion = process.version;
  console.log(`📦 Node.js version: ${nodeVersion}`);
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.DISABLE_ANALYTICS = 'true';
  process.env.MOCK_EXTERNAL_APIs = 'true';
  
  console.log('✅ Environment validation completed');
}

/**
 * Prepare test data for consistent testing
 */
async function prepareTestData() {
  console.log('📊 Preparing test data...');
  
  // Create consistent test datasets
  const testDatasets = {
    steadyGrowth: generateSteadyGrowthData(),
    volatileFinances: generateVolatileFinanceData(),
    newUser: generateNewUserData(),
    largeDataset: generateLargeDataset(),
    emptyData: []
  };
  
  // Store test data for use in tests
  global.testData = testDatasets;
  
  console.log('✅ Test data preparation completed');
}

/**
 * Generate steady growth financial data
 */
function generateSteadyGrowthData() {
  const data = [];
  let balance = 5000;
  
  for (let i = 0; i < 12; i++) {
    const month = new Date(2024, i, 1).toISOString().slice(0, 7);
    const income = 3000 + (i * 100); // Gradual income increase
    const expenses = 2000 + (i * 50); // Gradual expense increase
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
 * Generate volatile financial data
 */
function generateVolatileFinanceData() {
  const data = [];
  let balance = 3000;
  
  for (let i = 0; i < 24; i++) {
    const month = new Date(2023, i % 12, 1).toISOString().slice(0, 7);
    const income = 2000 + Math.random() * 3000; // Variable income
    const expenses = 1500 + Math.random() * 2500; // Variable expenses
    balance += (income - expenses);
    
    data.push({
      month,
      balance: Math.round(Math.max(0, balance)), // Prevent negative balance
      income: Math.round(income),
      expenses: Math.round(expenses)
    });
  }
  
  return data;
}

/**
 * Generate minimal data for new users
 */
function generateNewUserData() {
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
function generateLargeDataset() {
  const data = [];
  let balance = 10000;
  
  for (let i = 0; i < 60; i++) { // 5 years of data
    const year = 2019 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    const income = 3000 + Math.sin(i / 6) * 1000 + Math.random() * 500;
    const expenses = 2500 + Math.cos(i / 4) * 800 + Math.random() * 400;
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
 * Warm up the application by making initial requests
 */
async function warmUpApplication(baseURL: string) {
  console.log('🔥 Warming up application...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to main pages to warm up
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    await page.goto(`${baseURL}/reports`);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Application warm-up completed');
    
  } catch (error) {
    console.warn('⚠️ Application warm-up failed:', error.message);
    // Don't fail the setup if warm-up fails
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication for tests
 */
async function setupAuthentication() {
  console.log('🔐 Setting up authentication...');
  
  // Create test authentication tokens
  const testAuth = {
    token: 'test-auth-token-123',
    userId: 'test-user-id',
    email: 'test@example.com',
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  // Store auth data for use in tests
  global.testAuth = testAuth;
  
  console.log('✅ Authentication setup completed');
}

/**
 * Performance monitoring setup
 */
async function setupPerformanceMonitoring() {
  console.log('📈 Setting up performance monitoring...');
  
  // Initialize performance tracking
  global.performanceMetrics = {
    testStartTime: Date.now(),
    testCounts: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    loadTimes: [],
    renderTimes: [],
    memoryUsage: []
  };
  
  console.log('✅ Performance monitoring setup completed');
}

/**
 * Create test artifacts directory
 */
async function createTestDirectories() {
  const fs = require('fs').promises;
  const path = require('path');
  
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/visual',
    'test-results/performance',
    'test-results/reports'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, which is fine
    }
  }
}

// Export the global setup function
export default globalSetup; 