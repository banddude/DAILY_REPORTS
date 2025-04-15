"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAuthRoutes = void 0;
const express_1 = require("express");
const config_1 = require("../config"); // Import initialized Supabase client
const promises_1 = require("fs/promises"); // Import readFile
const path_1 = __importDefault(require("path")); // Import path
const router = (0, express_1.Router)();
// Calculate the path to the data directory relative to this file's location (server/src/routes)
// __dirname points to server/dist/routes when running compiled JS
// Adjust path to go up from dist/routes to server/ then into data/
const CORRECT_DATA_DIR = path_1.default.resolve(__dirname, '..', '..', 'data');
const DEFAULT_PROFILE_PATH = path_1.default.join(CORRECT_DATA_DIR, 'profile.json');
// S3 client injection might be removed if not used in this file anymore
// export const initializeAuthRoutes = (client: S3Client, bucket: string) => {
//     s3Client = client;
//     s3Bucket = bucket;
// };
// If no initialization needed, remove the function entirely
const initializeAuthRoutes = () => {
    // No initialization needed here now
};
exports.initializeAuthRoutes = initializeAuthRoutes;
// --- Login Endpoint ---
router.post('/login', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    console.log(`Login attempt for email: ${email}`);
    const { data, error } = yield config_1.supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        console.error(`Supabase login error for ${email}:`, error.message);
        // Check for specific Supabase error types if needed
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
    // Return the JWT access token and relevant user info
    res.json({
        success: true,
        token: data.session.access_token, // Send the JWT access token
        refreshToken: data.session.refresh_token, // Optionally send refresh token if client needs it
        user: {
            id: data.user.id,
            email: data.user.email,
            // Add other relevant user fields if needed
        }
    });
})));
// --- Signup Endpoint ---
router.post('/signup', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    console.log(`Signup attempt for email: ${email}`);
    // 1. Sign up the user with Supabase Auth
    const { data: signUpData, error: signUpError } = yield config_1.supabase.auth.signUp({
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
    // Handle cases where user needs confirmation or something went wrong (no session/user returned)
    if (!signUpData.user) {
        console.error(`Supabase signup failed for ${email}: No user object returned.`);
        // Even if user needs confirmation, the user object should exist.
        // If it doesn't, treat it as a failure.
        return res.status(500).json({ success: false, message: 'Signup failed. Unable to retrieve user details.' });
    }
    // At this point, we have a user ID, even if confirmation is needed
    const newUserId = signUpData.user.id;
    console.log(`Supabase auth user created: ${email} (User ID: ${newUserId})`);
    // 2. Initialize user profile in the database using profile.json template
    try {
        console.log(`Initializing profile in DB for user ${newUserId} using ${DEFAULT_PROFILE_PATH}`);
        const defaultProfileContent = yield (0, promises_1.readFile)(DEFAULT_PROFILE_PATH, 'utf-8');
        const defaultProfileData = JSON.parse(defaultProfileContent);
        // Extract nested config or default to empty object
        const config = defaultProfileData.config || {};
        // Extract nested company data or default to empty object
        const company = defaultProfileData.company || {};
        const companyAddress = company.address || {};
        // Manually map keys from JSON (with nesting) to snake_case columns in DB
        const profileToInsert = {
            id: newUserId, // Link to the auth user
            username: defaultProfileData.username, // Assuming username might be in json?
            full_name: defaultProfileData.name, // Map top-level name to full_name
            phone: defaultProfileData.phone,
            company_name: company.name,
            company_street: companyAddress.street,
            company_unit: companyAddress.unit,
            company_city: companyAddress.city,
            company_state: companyAddress.state,
            company_zip: companyAddress.zip,
            company_phone: company.phone,
            company_website: company.website,
            config_chat_model: config.chatModel, // Use nested config object
            config_whisper_model: config.whisperModel, // Use nested config object
            config_logo_filename: config.logoFilename, // Use nested config object
            config_system_prompt: config.systemPrompt, // Use nested config object
            config_report_json_schema: config.reportJsonSchema ? JSON.stringify(config.reportJsonSchema) : null, // Use nested config object
            // created_at and updated_at will be handled by DB defaults
        };
        // Remove undefined/null fields before inserting
        Object.keys(profileToInsert).forEach(key => {
            const k = key;
            if (profileToInsert[k] === undefined || profileToInsert[k] === null) {
                delete profileToInsert[k];
            }
        });
        console.log('Profile data prepared for insertion:', profileToInsert);
        const { error: insertError } = yield config_1.supabase
            .from('profiles')
            .insert(profileToInsert);
        if (insertError) {
            // Log the error but don't fail the whole signup process
            console.error(`Failed to initialize profile in DB for user ${newUserId}:`, insertError);
            // Optionally: Could add a flag to the response indicating profile init failed
        }
        else {
            console.log(`Successfully initialized profile in DB for user ${newUserId}`);
        }
    }
    catch (profileError) {
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
    }
    else {
        // User requires confirmation (or session wasn't returned for another reason)
        console.log(`Signup successful, confirmation likely required for ${email}`);
        res.status(200).json({
            success: true,
            message: 'Signup successful. Please check your email to confirm your account.',
            needsConfirmation: true,
            userId: newUserId,
            email: signUpData.user.email, // Include email
            // profileInitialized: !insertError // Add flag if needed
        });
    }
})));
exports.default = router;
