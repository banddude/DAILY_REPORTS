// Centralized configuration for the application

// Determine the API base URL from environment variable
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Log the API URL being used (optional, helpful for debugging)
console.log(`Config: Using API_BASE_URL: ${API_BASE_URL}`); // Added prefix

// AWS S3 Configuration for Report Viewer
export const S3_BUCKET_NAME = 'shaffer-reports'; // Replace with your actual bucket name
export const AWS_REGION = 'us-east-1'; // Replace with your actual bucket region

export {
  API_BASE_URL,
  // Add other configuration constants here as needed
}; 