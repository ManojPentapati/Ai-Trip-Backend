// Database operations for user management

import { supabase } from './supabaseClient.backend.js';

/**
 * Instructions for creating the necessary tables for user authentication
 */
export const initializeDatabase = () => {
  console.log('Please create the required tables manually in your Supabase dashboard with the following structures:');
  console.log(`
    -- Profiles table
    CREATE TABLE profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      email VARCHAR(255),
      first_name TEXT,
      last_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (id)
    );
    
    -- Trips table
    CREATE TABLE trips (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      destination TEXT NOT NULL,
      duration TEXT NOT NULL,
      budget TEXT NOT NULL,
      companions TEXT NOT NULL,
      trip_plan TEXT NOT NULL,
      is_favorite BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on both tables
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for profiles
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
      
    CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
      
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
    
    -- Create policies for trips
    CREATE POLICY "Users can view own trips" ON trips
      FOR SELECT USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can insert own trips" ON trips
      FOR INSERT WITH CHECK (auth.uid() = user_id);
      
    CREATE POLICY "Users can update own trips" ON trips
      FOR UPDATE USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can delete own trips" ON trips
      FOR DELETE USING (auth.uid() = user_id);
  `);
};

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