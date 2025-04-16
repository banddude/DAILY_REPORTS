import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Log the variables being read
console.log(`[SupabaseClient] URL: ${supabaseUrl}`);
console.log(`[SupabaseClient] Anon Key: ${supabaseAnonKey ? 'Loaded' : 'MISSING!'}`);

if (!supabaseUrl) {
  console.error('CRITICAL ERROR: EXPO_PUBLIC_SUPABASE_URL is not set. Supabase client cannot be initialized.');
}
if (!supabaseAnonKey) {
  console.error('CRITICAL ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase client cannot be initialized.');
}

// Create the Supabase client instance
// Only attempt creation if both variables are present
let supabase: SupabaseClient;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage, // Use AsyncStorage for session persistence in React Native
      autoRefreshToken: true, // Enable automatic token refresh
      persistSession: true,   // Persist session across app restarts
      detectSessionInUrl: false,
    },
  });
  console.log('[SupabaseClient] Supabase client initialized successfully.');
} else {
  // Provide a non-functional object to prevent immediate crashes, but log error.
  console.error("[SupabaseClient] Supabase client could NOT be initialized due to missing environment variables.");
  // Assign a dummy object to satisfy typing, although it won't work.
  supabase = {
     auth: { 
       getSession: async () => ({ data: { session: null }, error: new Error('Supabase not initialized') }),
       onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
       setSession: async () => ({ data: { session: null, user: null }, error: new Error('Supabase not initialized') }),
       signOut: async () => ({ error: new Error('Supabase not initialized') }),
     } 
     // Add other Supabase methods as needed if you want a more robust dummy
  } as unknown as SupabaseClient; // Cast to SupabaseClient type
}

export { supabase }; 