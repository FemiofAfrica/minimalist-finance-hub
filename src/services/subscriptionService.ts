import { supabase } from "@/integrations/supabase/client";

export const getSubscriptions = async () => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return subscriptions || [];
  } catch (error) {
    console.error("Unexpected error fetching subscriptions:", error);
    return [];
  }
};
