import { API_BASE_URL } from '../config';

interface FetchOptions extends RequestInit {
  // Add any custom options if needed
}

/**
 * Performs a fetch request to the backend API, automatically adding 
 * the Authorization header if a token is provided.
 * 
 * @param path The API endpoint path (e.g., '/api/reports').
 * @param token The authentication token (e.g., session?.access_token).
 * @param options Standard fetch options (method, body, headers, etc.).
 * @returns Promise<Response>
 */
export const fetchWithAuth = async (
  path: string,
  token: string | null | undefined, 
  options: FetchOptions = {}
): Promise<Response> => {
  const url = `${API_BASE_URL}${path}`;

  // Prepare headers
  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json'); // Default content type
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers: headers,
  };

  console.log(`[fetchWithAuth] ${options.method || 'GET'} ${url} - Sending with${token ? '' : 'out' } token.`);

  try {
    const response = await fetch(url, fetchOptions);

    // Basic check for non-ok responses
    if (!response.ok) {
      console.error(`[fetchWithAuth] Error: ${response.status} ${response.statusText} for ${url}`);
      // Consider throwing an error or returning a structured error object
      // throw new Error(`HTTP error! status: ${response.status}`); 
    }

    return response;
  } catch (error: any) {
    console.error(`[fetchWithAuth] Network or other error for ${url}:`, error);
    // Re-throw the error so the caller can handle it
    throw error; 
  }
};

// Example of a specific GET request function (optional)
export const getWithAuth = async (path: string, token: string | null | undefined) => {
  return fetchWithAuth(path, token, { method: 'GET' });
};

// Example of a specific POST request function (optional)
export const postWithAuth = async (path: string, token: string | null | undefined, body: any) => {
  return fetchWithAuth(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// Add PUT, DELETE etc. as needed 