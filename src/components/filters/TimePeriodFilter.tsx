import { useEffect, useState, useMemo, useCallback } from "react";
import { Clock, Info } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { chartDataService } from "@/services/chartDataService";
import { differenceInMonths, format, parseISO } from "date-fns";

interface DataAvailability {
  totalMonths: number;
  earliestMonth: string;
  latestMonth: string;
}

interface PeriodOption {
  value: number;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface TimePeriodFilterProps {
  currentPeriod: number;
  onPeriodChange: (months: number) => void;
  availableData?: DataAvailability;
  disabled?: boolean;
  showDataInfo?: boolean;
  className?: string;
}

const DEFAULT_PERIOD_OPTIONS: PeriodOption[] = [
  {
    value: 1,
    label: "Last Month",
    description: "View the most recent completed month's data"
  },
  {
    value: 2,
    label: "Last 2 Months",
    description: "Compare recent months and identify short-term trends"
  },
  {
    value: 3,
    label: "Last 3 Months",
    description: "View recent financial trends over the past quarter"
  },
  {
    value: 6,
    label: "Last 6 Months", 
    description: "Analyze patterns and trends over the past half year"
  },
  {
    value: 12,
    label: "Last 12 Months",
    description: "Review your complete annual financial performance"
  },
  {
    value: 24,
    label: "Last 24 Months",
    description: "Compare year-over-year trends and long-term patterns"
  }
];

const STORAGE_KEY = 'fintrack-preferred-time-period';

const TimePeriodFilter = ({
  currentPeriod,
  onPeriodChange,
  availableData,
  disabled = false,
  showDataInfo = true,
  className = ""
}: TimePeriodFilterProps) => {
  const [loading, setLoading] = useState(false);
  const [dataAvailability, setDataAvailability] = useState<DataAvailability | null>(
    availableData || null
  );

  // Load data availability if not provided as prop
  const loadDataAvailability = useCallback(async () => {
    if (availableData) return;

    try {
      setLoading(true);
      
      // Get historical data to determine available range
      const historicalData = await chartDataService.getBalanceTrendData(24);
      
      if (historicalData.length === 0) {
        setDataAvailability({
          totalMonths: 0,
          earliestMonth: format(new Date(), 'yyyy-MM'),
          latestMonth: format(new Date(), 'yyyy-MM')
        });
        return;
      }

      const sortedData = [...historicalData].sort((a, b) => 
        new Date(a.month).getTime() - new Date(b.month).getTime()
      );

      const earliestMonth = sortedData[0].month;
      const latestMonth = sortedData[sortedData.length - 1].month;
      
      const totalMonths = differenceInMonths(
        parseISO(latestMonth + '-01'),
        parseISO(earliestMonth + '-01')
      ) + 1;

      setDataAvailability({
        totalMonths,
        earliestMonth,
        latestMonth
      });
    } catch (error) {
      console.error('Failed to load data availability:', error);
      setDataAvailability({
        totalMonths: 1,
        earliestMonth: format(new Date(), 'yyyy-MM'),
        latestMonth: format(new Date(), 'yyyy-MM')
      });
    } finally {
      setLoading(false);
    }
  }, [availableData]);

  // Load data availability on mount
  useEffect(() => {
    loadDataAvailability();
  }, [loadDataAvailability]);

  // Generate period options with availability checking
  const periodOptions = useMemo(() => {
    if (!dataAvailability) return DEFAULT_PERIOD_OPTIONS;

    const { totalMonths } = dataAvailability;
    
    // Start with default options
    let options = [...DEFAULT_PERIOD_OPTIONS];
    
    // For users with limited data, add specific options that match their data
    if (totalMonths > 0 && totalMonths <= 6) {
      // Remove existing options that match, then add custom ones
      const existingValues = new Set(options.map(opt => opt.value));
      
      for (let months = 1; months <= totalMonths; months++) {
        if (!existingValues.has(months)) {
          const label = months === 1 ? "Last Month" : `Last ${months} Months`;
          const description = months === 1 
            ? "View the most recent completed month's data"
            : `View the last ${months} months of completed data`;
            
          // Insert in the right position to maintain order
          const insertIndex = options.findIndex(opt => opt.value > months);
          const newOption: PeriodOption = {
            value: months,
            label,
            description
          };
          
          if (insertIndex === -1) {
            options.push(newOption);
          } else {
            options.splice(insertIndex, 0, newOption);
          }
        }
      }
    }

    // Mark options as disabled if they exceed available data
    return options.map(option => {
      const isAvailable = option.value <= totalMonths;
      
      return {
        ...option,
        disabled: !isAvailable,
        disabledReason: !isAvailable 
          ? `Only ${totalMonths} month${totalMonths === 1 ? '' : 's'} of data available`
          : undefined
      };
    }).sort((a, b) => a.value - b.value); // Ensure correct ordering
  }, [dataAvailability]);

  // Handle period selection
  const handlePeriodChange = useCallback((value: string) => {
    const period = parseInt(value, 10);
    
    // Save preference to localStorage
    localStorage.setItem(STORAGE_KEY, period.toString());
    
    onPeriodChange(period);
  }, [onPeriodChange]);

  // Format data range for display
  const formatDataRange = useCallback((data: DataAvailability) => {
    try {
      const startDate = parseISO(data.earliestMonth + '-01');
      const endDate = parseISO(data.latestMonth + '-01');
      
      const startFormatted = format(startDate, 'MMM yyyy');
      const endFormatted = format(endDate, 'MMM yyyy');
      
      if (startFormatted === endFormatted) {
        return startFormatted;
      }
      
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return 'Current month';
    }
  }, []);

  const selectedOption = periodOptions.find(option => option.value === currentPeriod);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
      </div>
      
      <Select
        value={currentPeriod.toString()}
        onValueChange={handlePeriodChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select time period">
            {selectedOption?.label || `${currentPeriod} months`}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {periodOptions.map(option => (
            <TooltipProvider key={option.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectItem 
                    value={option.value.toString()}
                    disabled={option.disabled}
                    className="flex flex-col items-start py-3"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{option.label}</span>
                      {option.disabled && (
                        <Badge variant="secondary" className="text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {option.disabled ? option.disabledReason : option.description}
                    </span>
                  </SelectItem>
                </TooltipTrigger>
                
                {!option.disabled && (
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{option.description}</p>
                    {dataAvailability && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Available data: {formatDataRange(dataAvailability)}
                      </p>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </SelectContent>
      </Select>

      {/* Data info display */}
      {showDataInfo && dataAvailability && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                <Info className="h-3 w-3" />
                <span>{dataAvailability.totalMonths} months</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">Available Data Range</p>
                <p className="text-muted-foreground">
                  {formatDataRange(dataAvailability)}
                </p>
                <p className="text-muted-foreground">
                  {dataAvailability.totalMonths} total months
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};

export default TimePeriodFilter; 