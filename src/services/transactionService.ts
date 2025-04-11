import { supabase } from "@/integrations/supabase/client";

export const getTransactions = async () => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*');

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return transactions || [];
  } catch (error) {
    console.error("Unexpected error fetching transactions:", error);
    return [];
  }
};
