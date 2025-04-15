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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthenticated = exports.protect = void 0;
// Remove unused file system imports (readFile, path)
const config_1 = require("./config"); // Import initialized Supabase client
// Remove unused file system constants (DATA_DIR, USERS_JSON_PATH)
// Updated protect middleware using Supabase JWT validation
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        console.log('Auth Middleware: No token provided.');
        res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
        return;
    }
    try {
        // Validate the token using Supabase
        const { data: { user }, error } = yield config_1.supabase.auth.getUser(token);
        if (error) {
            console.warn(`Auth Middleware: Supabase token validation failed: ${error.message}`);
            // Handle specific errors like expired token if needed
            if (error.message === 'invalid JWT') {
                res.status(401).json({ success: false, message: 'Not authorized, invalid token.' });
                return;
            }
            else if (error.message.includes('expired')) {
                res.status(401).json({ success: false, message: 'Not authorized, token expired.' });
                return;
            }
            // Generic error for other Supabase auth issues
            res.status(401).json({ success: false, message: 'Not authorized.' });
            return;
        }
        if (!user) {
            // This case should theoretically be covered by error handling, but added for safety
            console.warn('Auth Middleware: Token validated but no user object returned.');
            res.status(401).json({ success: false, message: 'Not authorized, unable to verify user.' });
            return;
        }
        // Attach the validated Supabase user object to the request
        req.user = user;
        console.log(`Auth Middleware: Authenticated user: ${req.user.email} (ID: ${req.user.id}) for path: ${req.path}`);
        next(); // Proceed to the next middleware/route handler
    }
    catch (error) {
        // Catch unexpected errors during the validation process
        console.error("Auth Middleware: Unexpected error during token validation:", error);
        res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
    }
});
exports.protect = protect;
// Helper function to ensure user is authenticated and return the Supabase User ID
const ensureAuthenticated = (req, res) => {
    if (!req.user || !req.user.id) {
        // Log the state for debugging
        if (!req.user) {
            console.error('Auth Middleware: ensureAuthenticated check failed - req.user is missing. Protect middleware might have failed or was bypassed.');
        }
        else {
            console.error(`Auth Middleware: ensureAuthenticated check failed - req.user.id is missing for user ${req.user.email || '(email unknown)'}. Ensure user object is correctly attached.`);
        }
        res.status(401).json({ error: 'User not properly authenticated.' });
        return null;
    }
    // Return the Supabase User ID if authentication is successful
    return req.user.id;
};
exports.ensureAuthenticated = ensureAuthenticated;
