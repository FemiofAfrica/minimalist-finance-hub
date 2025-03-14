"use client"

import * as React from "react"
import { format } from "date-fns"
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
import { fetchAvailableTransactionDates } from "@/services/dateService"

export function DateRangePicker({
  className,
  onChange,
  id,
}: {
  className?: string
  onChange?: (date: DateRange | undefined) => void
  id?: string
}) {
  // Get current date for default range
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: firstDayOfMonth,
    to: lastDayOfMonth,
  })
  
  // State for available transaction dates
  const [availableDates, setAvailableDates] = React.useState<Date[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch available transaction dates when component mounts
  React.useEffect(() => {
    const fetchDates = async () => {
      try {
        setLoading(true);
        const dates = await fetchAvailableTransactionDates();
        setAvailableDates(dates);
      } catch (error) {
        console.error('Error fetching available dates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDates();
  }, []);

  React.useEffect(() => {
    if (onChange) {
      onChange(date)
    }
  }, [date, onChange])

  const [open, setOpen] = React.useState(false)

  // Custom onSelect handler to prevent auto-closing when only start date is selected
  const handleSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate)
    
    // Only close the popover when both from and to dates are selected
    if (selectedDate?.from && selectedDate?.to) {
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
    );
  }, [availableDates]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id || "date"}
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
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
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={2}
              modifiers={{
                highlighted: availableDates
              }}
              modifiersClassNames={{
                highlighted: "bg-primary/20 text-primary-foreground font-medium"
              }}
              // Remove the disabled property that was preventing date selection
              // This allows users to select any date, while still highlighting dates with transactions
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}