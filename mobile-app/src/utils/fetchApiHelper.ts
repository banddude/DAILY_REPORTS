import { API_BASE_URL } from '../config';
// Import the Supabase client
import { supabase } from '../utils/supabaseClient';

// Helper function to fetch data from the API
export const fetchApi = async (endpoint: string): Promise<string[]> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Fetching:', url);

  // Get the current session from Supabase
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting Supabase session for fetchApi:", sessionError);
    throw new Error("Could not retrieve authentication session.");
  }

  if (!session?.access_token) {
      console.warn('fetchApi called but no active session found for endpoint:', endpoint);
      // Decide how to handle - throw error? Return empty? Let's throw.
      throw new Error("User is not authenticated.");
  }

  const headers: HeadersInit = {
      'Accept': 'application/json',
      // Add Authorization header using the token from the session
      'Authorization': `Bearer ${session.access_token}`,
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      let errorBody = '';
      try {
          errorBody = await response.text();
          const errData = JSON.parse(errorBody);
          throw new Error(errData.error || errData.message || `HTTP error! ${response.status}`);
      } catch (parseError) {
          console.error("Failed to parse error response as JSON:", errorBody);
          throw new Error(`HTTP error! ${response.status}. Response: ${errorBody.substring(0, 100)}`);
      }
    }
    const data = await response.json();
    // Assuming the API returns { items: string[] }
    return Array.isArray(data?.items) ? data.items.filter((item: any): item is string => typeof item === 'string') : [];
  } catch (error: any) {
    console.error("API Fetch Error:", error);
    throw new Error(error.message || 'An unknown API error occurred');
  }
}; 