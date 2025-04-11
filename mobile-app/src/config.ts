// Centralized configuration for the application

// Determine the API base URL from environment variable
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Log the API URL being used (optional, helpful for debugging)
console.log(`Config: Using API_BASE_URL: ${API_BASE_URL}`); // Added prefix

export {
  API_BASE_URL,
  // Add other configuration constants here as needed
}; 