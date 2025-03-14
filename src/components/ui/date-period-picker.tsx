"use client"

import * as React from "react"
import { format, subDays, subWeeks, subMonths, startOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchAvailableTransactionDates } from "@/services/dateService"

export type DatePeriod = "7days" | "2weeks" | "month" | "custom"

export interface DatePeriodPickerProps {
  className?: string
  onChange?: (date: DateRange | undefined) => void
  id?: string
}

export function DatePeriodPicker({
  className,
  onChange,
  id,
}: DatePeriodPickerProps) {
  // Get current date
  const today = new Date()
  
  // State for selected period
  const [selectedPeriod, setSelectedPeriod] = React.useState<DatePeriod>("7days")
  
  // State for custom date range
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>({
    from: subDays(today, 7),
    to: today,
  })
  
  // State for popover open/close
  const [open, setOpen] = React.useState(false)
  
  // State for available transaction dates
  const [availableDates, setAvailableDates] = React.useState<Date[]>([])
  const [loading, setLoading] = React.useState(false)

  // Calculate date range based on selected period
  const getDateRangeForPeriod = React.useCallback((period: DatePeriod): DateRange => {
    const today = new Date()
    
    switch (period) {
      case "7days":
        return {
          from: subDays(today, 7),
          to: today,
        }
      case "2weeks":
        return {
          from: subWeeks(today, 2),
          to: today,
        }
      case "month":
        return {
          from: startOfMonth(today),
          to: today,
        }
      case "custom":
        return customDateRange || {
          from: subDays(today, 7),
          to: today,
        }
    }
  }, [customDateRange])

  // Fetch available transaction dates when component mounts
  React.useEffect(() => {
    const fetchDates = async () => {
      try {
        setLoading(true)
        const dates = await fetchAvailableTransactionDates()
        setAvailableDates(dates)
      } catch (error) {
        console.error('Error fetching available dates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDates()
  }, [])

  // Update date range when period changes
  React.useEffect(() => {
    const dateRange = getDateRangeForPeriod(selectedPeriod)
    console.log("DatePeriodPicker: Updating date range:", dateRange)
    if (onChange) {
      onChange(dateRange)
    }
  }, [selectedPeriod, customDateRange, getDateRangeForPeriod, onChange])

  // Custom onSelect handler for custom date range
  const handleSelect = (selectedDate: DateRange | undefined) => {
    console.log("DatePeriodPicker: Custom date selected:", selectedDate)
    setCustomDateRange(selectedDate)
    
    // Only close the popover when both from and to dates are selected
    if (selectedDate?.from && selectedDate?.to) {
      // Trigger onChange immediately with the new date range
      if (onChange && selectedPeriod === "custom") {
        onChange(selectedDate)
      }
      // Add a small delay to allow the UI to update before closing
      setTimeout(() => setOpen(false), 300)
    }
  }
  
  // Function to determine if a date has transaction data
  const hasTransactionData = React.useCallback((date: Date) => {
    return availableDates.some(availableDate => 
      availableDate.getFullYear() === date.getFullYear() &&
      availableDate.getMonth() === date.getMonth() &&
      availableDate.getDate() === date.getDate()
    )
  }, [availableDates])

  // Get the current date range based on selected period
  const currentDateRange = getDateRangeForPeriod(selectedPeriod)

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2">
        <Select
          value={selectedPeriod}
          onValueChange={(value: DatePeriod) => {
            console.log("DatePeriodPicker: Period changed to:", value)
            setSelectedPeriod(value)
          }}
        >
          <SelectTrigger id={id || "date-period"} className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="2weeks">Last 2 weeks</SelectItem>
            <SelectItem value="month">Last month</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        {selectedPeriod === "custom" && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[220px] justify-start text-left font-normal",
                  !customDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange?.from ? (
                  customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "LLL dd, y")} -{" "}
                      {format(customDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(customDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {loading ? (
                <div className="p-4 text-center">Loading available dates...</div>
              ) : (
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={handleSelect}
                  numberOfMonths={2}
                  modifiers={{
                    highlighted: availableDates
                  }}
                  modifiersClassNames={{
                    highlighted: "bg-primary/20 text-primary-foreground font-medium"
                  }}
                />
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Display selected date range */}
      {currentDateRange?.from && currentDateRange?.to && selectedPeriod !== "custom" && (
        <div className="text-sm text-muted-foreground">
          {format(currentDateRange.from, "LLL dd, y")} - {format(currentDateRange.to, "LLL dd, y")}
        </div>
      )}
    </div>
  )
}