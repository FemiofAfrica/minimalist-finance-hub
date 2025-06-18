/**
 * Pattern detection utilities for financial insights.
 * All functions are pure and do not rely on external state.
 */

/** Result for MoM change calculation */
export interface MoMChangeResult {
  /** Percent change between last value and value one month before */
  percentChange: number;
  /** Whether the change magnitude meets/exceeds the supplied threshold */
  exceedsThreshold: boolean;
}

/**
 * Calculate month-over-month percent change for a numeric series (latest value last).
 * @param series Array of numeric values ordered oldest→newest (at least 2 elements).
 * @param threshold Percentage threshold (e.g., 30 for 30%).
 * @returns MoMChangeResult
 */
export function detectMoMChange(series: number[], threshold: number): MoMChangeResult {
  if (series.length < 2) throw new Error('Series must contain at least two points');
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const change = previous === 0 ? Infinity : ((current - previous) / previous) * 100;
  return {
    percentChange: change,
    exceedsThreshold: Math.abs(change) >= threshold
  };
}

/**
 * Detect if current value has spiked relative to previous value by given percent.
 * @param current Current period value (positive number)
 * @param previous Previous period value (positive number)
 * @param spikePercent Spike threshold percentage (e.g., 50 for 50%).
 */
export function detectSpike(current: number, previous: number, spikePercent: number): boolean {
  if (previous === 0) return current > 0; // any amount is a spike if previous was zero
  const change = ((current - previous) / previous) * 100;
  return change >= spikePercent;
}

/**
 * Detect consecutive streak in numeric values.
 * @param values Array of numbers ordered oldest→newest.
 * @param direction 'up' for increasing, 'down' for decreasing.
 * @param length Number of consecutive periods required.
 */
export function detectStreak(values: number[], direction: 'up' | 'down', length: number): boolean {
  if (values.length < length) return false;
  let streak = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const cond = direction === 'up' ? diff > 0 : diff < 0;
    if (cond) {
      streak += 1;
      if (streak >= length - 1) return true; // length periods means length-1 comparisons
    } else {
      streak = 0;
    }
  }
  return false;
} 