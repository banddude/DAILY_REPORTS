import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { supabase } from '../config'; // Import initialized Supabase client
import { readFile } from 'fs/promises'; // Import readFile
import path from 'path'; // Import path
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { protect, ensureAuthenticated } from '../authMiddleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Calculate the path to the data directory relative to this file's location (server/src/routes)
// __dirname points to server/dist/routes when running compiled JS
// Adjust path to go up from dist/routes to server/ then into data/
const CORRECT_DATA_DIR = path.resolve(__dirname, '..', '..', 'data'); 
const DEFAULT_PROFILE_PATH = path.join(CORRECT_DATA_DIR, 'profile.json');

export const initializeAuthRoutes = () => {
    // No initialization needed here now
};

// --- Login Endpoint ---
router.post('/login', (async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    console.log(`Login attempt for email: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error(`Supabase login error for ${email}:`, error.message);
        if (error.message.includes('Invalid login credentials')) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        return res.status(400).json({ success: false, message: error.message });
    }

    if (!data.session || !data.user) {
         console.error(`Supabase login failed for ${email}: No session or user data returned.`);
         return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }

    console.log(`Login successful: ${data.user.email} (User ID: ${data.user.id})`);
    res.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
    });

}) as RequestHandler);

// --- Signup Endpoint ---
router.post('/signup', (async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    console.log(`Signup attempt for email: ${email}`);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (signUpError) {
        console.error(`Supabase signup error for ${email}:`, signUpError.message);
        if (signUpError.message.includes('User already registered')) {
             return res.status(409).json({ success: false, message: 'Email already exists.' });
        }
        return res.status(400).json({ success: false, message: signUpError.message });
    }

    if (!signUpData.user) {
         console.error(`Supabase signup failed for ${email}: No user object returned.`);
         return res.status(500).json({ success: false, message: 'Signup failed. Unable to retrieve user details.' });
    }
    const newUserId = signUpData.user.id;
    console.log(`Supabase auth user created: ${email} (User ID: ${newUserId})`);

    try {
        console.log(`Initializing profile in DB for user ${newUserId} using ${DEFAULT_PROFILE_PATH}`);
        const defaultProfileContent = await readFile(DEFAULT_PROFILE_PATH, 'utf-8');
        const defaultProfileData = JSON.parse(defaultProfileContent);

        // Extract nested config or default to empty object
        const config = defaultProfileData.config || {};

        // Extract nested company data or default to empty object
        const company = defaultProfileData.company || {};
        const companyAddress = company.address || {};

        // Manually map keys from JSON (with nesting) to snake_case columns in DB
        // Only include basic fields that exist in the database schema
        const profileToInsert = {
            id: newUserId, // Link to the auth user
            full_name: defaultProfileData.name, // Map top-level name to full_name
            phone: defaultProfileData.phone,
            subscription_level: defaultProfileData.subscription_level || 'free', // Add subscription level
            company_name: company.name,
            company_street: companyAddress.street,
            company_unit: companyAddress.unit,
            company_city: companyAddress.city,
            company_state: companyAddress.state,
            company_zip: companyAddress.zip,
            company_phone: company.phone,
            company_website: company.website,
            // Skip config fields if they don't exist in schema
            // created_at and updated_at will be handled by DB defaults
        };

        // Remove undefined/null fields before inserting
        Object.keys(profileToInsert).forEach(key => {
            const k = key as keyof typeof profileToInsert;
            if (profileToInsert[k] === undefined || profileToInsert[k] === null) {
                delete profileToInsert[k];
            }
        });

        console.log('Profile data prepared for insertion:', profileToInsert);

        const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileToInsert);

        if (insertError) {
            // Log the error but don't fail the whole signup process
            console.error(`Failed to initialize profile in DB for user ${newUserId}:`, insertError);
            // Optionally: Could add a flag to the response indicating profile init failed
        } else {
            console.log(`Successfully initialized profile in DB for user ${newUserId}`);
        }

    } catch (profileError: any) {
        // Log errors reading file or parsing JSON, but don't fail signup
        console.error(`Error initializing profile from file for user ${newUserId}:`, profileError);
    }

    // 3. Return the original signup response to the client
    // Determine the correct response based on whether confirmation is needed
    if (signUpData.session) {
         // User is confirmed and logged in
         console.log(`Signup successful and user confirmed: ${signUpData.user.email} (User ID: ${newUserId})`);
         res.status(201).json({
            success: true,
            message: 'Signup successful!',
            token: signUpData.session.access_token,
            refreshToken: signUpData.session.refresh_token,
            user: {
                id: newUserId,
                email: signUpData.user.email,
            },
            // profileInitialized: !insertError // Add flag if needed
        });
    } else {
        // User requires confirmation (or session wasn't returned for another reason)
        console.log(`Signup successful, confirmation likely required for ${email}`);
        res.status(200).json({ // Use 200 OK if action is needed by user
            success: true,
            message: 'Signup successful. Please check your email to confirm your account.',
            needsConfirmation: true,
            userId: newUserId,
            email: signUpData.user.email, // Include email
            // profileInitialized: !insertError // Add flag if needed
        });
    }

}) as RequestHandler);

// --- Manual Profile Creation Endpoint for Testing ---
router.post('/create-profile/:userId', (async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    
    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    
    console.log(`Manual profile creation attempt for user: ${userId}`);
    
    try {
        console.log(`Initializing profile in DB for user ${userId} using ${DEFAULT_PROFILE_PATH}`);
        const defaultProfileContent = await readFile(DEFAULT_PROFILE_PATH, 'utf-8');
        const defaultProfileData = JSON.parse(defaultProfileContent);

        // Extract nested config or default to empty object
        const config = defaultProfileData.config || {};

        // Extract nested company data or default to empty object
        const company = defaultProfileData.company || {};
        const companyAddress = company.address || {};

        // Manually map keys from JSON (with nesting) to snake_case columns in DB
        // Only include basic fields that exist in the database schema
        const profileToInsert = {
            id: userId, // Link to the auth user
            full_name: defaultProfileData.name, // Map top-level name to full_name
            phone: defaultProfileData.phone,
            subscription_level: defaultProfileData.subscription_level || 'free', // Add subscription level
            company_name: company.name,
            company_street: companyAddress.street,
            company_unit: companyAddress.unit,
            company_city: companyAddress.city,
            company_state: companyAddress.state,
            company_zip: companyAddress.zip,
            company_phone: company.phone,
            company_website: company.website,
            // Skip config fields if they don't exist in schema
            // created_at and updated_at will be handled by DB defaults
        };

        // Remove undefined/null fields before inserting
        Object.keys(profileToInsert).forEach(key => {
            const k = key as keyof typeof profileToInsert;
            if (profileToInsert[k] === undefined || profileToInsert[k] === null) {
                delete profileToInsert[k];
            }
        });

        console.log('Profile data prepared for insertion:', profileToInsert);

        const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileToInsert);

        if (insertError) {
            console.error(`Failed to initialize profile in DB for user ${userId}:`, insertError);
            res.status(500).json({ success: false, message: `Failed to create profile: ${insertError.message}` });
            return;
        } else {
            console.log(`Successfully initialized profile in DB for user ${userId}`);
            res.status(201).json({ success: true, message: 'Profile created successfully' });
            return;
        }

    } catch (profileError: any) {
        console.error(`Error initializing profile from file for user ${userId}:`, profileError);
        res.status(500).json({ success: false, message: `Error creating profile: ${profileError.message}` });
        return;
    }
}) as RequestHandler);

// --- Delete Account Endpoint ---
router.delete('/delete-account', protect, (async (req: Request, res: Response) => {
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

    console.log(`Account deletion request for user: ${userId}`);

    try {
        // Step 1: Delete all S3 objects for this user
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });
        
        const bucketName = process.env.AWS_S3_BUCKET || 'shaffer-reports';
        const userPrefix = `users/${userId}/`;
        
        console.log(`Deleting S3 objects for user ${userId} with prefix: ${userPrefix}`);
        
        // List all objects with the user prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: userPrefix
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
            console.log(`Found ${listResponse.Contents.length} S3 objects to delete for user ${userId}`);
            
            // Delete each object
            for (const object of listResponse.Contents) {
                if (object.Key) {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: object.Key
                    });
                    
                    try {
                        await s3Client.send(deleteCommand);
                        console.log(`Deleted S3 object: ${object.Key}`);
                    } catch (s3Error) {
                        console.error(`Failed to delete S3 object ${object.Key}:`, s3Error);
                        // Continue with deletion even if some S3 objects fail
                    }
                }
            }
        } else {
            console.log(`No S3 objects found for user ${userId}`);
        }

        // Step 2: Delete user's profile (due to foreign key constraints)
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error(`Failed to delete profile for user ${userId}:`, profileError);
            return res.status(500).json({ success: false, error: 'Failed to delete user profile.' });
        }

        // Step 3: Delete the auth user account using service role
        const supabaseServiceRole = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLL_SECRET!
        );
        
        const { error: authError } = await supabaseServiceRole.auth.admin.deleteUser(userId);

        if (authError) {
            console.error(`Failed to delete auth account for user ${userId}:`, authError);
            return res.status(500).json({ success: false, error: 'Failed to delete user account.' });
        }

        console.log(`Successfully deleted account and all data for user: ${userId}`);
        res.json({ success: true, message: 'Account and all associated data deleted successfully.' });

    } catch (error: any) {
        console.error('Error deleting account:', error);
        res.status(500).json({ success: false, error: 'Failed to delete account.' });
    }

}) as RequestHandler);

export default router; 