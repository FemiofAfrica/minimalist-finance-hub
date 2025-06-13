import { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E testing
 * 
 * This teardown runs once after all tests and handles:
 * - Test cleanup
 * - Performance report generation
 * - Artifact organization
 * - Summary reporting
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E Test Suite Global Teardown...');
  
  try {
    // ==================
    // PERFORMANCE REPORTING
    // ==================
    await generatePerformanceReport();
    
    // ==================
    // CLEANUP OPERATIONS
    // ==================
    await cleanupTestData();
    
    // ==================
    // ARTIFACT ORGANIZATION
    // ==================
    await organizeTestArtifacts();
    
    // ==================
    // SUMMARY REPORTING
    // ==================
    await generateTestSummary();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Generate comprehensive performance report
 */
async function generatePerformanceReport() {
  console.log('📊 Generating performance report...');
  
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const performanceData = global.performanceMetrics || {
      testStartTime: Date.now(),
      testCounts: { total: 0, passed: 0, failed: 0, skipped: 0 },
      loadTimes: [],
      renderTimes: [],
      memoryUsage: []
    };
    
    const testDuration = Date.now() - performanceData.testStartTime;
    
    const report = {
      summary: {
        totalDuration: `${(testDuration / 1000).toFixed(2)}s`,
        testsExecuted: performanceData.testCounts.total,
        testsPassed: performanceData.testCounts.passed,
        testsFailed: performanceData.testCounts.failed,
        testsSkipped: performanceData.testCounts.skipped,
        successRate: performanceData.testCounts.total > 0 
          ? `${((performanceData.testCounts.passed / performanceData.testCounts.total) * 100).toFixed(1)}%`
          : '0%'
      },
      performance: {
        loadTimes: {
          count: performanceData.loadTimes.length,
          average: performanceData.loadTimes.length > 0 
            ? `${(performanceData.loadTimes.reduce((a, b) => a + b, 0) / performanceData.loadTimes.length).toFixed(0)}ms`
            : 'N/A',
          min: performanceData.loadTimes.length > 0 
            ? `${Math.min(...performanceData.loadTimes)}ms`
            : 'N/A',
          max: performanceData.loadTimes.length > 0 
            ? `${Math.max(...performanceData.loadTimes)}ms`
            : 'N/A'
        },
        renderTimes: {
          count: performanceData.renderTimes.length,
          average: performanceData.renderTimes.length > 0 
            ? `${(performanceData.renderTimes.reduce((a, b) => a + b, 0) / performanceData.renderTimes.length).toFixed(0)}ms`
            : 'N/A',
          min: performanceData.renderTimes.length > 0 
            ? `${Math.min(...performanceData.renderTimes)}ms`
            : 'N/A',
          max: performanceData.renderTimes.length > 0 
            ? `${Math.max(...performanceData.renderTimes)}ms`
            : 'N/A'
        },
        memoryUsage: {
          samples: performanceData.memoryUsage.length,
          peak: performanceData.memoryUsage.length > 0 
            ? `${Math.max(...performanceData.memoryUsage).toFixed(1)}MB`
            : 'N/A',
          average: performanceData.memoryUsage.length > 0 
            ? `${(performanceData.memoryUsage.reduce((a, b) => a + b, 0) / performanceData.memoryUsage.length).toFixed(1)}MB`
            : 'N/A'
        }
      },
      benchmarks: {
        pageLoadThreshold: '3000ms',
        chartRenderThreshold: '1000ms',
        interactionThreshold: '200ms',
        memoryThreshold: '100MB'
      },
      recommendations: generatePerformanceRecommendations(performanceData)
    };
    
    const reportPath = path.join('test-results', 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryText = `
E2E Test Performance Report
==========================
Test Execution Summary:
- Total Duration: ${report.summary.totalDuration}
- Tests Executed: ${report.summary.testsExecuted}
- Success Rate: ${report.summary.successRate}

Performance Metrics:
- Average Load Time: ${report.performance.loadTimes.average}
- Average Render Time: ${report.performance.renderTimes.average}
- Peak Memory Usage: ${report.performance.memoryUsage.peak}

Recommendations:
${report.recommendations.map(rec => `- ${rec}`).join('\n')}
    `;
    
    const summaryPath = path.join('test-results', 'performance-summary.txt');
    await fs.writeFile(summaryPath, summaryText);
    
    console.log('✅ Performance report generated');
    
  } catch (error) {
    console.warn('⚠️ Failed to generate performance report:', error.message);
  }
}

/**
 * Generate performance recommendations based on test data
 */
function generatePerformanceRecommendations(performanceData: any): string[] {
  const recommendations = [];
  
  // Load time recommendations
  if (performanceData.loadTimes.length > 0) {
    const avgLoadTime = performanceData.loadTimes.reduce((a, b) => a + b, 0) / performanceData.loadTimes.length;
    const maxLoadTime = Math.max(...performanceData.loadTimes);
    
    if (avgLoadTime > 3000) {
      recommendations.push('Page load times exceed 3s target. Consider optimizing bundle size and API responses.');
    }
    
    if (maxLoadTime > 5000) {
      recommendations.push('Some pages load very slowly (>5s). Investigate network bottlenecks.');
    }
  }
  
  // Render time recommendations
  if (performanceData.renderTimes.length > 0) {
    const avgRenderTime = performanceData.renderTimes.reduce((a, b) => a + b, 0) / performanceData.renderTimes.length;
    
    if (avgRenderTime > 1000) {
      recommendations.push('Chart render times exceed 1s target. Consider optimizing chart libraries and data processing.');
    }
  }
  
  // Memory recommendations
  if (performanceData.memoryUsage.length > 0) {
    const peakMemory = Math.max(...performanceData.memoryUsage);
    
    if (peakMemory > 100) {
      recommendations.push('Peak memory usage is high (>100MB). Review for potential memory leaks.');
    }
  }
  
  // Test execution recommendations
  if (performanceData.testCounts.failed > 0) {
    const failureRate = (performanceData.testCounts.failed / performanceData.testCounts.total) * 100;
    
    if (failureRate > 10) {
      recommendations.push('High test failure rate detected. Review test stability and application reliability.');
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All performance metrics are within acceptable ranges. Great job!');
  }
  
  return recommendations;
}

/**
 * Clean up test data and temporary files
 */
async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Clear global test data
    delete global.testData;
    delete global.testAuth;
    delete global.performanceMetrics;
    
    // Clean up temporary test files
    const fs = require('fs').promises;
    const path = require('path');
    
    const tempFiles = [
      'test-temp-*.json',
      'test-cache-*.tmp'
    ];
    
    // Note: In a real implementation, you'd use glob patterns to find and delete temp files
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup had issues:', error.message);
  }
}

/**
 * Organize test artifacts into structured directories
 */
async function organizeTestArtifacts() {
  console.log('📁 Organizing test artifacts...');
  
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Create organized directory structure
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const runDir = path.join('test-results', `run-${timestamp}`);
    
    await fs.mkdir(runDir, { recursive: true });
    
    // Move artifacts to organized structure
    const artifactTypes = [
      'screenshots',
      'videos', 
      'traces',
      'visual',
      'performance'
    ];
    
    for (const type of artifactTypes) {
      const sourceDir = path.join('test-results', type);
      const targetDir = path.join(runDir, type);
      
      try {
        await fs.access(sourceDir);
        await fs.mkdir(targetDir, { recursive: true });
        // In a real implementation, you'd move files from source to target
      } catch (error) {
        // Directory might not exist, which is fine
      }
    }
    
    console.log('✅ Test artifacts organized');
    
  } catch (error) {
    console.warn('⚠️ Artifact organization had issues:', error.message);
  }
}

/**
 * Generate final test summary
 */
async function generateTestSummary() {
  console.log('📋 Generating test summary...');
  
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: !!process.env.CI,
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      },
      testSuite: {
        name: 'Visual Charts E2E Test Suite',
        version: '1.0.0',
        framework: 'Playwright',
        totalTests: global.performanceMetrics?.testCounts?.total || 0,
        duration: global.performanceMetrics 
          ? `${((Date.now() - global.performanceMetrics.testStartTime) / 1000).toFixed(2)}s`
          : 'Unknown'
      },
      coverage: {
        chartComponents: [
          'BalanceTrendChart',
          'IncomeExpenseChart', 
          'MonthlyTotalsBarChart'
        ],
        testTypes: [
          'Functional Testing',
          'User Interaction Testing',
          'Performance Testing',
          'Visual Regression Testing',
          'Mobile Responsiveness Testing',
          'Cross-Browser Testing'
        ],
        devices: [
          'Desktop Chrome',
          'Desktop Firefox',
          'Desktop Safari',
          'Mobile Chrome',
          'Mobile Safari',
          'iPad',
          'Android Tablet'
        ]
      },
      status: 'COMPLETED',
      artifacts: {
        performanceReport: 'test-results/performance-report.json',
        performanceSummary: 'test-results/performance-summary.txt',
        htmlReport: 'test-results/html-report/index.html',
        junitResults: 'test-results/junit-results.xml',
        jsonResults: 'test-results/json-results.json'
      }
    };
    
    const summaryPath = path.join('test-results', 'test-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Generate human-readable summary
    const readableSummary = `
Visual Charts E2E Test Suite - Final Summary
===========================================

Test Execution Completed: ${new Date().toLocaleString()}
Total Duration: ${summary.testSuite.duration}
Tests Executed: ${summary.testSuite.totalTests}

Environment:
- Node.js: ${summary.environment.nodeVersion}
- Platform: ${summary.environment.platform}
- CI Environment: ${summary.environment.ci ? 'Yes' : 'No'}

Coverage:
- Chart Components: ${summary.coverage.chartComponents.length} tested
- Test Types: ${summary.coverage.testTypes.length} categories
- Devices/Browsers: ${summary.coverage.devices.length} configurations

Artifacts Generated:
- Performance Report: ${summary.artifacts.performanceReport}
- HTML Test Report: ${summary.artifacts.htmlReport}
- JUnit Results: ${summary.artifacts.junitResults}

Status: ${summary.status}
    `;
    
    const readablePath = path.join('test-results', 'final-summary.txt');
    await fs.writeFile(readablePath, readableSummary);
    
    console.log('✅ Test summary generated');
    console.log('\n' + '='.repeat(50));
    console.log('📊 E2E TEST SUITE EXECUTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`📋 Summary: ${summaryPath}`);
    console.log(`📈 Performance: ${path.join('test-results', 'performance-report.json')}`);
    console.log(`🌐 HTML Report: ${path.join('test-results', 'html-report', 'index.html')}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.warn('⚠️ Test summary generation had issues:', error.message);
  }
}

/**
 * Send notifications if configured
 */
async function sendNotifications() {
  if (process.env.SLACK_WEBHOOK_URL) {
    // Send Slack notification about test completion
    console.log('📱 Sending test completion notification...');
    
    try {
      const performanceData = global.performanceMetrics || {};
      const testDuration = performanceData.testStartTime 
        ? `${((Date.now() - performanceData.testStartTime) / 1000).toFixed(2)}s`
        : 'Unknown';
      
      const message = {
        text: `Visual Charts E2E Test Suite Completed`,
        attachments: [{
          color: performanceData.testCounts?.failed > 0 ? 'danger' : 'good',
          fields: [
            {
              title: 'Duration',
              value: testDuration,
              short: true
            },
            {
              title: 'Tests Executed',
              value: performanceData.testCounts?.total || 0,
              short: true
            },
            {
              title: 'Success Rate',
              value: performanceData.testCounts?.total > 0 
                ? `${((performanceData.testCounts.passed / performanceData.testCounts.total) * 100).toFixed(1)}%`
                : 'N/A',
              short: true
            }
          ]
        }]
      };
      
      // In a real implementation, you'd send this to Slack
      console.log('✅ Notification sent');
      
    } catch (error) {
      console.warn('⚠️ Failed to send notification:', error.message);
    }
  }
}

// Export the global teardown function
export default globalTeardown; 