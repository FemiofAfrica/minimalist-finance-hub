import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/category";

// Get current user ID from auth
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Failed to get user session:', error);
    return null;
  }
};

/**
 * Fetches all categories for the current user
 * @returns Promise<Category[]> Array of user categories
 */
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCategories:', error);
    return [];
  }
};

/**
 * Creates a new category for the current user
 * @param category The category data to create
 * @returns Promise<Category> The created category
 */
export const createCategory = async (category: Omit<Category, 'category_id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> => {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          ...category,
          user_id: userId,
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createCategory:', error);
    throw error;
  }
};

/**
 * Fetches all categories of a specific type for the current user
 * @param type The category type to filter by ('income', 'expense', or 'transfer')
 * @returns Promise<Category[]> Array of filtered user categories
 */
export const fetchCategoriesByType = async (type: 'income' | 'expense' | 'transfer'): Promise<Category[]> => {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('name');
    
    if (error) {
      console.error(`Error fetching ${type} categories:`, error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in fetchCategoriesByType for ${type}:`, error);
    return [];
  }
}; 