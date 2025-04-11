import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/contexts/CurrencyContext";

const supportedCurrencies = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export function CurrencySelector() {
  try {
    const currencyContext = useCurrency();
    const currentCurrency = currencyContext?.currency || { code: "USD", symbol: "$", name: "US Dollar" };
    const setCurrentCurrency = currencyContext?.setCurrency;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[130px]">
            {currentCurrency?.symbol} {currentCurrency?.code}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedCurrencies.map((currency) => (
            <DropdownMenuItem
              key={currency.code}
              onClick={() => setCurrentCurrency && setCurrentCurrency(currency)}
            >
              {currency.symbol} {currency.code} - {currency.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } catch (error) {
    console.error("Error in CurrencySelector:", error);
    return <div>Currency Selector Unavailable</div>; // Fallback
  }
}