import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FinanceEvents } from "@/integrations/mixpanel/events";
import { Check, ChevronsUpDown } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  const handleCurrencyChange = (currency: typeof currentCurrency) => {
    setCurrentCurrency(currency);
    setOpen(false);
    
    // Track currency selection event
    FinanceEvents.trackLiveCurrency({
      currencies: [currency.code],
      baseCurrency: currency.code,
      viewType: 'selector'
    });
  };

  const africanCurrencyCodes = ['NGN', 'ZAR', 'GHS', 'KES', 'EGP', 'MAD', 'TND', 'UGX', 'TZS', 'ETB', 'XOF', 'XAF', 'BWP', 'ZMW', 'AOA', 'MZN', 'RWF', 'MWK', 'SZL', 'LSL', 'NAD'];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between min-w-0",
            isMobile ? "w-[70px] text-sm px-2" : "w-[130px]"
          )}
        >
          <span className="truncate">
            {currentCurrency.symbol} {!isMobile && currentCurrency.code}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search currencies..." className="h-9" />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup heading="African Currencies">
              {supportedCurrencies
                .filter(currency => africanCurrencyCodes.includes(currency.code))
                .map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={`${currency.code} ${currency.name} ${currency.symbol}`}
                    onSelect={() => handleCurrencyChange(currency)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <span className="font-mono text-sm mr-2">{currency.symbol}</span>
                        <span className="text-sm">{currency.code} - {currency.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          currentCurrency.code === currency.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandGroup heading="International Currencies">
              {supportedCurrencies
                .filter(currency => !africanCurrencyCodes.includes(currency.code))
                .map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={`${currency.code} ${currency.name} ${currency.symbol}`}
                    onSelect={() => handleCurrencyChange(currency)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <span className="font-mono text-sm mr-2">{currency.symbol}</span>
                        <span className="text-sm">{currency.code} - {currency.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          currentCurrency.code === currency.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 