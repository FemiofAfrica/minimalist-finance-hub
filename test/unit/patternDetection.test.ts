import { describe, it, expect } from 'vitest';
import { detectMoMChange, detectSpike, detectStreak } from '@/services/insights/patternDetection';

describe('patternDetection utilities', () => {
  it('detectMoMChange detects percent and threshold exceed', () => {
    const res = detectMoMChange([100, 140], 30);
    expect(res.percentChange).toBeCloseTo(40);
    expect(res.exceedsThreshold).toBe(true);
  });

  it('detectSpike identifies spike', () => {
    expect(detectSpike(150, 100, 40)).toBe(true); // 50% spike > 40
    expect(detectSpike(110, 100, 20)).toBe(false); // 10% < 20
    expect(detectSpike(110, 100, 15)).toBe(false);
    expect(detectSpike(130, 100, 20)).toBe(true); // 30%
    expect(detectSpike(105, 100, 10)).toBe(false);
    expect(detectSpike(105, 100, 6)).toBe(false);
  });

  it('detectStreak detects upward streak', () => {
    expect(detectStreak([1,2,3,4], 'up', 3)).toBe(true);
    expect(detectStreak([1,2,1,2], 'up', 3)).toBe(false);
  });

  it('detectStreak detects downward streak', () => {
    expect(detectStreak([5,4,3,2], 'down', 4)).toBe(true);
    expect(detectStreak([5,4,4,3], 'down', 3)).toBe(false);
  });
}); 