import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FinanceEvents } from "@/integrations/mixpanel/events";

const supportedCurrencies = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export function CurrencySelector() {
  const { currentCurrency, setCurrentCurrency } = useCurrency();
  const isMobile = useIsMobile();

  const handleCurrencyChange = (currency: typeof currentCurrency) => {
    setCurrentCurrency(currency);
    
    // Track currency selection event
    FinanceEvents.trackLiveCurrency({
      currencies: [currency.code],
      baseCurrency: currency.code,
      viewType: 'selector'
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "min-w-0",
            isMobile ? "w-[70px] text-sm px-2" : "w-[130px]"
          )}
        >
          {currentCurrency.symbol} {!isMobile && currentCurrency.code}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {supportedCurrencies.map((currency) => (
          <DropdownMenuItem
            key={currency.code}
            onClick={() => handleCurrencyChange(currency)}
          >
            {currency.symbol} {currency.code} - {currency.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}