import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCategoryTotals } from '@/services/categoryAnalyticsService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client');

const mockSupabase = vi.mocked(supabase);

describe('getCategoryTotals', () => {
  const userId = 'user1';

  const mockTransactions = [
    {
      amount: -100, // expense
      currency: 'USD',
      type: 'expense',
      category_id: 'cat1',
      categories: { name: 'Food', type: 'expense' },
      date: '2024-05-10'
    },
    {
      amount: -200,
      currency: 'USD',
      type: 'expense',
      category_id: 'cat1',
      categories: { name: 'Food', type: 'expense' },
      date: '2024-05-15'
    },
    {
      amount: -150,
      currency: 'USD',
      type: 'expense',
      category_id: 'cat2',
      categories: { name: 'Transport', type: 'expense' },
      date: '2024-05-20'
    },
    {
      amount: 500,
      currency: 'USD',
      type: 'income',
      category_id: 'cat3',
      categories: { name: 'Salary', type: 'income' },
      date: '2024-05-18'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Builder object that tracks filters and resolves data on .lte()
    const builder: any = {
      _typeFilter: undefined as string | undefined,
      select() { return this; },
      eq(column: string, value: string) {
        if (column === 'type') {
          this._typeFilter = value;
        }
        return this;
      },
      gte() { return this; },
      lte() {
        const filtered = this._typeFilter
          ? mockTransactions.filter(t => t.type === this._typeFilter)
          : mockTransactions;
        return Promise.resolve({ data: filtered, error: null });
      }
    };

    (mockSupabase.from as unknown as vi.Mock).mockImplementation(() => builder);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate totals and percentages correctly', async () => {
    const result = await getCategoryTotals(userId, 3);

    expect(result).toHaveLength(3);

    const food = result.find(r => r.categoryName === 'Food');
    const transport = result.find(r => r.categoryName === 'Transport');
    const salary = result.find(r => r.categoryName === 'Salary');

    expect(food?.total).toBe(300);
    expect(transport?.total).toBe(150);
    expect(salary?.total).toBe(500);

    // Grand total = 950
    expect(food?.percentage).toBeCloseTo((300 / 950) * 100, 5);
    expect(salary?.percentage).toBeCloseTo((500 / 950) * 100, 5);
  });

  it('should support filtering by category type', async () => {
    const result = await getCategoryTotals(userId, 3, 'expense');

    expect(result).toHaveLength(2); // Only expense categories
    expect(result.some(r => r.type === 'income')).toBe(false);
  });
}); 