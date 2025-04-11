// Centralized configuration for the application

// Determine the API base URL
// Use environment variable if available (e.g., for production builds),
// otherwise fall back to a local development URL.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Log the API URL being used (optional, helpful for debugging)
console.log(`Using API_BASE_URL: ${API_BASE_URL}`);

export {
  API_BASE_URL,
  // Add other configuration constants here as needed
}; 