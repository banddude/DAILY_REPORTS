import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from '../config';
import { Readable } from 'stream';
import path from 'path';

const router = Router();

// Dependency placeholders
let s3Client: S3Client;
let s3Bucket: string;
let protectMiddleware: RequestHandler;
let ensureAuthenticatedHelper: (req: Request, res: Response) => string | null;
let imageUploadMiddleware: RequestHandler; // For logo and profile image

// Initializer function
export const initializeProfileRoutes = (
    client: S3Client,
    bucket: string,
    protect: RequestHandler,
    ensureAuth: (req: Request, res: Response) => string | null,
    imageUpload: RequestHandler
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
    imageUploadMiddleware = imageUpload;
};

// --- Profile Routes ---

// GET Endpoint for retrieving profile data from Supabase
router.get('/profile', (req, res, next) => protectMiddleware(req, res, next), (async (req: Request, res: Response, next: NextFunction) => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    console.log(`GET /api/profile - Attempting to read profile for user ${userId} from Supabase`);

    try {
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*, subscription_level') // Ensure subscription_level is selected
            .eq('id', userId)
            .single(); // Expecting only one profile per user ID

        if (error) {
            console.error(`Supabase error reading profile for user ${userId}:`, error);
            // Handle specific errors like PostgREST 'PGRST116' for no rows found
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    error: 'User profile not found. Please initialize your profile first.',
                    needsInitialization: true
                });
            }
            return res.status(500).json({ error: `Failed to read profile configuration: ${error.message}` });
        }

        if (!profileData) {
            // Should be caught by error.code === 'PGRST116', but included for safety
            console.error(`User profile not found in Supabase for user ${userId} (no error code)`);
            return res.status(404).json({ 
                error: 'User profile not found. Please initialize your profile first.',
                needsInitialization: true
            });
        }

        console.log(`Found Supabase profile for user ${userId}`);
        // --- Fetch Config based on Profile's Subscription Level ---
        const userSubscriptionLevel = profileData.subscription_level; // Get level directly

        // Check if the subscription level is set on the profile
        if (!userSubscriptionLevel) {
            console.error(`User ${userId} profile is missing the 'subscription_level'.`);
            return res.status(400).json({ error: 'User profile is missing the required subscription level.' });
        }

        console.log(`User ${userId} subscription level: ${userSubscriptionLevel}. Fetching corresponding config.`);

        const { data: config, error: configError } = await supabase
            .from('config')
            .select('*') // Select all columns for the user's specific level
            .eq('subscription_level', userSubscriptionLevel) // Filter using the user's level
            .single(); // Expect exactly one row for the user's level

        if (configError || !config) {
            console.error(`Error fetching config for '${userSubscriptionLevel}' level:`, configError);
            // Provide a more specific error message if the config for the level is missing
            const errorMessage = configError?.code === 'PGRST116' // No rows found
                ? `Configuration for subscription level '${userSubscriptionLevel}' not found.`
                : `Failed to fetch configuration: ${configError?.message || 'Unknown error'}`;
            return res.status(500).json({ error: errorMessage });
        }

        // Exclude internal/supabase fields from the profile before sending
        const { id, created_at, updated_at, subscription_level, ...profileFieldsToSend } = profileData;

        // Build configuration object using data from the fetched config row
        const configuration = {
            chatModel: config.chat_model,
            whisperModel: config.whisper_model,
            systemPrompt: config.daily_report_system_prompt,
            reportJsonSchema: config.report_json_schema,
        };
        res.json({ ...profileFieldsToSend, config: configuration }); // Pass the correct config

    } catch (error: any) { // Catch unexpected errors
        console.error(`Unexpected error reading profile for user ${userId}:`, error);
        res.status(500).json({ error: `Failed to read profile configuration: ${error.message || 'Unknown error'}` });
    }
}) as RequestHandler);

// POST Endpoint to save updated profile data to Supabase
router.post('/profile', (req, res, next) => protectMiddleware(req, res, next), (async (req: Request, res: Response, next: NextFunction) => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    console.log(`POST /api/profile - Attempting to save profile for user ${userId} to Supabase`);

    // Extract only the columns that exist in the 'profiles' table from req.body
    // This prevents errors if req.body contains extra fields.
    const allowedColumns = [
        'username', 'full_name', 'phone', 'company_name', 'company_street',
        'company_unit', 'company_city', 'company_state', 'company_zip', 'company_phone',
        'company_website', 'chat_model', 'whisper_model',
        'config_logo_filename', 'daily_report_system_prompt', 'report_json_schema'
        // Do NOT include 'id', 'created_at', 'updated_at' here
    ];
    const profileUpdateData: { [key: string]: any } = {};
    for (const key in req.body) {
        if (allowedColumns.includes(key)) {
            profileUpdateData[key] = req.body[key];
        }
    }

    if (Object.keys(profileUpdateData).length === 0) {
        return res.status(400).json({ error: 'No valid profile fields provided for update.' });
    }
    
    try {
        // Update the profile in Supabase, matching the user ID
        const { data, error } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', userId)
            .select() // Optionally select the updated row to return it
            .single(); // Assuming update affects one row

        if (error) {
            console.error(`Supabase error saving profile for user ${userId}:`, error);
            // Handle specific Supabase errors if needed
            return res.status(500).json({ error: `Failed to update profile configuration: ${error.message}` });
        }

        console.log(`User ${userId}: Successfully saved profile to Supabase`);
        // Return the updated profile data (optional)
        res.json({ message: 'Profile updated successfully.', updatedProfile: data });

    } catch (error: any) { // Catch unexpected errors
        console.error(`Unexpected error saving profile for user ${userId}:`, error);
        res.status(500).json({ error: `Failed to update profile configuration: ${error.message || 'Unknown error'}` });
    }
}) as RequestHandler);

// POST endpoint for uploading profile image - REMOVED as it seemed misplaced/deprecated
// If this is needed, it should be redesigned to potentially update an avatar_url in the profiles table.
// router.post('/upload-profile-image', ...);

// POST endpoint for uploading logo file (remains mostly the same, but updates Supabase)
router.post('/upload-logo', 
    (req: Request, res: Response, next: NextFunction) => protectMiddleware(req, res, next),
    (req: Request, res: Response, next: NextFunction) => imageUploadMiddleware(req, res, next),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = ensureAuthenticatedHelper(req, res);
        if (!userId) { 
            return; 
        }

        // The imageUploadMiddleware (using multer-s3) should have already uploaded the file.
        // We need to check req.file for the details provided by multer-s3.
        
        // Extend the Request type for clarity, assuming Express.Multer.File might be extended by multer-s3
        interface RequestWithMulterS3File extends Request {
            file?: Express.Multer.File & {
                bucket?: string;
                key?: string;
                location?: string; // S3 URL
                // other multer-s3 properties...
            };
        }

        const s3File = (req as RequestWithMulterS3File).file;

        if (!s3File || !s3File.key || !s3File.location) {
            console.error(`User ${userId}: Logo upload failed - multer-s3 did not provide file details (key/location) in req.file.`);
            if (s3File) {
                console.error('>>> req.file details:', JSON.stringify(s3File, null, 2));
            }
            res.status(400).json({ error: 'Logo file upload failed or file details are missing.' });
            return;
        }

        const logoS3Key = s3File.key;
        const logoS3Url = s3File.location;
        
        console.log(`User ${userId}: Logo uploaded by multer-s3. Key: ${logoS3Key}, URL: ${logoS3Url}`);
        
        try {
            // 2. Update the logo filename/URL in the Supabase profiles table
            //    Use the key provided by multer-s3
            console.log(`User ${userId}: Updating profile table with logo S3 key: ${logoS3Key}`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    config_logo_filename: logoS3Key, // Store the S3 key 
                 })
                .eq('id', userId);

            if (updateError) {
                console.error(`User ${userId}: Failed to update profile table with new logo info:`, updateError);
                // Consider if we should delete the S3 object if the DB update fails?
                res.status(500).json({ error: `Logo uploaded, but failed to update profile record: ${updateError.message}` });
                return;
            }
            
            console.log(`User ${userId}: Successfully updated profile record with logo info.`);
            res.status(200).json({ 
                message: "Logo uploaded and profile updated successfully.", 
                logoUrl: logoS3Url, // Return the URL from multer-s3 
                s3Key: logoS3Key
            });

        } catch (error: any) {
            console.error(`User ${userId}: Error during logo database update process:`, error);
            // Consider if we should delete the S3 object if the DB update fails?
            res.status(500).json({ error: `Failed during logo database update process: ${error.message}` });
        }
    }
);

// GET endpoint to serve logo (publicly accessible by userId)
router.get('/logo/:userId', (async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  console.log(`Fetching profile to get logo key for user ${userId}`);

  try {
    // 1. Fetch the profile to get the logo key
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('config_logo_filename') // Select only the needed column
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
        console.error(`Error fetching profile or profile not found for user ${userId} to get logo key:`, profileError);
        return res.status(404).send('User profile not found or logo not set.');
    }

    const s3Key = profileData.config_logo_filename;

    if (!s3Key) {
        console.log(`User ${userId} profile found, but no logo filename is set.`);
        return res.status(404).send('Logo not set for this user.');
    }
    
    console.log(`Serving logo for user ${userId} using S3 key from profile: ${s3Key}`);

    // 2. Fetch the logo from S3 using the retrieved key
    const getObjectParams = {
      Bucket: s3Bucket,
      Key: s3Key,
    };

    const command = new GetObjectCommand(getObjectParams);
    const data = await s3Client.send(command);

    if (!data.Body || !(data.Body instanceof Readable)) {
      throw new Error("S3 GetObject response body is missing or not readable.");
    }

    // Set Content-Type based on S3 metadata or file extension from the key
    const extension = path.extname(s3Key).toLowerCase();
    let contentType = 'application/octet-stream'; // Default
    if (extension === '.jpg' || extension === '.jpeg') contentType = 'image/jpeg';
    else if (extension === '.png') contentType = 'image/png';
    else if (extension === '.gif') contentType = 'image/gif'; 
    // Add other types if needed
    
    res.setHeader('Content-Type', data.ContentType || contentType); 
    if (data.ContentLength) {
        res.setHeader('Content-Length', data.ContentLength.toString());
    }
    
    // Pipe the S3 object stream directly to the response
    data.Body.pipe(res);

  } catch (error: any) {
    // Corrected error logging: remove direct reference to profileData from the catch scope if it causes issues.
    // We can log the intended key derived *before* the try block or just log the user ID.
    console.error(`Error serving logo for user ${userId}:`, error);
    if (error.name === 'NoSuchKey') {
        res.status(404).send('Logo file not found in storage.');
    } else if (error.message && error.message.includes('profile not found')) {
        // Catch error from profile fetch stage
        res.status(404).send(error.message); 
    } else {
        res.status(500).send(`Failed to serve logo: ${error.message || 'Unknown error'}`);
    }
  }
}) as RequestHandler);

export default router; 