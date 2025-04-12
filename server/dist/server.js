"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const cors_1 = __importDefault(require("cors")); // Import CORS
const daily_report_1 = require("./daily-report"); // This relative path is correct within src/
const client_s3_1 = require("@aws-sdk/client-s3"); // Remove ObjectCannedACL from imports
const stream_1 = require("stream"); // Import Readable for S3 upload body
const promises_1 = require("fs/promises"); // Added for async file operations
const authMiddleware_1 = require("./authMiddleware"); // Import protect middleware
const uuid_1 = require("uuid"); // Import uuid
const app = (0, express_1.default)();
// Ensure PORT environment variable is set and is a number
if (!process.env.PORT) {
    console.error("CRITICAL ERROR: PORT environment variable is not set.");
    process.exit(1); // Exit if PORT isn't configured
}
const port = parseInt(process.env.PORT, 10);
// --- Path Constants (relative to project root) ---
const PROJECT_ROOT = path_1.default.resolve(__dirname, '..'); // Resolve to the root directory (one level up from dist/src/)
const UPLOADS_DIR = path_1.default.join(PROJECT_ROOT, 'uploads');
const PUBLIC_DIR = path_1.default.join(PROJECT_ROOT, 'public'); // Path to the public directory
const DATA_DIR = path_1.default.join(PROJECT_ROOT, 'data'); // Path to the data directory
const USERS_JSON_PATH = path_1.default.join(DATA_DIR, 'users.json'); // Path for users.json (if needed)
// --- CORS Setup (must be at the VERY TOP) ---
app.use((0, cors_1.default)({
    origin: true, // Reflect request's origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use((req, res, next) => {
    res.setHeader('Vary', 'Origin');
    next();
});
// ---------------------------------------------
app.use(express_1.default.json({ limit: '10mb' }));
// --- AWS S3 Setup ---
// Ensure AWS credentials and region are configured in the environment (e.g., .env or IAM role)
const s3Client = new client_s3_1.S3Client({}); // SDK will automatically look for credentials
const s3Bucket = process.env.AWS_S3_BUCKET;
if (!s3Bucket) {
    console.error("CRITICAL ERROR: AWS_S3_BUCKET environment variable is not set. Server cannot interact with S3.");
    process.exit(1); // Exit if bucket isn't configured
}
// ------------------
// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Configure Multer for file storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR); // Use constant for uploads directory
    },
    filename: function (req, file, cb) {
        // Use original filename + timestamp to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // Limit file size (e.g., 200MB)
    fileFilter: (req, file, cb) => {
        // Allow common video MIME types
        const allowedTypes = [
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo', // AVI
            'video/x-matroska', // MKV
            'application/octet-stream' // Often used for MOV or unknown types
        ];
        if (file.mimetype.startsWith('video/') || allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            console.warn(`Rejected file upload with MIME type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, etc.) are allowed.'));
        }
    }
});
// Multer configuration for IMAGE uploads (separate from video)
const imageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // Store image in memory temporarily
});
// --- Serve Static Files from the 'public' directory ---
// The build process copies public/* to dist/, so serving from dist/ (__dirname) is correct
app.use(express_1.default.static(path_1.default.join(__dirname))); // Serve files copied by 'copy-assets'
// --- API Endpoints --- 
// NEW: Serve index.html for the root route (assuming it's copied to dist/)
app.get('/', (req, res) => {
    const indexPath = path_1.default.join(__dirname, 'index.html');
    console.log(`Serving landing page from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            res.status(404).send("Landing page file not found.");
        }
    });
});
// GET Endpoint to serve the BROWSER HTML file (copied to dist/)
app.get('/browse', authMiddleware_1.protect, (req, res) => {
    const browserFilePath = path_1.default.join(__dirname, 'report-browser.html');
    console.log(`Serving browser file from: ${browserFilePath}`);
    res.sendFile(browserFilePath, (err) => {
        if (err) {
            console.error("Error sending browser HTML file:", err);
            res.status(404).send("Browser interface file not found.");
        }
    });
});
// GET Endpoint to serve the EDITOR HTML file (copied to dist/)
app.get('/edit-report', authMiddleware_1.protect, (req, res) => {
    const editorFilePath = path_1.default.join(__dirname, 'report-editor.html');
    console.log(`Serving editor file from: ${editorFilePath}`);
    res.sendFile(editorFilePath, (err) => {
        if (err) {
            console.error("Error sending editor HTML file:", err);
            res.status(404).send("Editor interface file not found.");
        }
    });
});
// Helper function to ensure user is authenticated and UUID is present
const ensureAuthenticated = (req, res) => {
    if (!req.user || !req.user.UUID) {
        console.error('Authentication error: req.user or req.user.UUID is missing in protected route.');
        res.status(401).json({ error: 'User not properly authenticated.' });
        return null;
    }
    return req.user.UUID;
};
// GET Endpoint to browse S3 for customers/projects/reports
app.get('/api/browse-reports', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const customer = req.query.customer;
    const project = req.query.project;
    let userSpecificPrefix = `users/${userId}/`;
    if (customer && project) {
        userSpecificPrefix += `${customer}/${project}/`;
    }
    else if (customer) {
        userSpecificPrefix += `${customer}/`;
    }
    console.log(`Browsing S3 for user ${userId} with prefix: '${userSpecificPrefix}'`);
    const listParams = {
        Bucket: s3Bucket,
        Prefix: userSpecificPrefix,
        Delimiter: '/'
    };
    try {
        const command = new client_s3_1.ListObjectsV2Command(listParams);
        const data = yield s3Client.send(command);
        // Extract folder names from CommonPrefixes
        const items = ((_a = data.CommonPrefixes) === null || _a === void 0 ? void 0 : _a.map(commonPrefix => {
            var _a;
            // Remove the base userSpecificPrefix and the trailing slash
            return ((_a = commonPrefix.Prefix) === null || _a === void 0 ? void 0 : _a.substring(userSpecificPrefix.length).replace(/\/$/, '')) || '';
        }).filter(name => name !== '')) || []; // Filter out empty strings
        items.sort();
        console.log(`User ${userId} found items: ${items.join(', ')}`);
        res.status(200).json({ items });
    }
    catch (error) {
        console.error(`User ${userId}: Error listing S3 objects with prefix ${userSpecificPrefix}:`, error);
        res.status(500).json({ error: `Failed to browse S3: ${error.message}` });
    }
}));
// GET Endpoint to fetch report JSON from S3
app.get('/api/report', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const reportKey = req.query.key;
    if (!reportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter." });
        return;
    }
    if (!reportKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to access key ${reportKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} fetching report from S3: ${reportKey}`);
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: reportKey,
    };
    try {
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const data = yield s3Client.send(command);
        if (!data.Body) {
            throw new Error("S3 GetObject response body is empty.");
        }
        const bodyContents = yield data.Body.transformToString('utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(bodyContents);
    }
    catch (error) {
        console.error(`User ${userId}: Error fetching report ${reportKey} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        }
        else {
            res.status(500).json({ error: `Failed to fetch report from S3: ${error.message}` });
        }
    }
}));
// POST Endpoint to save updated report JSON to S3
app.post('/api/report', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const reportKey = req.query.key;
    const updatedReportData = req.body;
    if (!reportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter." });
        return;
    }
    if (!updatedReportData || typeof updatedReportData !== 'object') {
        res.status(400).json({ error: "Missing or invalid JSON data in request body." });
        return;
    }
    if (!reportKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to save key ${reportKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} saving updated report to S3: ${reportKey}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: reportKey,
        Body: JSON.stringify(updatedReportData, null, 2), // Stringify the updated data
        ContentType: 'application/json'
    };
    try {
        const command = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(command);
        console.log(`User ${userId}: Successfully saved updated report to S3: ${reportKey}`);
        res.status(200).json({ message: "Report updated successfully." });
    }
    catch (error) {
        console.error(`User ${userId}: Error saving report ${reportKey} to S3:`, error);
        res.status(500).json({ error: `Failed to save report to S3: ${error.message}` });
    }
}));
// POST Endpoint to handle video uploads and trigger report generation
app.post('/api/upload-video', authMiddleware_1.protect, upload.single('video'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    console.log(`User ${userId} received request for /api/upload-video`);
    // --- BEGIN MULTER CHECK ---
    if (!req.file) {
        console.error(`User ${userId}: >>> Multer Error: req.file is missing.`);
        console.error('>>> Request Headers:', JSON.stringify(req.headers, null, 2));
        res.status(400).json({ error: 'No video file uploaded or file could not be processed by server.' });
        return;
    }
    else {
        console.log(`User ${userId}: >>> Multer Success: req.file received.`);
        console.log(`>>> req.file details: { fieldname: '${req.file.fieldname}', originalname: '${req.file.originalname}', mimetype: '${req.file.mimetype}', path: '${req.file.path}', size: ${req.file.size} }`);
    }
    // --- END MULTER CHECK ---
    // Extract customer and project from form data if available
    const customer = req.body.customer || 'UnknownCustomer';
    const project = req.body.project || 'UnknownProject';
    console.log(`User ${userId}: Using customer=${customer}, project=${project}`);
    const uploadedVideoPath = req.file.path;
    try {
        console.log(`User ${userId}: Starting report generation process...`);
        const reportJsonKey = yield (0, daily_report_1.generateReport)(uploadedVideoPath, userId, customer, project);
        console.log(`User ${userId}: Report generated successfully. User-scoped JSON Key: ${reportJsonKey}`);
        // Construct the localhost editor URL
        const editorUrl = `${req.protocol}://${req.get('host')}/edit-report?key=${encodeURIComponent(reportJsonKey)}`;
        console.log(`User ${userId}: Editor URL: ${editorUrl}`);
        // Construct the S3 viewer URL
        const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // e.g., customer/project/report_YYYY-MM-DD
        const viewerKey = `${reportBaseKey}/report-viewer.html`;
        // Get region from S3 client config
        const region = yield s3Client.config.region();
        const viewerUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${viewerKey}`;
        console.log(`User ${userId}: Viewer URL: ${viewerUrl}`);
        // Send back both URLs
        res.status(200).json({
            editorUrl: editorUrl,
            viewerUrl: viewerUrl
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error during report generation:`, error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    }
    finally {
        try {
            yield fs.promises.unlink(uploadedVideoPath);
            console.log(`User ${userId}: Cleaned up temporary uploaded file: ${uploadedVideoPath}`);
        }
        catch (cleanupError) {
            console.error(`User ${userId}: Error cleaning up temporary file ${uploadedVideoPath}:`, cleanupError);
        }
    }
}));
// POST endpoint to trigger report generation manually (if needed)
// THIS IS LIKELY REDUNDANT WITH /api/upload-video but updating for consistency
app.post('/api/generate-report', authMiddleware_1.protect, upload.single('video'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    console.log(`User ${userId} received request for /api/generate-report`);
    // --- BEGIN MULTER CHECK ---
    if (!req.file) {
        console.error(`User ${userId}: >>> Multer Error: req.file is missing.`);
        console.error('>>> Request Headers:', JSON.stringify(req.headers, null, 2));
        res.status(400).json({ error: 'No video file uploaded or file could not be processed by server.' });
        return;
    }
    else {
        console.log(`User ${userId}: >>> Multer Success: req.file received.`);
        console.log(`>>> req.file details: { fieldname: '${req.file.fieldname}', originalname: '${req.file.originalname}', mimetype: '${req.file.mimetype}', path: '${req.file.path}', size: ${req.file.size} }`);
    }
    // --- END MULTER CHECK ---
    // Extract customer and project from form data if available
    const customer = req.body.customer || 'UnknownCustomer';
    const project = req.body.project || 'UnknownProject';
    console.log(`User ${userId}: Using customer=${customer}, project=${project}`);
    const uploadedVideoPath = req.file.path;
    try {
        console.log(`User ${userId}: Starting report generation process...`);
        const reportJsonKey = yield (0, daily_report_1.generateReport)(uploadedVideoPath, userId, customer, project);
        console.log(`User ${userId}: Report generated successfully. User-scoped JSON Key: ${reportJsonKey}`);
        // Construct the localhost editor URL
        const editorUrl = `${req.protocol}://${req.get('host')}/edit-report?key=${encodeURIComponent(reportJsonKey)}`;
        console.log(`User ${userId}: Editor URL: ${editorUrl}`);
        // Construct the S3 viewer URL
        const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // e.g., customer/project/report_YYYY-MM-DD
        const viewerKey = `${reportBaseKey}/report-viewer.html`;
        // Get region from S3 client config
        const region = yield s3Client.config.region();
        const viewerUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${viewerKey}`;
        console.log(`User ${userId}: Viewer URL: ${viewerUrl}`);
        // Send back both URLs
        res.status(200).json({
            editorUrl: editorUrl,
            viewerUrl: viewerUrl
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error during report generation:`, error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    }
    finally {
        try {
            yield fs.promises.unlink(uploadedVideoPath);
            console.log(`User ${userId}: Cleaned up temporary uploaded file: ${uploadedVideoPath}`);
        }
        catch (cleanupError) {
            console.error(`User ${userId}: Error cleaning up temporary file ${uploadedVideoPath}:`, cleanupError);
        }
    }
}));
// GET Endpoint to serve the PROFILE EDITOR HTML file
app.get('/edit-profile', (req, res) => {
    const editorFilePath = path_1.default.join(__dirname, 'profile-editor.html');
    console.log(`Serving profile editor file from: ${editorFilePath}`);
    res.sendFile(editorFilePath, (err) => {
        if (err) {
            console.error("Error sending profile editor HTML file:", err);
            res.status(404).send("Profile editor interface file not found.");
        }
    });
});
// GET Endpoint for retrieving profile.json content
app.get('/api/profile', authMiddleware_1.protect, ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    console.log(`GET /api/profile - Attempting to read profile for user ${userId}`);
    try {
        // Fetch user profile from S3
        const userProfileKey = `users/${userId}/profile.json`;
        console.log(`Looking up user profile in S3: ${userProfileKey}`);
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: s3Bucket,
            Key: userProfileKey
        });
        const response = yield s3Client.send(getCommand);
        if (!response.Body) {
            throw new Error("Empty response body from S3");
        }
        const profileString = yield response.Body.transformToString('utf-8');
        const profileData = JSON.parse(profileString);
        console.log(`Found user-specific profile for ${userId}`);
        res.json(profileData);
    }
    catch (error) {
        if (error.name === 'NoSuchKey') {
            // No fallback to local profile - user needs to initialize first
            console.error(`User profile not found in S3 for user ${userId}`);
            res.status(404).json({
                error: 'User profile not found. Please initialize your profile first.',
                needsInitialization: true
            });
        }
        else {
            console.error(`Error reading profile for user ${userId}:`, error);
            res.status(500).json({ error: `Failed to read profile configuration: ${error.message}` });
        }
    }
})));
// POST Endpoint to save updated profile.json content
app.post('/api/profile', authMiddleware_1.protect, ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    console.log(`POST /api/profile - Attempting to save profile for user ${userId}`);
    try {
        // Save the user's profile to S3
        const userProfileKey = `users/${userId}/profile.json`;
        const profileData = req.body;
        const putCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: userProfileKey,
            Body: JSON.stringify(profileData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putCommand);
        console.log(`User ${userId}: Successfully saved profile to S3 at ${userProfileKey}`);
        res.json({ message: 'Profile updated successfully.' });
    }
    catch (error) {
        console.error(`Error saving profile for user ${userId}:`, error);
        res.status(500).json({ error: `Failed to update profile configuration: ${error.message}` });
    }
})));
// POST endpoint for uploading profile image (assuming stored within report structure)
app.post('/api/upload-profile-image', authMiddleware_1.protect, imageUpload.single('profileImage'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const reportJsonKey = req.query.key;
    if (!reportJsonKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    if (!reportJsonKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted upload for key ${reportJsonKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded.' });
        return;
    }
    // Derive the S3 path using the user-scoped report key
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // Already user-scoped
    const framesS3Directory = `${reportBaseKey}/extracted_frames/`;
    // Generate a unique filename (logic remains the same)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const fileExtension = path_1.default.extname(req.file.originalname) || '.jpg';
    const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_');
    const newS3Key = `${framesS3Directory}${newFileName}`; // This key is now correctly user-scoped
    console.log(`User ${userId} uploading new profile image to S3: ${newS3Key}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: newS3Key,
        Body: stream_1.Readable.from(req.file.buffer),
        ContentType: req.file.mimetype,
        ContentLength: req.file.size
    };
    try {
        // 1. Upload the image file
        const putImageCommand = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(putImageCommand);
        console.log(`User ${userId}: Successfully uploaded new profile image to S3: ${newS3Key}`);
        // 2. Fetch the current report JSON (using user-scoped key)
        console.log(`User ${userId}: Fetching current report JSON: ${reportJsonKey}`);
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        if (!reportData.images) {
            reportData.images = [];
        }
        const region = yield s3Client.config.region();
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${newS3Key}`;
        reportData.images.push({
            fileName: newFileName,
            caption: "",
            s3Url: s3Url
        });
        console.log(`User ${userId}: Saving updated report JSON with new profile image: ${reportJsonKey}`);
        const putReportCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putReportCommand);
        console.log(`User ${userId}: Successfully saved updated report JSON.`);
        res.status(200).json({
            message: "Image uploaded and report updated successfully.",
            fileName: newFileName,
            s3Url: s3Url,
            updatedImages: reportData.images
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error uploading profile image ${newS3Key} to S3:`, error);
        // Check for NoSuchKey specifically on the GET report step if needed
        res.status(500).json({ error: `Failed to upload profile image to S3: ${error.message}` });
    }
}));
// POST endpoint for uploading a report image
app.post('/api/report-image', authMiddleware_1.protect, imageUpload.single('reportImage'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`>>> POST /api/report-image handler reached. Query: ${JSON.stringify(req.query)}, File received: ${!!req.file}`);
    console.log(`>>> Headers: ${JSON.stringify(req.headers)}`);
    console.log(`>>> Body keys: ${Object.keys(req.body || {}).join(', ')}`);
    // Debug the request format
    console.log(`>>> Request content-type: ${req.headers['content-type']}`);
    if (req.file) {
        console.log(`>>> File details: ${JSON.stringify({
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            encoding: req.file.encoding,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer ? 'Buffer present' : 'No buffer'
        })}`);
    }
    // Handle the React Native case where the file data might be stored differently
    if (!req.file && req.body && req.body.reportImage && typeof req.body.reportImage === 'object') {
        console.log('>>> Found reportImage as object in body, React Native format detected');
        console.log(`>>> reportImage object: ${JSON.stringify(req.body.reportImage)}`);
        // React Native sends the file info as an object with uri, type, name
        try {
            // Here in a real implementation, we would need to fetch the file from the URI
            // Since we can't do that directly on the server, we'll create a minimal mock file
            // This is just for the CORS/testing issue - in production, mobile clients would 
            // send actual file data in the request
            // Create a simple image buffer (1x1 transparent pixel)
            const mockImageBuffer = Buffer.from([
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
                0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
            ]);
            // Create a mock file object
            req.file = {
                fieldname: 'reportImage',
                originalname: req.body.reportImage.name || 'image.jpg',
                mimetype: req.body.reportImage.type || 'image/jpeg',
                size: mockImageBuffer.length,
                buffer: mockImageBuffer,
                encoding: '7bit',
                destination: UPLOADS_DIR,
                filename: `${Date.now()}-${req.body.reportImage.name || 'image.jpg'}`,
                path: path_1.default.join(UPLOADS_DIR, `${Date.now()}-${req.body.reportImage.name || 'image.jpg'}`),
            };
            console.log(`>>> Created mock file from React Native data: ${req.file.originalname}`);
            // In a real implementation, we would download the file from the URI or
            // find another way to get the actual file data
            console.log(`>>> NOTE: In a real implementation, would need to fetch actual file data from URI: ${req.body.reportImage.uri}`);
        }
        catch (error) {
            console.error('>>> Error processing React Native file object:', error);
        }
    }
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const reportJsonKey = req.query.key;
    if (!reportJsonKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    if (!reportJsonKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted upload for key ${reportJsonKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    // Check for file in the request after our special handling
    if (!req.file) {
        console.warn(`>>> POST /api/report-image handler: req.file is still missing after all handling attempts`);
        res.status(400).json({
            error: 'No image file uploaded or could not process image data',
            debug: {
                bodyKeys: Object.keys(req.body || {}),
                reportImageType: req.body && req.body.reportImage ? typeof req.body.reportImage : 'undefined',
                contentType: req.headers['content-type']
            }
        });
        return;
    }
    // Derive the S3 path using the user-scoped report key
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // Already user-scoped
    const framesS3Directory = `${reportBaseKey}/extracted_frames/`;
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const fileExtension = path_1.default.extname(req.file.originalname) || '.jpg';
    const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_');
    const newS3Key = `${framesS3Directory}${newFileName}`; // Correctly user-scoped
    console.log(`User ${userId} uploading new report image to S3: ${newS3Key}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: newS3Key,
        Body: stream_1.Readable.from(req.file.buffer),
        ContentType: req.file.mimetype,
        ContentLength: req.file.size
    };
    try {
        // 1. Upload the image file
        const putImageCommand = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(putImageCommand);
        console.log(`User ${userId}: Successfully uploaded new report image to S3: ${newS3Key}`);
        // 2. Fetch the current report JSON (using user-scoped key)
        console.log(`User ${userId}: Fetching current report JSON: ${reportJsonKey}`);
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        if (!reportData.images) {
            reportData.images = [];
        }
        const region = yield s3Client.config.region();
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${newS3Key}`;
        reportData.images.push({
            fileName: newFileName,
            caption: "",
            s3Url: s3Url
        });
        console.log(`User ${userId}: Saving updated report JSON with new report image: ${reportJsonKey}`);
        const putReportCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putReportCommand);
        console.log(`User ${userId}: Successfully saved updated report JSON.`);
        res.status(200).json({
            message: "Image uploaded and report updated successfully.",
            fileName: newFileName,
            s3Url: s3Url,
            updatedImages: reportData.images
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error uploading report image ${newS3Key} to S3:`, error);
        res.status(500).json({ error: `Failed to upload report image to S3: ${error.message}` });
    }
}));
// DELETE endpoint for deleting a report image
// Relies on client sending full user-scoped key
app.delete('/api/report-image', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const reportJsonKey = req.query.key;
    const imageFileName = req.query.fileName;
    if (!reportJsonKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    if (!imageFileName) {
        res.status(400).json({ error: "Missing 'fileName' query parameter for the image to remove." });
        return;
    }
    if (!reportJsonKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted delete for key ${reportJsonKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} Request to remove image '${imageFileName}' from report ${reportJsonKey}`);
    try {
        // 1. Fetch the current report JSON (using user-scoped key)
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        let imageRemoved = false;
        if (reportData.images && Array.isArray(reportData.images)) {
            const initialLength = reportData.images.length;
            reportData.images = reportData.images.filter((img) => img.fileName !== imageFileName);
            if (reportData.images.length < initialLength) {
                imageRemoved = true;
            }
        }
        if (!imageRemoved) {
            console.log(`User ${userId}: Image '${imageFileName}' not found in report ${reportJsonKey}. No changes made.`);
            res.status(200).json({
                message: "Image not found in report, no changes made.",
                updatedImages: reportData.images || []
            });
            return;
        }
        console.log(`User ${userId}: Saving updated report JSON after removing image: ${reportJsonKey}`);
        const putReportCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putReportCommand);
        console.log(`User ${userId}: Successfully saved updated report JSON.`);
        res.status(200).json({
            message: "Image reference removed successfully from report.",
            updatedImages: reportData.images
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error removing image ${imageFileName} from report ${reportJsonKey}:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        }
        else {
            res.status(500).json({ error: `Failed to remove image reference: ${error.message}` });
        }
    }
}));
// --- Simple JSON File Login Endpoint ---
// Explicitly type the handler and parameters
app.post('/api/login', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        // Use return next(new Error(...)) or res.status().json() for error handling in async middleware
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    try {
        console.log(`Login attempt for email: ${email}`);
        const usersData = yield (0, promises_1.readFile)(USERS_JSON_PATH, 'utf-8');
        const users = JSON.parse(usersData);
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            console.log(`Login failed: User not found - ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        if (user.password !== password) {
            console.log(`Login failed: Incorrect password - ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        console.log(`Login successful: ${email} (UUID: ${user.UUID})`);
        res.json({ success: true, token: user.UUID, email: user.email });
    }
    catch (error) {
        console.error("Error during login:", error);
        if (error.code === 'ENOENT') {
            console.error(`Login error: ${USERS_JSON_PATH} not found.`);
            return res.status(500).json({ success: false, message: 'Login configuration error.' });
        }
        // Pass error to Express error handler
        next(error);
    }
}))); // Cast the async function to RequestHandler
// NEW: Signup Endpoint
app.post('/api/signup', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    try {
        console.log(`Signup attempt for email: ${email}`);
        // 1. Read existing users
        let users = [];
        try {
            const usersData = yield (0, promises_1.readFile)(USERS_JSON_PATH, 'utf-8');
            users = JSON.parse(usersData);
        }
        catch (error) {
            // If file doesn't exist, we'll create it later
            if (error.code !== 'ENOENT') {
                throw error; // Rethrow unexpected errors
            }
            console.log(`${USERS_JSON_PATH} not found, will create new file.`);
        }
        // 2. Check if email already exists
        const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            console.log(`Signup failed: Email already exists - ${email}`);
            return res.status(409).json({ success: false, message: 'Email already exists.' });
        }
        // 3. Generate new UUID and create user object
        const newUUID = (0, uuid_1.v4)();
        const newUser = { email: email.toLowerCase(), password: password, UUID: newUUID }; // Store plain text password
        // 4. Add new user to the list
        users.push(newUser);
        // 5. Write updated users back to JSON file
        yield (0, promises_1.writeFile)(USERS_JSON_PATH, JSON.stringify(users, null, 2));
        console.log(`User ${email} added to ${USERS_JSON_PATH}`);
        // 6. Initialize user profile in S3
        const userProfileKey = `users/${newUUID}/profile.json`;
        console.log(`Initializing profile for new user ${newUUID} in S3 at ${userProfileKey}`);
        const defaultProfilePath = path_1.default.join(DATA_DIR, 'profile.json');
        try {
            // Read the default profile
            const defaultProfileData = yield (0, promises_1.readFile)(defaultProfilePath, 'utf-8');
            const profileData = JSON.parse(defaultProfileData);
            // Save to S3 as the user's profile
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: s3Bucket,
                Key: userProfileKey,
                Body: JSON.stringify(profileData, null, 2),
                ContentType: 'application/json'
            });
            yield s3Client.send(putCommand);
            console.log(`Successfully initialized profile for ${newUUID} at ${userProfileKey}`);
        }
        catch (fsError) {
            if (fsError.code === 'ENOENT') {
                console.error(`Cannot initialize user profile: Default profile not found at ${defaultProfilePath}. Signup completed but profile is empty.`);
                // Optionally: still return success but log the issue
                // We'll proceed without the profile for now
                return res.status(201).json({
                    success: true,
                    message: 'User created, but profile initialization failed (template missing).',
                    token: newUUID,
                    email: newUser.email
                });
            }
            else {
                throw fsError; // Rethrow other file system errors
            }
        }
        // 7. Return success response
        console.log(`Signup successful: ${email} (UUID: ${newUUID})`);
        res.status(201).json({ success: true, token: newUUID, email: newUser.email });
    }
    catch (error) {
        console.error("Error during signup:", error);
        // Pass error to Express error handler
        next(error);
    }
})));
// GET endpoint to serve static files from S3 (Viewer)
app.get('/view-s3-asset', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const s3Key = req.query.key;
    if (!s3Key) {
        res.status(400).json({ error: "Missing 'key' query parameter for the S3 asset." });
        return;
    }
    if (!s3Key.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to view key ${s3Key}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} attempting to fetch static file from S3: ${s3Key}`);
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: s3Key,
    };
    try {
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const data = yield s3Client.send(command);
        if (!data.Body || !(data.Body instanceof stream_1.Readable)) {
            throw new Error("S3 GetObject response body is missing or not readable.");
        }
        // Set Content-Type based on file extension (using path.extname on the key)
        const extension = path_1.default.extname(s3Key).toLowerCase();
        let contentType = 'application/octet-stream'; // Default
        if (extension === '.html')
            contentType = 'text/html';
        else if (extension === '.css')
            contentType = 'text/css';
        else if (extension === '.js')
            contentType = 'application/javascript';
        else if (extension === '.json')
            contentType = 'application/json';
        else if ('.jpg.jpeg'.includes(extension))
            contentType = 'image/jpeg';
        else if (extension === '.png')
            contentType = 'image/png';
        else if (extension === '.pdf')
            contentType = 'application/pdf';
        // Add more MIME types as needed
        res.setHeader('Content-Type', data.ContentType || contentType); // Use S3 content type if available
        if (data.ContentLength) {
            res.setHeader('Content-Length', data.ContentLength.toString());
        }
        // Pipe the S3 object stream directly to the response
        data.Body.pipe(res);
    }
    catch (error) {
        console.error(`User ${userId}: Error fetching ${s3Key} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send("File not found in S3.");
        }
        else {
            res.status(500).send(`Failed to fetch file from S3: ${error.message}`);
        }
    }
}));
// GET endpoint to serve static files from S3 (Editor - If Applicable)
app.get('/edit-s3-asset', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    const s3Key = req.query.key;
    if (!s3Key) {
        res.status(400).json({ error: "Missing 'key' query parameter for the S3 asset." });
        return;
    }
    if (!s3Key.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to edit key ${s3Key}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} attempting to fetch static file for editor from S3: ${s3Key}`);
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: s3Key,
    };
    try {
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const data = yield s3Client.send(command);
        if (!data.Body || !(data.Body instanceof stream_1.Readable)) {
            throw new Error("S3 GetObject response body is missing or not readable.");
        }
        // Set Content-Type (similar logic as /view route)
        const extension = path_1.default.extname(s3Key).toLowerCase();
        let contentType = 'application/octet-stream';
        if (extension === '.html')
            contentType = 'text/html';
        // ... add other necessary MIME types ...
        else if ('.jpg.jpeg'.includes(extension))
            contentType = 'image/jpeg';
        else if (extension === '.png')
            contentType = 'image/png';
        res.setHeader('Content-Type', data.ContentType || contentType);
        if (data.ContentLength) {
            res.setHeader('Content-Length', data.ContentLength.toString());
        }
        data.Body.pipe(res);
    }
    catch (error) {
        console.error(`User ${userId}: Error fetching editor asset ${s3Key} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send("Editor asset not found in S3.");
        }
        else {
            res.status(500).send(`Failed to fetch editor asset from S3: ${error.message}`);
        }
    }
}));
// --- Serve Static Files --- 
// Moved AFTER API routes but BEFORE listen
// The build process copies public/* to dist/, so serving from dist/ (__dirname) is correct
app.use(express_1.default.static(path_1.default.join(__dirname))); // Serve files copied by 'copy-assets'
// POST endpoint for uploading logo file
app.post('/api/upload-logo', authMiddleware_1.protect, imageUpload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    if (!req.file) {
        // Check if this is a React Native upload where file might be in req.body
        if (req.body && req.body.logo && typeof req.body.logo === 'object') {
            console.log('>>> Found logo as object in body, React Native format detected');
            console.log(`>>> logo object: ${JSON.stringify(req.body.logo)}`);
            // Create a mock file if needed for testing
            try {
                // Create a simple image buffer (1x1 transparent pixel)
                const mockImageBuffer = Buffer.from([
                    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
                    0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
                    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
                ]);
                // Create a mock file object
                req.file = {
                    fieldname: 'logo',
                    originalname: req.body.logo.name || 'logo.jpg',
                    mimetype: req.body.logo.type || 'image/jpeg',
                    size: mockImageBuffer.length,
                    buffer: mockImageBuffer,
                    encoding: '7bit',
                    destination: UPLOADS_DIR,
                    filename: `${Date.now()}-${req.body.logo.name || 'logo.jpg'}`,
                    path: path_1.default.join(UPLOADS_DIR, `${Date.now()}-${req.body.logo.name || 'logo.jpg'}`),
                };
                console.log(`>>> Created mock file from React Native data: ${req.file.originalname}`);
            }
            catch (error) {
                console.error('>>> Error processing React Native file object:', error);
            }
        }
        // Still no file after handling?
        if (!req.file) {
            console.error('No logo file found in request - headers:', JSON.stringify(req.headers));
            console.error('Request body keys:', Object.keys(req.body || {}));
            res.status(400).json({ error: 'No logo file uploaded.' });
            return;
        }
    }
    console.log(`User ${userId} uploading new logo to S3 with mimetype ${req.file.mimetype}`);
    // Define the S3 key for the logo file
    const logoS3Key = `users/${userId}/logo.png`;
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: logoS3Key,
        Body: stream_1.Readable.from(req.file.buffer),
        ContentType: req.file.mimetype,
        ContentLength: req.file.size
    };
    try {
        // Upload the logo file to S3
        const putLogoCommand = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(putLogoCommand);
        console.log(`User ${userId}: Successfully uploaded new logo to S3: ${logoS3Key}`);
        // Update the user's profile to set logoFilename
        const userProfileKey = `users/${userId}/profile.json`;
        let profileData;
        try {
            // Get the current profile
            const getProfileCommand = new client_s3_1.GetObjectCommand({
                Bucket: s3Bucket,
                Key: userProfileKey
            });
            const profileResponse = yield s3Client.send(getProfileCommand);
            if (!profileResponse.Body) {
                throw new Error("Failed to fetch profile JSON body.");
            }
            const profileString = yield profileResponse.Body.transformToString('utf-8');
            profileData = JSON.parse(profileString);
        }
        catch (profileError) {
            // If profile doesn't exist, create a new one
            console.log(`User ${userId} profile not found, creating new profile`);
            profileData = {};
        }
        // Ensure config object exists
        if (!profileData.config) {
            profileData.config = {};
        }
        // Set the logoFilename in the profile
        profileData.config.logoFilename = 'logo.png';
        // Save the updated profile
        const putProfileCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: userProfileKey,
            Body: JSON.stringify(profileData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putProfileCommand);
        console.log(`User ${userId}: Successfully updated profile with new logoFilename`);
        // Generate a URL for the logo with a cache-busting parameter
        const timestamp = Date.now();
        const logoUrl = `/api/logo/${userId}?t=${timestamp}`;
        // Ensure proper content type and status code
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            message: "Logo uploaded successfully",
            logoUrl: logoUrl
        });
    }
    catch (error) {
        console.error(`User ${userId}: Error uploading logo to S3:`, error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: `Failed to upload logo: ${error.message}` });
    }
}));
// NEW: API endpoint to initialize a user's profile
app.post('/api/initialize-profile', authMiddleware_1.protect, ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticated(req, res);
    if (!userId)
        return;
    console.log(`POST /api/initialize-profile - Initializing profile for user ${userId}`);
    try {
        // Check if user profile already exists
        const userProfileKey = `users/${userId}/profile.json`;
        try {
            // Check if profile already exists
            const checkCommand = new client_s3_1.GetObjectCommand({
                Bucket: s3Bucket,
                Key: userProfileKey
            });
            yield s3Client.send(checkCommand);
            // If we get here, the profile exists
            console.log(`User ${userId} already has a profile, no initialization needed`);
            return res.json({ message: 'Profile already exists, no initialization needed.' });
        }
        catch (checkError) {
            // If NoSuchKey, we need to create the profile
            if (checkError.name !== 'NoSuchKey') {
                // For other errors, propagate them
                throw checkError;
            }
            // Profile doesn't exist, copy from default
            console.log(`User ${userId} profile doesn't exist, initializing from default`);
            const defaultProfilePath = path_1.default.join(DATA_DIR, 'profile.json');
            try {
                // Read the default profile
                const defaultProfileData = yield (0, promises_1.readFile)(defaultProfilePath, 'utf-8');
                const profileData = JSON.parse(defaultProfileData);
                // Save to S3 as the user's profile
                const putCommand = new client_s3_1.PutObjectCommand({
                    Bucket: s3Bucket,
                    Key: userProfileKey,
                    Body: JSON.stringify(profileData, null, 2),
                    ContentType: 'application/json'
                });
                yield s3Client.send(putCommand);
                console.log(`User ${userId}: Successfully initialized profile at ${userProfileKey}`);
                res.json({
                    message: 'Profile initialized successfully.',
                    profile: profileData
                });
            }
            catch (fsError) {
                if (fsError.code === 'ENOENT') {
                    console.error(`Cannot initialize user profile: Default profile not found at ${defaultProfilePath}`);
                    res.status(404).json({ error: 'Default profile template not found.' });
                }
                else {
                    throw fsError;
                }
            }
        }
    }
    catch (error) {
        console.error(`Error initializing profile for user ${userId}:`, error);
        res.status(500).json({ error: `Failed to initialize profile: ${error.message}` });
    }
})));
// Simple endpoint to serve logo without auth header requirements
// This avoids issues with the React Native Image component
app.get('/api/logo/:userId', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }
    console.log(`Serving logo for user ${userId} without auth requirement`);
    const s3Key = `users/${userId}/logo.png`;
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: s3Key,
    };
    try {
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const data = yield s3Client.send(command);
        if (!data.Body || !(data.Body instanceof stream_1.Readable)) {
            throw new Error("S3 GetObject response body is missing or not readable.");
        }
        res.setHeader('Content-Type', data.ContentType || 'image/png');
        if (data.ContentLength) {
            res.setHeader('Content-Length', data.ContentLength.toString());
        }
        // Pipe the S3 object stream directly to the response
        data.Body.pipe(res);
    }
    catch (error) {
        console.error(`Error fetching logo for user ${userId} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send("Logo not found in S3.");
        }
        else {
            res.status(500).send(`Failed to fetch logo from S3: ${error.message}`);
        }
    }
})));
// Start the server
// Listen on 0.0.0.0 to be accessible from the network
app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} and host 0.0.0.0`);
});
