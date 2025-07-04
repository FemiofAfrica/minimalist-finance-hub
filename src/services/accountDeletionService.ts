import { supabase } from '@/integrations/supabase/client';

export interface UserDataSummary {
  user_id: string;
  accounts: number;
  transactions: number;
  categories: number;
  cards: number;
  notifications: number;
  biometric_credentials: number;
  push_subscriptions: number;
  monthly_snapshots: number;
  email_preferences: number;
  total_records: number;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  email: string;
  reason?: string;
  requested_at: string;
  processed_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeletionRequestResponse {
  success: boolean;
  request_id?: string;
  message?: string;
  error?: string;
}

export interface DataTypeInfo {
  name: string;
  description: string;
  warning: string;
}

export interface AvailableDataTypes {
  [key: string]: DataTypeInfo;
}

export interface PartialDeletionRequest {
  id: string;
  user_id: string;
  email: string;
  data_types: string[];
  reason?: string;
  requested_at: string;
  processed_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deletion_summary?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartialDeletionResponse {
  success: boolean;
  request_id?: string;
  message?: string;
  error?: string;
  data_types?: string[];
}

export interface PartialDataSummary {
  user_id: string;
  data_types: { [key: string]: number };
  requested_types: string[];
}

/**
 * Request account deletion for the current user
 */
export const requestAccountDeletion = async (reason?: string): Promise<DeletionRequestResponse> => {
  try {
    const { data, error } = await supabase.rpc('request_account_deletion', {
      p_reason: reason || null
    });

    if (error) {
      console.error('Error requesting account deletion:', error);
      throw error;
    }

    return data as DeletionRequestResponse;
  } catch (error) {
    console.error('Error in requestAccountDeletion:', error);
    throw error;
  }
};

/**
 * Get user data summary before deletion
 */
export const getUserDataSummary = async (userId?: string): Promise<UserDataSummary> => {
  try {
    const { data, error } = await supabase.rpc('get_user_data_summary', {
      p_user_id: userId || null
    });

    if (error) {
      console.error('Error getting user data summary:', error);
      throw error;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as UserDataSummary;
  } catch (error) {
    console.error('Error in getUserDataSummary:', error);
    throw error;
  }
};

/**
 * Get account deletion requests for the current user
 */
export const getAccountDeletionRequests = async (): Promise<AccountDeletionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting account deletion requests:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAccountDeletionRequests:', error);
    throw error;
  }
};

/**
 * Delete user account (for super admins or the user themselves)
 */
export const deleteUserAccount = async (userId: string, adminUserId?: string): Promise<any> => {
  try {
    const { data, error } = await supabase.rpc('delete_user_account', {
      p_user_id: userId,
      p_admin_user_id: adminUserId || null
    });

    if (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in deleteUserAccount:', error);
    throw error;
  }
};

/**
 * Get data types that will be deleted (for display purposes)
 */
export const getDataTypesToDelete = (): string[] => {
  return [
    'Profile information (name, email)',
    'Financial accounts and balances',
    'Transaction history',
    'Custom categories',
    'Credit/debit cards',
    'Monthly financial snapshots',
    'Notification preferences',
    'Biometric authentication data',
    'Push notification subscriptions',
    'App usage notifications',
    'Settings and preferences'
  ];
};

/**
 * Get data retention information
 */
export const getDataRetentionInfo = (): {
  immediatelyDeleted: string[];
  anonymized: string[];
  retentionPeriod: string;
} => {
  return {
    immediatelyDeleted: [
      'Profile information',
      'Financial accounts and balances',
      'Transaction history',
      'Custom categories',
      'Credit/debit cards',
      'Monthly financial snapshots',
      'Notification preferences',
      'Biometric authentication data',
      'Push notification subscriptions',
      'App usage notifications'
    ],
    anonymized: [
      'Error logs (personal identifiers removed)'
    ],
    retentionPeriod: 'Most data is deleted immediately. Error logs are anonymized (personal identifiers removed) and may be retained for up to 1 year for technical debugging purposes.'
  };
};

/**
 * Get available data types for partial deletion
 */
export const getAvailableDataTypesForDeletion = async (): Promise<AvailableDataTypes> => {
  try {
    const { data, error } = await supabase.rpc('get_available_data_types_for_deletion');
    
    if (error) {
      console.error('Error getting available data types:', error);
      throw new Error('Failed to get available data types');
    }
    
    return data as AvailableDataTypes;
  } catch (error) {
    console.error('Error in getAvailableDataTypesForDeletion:', error);
    throw error;
  }
};

/**
 * Request partial deletion of specific data types
 */
export const requestPartialDeletion = async (
  dataTypes: string[],
  reason?: string
): Promise<PartialDeletionResponse> => {
  try {
    const { data, error } = await supabase.rpc('request_partial_deletion', {
      p_data_types: dataTypes,
      p_reason: reason || null,
    });
    
    if (error) {
      console.error('Error requesting partial deletion:', error);
      throw new Error('Failed to request partial deletion');
    }
    
    return data as PartialDeletionResponse;
  } catch (error) {
    console.error('Error in requestPartialDeletion:', error);
    throw error;
  }
};

/**
 * Get partial data summary for specific data types
 */
export const getPartialDataSummary = async (
  dataTypes: string[]
): Promise<PartialDataSummary> => {
  try {
    const { data, error } = await supabase.rpc('get_partial_data_summary', {
      p_data_types: dataTypes,
    });
    
    if (error) {
      console.error('Error getting partial data summary:', error);
      throw new Error('Failed to get partial data summary');
    }
    
    return data as PartialDataSummary;
  } catch (error) {
    console.error('Error in getPartialDataSummary:', error);
    throw error;
  }
};

/**
 * Get all partial deletion requests for current user
 */
export const getPartialDeletionRequests = async (): Promise<PartialDeletionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('partial_deletion_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting partial deletion requests:', error);
      throw new Error('Failed to get partial deletion requests');
    }
    
    return data as PartialDeletionRequest[];
  } catch (error) {
    console.error('Error in getPartialDeletionRequests:', error);
    throw error;
  }
};

/**
 * Cancel a pending partial deletion request
 */
export const cancelPartialDeletionRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('partial_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error cancelling partial deletion request:', error);
      throw new Error('Failed to cancel partial deletion request');
    }
    
    return true;
  } catch (error) {
    console.error('Error in cancelPartialDeletionRequest:', error);
    throw error;
  }
};

/**
 * Get available data types categorized by impact level
 */
export const getCategorizedDataTypes = async (): Promise<{
  low: AvailableDataTypes;
  medium: AvailableDataTypes;
  high: AvailableDataTypes;
}> => {
  const allDataTypes = await getAvailableDataTypesForDeletion();
  
  const lowImpact: AvailableDataTypes = {};
  const mediumImpact: AvailableDataTypes = {};
  const highImpact: AvailableDataTypes = {};
  
  // Categorize data types by impact level
  Object.entries(allDataTypes).forEach(([key, value]) => {
    if (['notifications', 'push_subscriptions', 'email_preferences'].includes(key)) {
      lowImpact[key] = value;
    } else if (['biometric_credentials', 'monthly_snapshots', 'categories'].includes(key)) {
      mediumImpact[key] = value;
    } else if (['transactions', 'accounts', 'cards'].includes(key)) {
      highImpact[key] = value;
    }
  });
  
  return { low: lowImpact, medium: mediumImpact, high: highImpact };
};

/**
 * Legacy function aliases for backward compatibility
 */
export const getDataTypes = getDataTypesToDelete;
export const getDataRetentionPolicy = getDataRetentionInfo;
export const getDeletionRequestStatus = getAccountDeletionRequests;

export const accountDeletionService = {
  // Full account deletion
  requestAccountDeletion,
  getUserDataSummary,
  getDataRetentionPolicy,
  getDataTypes,
  getDeletionRequestStatus,
  getAccountDeletionRequests,
  deleteUserAccount,
  
  // Partial deletion functions
  getAvailableDataTypesForDeletion,
  requestPartialDeletion,
  getPartialDataSummary,
  getPartialDeletionRequests,
  cancelPartialDeletionRequest,
  getCategorizedDataTypes,
}; 