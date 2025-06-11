import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

// List of Nigerian banks (sorted alphabetically by name)
export const nigerianBanks = [
  { id: "access", name: "Access Bank" },
  { id: "citibank", name: "Citibank Nigeria" },
  { id: "ecobank", name: "Ecobank Nigeria" },
  { id: "fidelity", name: "Fidelity Bank" },
  { id: "firstbank", name: "First Bank of Nigeria" },
  { id: "fcmb", name: "First City Monument Bank" },
  { id: "globus", name: "Globus Bank" },
  { id: "gtbank", name: "Guaranty Trust Bank" },
  { id: "heritage", name: "Heritage Bank" },
  { id: "jaiz", name: "Jaiz Bank" },
  { id: "keystone", name: "Keystone Bank" },
  { id: "kuda", name: "Kuda Bank" },
  { id: "moniepoint", name: "Moniepoint" },
  { id: "opay", name: "OPay" },
  { id: "optimus", name: "Optimus Bank" },
  { id: "other", name: "Other" },
  { id: "palmpay", name: "PalmPay" },
  { id: "polaris", name: "Polaris Bank" },
  { id: "premium", name: "Premium Trust Bank" },
  { id: "providus", name: "Providus Bank" },
  { id: "stanbic", name: "Stanbic IBTC Bank" },
  { id: "standard", name: "Standard Chartered Bank" },
  { id: "sterling", name: "Sterling Bank" },
  { id: "suntrust", name: "SunTrust Bank" },
  { id: "taj", name: "TAJ Bank" },
  { id: "titan", name: "Titan Trust Bank" },
  { id: "uba", name: "United Bank for Africa" },
  { id: "unity", name: "Unity Bank" },
  { id: "wema", name: "Wema Bank" },
  { id: "zenith", name: "Zenith Bank" },
];

// Helper function to get bank name from id
export const getBankNameById = (id: string): string => {
  const bank = nigerianBanks.find(bank => bank.id === id);
  return bank ? bank.name : id;
};

interface BankSelectorProps {
  value: string;
  onChange: (value: string, displayName?: string) => void;
  placeholder?: string;
}

export function BankSelector({ value, onChange, placeholder = "Select bank..." }: BankSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | undefined>(value);

  useEffect(() => {
    setSelectedBank(value);
  }, [value]);

  const handleSelect = (currentValue: string) => {
    setSelectedBank(currentValue);
    const bank = nigerianBanks.find(bank => bank.id === currentValue);
    onChange(currentValue, bank?.name);
    setOpen(false);
  };

  const displayValue = selectedBank 
    ? nigerianBanks.find((bank) => bank.id === selectedBank)?.name 
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search bank..." />
          <CommandList>
            <CommandEmpty>No bank found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {nigerianBanks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.id}
                  onSelect={() => handleSelect(bank.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedBank === bank.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {bank.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}