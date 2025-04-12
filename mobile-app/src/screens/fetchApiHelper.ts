import { API_BASE_URL } from '../config';

// Helper function to fetch data from the API
export const fetchApi = async (endpoint: string, token: string | null): Promise<string[]> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Fetching:', url);

  const headers: HeadersInit = {
      'Accept': 'application/json',
  };

  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  } else {
      console.warn('fetchApi called without a token for endpoint:', endpoint);
      return [];
  }

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