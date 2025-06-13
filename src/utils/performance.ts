// Performance monitoring utilities for charts and components

export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ChartPerformanceData {
  loadTime: number;
  renderTime: number;
  dataPoints: number;
  timePeriod: number;
  component: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private chartMetrics: ChartPerformanceData[] = [];
  
  // Start timing a performance measurement
  start(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata
    });
  }

  // End timing and calculate duration
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    this.metrics.set(name, {
      ...metric,
      endTime,
      duration
    });

    return duration;
  }

  // Get a specific metric
  getMetric(name: string): PerformanceMetrics | undefined {
    return this.metrics.get(name);
  }

  // Get all metrics
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values()).filter(metric => metric.duration !== undefined);
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
    this.chartMetrics = [];
  }

  // Record chart-specific performance data
  recordChartPerformance(data: ChartPerformanceData): void {
    this.chartMetrics.push({
      ...data,
      loadTime: Math.round(data.loadTime * 100) / 100, // Round to 2 decimal places
      renderTime: Math.round(data.renderTime * 100) / 100
    });

    // Log performance warnings for slow charts
    if (data.loadTime > 2000) {
      console.warn(`Slow chart load detected: ${data.component} took ${data.loadTime}ms to load`);
    }
    
    if (data.renderTime > 1000) {
      console.warn(`Slow chart render detected: ${data.component} took ${data.renderTime}ms to render`);
    }
  }

  // Get chart performance summary
  getChartPerformanceSummary(): {
    averageLoadTime: number;
    averageRenderTime: number;
    slowestChart: ChartPerformanceData | null;
    totalCharts: number;
  } {
    if (this.chartMetrics.length === 0) {
      return {
        averageLoadTime: 0,
        averageRenderTime: 0,
        slowestChart: null,
        totalCharts: 0
      };
    }

    const totalLoadTime = this.chartMetrics.reduce((sum, metric) => sum + metric.loadTime, 0);
    const totalRenderTime = this.chartMetrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    const slowestChart = this.chartMetrics.reduce((slowest, current) => 
      current.loadTime > slowest.loadTime ? current : slowest
    );

    return {
      averageLoadTime: Math.round((totalLoadTime / this.chartMetrics.length) * 100) / 100,
      averageRenderTime: Math.round((totalRenderTime / this.chartMetrics.length) * 100) / 100,
      slowestChart,
      totalCharts: this.chartMetrics.length
    };
  }

  // Log performance summary to console (development only)
  logSummary(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const chartSummary = this.getChartPerformanceSummary();
    const allMetrics = this.getAllMetrics();

    console.group('📊 Performance Summary');
    
    if (chartSummary.totalCharts > 0) {
      console.log('Chart Performance:');
      console.log(`  Average Load Time: ${chartSummary.averageLoadTime}ms`);
      console.log(`  Average Render Time: ${chartSummary.averageRenderTime}ms`);
      console.log(`  Total Charts: ${chartSummary.totalCharts}`);
      
      if (chartSummary.slowestChart) {
        console.log(`  Slowest Chart: ${chartSummary.slowestChart.component} (${chartSummary.slowestChart.loadTime}ms)`);
      }
    }

    if (allMetrics.length > 0) {
      console.log('\nOther Metrics:');
      allMetrics.forEach(metric => {
        if (metric.duration) {
          console.log(`  ${metric.name}: ${metric.duration.toFixed(2)}ms`);
        }
      });
    }

    console.groupEnd();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for measuring component performance
export const usePerformanceMetrics = () => {
  const startMeasurement = (name: string, metadata?: Record<string, any>) => {
    performanceMonitor.start(name, metadata);
  };

  const endMeasurement = (name: string) => {
    return performanceMonitor.end(name);
  };

  const recordChartPerformance = (data: ChartPerformanceData) => {
    performanceMonitor.recordChartPerformance(data);
  };

  return {
    startMeasurement,
    endMeasurement,
    recordChartPerformance,
    getMetric: (name: string) => performanceMonitor.getMetric(name),
    getSummary: () => performanceMonitor.getChartPerformanceSummary()
  };
};

// Memory usage tracking utilities
export const getMemoryUsage = (): MemoryInfo | null => {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
};

// Network performance utilities
export const measureNetworkPerformance = (url: string) => {
  const startTime = performance.now();
  
  return {
    complete: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performanceMonitor.start(`network-${url}`, { url });
      performanceMonitor.end(`network-${url}`);
      
      return duration;
    }
  };
};

// Debounce utility for performance optimization
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  immediate?: boolean
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

// Throttle utility for scroll/resize handlers
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 