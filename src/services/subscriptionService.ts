import { supabase } from "@/integrations/supabase/client";
import { Subscription, SubscriptionProvider, SubscriptionFrequency } from "@/types/subscription";

// Fetch all subscriptions for the current user
export const fetchSubscriptions = async (): Promise<Subscription[]> => {
  try {
    console.log("Fetching subscriptions...");
    
    // Step 1: Fetch all subscriptions
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('next_billing_date', { ascending: true });

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      throw subscriptionsError;
    }

    console.log("Subscriptions data from Supabase:", subscriptionsData);

    if (!subscriptionsData || subscriptionsData.length === 0) {
      console.log("No subscriptions found in database");
      return [];
    }

    // Step 2: Extract all category IDs and fetch categories in a separate query
    const categoryIds = subscriptionsData
      .map(subscription => subscription.category_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let categoriesMap = new Map();
    
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('category_id', categoryIds);
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else if (categoriesData) {
        console.log("Categories data for subscriptions:", categoriesData);
        // Create a map of category_id to category object for faster lookups
        categoriesData.forEach(category => {
          categoriesMap.set(category.category_id, category);
        });
      }
    }

    // Step 3: Extract all provider IDs and fetch providers in a separate query
    const providerIds = subscriptionsData
      .map(subscription => subscription.provider_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let providersMap = new Map();
    
    if (providerIds.length > 0) {
      const { data: providersData, error: providersError } = await supabase
        .from('subscription_providers')
        .select('*')
        .in('provider_id', providerIds);
      
      if (providersError) {
        console.error('Error fetching subscription providers:', providersError);
      } else if (providersData) {
        console.log("Providers data for subscriptions:", providersData);
        // Create a map of provider_id to provider object for faster lookups
        providersData.forEach(provider => {
          providersMap.set(provider.provider_id, provider);
        });
      }
    }

    // Step 4: Combine subscription data with category and provider data
    const enrichedSubscriptions = subscriptionsData.map(subscription => {
      const category = subscription.category_id ? categoriesMap.get(subscription.category_id) : null;
      const provider = subscription.provider_id ? providersMap.get(subscription.provider_id) : null;
      
      return {
        ...subscription,
        category_name: category ? category.category_name : (subscription.category_name || 'Uncategorized'),
        category_type: category ? category.category_type : (subscription.category_type || 'EXPENSE'),
        provider_name: provider ? provider.name : null,
        logo_url: provider ? provider.logo_url : null
      } as Subscription & { provider_name?: string | null }; // Extended type to include provider_name
    });
    
    console.log("Processed subscriptions:", enrichedSubscriptions);
    return enrichedSubscriptions;
  } catch (error) {
    console.error("Error in fetchSubscriptions:", error);
    throw error;
  }
};

// Create a new subscription
export const createSubscription = async (subscription: Omit<Subscription, 'subscription_id' | 'created_at' | 'updated_at'>): Promise<Subscription> => {
  try {
    console.log("Creating subscription:", subscription);
    
    // Get the current user's ID from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Add the user_id to the subscription object
    const subscriptionWithUserId = {
      ...subscription,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscriptionWithUserId])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
    
    console.log("Created subscription:", data);
    return {
      ...data,
      frequency: data.frequency as SubscriptionFrequency
    };
  } catch (error) {
    console.error("Error in createSubscription:", error);
    throw error;
  }
};

// Update an existing subscription
export const updateSubscription = async (subscription: Partial<Subscription> & { subscription_id: string }): Promise<Subscription> => {
  try {
    console.log("Updating subscription:", subscription);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscription)
      .eq('subscription_id', subscription.subscription_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
    
    console.log("Updated subscription:", data);
    return {
      ...data,
      frequency: data.frequency as SubscriptionFrequency
    };
  } catch (error) {
    console.error("Error in updateSubscription:", error);
    throw error;
  }
};

// Delete a subscription
export const deleteSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    console.log("Deleting subscription:", subscriptionId);
    
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscription_id', subscriptionId);
    
    if (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
    
    console.log("Deleted subscription:", subscriptionId);
  } catch (error) {
    console.error("Error in deleteSubscription:", error);
    throw error;
  }
};

// Fetch all subscription providers
export const fetchSubscriptionProviders = async (): Promise<SubscriptionProvider[]> => {
  try {
    console.log("Fetching subscription providers...");
    
    const { data, error } = await supabase
      .from('subscription_providers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching subscription providers:', error);
      throw error;
    }
    
    console.log("Subscription providers:", data);
    return data || [];
  } catch (error) {
    console.error("Error in fetchSubscriptionProviders:", error);
    throw error;
  }
};

// Create a new subscription provider
export const createSubscriptionProvider = async (provider: Omit<SubscriptionProvider, 'provider_id' | 'created_at'>): Promise<SubscriptionProvider> => {
  try {
    console.log("Creating subscription provider:", provider);
    
    const { data, error } = await supabase
      .from('subscription_providers')
      .insert([provider])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating subscription provider:', error);
      throw error;
    }
    
    console.log("Created subscription provider:", data);
    return data;
  } catch (error) {
    console.error("Error in createSubscriptionProvider:", error);
    throw error;
  }
};

// Convert a subscription to a transaction when payment is confirmed
export const convertSubscriptionToTransaction = async (subscriptionId: string): Promise<void> => {
  try {
    console.log("Converting subscription to transaction:", subscriptionId);
    
    // First, get the subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (subscriptionError) {
      console.error('Error fetching subscription for conversion:', subscriptionError);
      throw subscriptionError;
    }
    
    if (!subscription) {
      throw new Error(`Subscription with ID ${subscriptionId} not found`);
    }
    
    // Create a transaction from the subscription
    const transaction = {
      description: `${subscription.name} Subscription`,
      amount: subscription.amount,
      category_id: subscription.category_id,
      category_name: subscription.category_name,
      category_type: subscription.category_type || 'EXPENSE',
      date: new Date().toISOString().split('T')[0], // Today's date
      user_id: subscription.user_id,
      source: 'subscription'
    };
    
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([transaction]);
    
    if (transactionError) {
      console.error('Error creating transaction from subscription:', transactionError);
      throw transactionError;
    }
    
    // Update the subscription's next billing date based on frequency
    const nextBillingDate = calculateNextBillingDate(subscription.next_billing_date, subscription.frequency as SubscriptionFrequency);
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ next_billing_date: nextBillingDate })
      .eq('subscription_id', subscriptionId);
    
    if (updateError) {
      console.error('Error updating subscription next billing date:', updateError);
      throw updateError;
    }
    
    console.log("Successfully converted subscription to transaction and updated next billing date");
  } catch (error) {
    console.error("Error in convertSubscriptionToTransaction:", error);
    throw error;
  }
};

// Helper function to calculate the next billing date based on frequency
const calculateNextBillingDate = (currentDate: string, frequency: SubscriptionFrequency): string => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'ANNUALLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'CUSTOM':
      // For custom frequency, default to monthly
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString().split('T')[0];
};

// Get upcoming subscriptions for reminders
export const getUpcomingSubscriptions = async (daysAhead: number): Promise<Subscription[]> => {
  try {
    console.log(`Fetching subscriptions due in the next ${daysAhead} days...`);
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .gte('next_billing_date', todayStr)
      .lte('next_billing_date', futureDateStr)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching upcoming subscriptions:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} upcoming subscriptions`);
    return (data || []).map(subscription => ({
      ...subscription,
      frequency: subscription.frequency as SubscriptionFrequency
    }));
  } catch (error) {
    console.error("Error in getUpcomingSubscriptions:", error);
    throw error;
  }
};