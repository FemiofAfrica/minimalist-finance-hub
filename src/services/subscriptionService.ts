/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { supabase } from "@/integrations/supabase/client";
import { Subscription, SubscriptionProvider, SubscriptionFrequency, mapDBFrequencyToAppFrequency, mapAppFrequencyToDBFrequency } from "@/types/subscription";
import { createTransaction } from "./transactionService"; // Import createTransaction

// Type assertion for Supabase client to handle missing tables in type definitions
const typedSupabase = supabase as any;

// Helper to map database row to Subscription type
function mapToSubscription(dbData: any): Subscription {
  return {
    subscription_id: dbData.subscription_id,
    name: dbData.name,
    description: dbData.description,
    amount: dbData.amount,
    frequency: mapDBFrequencyToAppFrequency(dbData.frequency),
    next_billing_date: dbData.next_billing_date,
    category_id: dbData.category_id,
    category_name: dbData.category_name,
    category_type: dbData.category_type,
    is_active: dbData.is_active,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at,
    user_id: dbData.user_id,
    auto_renew: dbData.auto_renew,
    reminder_days: dbData.reminder_days,
    provider_id: dbData.provider_id
  };
}

// Helper to map database row to SubscriptionProvider type
function mapToSubscriptionProvider(dbData: any): SubscriptionProvider {
  return {
    provider_id: dbData.provider_id,
    name: dbData.name,
    category_id: dbData.category_id,
    category_name: dbData.category_name,
    logo_url: dbData.logo_url,
    website: dbData.website,
    is_popular: dbData.is_popular ?? false,
    created_at: dbData.created_at,
    created_by_user_id: dbData.created_by_user_id
  };
}

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
      .map((subscription) => subscription.category_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const categoriesMap = new Map();
    
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
        categoriesData.forEach((category) => {
          categoriesMap.set(category.category_id, category);
        });
      }
    }

    // Step 3: Extract all provider IDs and fetch providers in a separate query
    const providerIds = subscriptionsData
      .map((subscription) => subscription.provider_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const providersMap = new Map();
    
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
        providersData.forEach((provider) => {
          providersMap.set(provider.provider_id, provider);
        });
      }
    }

    // Step 4: Combine subscription data with category and provider data
    const enrichedSubscriptions = subscriptionsData.map((subscription) => {
      const category = subscription.category_id ? categoriesMap.get(subscription.category_id) : null;
      const provider = subscription.provider_id ? providersMap.get(subscription.provider_id) : null;
      
      const enriched = mapToSubscription({
        ...subscription,
        category_name: category ? category.name : (subscription.category_name || 'Uncategorized'),
        category_type: category ? category.type?.toUpperCase() : (subscription.category_type || 'EXPENSE'),
        provider_name: provider ? provider.name : null,
        logo_url: provider ? provider.logo_url : null
      });
      
      return enriched;
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
    
    // Add the user_id to the subscription object and map frequency to DB format
    const mappedFrequency = mapAppFrequencyToDBFrequency(subscription.frequency);
    console.log("Original frequency (app type):", subscription.frequency);
    console.log("Mapped frequency for DB (DB type):", mappedFrequency);
    console.log("Attempting to debug subscription_frequency_check constraint");

    // Check that the mapped frequency is one of the accepted DB enum values
    const validDBFrequencies = ['MONTHLY', 'QUARTERLY', 'WEEKLY', 'ANNUALLY']; // Try uppercase values
    // Note: 'CUSTOM' from app maps to 'MONTHLY' for DB via mapAppFrequencyToDBFrequency

    if (!validDBFrequencies.includes(mappedFrequency)) {
      // This error should ideally not be hit if mapAppFrequencyToDBFrequency is comprehensive
      // and SubscriptionFrequency type is strictly enforced on input.
      console.error(`Invalid mapped frequency for DB: ${mappedFrequency}. Must be one of: ${validDBFrequencies.join(', ')}`);
      throw new Error(`Invalid mapped frequency for DB: ${mappedFrequency}. Must be one of: ${validDBFrequencies.join(', ')}`);
    }

    const subscriptionWithUserId = {
      ...subscription,
      user_id: user.id,
      frequency: mappedFrequency // Use the correctly cased frequency from mapAppFrequencyToDBFrequency
    };

    // Check if we need to find or create a category
    let categoryId = subscriptionWithUserId.category_id;
    const categoryName = subscriptionWithUserId.category_name || 'Subscriptions';
    const categoryType = (subscriptionWithUserId.category_type?.toLowerCase() === 'income' ? 'income' : 'expense');
    
    if (!categoryId && categoryName) {
      console.log(`No category ID provided but name "${categoryName}" exists, finding or creating category...`);
      
      // Try to find existing category by name and type
      const { data: existingCategory, error: findCategoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('user_id', user.id)
        .eq('name', categoryName)
        .eq('type', categoryType)
        .maybeSingle();
      
      if (findCategoryError) {
        console.error('Error finding category:', findCategoryError);
      }
      
      if (existingCategory && existingCategory.category_id) {
        // Use existing category
        categoryId = existingCategory.category_id;
        console.log(`Using existing category: ${categoryId}`);
      } else {
        // Create a new category
        const { data: newCategory, error: createCategoryError } = await supabase
          .from('categories')
          .insert({
            name: categoryName,
            type: categoryType,
            user_id: user.id
          })
          .select('category_id')
          .single();
        
        if (createCategoryError) {
          console.error('Error creating category:', createCategoryError);
        } else if (newCategory) {
          categoryId = newCategory.category_id;
          console.log(`Created new category: ${categoryId}`);
        }
      }
    }

    // Update the subscription with the found/created category ID
    subscriptionWithUserId.category_id = categoryId;

    // Remove any fields that might be causing problems
    const { category_name, category_type, ...dbSubscription } = subscriptionWithUserId;

    // Debug the final data being sent to the database
    console.log("Final subscription data for DB:", JSON.stringify(dbSubscription, null, 2));
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([dbSubscription])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
    
    console.log("Created subscription:", data);

    // --- BEGIN: Auto-create initial transaction ---
    // Run this asynchronously in the background
    (async () => {
      try {
        const userId = user.id;
        // 1. First try to fetch the account named 'Default Account'
        let accountToUse = null;
        const { data: defaultAccount, error: defaultAccountError } = await supabase
          .from('accounts')
          .select('account_id, currency, name')
          .eq('user_id', userId)
          .eq('name', 'Default Account')
          .limit(1)
          .maybeSingle();

        if (defaultAccountError) {
          console.error("Error fetching default account:", defaultAccountError);
        }

        if (defaultAccount && defaultAccount.account_id) {
          console.log(`Found default account "${defaultAccount.name}" (${defaultAccount.account_id}) for auto-creating transaction.`);
          accountToUse = defaultAccount;
        } else {
          // Fallback: Try to get any available account
          console.log("No 'Default Account' found, looking for any available account...");
          const { data: anyAccount, error: anyAccountError } = await supabase
            .from('accounts')
            .select('account_id, currency, name')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (anyAccountError) {
            console.error("Error fetching any account:", anyAccountError);
            return;
          }

          if (anyAccount && anyAccount.account_id) {
            console.log(`Using fallback account "${anyAccount.name}" (${anyAccount.account_id}) for auto-creating transaction.`);
            accountToUse = anyAccount;
          }
        }

        if (accountToUse && accountToUse.account_id) {
          // Check if the billing date is in the future
          const billingDate = new Date(data.next_billing_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
          billingDate.setHours(0, 0, 0, 0);
          
          if (billingDate > today) {
            console.log(`Billing date ${data.next_billing_date} is in the future. Skipping auto-creation of transaction.`);
            console.log("Future transactions require explicit user confirmation.");
            return; // Don't create transaction for future dates
          }
          
          // 2. Prepare transaction data (only for past/current dates)
          const transactionInput = {
            user_id: userId,
            account_id: accountToUse.account_id,
            amount: data.amount, // Amount from the subscription
            currency: accountToUse.currency || 'NGN', // Use account currency or default
            type: (data.category_type?.toLowerCase() === 'income' ? 'income' : 'expense') as 'income' | 'expense', // Explicitly type as TransactionType
            date: data.next_billing_date, // Use the subscription's billing date as the transaction date
            description: data.name, // Use subscription name as description
            category_id: data.category_id,
            notes: `Automatically created for subscription on ${data.next_billing_date}.`,
            subscription_id: data.subscription_id // Link it immediately
          };

          // 3. Create the transaction
          console.log("Attempting to auto-create transaction for past/current date:", transactionInput);
          await createTransaction(transactionInput); // Call the imported function
          console.log("Successfully auto-created initial transaction.");

        } else {
          console.log("No accounts found for this user, skipping auto-creation of initial transaction.");
        }
      } catch (autoCreateError) {
        console.error("Error during auto-creation of initial transaction:", autoCreateError);
      }
    })();
    // --- END: Auto-create initial transaction ---

    // --- BEGIN: Link existing transactions ---
    // Run this asynchronously in the background, don't block the response
    (async () => {
      try {
        const newSubscriptionId = data.subscription_id;
        const subscriptionName = data.name;
        const userId = user.id; // Already fetched earlier

        if (!newSubscriptionId || !subscriptionName || !userId) {
          console.error("Missing data needed for transaction linking.", { newSubscriptionId, subscriptionName, userId });
          return; // Exit if essential data is missing
        }

        console.log(`Starting background transaction linking for subscription: ${subscriptionName} (ID: ${newSubscriptionId})`);

        // 1. Define keywords (simple split, lowercase, ignore short words)
        const keywords = subscriptionName
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 2); // Ignore words with 2 or fewer characters
        
        if (keywords.length === 0) {
          console.log("No suitable keywords found for linking, skipping.");
          return;
        }
        console.log("Linking keywords:", keywords);

        // 2. Fetch unlinked transactions for the user
        const { data: transactions, error: fetchError } = await supabase
          .from('transactions')
          .select('transaction_id, description')
          .eq('user_id', userId)
          .is('subscription_id', null);

        if (fetchError) {
          console.error('Error fetching transactions for linking:', fetchError);
          return; // Exit if fetching fails
        }

        if (!transactions || transactions.length === 0) {
          console.log("No unlinked transactions found for user.");
          return;
        }

        console.log(`Found ${transactions.length} unlinked transactions to check.`);
        
        // 3. Loop and update matching transactions
        let linkedCount = 0;
        const updates: Promise<any>[] = [];

        for (const transaction of transactions) {
          if (transaction.description) {
            const lowerDescription = transaction.description.toLowerCase();
            // Check if description contains ALL keywords
            const isMatch = keywords.every(keyword => lowerDescription.includes(keyword));

            if (isMatch) {
              console.log(`Found match: Transaction ID ${transaction.transaction_id} matches keywords.`);
              linkedCount++;
              // Add update promise to the list
              const updateOperation = supabase
                .from('transactions')
                .update({ 
                  subscription_id: newSubscriptionId,
                  amount: data.amount // Update amount to match subscription
                })
                .eq('transaction_id', transaction.transaction_id);
              
              updates.push(
                Promise.resolve(updateOperation.then(result => { // Ensure result is a full Promise
                  if (result.error) {
                    console.error(`Error updating transaction ${transaction.transaction_id}:`, result.error);
                  }
                  return result; // This will be the resolved value of the promise in allSettled
                }))
              );
            }
          }
        }

        // 4. Execute all updates in parallel
        if (updates.length > 0) {
          console.log(`Attempting to link ${linkedCount} transactions...`);
          await Promise.allSettled(updates);
          console.log(`Finished linking attempts for ${linkedCount} transactions.`);
        } else {
            console.log("No matching transactions found to link.");
        }

      } catch (linkError) {
        // Log errors but don't throw to avoid breaking the main function flow
        console.error('Error during background transaction linking:', linkError);
      }
    })();
    // --- END: Link existing transactions ---

    return mapToSubscription(data);
  } catch (error) {
    console.error("Error in createSubscription:", error);
    throw error;
  }
};

// Update an existing subscription
export const updateSubscription = async (subscription: Partial<Subscription> & { subscription_id: string }): Promise<Subscription> => {
  try {
    console.log("Updating subscription:", subscription);
    
    // Only send necessary fields to update
    const updateData: any = {  // Added 'any' type here to allow dynamic property deletion
      is_active: subscription.is_active,
      amount: subscription.amount,
      frequency: subscription.frequency ? mapAppFrequencyToDBFrequency(subscription.frequency) : undefined,
      next_billing_date: subscription.next_billing_date,
      description: subscription.description,
      name: subscription.name,
      auto_renew: subscription.auto_renew,
      reminder_days: subscription.reminder_days,
      provider_id: subscription.provider_id,
      category_id: subscription.category_id
      // category_name and category_type should not be sent directly
      // as they are typically derived or handled via category_id
    };
    
    // Filter out undefined values to avoid overwriting with null
    // Also remove category_name and category_type as they are not direct columns
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Explicitly delete category_name and category_type if they somehow exist on subscription
    // though they are not defined in the initial updateData object above anymore.
    // This is a defensive measure.
    if ('category_name' in updateData) {
      delete updateData.category_name;
    }
    if ('category_type' in updateData) {
      delete updateData.category_type;
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('subscription_id', subscription.subscription_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
    
    console.log("Updated subscription:", data);
    return mapToSubscription(data);
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
    return (data || []).map(provider => mapToSubscriptionProvider(provider));
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
    return mapToSubscriptionProvider(data);
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
    
    // Get the user's default account to link the transaction to
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Fetch the default account or any active account
    const { data: defaultAccount, error: accountError } = await supabase
      .from('accounts')
      .select('account_id, currency')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();
    
    if (accountError) {
      console.error('Error fetching default account:', accountError);
      throw accountError;
    }
    
    // If no default account is found, try to get any active account
    let accountId;
    let accountCurrency = 'NGN';
    
    if (defaultAccount && defaultAccount.account_id) {
      accountId = defaultAccount.account_id;
      accountCurrency = defaultAccount.currency || 'NGN';
    } else {
      // Fallback to any account if no default is set
      const { data: anyAccount, error: anyAccountError } = await supabase
        .from('accounts')
        .select('account_id, currency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (anyAccountError) {
        console.error('Error fetching any account:', anyAccountError);
        throw anyAccountError;
      }
      
      if (!anyAccount || !anyAccount.account_id) {
        throw new Error('No active account found to link the transaction to');
      }
      
      accountId = anyAccount.account_id;
      accountCurrency = anyAccount.currency || 'NGN';
    }
    
    // Determine the category type
    const categoryType = (subscription.category_type?.toLowerCase() === 'income' ? 'income' : 'expense');
    
    // Ensure we have a valid category ID by checking if it exists
    let categoryId = subscription.category_id;
    const categoryName = subscription.category_name || 'Subscriptions';
    
    if (categoryId) {
      // Verify that the category exists
      const { data: categoryExists, error: categoryCheckError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_id', categoryId)
        .maybeSingle();
      
      if (categoryCheckError) {
        console.error('Error checking category existence:', categoryCheckError);
      }
      
      // If category doesn't exist, clear the ID so we'll create or find one
      if (!categoryExists) {
        console.log(`Category ID ${categoryId} does not exist, will create/find one`);
        categoryId = null;
      }
    }
    
    // If we don't have a valid category ID, find or create one
    if (!categoryId) {
      // Try to find existing category by name and type
      const { data: existingCategory, error: findCategoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('user_id', user.id)
        .eq('name', categoryName)
        .eq('type', categoryType)
        .maybeSingle();
      
      if (findCategoryError) {
        console.error('Error finding category:', findCategoryError);
      }
      
      if (existingCategory && existingCategory.category_id) {
        // Use existing category
        categoryId = existingCategory.category_id;
        console.log(`Using existing category: ${categoryId}`);
      } else {
        // Create a new category
        const { data: newCategory, error: createCategoryError } = await supabase
          .from('categories')
          .insert({
            name: categoryName,
            type: categoryType,
            user_id: user.id
          })
          .select('category_id')
          .single();
        
        if (createCategoryError) {
          console.error('Error creating category:', createCategoryError);
          throw createCategoryError;
        }
        
        categoryId = newCategory.category_id;
        console.log(`Created new category: ${categoryId}`);
      }
    }
    
    // Create a transaction from the subscription using the createTransaction function
    const transactionInput = {
      user_id: user.id,
      account_id: accountId,
      amount: subscription.amount,
      currency: accountCurrency,
      type: categoryType as 'income' | 'expense',
      date: new Date().toLocaleDateString('en-CA'), // Today's date
      description: `${subscription.name} Subscription Payment`,
      category_id: categoryId,
      notes: `Automatic payment for subscription: ${subscription.name}`,
      subscription_id: subscription.subscription_id // Link it to the subscription
    };
    
    console.log("Creating transaction with input:", transactionInput);
    
    // Use the createTransaction function instead of direct insert
    await createTransaction(transactionInput);
    
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
  
  return date.toLocaleDateString('en-CA');
};

// Get upcoming subscriptions for reminders
export const getUpcomingSubscriptions = async (daysAhead: number): Promise<Subscription[]> => {
  try {
    console.log(`Fetching subscriptions due in the next ${daysAhead} days...`);
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    
    const todayStr = today.toLocaleDateString('en-CA');
    const futureDateStr = futureDate.toLocaleDateString('en-CA');
    
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
    return (data || []).map(subscription => mapToSubscription(subscription));
  } catch (error) {
    console.error("Error in getUpcomingSubscriptions:", error);
    throw error;
  }
};