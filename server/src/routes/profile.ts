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
            .select('*') // Select all columns, or specify needed ones
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
        // Exclude the user ID from the response if preferred
        const { id, ...profileResponseData } = profileData;
        res.json(profileResponseData);

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
        'company_website', 'config_chat_model', 'config_whisper_model',
        'config_logo_filename', 'config_system_prompt', 'config_report_json_schema'
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

        // Handle React Native mock file if necessary
        if (!req.file && req.body && req.body.logo && typeof req.body.logo === 'object') {
            console.log('>>> Found logo as object in body, React Native format detected');
            try {
                const mockImageBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b]);
                req.file = {
                    fieldname: 'logo',
                    originalname: req.body.logo.name || 'logo.jpg',
                    mimetype: req.body.logo.type || 'image/jpeg',
                    size: mockImageBuffer.length,
                    buffer: mockImageBuffer,
                    encoding: '7bit',
                    filename: `${Date.now()}-${req.body.logo.name || 'logo.jpg'}`,
                } as Express.Multer.File;
                console.log(`>>> Created mock file from React Native data: ${req.file.originalname}`);
            } catch (error) {
                console.error('>>> Error processing React Native file object:', error);
            }
        }

        if (!req.file) {
            res.status(400).json({ error: 'No logo file uploaded.' });
            return;
        }

        console.log(`User ${userId} uploading new logo to S3 with mimetype ${req.file.mimetype}`);
        const fileExtension = path.extname(req.file.originalname) || '.png'; 
        const logoS3Key = `users/${userId}/logo${fileExtension}`; 

        const putObjectParams = {
            Bucket: s3Bucket,
            Key: logoS3Key,
            Body: Readable.from(req.file.buffer),
            ContentType: req.file.mimetype,
            ContentLength: req.file.size
        };

        let logoS3Url = '';

        try {
            // 1. Upload logo to S3
            const putLogoCommand = new PutObjectCommand(putObjectParams);
            await s3Client.send(putLogoCommand);
            console.log(`User ${userId}: Successfully uploaded new logo to S3: ${logoS3Key}`);
            
            const region = await s3Client.config.region() || process.env.AWS_REGION || 'us-west-2';
            logoS3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${logoS3Key}`;
            console.log(`User ${userId}: Logo S3 URL: ${logoS3Url}`);

            // 2. Update the logo filename/URL in the Supabase profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    config_logo_filename: logoS3Key, 
                 })
                .eq('id', userId);

            if (updateError) {
                console.error(`User ${userId}: Failed to update profile table with new logo info:`, updateError);
                res.status(500).json({ error: `Logo uploaded, but failed to update profile record: ${updateError.message}` });
                return;
            }
            
            console.log(`User ${userId}: Successfully updated profile record with logo info.`);
            res.status(200).json({ 
                message: "Logo uploaded and profile updated successfully.", 
                logoUrl: logoS3Url, 
                s3Key: logoS3Key
            });

        } catch (error: any) {
            console.error(`User ${userId}: Error during logo upload process:`, error);
            res.status(500).json({ error: `Failed during logo upload process: ${error.message}` });
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