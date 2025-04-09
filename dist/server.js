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
const daily_report_1 = require("./daily-report"); // Use CommonJS style import (no extension)
const client_s3_1 = require("@aws-sdk/client-s3"); // Import S3 client and commands
const stream_1 = require("stream"); // Import Readable for S3 upload body
const promises_1 = require("fs/promises"); // Added for async file operations
const app = (0, express_1.default)();
const port = process.env.PORT || 3000; // Use environment variable for port or default
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
const uploadsDir = path_1.default.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Configure Multer for file storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); // Save uploaded files to the ./uploads/ directory
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
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit image size (e.g., 10MB)
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            console.warn(`Rejected image upload with MIME type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP images are allowed.'));
        }
    }
});
// Middleware for JSON body parsing (if you need to pass other params)
app.use(express_1.default.json({ limit: '10mb' })); // Increase JSON payload limit for potential large reports
// --- Serve Static Files (like header.html, include-header.js, etc.) ---
// Serve files directly from the 'dist' directory (which __dirname points to in the compiled JS)
app.use(express_1.default.static(__dirname));
// --- API Endpoints --- 
// NEW: Serve index.html for the root route
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
// GET Endpoint to serve the BROWSER HTML file
app.get('/browse', (req, res) => {
    const browserFilePath = path_1.default.join(__dirname, 'report-browser.html');
    console.log(`Serving browser file from: ${browserFilePath}`);
    res.sendFile(browserFilePath, (err) => {
        if (err) {
            console.error("Error sending browser HTML file:", err);
            res.status(404).send("Browser interface file not found.");
        }
    });
});
// GET Endpoint to serve the EDITOR HTML file
app.get('/edit-report', (req, res) => {
    // Construct the absolute path to the report-editor.html file
    const editorFilePath = path_1.default.join(__dirname, 'report-editor.html');
    console.log(`Serving editor file from: ${editorFilePath}`);
    res.sendFile(editorFilePath, (err) => {
        if (err) {
            console.error("Error sending editor HTML file:", err);
            res.status(404).send("Editor interface file not found.");
        }
    });
});
// GET Endpoint to browse S3 for customers/projects/reports
app.get('/api/browse-reports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const customer = req.query.customer;
    const project = req.query.project;
    let prefix = '';
    if (customer && project) {
        prefix = `${customer}/${project}/`; // List reports within a project
    }
    else if (customer) {
        prefix = `${customer}/`; // List projects within a customer
    } // else prefix remains '' to list customers (top-level)
    console.log(`Browsing S3 with prefix: '${prefix}'`);
    const listParams = {
        Bucket: s3Bucket,
        Prefix: prefix,
        Delimiter: '/' // List only immediate subdirectories
    };
    try {
        const command = new client_s3_1.ListObjectsV2Command(listParams);
        const data = yield s3Client.send(command);
        // Extract folder names from CommonPrefixes
        const items = ((_a = data.CommonPrefixes) === null || _a === void 0 ? void 0 : _a.map(commonPrefix => {
            var _a;
            // Remove the base prefix and the trailing slash to get the folder name
            return ((_a = commonPrefix.Prefix) === null || _a === void 0 ? void 0 : _a.substring(prefix.length).replace(/\/$/, '')) || '';
        }).filter(name => name !== '')) || []; // Filter out empty strings
        // Sort alphabetically for better UI
        items.sort();
        console.log(`Found items: ${items.join(', ')}`);
        res.status(200).json({ items });
    }
    catch (error) {
        console.error(`Error listing S3 objects with prefix ${prefix}:`, error);
        res.status(500).json({ error: `Failed to browse S3: ${error.message}` });
    }
}));
// GET Endpoint to fetch report JSON from S3
app.get('/api/report', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reportKey = req.query.key; // e.g., amazon/DSD8/report_.../daily_report.json
    if (!reportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    console.log(`Fetching report from S3: ${reportKey}`);
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
        // Convert the stream to string
        const bodyContents = yield data.Body.transformToString('utf-8');
        // Send the JSON content directly
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(bodyContents);
    }
    catch (error) {
        console.error(`Error fetching report ${reportKey} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        }
        else {
            res.status(500).json({ error: `Failed to fetch report from S3: ${error.message}` });
        }
    }
}));
// POST Endpoint to save updated report JSON to S3
app.post('/api/report', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reportKey = req.query.key;
    const updatedReportData = req.body; // Assumes request body contains the full updated JSON object
    if (!reportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    if (!updatedReportData || typeof updatedReportData !== 'object' || Object.keys(updatedReportData).length === 0) {
        res.status(400).json({ error: "Missing or invalid JSON data in request body." });
        return;
    }
    console.log(`Saving updated report to S3: ${reportKey}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: reportKey,
        Body: JSON.stringify(updatedReportData, null, 2), // Stringify the updated data
        ContentType: 'application/json'
    };
    try {
        const command = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(command);
        console.log(`Successfully saved updated report to S3: ${reportKey}`);
        res.status(200).json({ message: "Report updated successfully." });
    }
    catch (error) {
        console.error(`Error saving report ${reportKey} to S3:`, error);
        res.status(500).json({ error: `Failed to save report to S3: ${error.message}` });
    }
}));
// POST Endpoint to upload a new image for a report
app.post('/api/upload-image', imageUpload.single('newImage'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reportJsonKey = req.query.key;
    if (!reportJsonKey) {
        res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
        return;
    }
    if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded.' });
        return;
    }
    // Derive the S3 path for the extracted_frames directory
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/'));
    const framesS3Directory = `${reportBaseKey}/extracted_frames/`;
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const fileExtension = path_1.default.extname(req.file.originalname) || '.jpg'; // Default extension if needed
    const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_'); // Replace spaces
    const newS3Key = `${framesS3Directory}${newFileName}`;
    console.log(`Uploading new image to S3: ${newS3Key}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: newS3Key,
        Body: stream_1.Readable.from(req.file.buffer), // Upload from memory buffer
        ContentType: req.file.mimetype,
        ContentLength: req.file.size // Explicitly provide the content length
    };
    try {
        // 1. Upload the image file
        const putImageCommand = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(putImageCommand);
        console.log(`Successfully uploaded new image to S3: ${newS3Key}`);
        // 2. Fetch the current report JSON
        console.log(`Fetching current report JSON: ${reportJsonKey}`);
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        // 3. Add the new image info to the report data
        if (!reportData.images) { // Initialize array if it doesn't exist
            reportData.images = [];
        }
        const region = yield s3Client.config.region(); // Get region for URL construction
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${newS3Key}`;
        reportData.images.push({
            fileName: newFileName,
            caption: "", // Add with empty caption initially
            s3Url: s3Url
        });
        // 4. Save the updated report JSON back to S3
        console.log(`Saving updated report JSON with new image: ${reportJsonKey}`);
        const putReportCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putReportCommand);
        console.log(`Successfully saved updated report JSON to S3.`);
        // 5. Return success response (including the updated images array)
        res.status(200).json({
            message: "Image uploaded and report updated successfully.",
            fileName: newFileName,
            s3Url: s3Url, // Keep sending this for potential immediate use
            updatedImages: reportData.images // Send back the updated array
        });
    }
    catch (error) {
        console.error(`Error uploading image ${newS3Key} to S3:`, error);
        res.status(500).json({ error: `Failed to upload image to S3: ${error.message}` });
    }
}));
// DELETE Endpoint to remove an image reference from a report's JSON
app.delete('/api/remove-image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    console.log(`Request to remove image '${imageFileName}' from report ${reportJsonKey}`);
    try {
        // 1. Fetch the current report JSON
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        // 2. Filter out the image to remove
        let imageRemoved = false;
        if (reportData.images && Array.isArray(reportData.images)) {
            const initialLength = reportData.images.length;
            reportData.images = reportData.images.filter((img) => img.fileName !== imageFileName);
            if (reportData.images.length < initialLength) {
                imageRemoved = true;
            }
        }
        if (!imageRemoved) {
            console.log(`Image '${imageFileName}' not found in report ${reportJsonKey}. No changes made.`);
            res.status(200).json({
                message: "Image not found in report, no changes made.",
                updatedImages: reportData.images || []
            });
            return; // Exit after sending response
        }
        // 3. Save the updated report JSON back to S3
        console.log(`Saving updated report JSON after removing image: ${reportJsonKey}`);
        const putReportCommand = new client_s3_1.PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        yield s3Client.send(putReportCommand);
        console.log(`Successfully saved updated report JSON.`);
        // 4. Return success response with the updated images array
        res.status(200).json({
            message: "Image reference removed successfully from report.",
            updatedImages: reportData.images
        });
        // No explicit return needed here, sending response ends execution path
    }
    catch (error) {
        console.error(`Error removing image ${imageFileName} from report ${reportJsonKey}:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        }
        else {
            res.status(500).json({ error: `Failed to remove image reference: ${error.message}` });
        }
        // No explicit return needed here either
    }
}));
// POST Endpoint for report generation (UPDATED RESPONSE)
app.post('/generate-report', upload.single('video'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Received request for /generate-report');
    if (!req.file) {
        res.status(400).json({ error: 'No video file uploaded.' });
        return;
    }
    const uploadedVideoPath = req.file.path;
    console.log(`Video uploaded temporarily to: ${uploadedVideoPath}`);
    try {
        console.log('Starting report generation process...');
        // generateReport now returns the JSON key
        const reportJsonKey = yield (0, daily_report_1.generateReport)(uploadedVideoPath);
        console.log(`Report generated successfully. JSON Key: ${reportJsonKey}`);
        // Construct the localhost editor URL
        const editorUrl = `${req.protocol}://${req.get('host')}/edit-report?key=${encodeURIComponent(reportJsonKey)}`;
        console.log(`Editor URL: ${editorUrl}`);
        // Construct the S3 viewer URL
        const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // e.g., customer/project/report_YYYY-MM-DD
        const viewerKey = `${reportBaseKey}/report-viewer.html`;
        // Get region from S3 client config
        const region = yield s3Client.config.region();
        const viewerUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${viewerKey}`;
        console.log(`Viewer URL: ${viewerUrl}`);
        // Send back both URLs
        res.status(200).json({
            editorUrl: editorUrl,
            viewerUrl: viewerUrl
        });
    }
    catch (error) {
        console.error('Error during report generation:', error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    }
    finally {
        try {
            yield fs.promises.unlink(uploadedVideoPath);
            console.log(`Cleaned up temporary uploaded file: ${uploadedVideoPath}`);
        }
        catch (cleanupError) {
            console.error(`Error cleaning up temporary file ${uploadedVideoPath}:`, cleanupError);
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
// GET Endpoint to fetch profile.json content
app.get('/api/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const profilePath = path_1.default.join(__dirname, 'profile.json');
    console.log(`Fetching profile from: ${profilePath}`);
    try {
        const data = yield (0, promises_1.readFile)(profilePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    }
    catch (error) {
        console.error(`Error reading profile.json:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'profile.json not found.' });
        }
        else {
            res.status(500).json({ error: `Failed to read profile.json: ${error.message}` });
        }
    }
}));
// POST Endpoint to save updated profile.json content
app.post('/api/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const profilePath = path_1.default.join(__dirname, 'profile.json');
    const updatedProfileData = req.body;
    if (!updatedProfileData || typeof updatedProfileData !== 'object' || Object.keys(updatedProfileData).length === 0) {
        res.status(400).json({ error: "Missing or invalid JSON data in request body." });
        return;
    }
    console.log(`Saving updated profile to: ${profilePath}`);
    try {
        // Validate if it's actually JSON before writing
        const profileString = JSON.stringify(updatedProfileData, null, 2);
        yield (0, promises_1.writeFile)(profilePath, profileString, 'utf-8');
        console.log(`Successfully saved updated profile to ${profilePath}`);
        res.status(200).json({ message: "Profile updated successfully." });
    }
    catch (error) {
        console.error(`Error writing profile.json:`, error);
        // Handle potential JSON stringify errors (though less likely with prior checks)
        if (error instanceof SyntaxError) {
            res.status(400).json({ error: `Invalid JSON format received: ${error.message}` });
        }
        else {
            res.status(500).json({ error: `Failed to save profile.json: ${error.message}` });
        }
    }
}));
// POST Endpoint to upload a video and trigger report generation
app.post('/upload', upload.single('videoFile'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ... existing code ...
}));
// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
