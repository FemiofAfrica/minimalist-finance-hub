import { useState, useEffect, useCallback, useMemo } from 'react';
import { differenceInMonths, format, parseISO } from 'date-fns';
import { chartDataService } from '@/services/chartDataService';

interface DataAvailability {
  totalMonths: number;
  earliestMonth: string;
  latestMonth: string;
}

interface UseTimePeriodDataReturn {
  currentPeriod: number;
  availableData: DataAvailability | null;
  loading: boolean;
  error: string | null;
  setPeriod: (period: number) => void;
  refreshAvailability: () => Promise<void>;
  isValidPeriod: (period: number) => boolean;
  getBestAvailablePeriod: () => number;
}

const STORAGE_KEY = 'fintrack-preferred-time-period';
const DEFAULT_PERIOD = 6;

/**
 * Custom hook for managing time period selection and data availability
 * Handles persistence, validation, and automatic fallbacks
 */
export const useTimePeriodData = (
  initialPeriod: number = DEFAULT_PERIOD
): UseTimePeriodDataReturn => {
  const [currentPeriod, setCurrentPeriod] = useState<number>(() => {
    // Try to restore from localStorage, fallback to initialPeriod
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return initialPeriod;
  });

  const [availableData, setAvailableData] = useState<DataAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data availability from the chart data service
  const loadDataAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get historical data to determine available range
      const historicalData = await chartDataService.getBalanceTrendData(24);
      
      if (historicalData.length === 0) {
        setAvailableData({
          totalMonths: 0,
          earliestMonth: format(new Date(), 'yyyy-MM'),
          latestMonth: format(new Date(), 'yyyy-MM')
        });
        return;
      }

      // Sort data chronologically
      const sortedData = [...historicalData].sort((a, b) => 
        new Date(a.month).getTime() - new Date(b.month).getTime()
      );

      const earliestMonth = sortedData[0].month;
      const latestMonth = sortedData[sortedData.length - 1].month;
      
      // Calculate total months between earliest and latest
      const totalMonths = differenceInMonths(
        parseISO(latestMonth + '-01'),
        parseISO(earliestMonth + '-01')
      ) + 1;

      setAvailableData({
        totalMonths: Math.max(1, totalMonths),
        earliestMonth,
        latestMonth
      });
    } catch (err) {
      console.error('Failed to load data availability:', err);
      setError('Failed to load data availability');
      
      // Fallback to current month
      setAvailableData({
        totalMonths: 1,
        earliestMonth: format(new Date(), 'yyyy-MM'),
        latestMonth: format(new Date(), 'yyyy-MM')
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data availability on mount
  useEffect(() => {
    loadDataAvailability();
  }, [loadDataAvailability]);

  // Validate if a period is available given current data
  const isValidPeriod = useCallback((period: number): boolean => {
    if (!availableData) return false;
    return period > 0 && period <= availableData.totalMonths;
  }, [availableData]);

  // Get the best available period based on preference order
  const getBestAvailablePeriod = useCallback((): number => {
    if (!availableData) return DEFAULT_PERIOD;
    
    const { totalMonths } = availableData;
    
    // For small amounts of data, show all available
    if (totalMonths <= 3) {
      return totalMonths;
    }
    
    // Preference order: 6, 3, 12, 24 months, then largest available
    const preferredOrder = [6, 3, 12, 24];
    
    for (const preferred of preferredOrder) {
      if (preferred <= totalMonths) {
        return preferred;
      }
    }
    
    // If none of the preferred options work, use the largest available
    // but cap at 24 months for performance
    return Math.min(totalMonths, 24);
  }, [availableData]);

  // Update period with validation and persistence
  const setPeriod = useCallback((period: number) => {
    if (period <= 0) {
      console.warn('Invalid period provided:', period);
      return;
    }

    // Validate against available data
    if (availableData && period > availableData.totalMonths) {
      console.warn(`Period ${period} exceeds available data (${availableData.totalMonths} months)`);
      const fallback = getBestAvailablePeriod();
      setCurrentPeriod(fallback);
      localStorage.setItem(STORAGE_KEY, fallback.toString());
      return;
    }

    setCurrentPeriod(period);
    localStorage.setItem(STORAGE_KEY, period.toString());
  }, [availableData, getBestAvailablePeriod]);

  // Auto-correct invalid periods when data becomes available
  useEffect(() => {
    if (availableData && !isValidPeriod(currentPeriod)) {
      const fallback = getBestAvailablePeriod();
      setPeriod(fallback);
    }
  }, [availableData, currentPeriod, isValidPeriod, getBestAvailablePeriod, setPeriod]);

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    currentPeriod,
    availableData,
    loading,
    error,
    setPeriod,
    refreshAvailability: loadDataAvailability,
    isValidPeriod,
    getBestAvailablePeriod
  }), [
    currentPeriod,
    availableData,
    loading,
    error,
    setPeriod,
    loadDataAvailability,
    isValidPeriod,
    getBestAvailablePeriod
  ]);

  return returnValue;
}; 