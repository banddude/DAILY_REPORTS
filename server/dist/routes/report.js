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
exports.initializeReportRoutes = void 0;
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const stream_1 = require("stream");
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const reportUtils_1 = require("../reportUtils"); // Import the helper
const router = (0, express_1.Router)();
// Dependency placeholders
let s3Client;
let s3Bucket;
let protectMiddleware;
let ensureAuthenticatedHelper;
let videoUploadMiddleware; // Middleware from upload.single('video')
let imageUploadMiddleware; // Middleware from imageUpload.single('reportImage')
let generateReportFunction;
let uploadsDir; // Pass UPLOADS_DIR
// Initializer function
const initializeReportRoutes = (client, bucket, protect, ensureAuth, videoUpload, imageUpload, generateReport, uploadsDirectory) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
    videoUploadMiddleware = videoUpload;
    imageUploadMiddleware = imageUpload;
    generateReportFunction = generateReport;
    uploadsDir = uploadsDirectory; // Store uploads directory path
};
exports.initializeReportRoutes = initializeReportRoutes;
// GET Endpoint to fetch report JSON from S3
router.get('/report', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId)
        return;
    const encodedReportKey = req.query.key; // Key might be URL-encoded
    if (!encodedReportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter." });
        return;
    }
    // Explicitly decode the key before using it for checks or S3
    const reportKey = decodeURIComponent(encodedReportKey);
    console.log(`User ${userId} requested report. Raw key: "${encodedReportKey}", Decoded key: "${reportKey}"`);
    // Use the DECODED key for validation
    if (!reportKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to access decoded key ${reportKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} fetching report from S3 using DECODED key: ${reportKey}`);
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: reportKey, // Use the DECODED key for S3
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
router.post('/report', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId)
        return;
    const encodedReportKey = req.query.key; // Key might be URL-encoded
    const updatedReportData = req.body;
    if (!encodedReportKey) {
        res.status(400).json({ error: "Missing 'key' query parameter." });
        return;
    }
    // Explicitly decode the key before using it
    const reportKey = decodeURIComponent(encodedReportKey);
    console.log(`User ${userId} saving report. Raw key: "${encodedReportKey}", Decoded key: "${reportKey}"`);
    if (!updatedReportData || typeof updatedReportData !== 'object') {
        res.status(400).json({ error: "Missing or invalid JSON data in request body." });
        return;
    }
    // Use the DECODED key for validation
    if (!reportKey.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to save decoded key ${reportKey}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} saving updated report to S3 using DECODED key: ${reportKey}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: reportKey, // Use the DECODED key for S3
        Body: JSON.stringify(updatedReportData, null, 2), // Stringify the updated data
        ContentType: 'application/json'
    };
    try {
        const command = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(command);
        console.log(`User ${userId}: Successfully saved updated report to S3: ${reportKey}`);
        // Regenerate and upload the viewer HTML
        try {
            // Use the DECODED key for parsing and HTML generation
            console.log(`User ${userId}: Triggering viewer HTML regeneration for DECODED key: ${reportKey}`);
            const keyParts = reportKey.replace(/^users\/[^\/]+\//, '').split('/');
            // keyParts should be [customer, project, reportFolder, daily_report.json]
            if (keyParts.length === 4) {
                const customerName = keyParts[0];
                const projectName = keyParts[1];
                const reportFolderName = keyParts[2];
                yield (0, reportUtils_1.generateAndUploadViewerHtml)(s3Client, s3Bucket, updatedReportData, // Use the data that was just saved
                userId, customerName, projectName, reportFolderName);
                console.log(`User ${userId}: Successfully regenerated viewer HTML.`);
            }
            else {
                console.error(`User ${userId}: Could not parse report key components for HTML regeneration: ${reportKey}`);
                // Decide how to handle this? Maybe still return success for JSON save?
            }
        }
        catch (htmlError) {
            console.error(`User ${userId}: Failed to regenerate viewer HTML after saving JSON:`, htmlError);
            // Decide if this error should prevent the success response for the JSON save.
            // For now, we log the error but still return success for the primary JSON save.
        }
        res.status(200).json({ message: "Report updated successfully." });
    }
    catch (error) {
        console.error(`User ${userId}: Error saving report ${reportKey} to S3:`, error);
        res.status(500).json({ error: `Failed to save report to S3: ${error.message}` });
    }
}));
// Common function to handle video processing and report generation
const handleVideoUploadAndGenerate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId)
        return;
    console.log(`User ${userId} received request for video processing`);
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
    const customer = req.body.customer || 'UnknownCustomer';
    const project = req.body.project || 'UnknownProject';
    console.log(`User ${userId}: Using customer=${customer}, project=${project}`);
    const uploadedVideoPath = req.file.path;
    try {
        console.log(`User ${userId}: Starting report generation process...`);
        const reportJsonKey = yield generateReportFunction(uploadedVideoPath, userId, customer, project);
        console.log(`User ${userId}: Report generated successfully. User-scoped JSON Key: ${reportJsonKey}`);
        const editorUrl = `${req.protocol}://${req.get('host')}/edit-report?key=${encodeURIComponent(reportJsonKey)}`;
        console.log(`User ${userId}: Editor URL: ${editorUrl}`);
        const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/'));
        const viewerKey = `${reportBaseKey}/report-viewer.html`;
        const region = yield s3Client.config.region();
        const viewerUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${viewerKey}`;
        console.log(`User ${userId}: Viewer URL: ${viewerUrl}`);
        res.status(200).json({ editorUrl, viewerUrl });
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
});
// POST Endpoint to handle video uploads and trigger report generation
router.post('/upload-video', (req, res, next) => protectMiddleware(req, res, next), (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer middleware
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield handleVideoUploadAndGenerate(req, res);
}));
// POST endpoint to trigger report generation manually (redundant but kept for compatibility)
router.post('/generate-report', (req, res, next) => protectMiddleware(req, res, next), (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer middleware
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Manual /api/generate-report endpoint hit.");
    yield handleVideoUploadAndGenerate(req, res);
}));
// POST endpoint for uploading a report image
router.post('/report-image', (req, res, next) => protectMiddleware(req, res, next), (req, res, next) => imageUploadMiddleware(req, res, next), // Apply image multer middleware
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`>>> POST /api/report-image handler reached. Query: ${JSON.stringify(req.query)}, File received: ${!!req.file}`);
    // Handle React Native format (mocking file buffer)
    if (!req.file && req.body && req.body.reportImage && typeof req.body.reportImage === 'object') {
        console.log('>>> Found reportImage as object in body, React Native format detected');
        try {
            const mockImageBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b]);
            req.file = {
                fieldname: 'reportImage',
                originalname: req.body.reportImage.name || 'image.jpg',
                mimetype: req.body.reportImage.type || 'image/jpeg',
                size: mockImageBuffer.length,
                buffer: mockImageBuffer,
                encoding: '7bit',
                destination: uploadsDir, // Use injected uploadsDir
                filename: `${Date.now()}-${req.body.reportImage.name || 'image.jpg'}`,
                path: path_1.default.join(uploadsDir, `${Date.now()}-${req.body.reportImage.name || 'image.jpg'}`),
            };
            console.log(`>>> Created mock file from React Native data: ${req.file.originalname}`);
        }
        catch (error) {
            console.error('>>> Error processing React Native file object:', error);
        }
    }
    const userId = ensureAuthenticatedHelper(req, res);
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
        console.warn(`>>> POST /api/report-image handler: req.file is still missing after all handling attempts`);
        res.status(400).json({ error: 'No image file uploaded or could not process image data' });
        return;
    }
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/'));
    const framesS3Directory = `${reportBaseKey}/extracted_frames/`;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const fileExtension = path_1.default.extname(req.file.originalname) || '.jpg';
    const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_');
    const newS3Key = `${framesS3Directory}${newFileName}`;
    console.log(`User ${userId} uploading new report image to S3: ${newS3Key}`);
    const putObjectParams = {
        Bucket: s3Bucket,
        Key: newS3Key,
        Body: stream_1.Readable.from(req.file.buffer),
        ContentType: req.file.mimetype,
        ContentLength: req.file.size
    };
    try {
        const putImageCommand = new client_s3_1.PutObjectCommand(putObjectParams);
        yield s3Client.send(putImageCommand);
        console.log(`User ${userId}: Successfully uploaded new report image to S3: ${newS3Key}`);
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body)
            throw new Error("Failed to fetch report JSON body.");
        const reportJsonString = yield reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);
        if (!reportData.images)
            reportData.images = [];
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
router.delete('/report-image', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
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
        const getReportCommand = new client_s3_1.GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = yield s3Client.send(getReportCommand);
        if (!reportDataResponse.Body)
            throw new Error("Failed to fetch report JSON body.");
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
exports.default = router;
