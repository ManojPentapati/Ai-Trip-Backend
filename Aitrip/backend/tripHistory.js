import { createClient } from '@supabase/supabase-js';

// Create clients
const supabaseUrl = 'https://pwwykhhgcelxbvybtetz.supabase.co';
const supabaseAnonKey = 'sb_publishable_gFaaxYFxpHzud75IjldMrA_kiRqptJn';

// Regular client for unauthenticated operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to create a client with user context
function createClientWithUserToken(userToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
}

// Save trip to history
export async function saveTripToHistory(userId, tripData, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .insert({
        user_id: userId,
        destination: tripData.destination,
        duration: tripData.duration,
        budget: tripData.budget,
        companions: tripData.companions,
        country: tripData.country,
        trip_plan: tripData.tripPlan,
        ml_prediction: tripData.mlPrediction || null,
        ml_recommendations: tripData.mlRecommendations ? JSON.stringify(tripData.mlRecommendations) : null,
      })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving trip to history:', error);
    return { success: false, error: error.message };
  }
}

// Get user's trip history
export async function getUserTripHistory(userId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching trip history:', error);
    return { success: false, error: error.message };
  }
}

// Delete a trip from history
export async function deleteTripFromHistory(userId, tripId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting trip:', error);
    return { success: false, error: error.message };
  }
}

// Get a specific trip by ID
export async function getTripById(userId, tripId, userToken, isPublic = false) {
  try {
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    let query = userClient.from('trips').select('*').eq('id', tripId);
    
    if (!isPublic && userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching trip:', error);
    return { success: false, error: error.message };
  }
}

// Add trip to favorites
export async function addTripToFavorites(userId, tripId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .update({ is_favorite: true })
      .eq('id', tripId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error adding trip to favorites:', error);
    return { success: false, error: error.message };
  }
}

// Remove trip from favorites
export async function removeTripFromFavorites(userId, tripId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .update({ is_favorite: false })
      .eq('id', tripId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error removing trip from favorites:', error);
    return { success: false, error: error.message };
  }
}

// Simple country mapping function
function getCountryFromDestination(destination) {
  // Simple mapping of common destinations to countries
  const countryMap = {
    // India
    'Mumbai': 'India',
    'Delhi': 'India',
    'Bangalore': 'India',
    'Chennai': 'India',
    'Kolkata': 'India',
    'Goa': 'India',
    'Jaipur': 'India',
    'Agra': 'India',
    'Kerala': 'India',
    'Himachal Pradesh': 'India',
    'India': 'India',
    
    // USA
    'New York': 'USA',
    'Los Angeles': 'USA',
    'Chicago': 'USA',
    'Miami': 'USA',
    'San Francisco': 'USA',
    'Las Vegas': 'USA',
    'Orlando': 'USA',
    'USA': 'USA',
    'United States': 'USA',
    
    // UK
    'London': 'UK',
    'Manchester': 'UK',
    'Edinburgh': 'UK',
    'Birmingham': 'UK',
    'UK': 'UK',
    'United Kingdom': 'UK',
    
    // France
    'Paris': 'France',
    'Nice': 'France',
    'Lyon': 'France',
    'Marseille': 'France',
    'France': 'France',
    
    // Italy
    'Rome': 'Italy',
    'Milan': 'Italy',
    'Venice': 'Italy',
    'Florence': 'Italy',
    'Italy': 'Italy',
    
    // Japan
    'Tokyo': 'Japan',
    'Osaka': 'Japan',
    'Kyoto': 'Japan',
    'Hiroshima': 'Japan',
    'Japan': 'Japan',
    
    // Other common countries
    'Thailand': 'Thailand',
    'Bangkok': 'Thailand',
    'Phuket': 'Thailand',
    'Australia': 'Australia',
    'Sydney': 'Australia',
    'Melbourne': 'Australia',
    'Canada': 'Canada',
    'Toronto': 'Canada',
    'Vancouver': 'Canada',
    'Germany': 'Germany',
    'Berlin': 'Germany',
    'Munich': 'Germany',
    'Spain': 'Spain',
    'Barcelona': 'Spain',
    'Madrid': 'Spain'
  };
  
  // Check for exact match first
  if (countryMap[destination]) {
    return countryMap[destination];
  }
  
  // Check for partial matches
  for (const [key, country] of Object.entries(countryMap)) {
    if (destination.toLowerCase().includes(key.toLowerCase())) {
      return country;
    }
  }
  
  // No match found - return null to indicate user input needed
  return null;
}

// Get dashboard statistics
export async function getDashboardStats(userId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    // Get all user's trips with country data
    const { data: trips, error: tripsError } = await userClient
      .from('trips')
      .select('destination, country')
      .eq('user_id', userId);

    if (tripsError) throw tripsError;
    
    // Calculate statistics
    const activeTrips = trips.length;
    
    // Extract unique destinations
    const uniqueDestinations = [...new Set(trips.map(trip => trip.destination))];
    const destinations = uniqueDestinations.length;
    
    // Extract unique countries (filter out null/empty values)
    const countries = [...new Set(trips.map(trip => trip.country).filter(country => country))].length;
    
    return { 
      success: true, 
      data: {
        activeTrips,
        destinations,
        countries
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: error.message };
  }
}

// Get user's recent trips
export async function getUserRecentTrips(userId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching recent trips:', error);
    return { success: false, error: error.message };
  }
}

// Get user's favorite trips
export async function getUserFavoriteTrips(userId, userToken) {
  try {
    // Create client with user's token to make request in user's context
    const userClient = userToken ? createClientWithUserToken(userToken) : supabase;
    
    const { data, error } = await userClient
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching favorite trips:', error);
    return { success: false, error: error.message };
  }
}