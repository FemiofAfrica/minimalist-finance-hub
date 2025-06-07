import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fetchAccounts, createAccount } from "@/services/accountService";
import { Account } from "@/types/account";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BankSelector } from "@/components/BankSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountStore } from "@/stores/accountStore";

export const DefaultAccountSetup = () => {
  // This component is now disabled since account creation is handled in the main Onboarding.tsx flow
  // Keeping the component for backward compatibility but it will never show
  return null;
}; 