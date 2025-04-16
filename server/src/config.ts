// Centralized server config for non-secret settings

import path from 'path';
import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';

// Load .env file contents into process.env
// Ensure dotenv is configured early, potentially in server.ts or via ts-node-dev flags
// For simplicity assuming it's loaded before this module is imported.

// --- Path Constants (relative to project root) ---
// Note: __dirname in a standard Node.js setup running from dist/src will be /path/to/project/server/dist/src
// We resolve relative to this __dirname to get project paths.
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // Go up two levels from dist/src to get server/
// export const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads'); // REMOVED - No longer used
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public'); // Path to the public directory
export const DATA_DIR = path.join(PROJECT_ROOT, 'data'); // Path to the data directory
export const USERS_JSON_PATH = path.join(DATA_DIR, 'users.json'); // Path for users.json (if needed)

// --- AWS S3 Setup ---
// Ensure AWS credentials and region are configured in the environment (e.g., .env or IAM role)
export const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-west-2', // Default to us-west-2 if not specified
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

export const s3Bucket = process.env.AWS_S3_BUCKET!;
if (!s3Bucket) {
    console.error("CRITICAL ERROR: AWS_S3_BUCKET environment variable is not set.");
    process.exit(1);
}

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.");
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Recommended: Store session tokens in memory server-side, or use secure httpOnly cookies
        // This example uses default (localStorage) which isn't ideal for server-side but works for basic setup
        // Consider a custom storage adapter for production server environments
        persistSession: false, // Usually set to false for server-side usage
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

// --- Network Port --- 
if (!process.env.PORT) {
    console.error("CRITICAL ERROR: PORT environment variable is not set.");
    process.exit(1); // Exit if PORT isn't configured
}
export const port = parseInt(process.env.PORT, 10);
if (isNaN(port)) {
    console.error(`CRITICAL ERROR: Invalid PORT environment variable: ${process.env.PORT}. Must be a number.`);
    process.exit(1);
}

// --- Other Configs ---
export const DEFAULT_WHISPER_MODEL = "whisper-1"; // Change as needed for your deployment 