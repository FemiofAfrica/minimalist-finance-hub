import { supabase } from "@/integrations/supabase/client";

export const getAccounts = async () => {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*');

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }

    return accounts || [];
  } catch (error) {
    console.error("Unexpected error fetching accounts:", error);
    return [];
  }
};
