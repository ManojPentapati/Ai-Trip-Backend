// Frontend database operations using Supabase client
import { supabase } from './supabaseClient';

/**
 * Creates or updates a user profile in the database
 */
export const createUserProfile = async (userId, userData) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: userData.avatar_url || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: ['id', 'email'] }
    );

  if (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }

  return data;
};

/**
 * Updates a user profile in the database
 */
export const updateUserProfile = async (userId, userData) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...userData,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }

  return data;
};

/**
 * Gets a user profile from the database
 */
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }

  return data;
};
