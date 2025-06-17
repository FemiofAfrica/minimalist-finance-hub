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
  // African currencies (prioritized for African users)
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham" },
  { code: "TND", symbol: "د.ت", name: "Tunisian Dinar" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc" },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha" },
  { code: "SZL", symbol: "L", name: "Swazi Lilangeni" },
  { code: "LSL", symbol: "L", name: "Lesotho Loti" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar" },
  // International currencies
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