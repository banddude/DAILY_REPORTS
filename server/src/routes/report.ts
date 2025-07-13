import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import path from 'path';
import * as fs from 'fs';
import os from 'os';
import { pipeline } from 'stream/promises';
import type { Multer } from 'multer'; // Import Multer type for dependency injection
import { generateAndUploadViewerHtml } from '../reportUtils'; // Import the helper

// Extend Express Request type to potentially include file info from multer-s3
interface RequestWithS3File extends Request {
    file?: Express.Multer.File & { // Standard Multer file properties
        // Properties added by multer-s3
        bucket?: string;
        key?: string;
        acl?: string;
        contentType?: string;
        contentDisposition?: null;
        storageClass?: string;
        serverSideEncryption?: null;
        metadata?: any;
        location?: string; // The S3 URL
        etag?: string;
        versionId?: string;
    };
}


// Type for the generateReport function dependency - accepts local path and S3 key
type GenerateReportFunction = (localVideoPath: string, userId: string, customer: string, project: string, videoS3Key?: string) => Promise<string>;

const router = Router();

// Dependency placeholders
let s3Client: S3Client;
let s3Bucket: string;
let protectMiddleware: RequestHandler;
let ensureAuthenticatedHelper: (req: Request, res: Response) => string | null;
let videoUploadMiddleware: RequestHandler; // Middleware from upload.single('video')
let imageUploadMiddleware: RequestHandler; // Middleware from imageUpload.single('reportImage')
let generateReportFunction: GenerateReportFunction;
// let uploadsDir: string; // No longer needed

// Initializer function
export const initializeReportRoutes = (
    client: S3Client,
    bucket: string,
    protect: RequestHandler,
    ensureAuth: (req: Request, res: Response) => string | null,
    videoUpload: RequestHandler,
    imageUpload: RequestHandler,
    generateReport: GenerateReportFunction,
    // uploadsDirectory: string // Removed uploadsDirectory parameter
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
    videoUploadMiddleware = videoUpload;
    imageUploadMiddleware = imageUpload;
    generateReportFunction = generateReport;
    // uploadsDir = uploadsDirectory; // Removed assignment
};

// GET Endpoint to fetch report JSON from S3
router.get('/report', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response): Promise<void> => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    const encodedReportKey = req.query.key as string; // Key might be URL-encoded
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
        const command = new GetObjectCommand(getObjectParams);
        const data = await s3Client.send(command);
        
        if (!data.Body) {
             throw new Error("S3 GetObject response body is empty.");
        }
        
        const bodyContents = await data.Body.transformToString('utf-8');
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(bodyContents);

    } catch (error: any) {
        console.error(`User ${userId}: Error fetching report ${reportKey} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        } else {
             res.status(500).json({ error: `Failed to fetch report from S3: ${error.message}` });
        }
    }
});

// POST Endpoint to save updated report JSON to S3
router.post('/report', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response): Promise<void> => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    const encodedReportKey = req.query.key as string; // Key might be URL-encoded
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
        const command = new PutObjectCommand(putObjectParams);
        await s3Client.send(command);
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
                
                await generateAndUploadViewerHtml(
                    s3Client,
                    s3Bucket,
                    updatedReportData, // Use the data that was just saved
                    userId,
                    customerName,
                    projectName,
                    reportFolderName
                );
                console.log(`User ${userId}: Successfully regenerated viewer HTML.`);
            } else {
                console.error(`User ${userId}: Could not parse report key components for HTML regeneration: ${reportKey}`);
                // Decide how to handle this? Maybe still return success for JSON save?
            }
        } catch (htmlError: any) {
            console.error(`User ${userId}: Failed to regenerate viewer HTML after saving JSON:`, htmlError);
            // Decide if this error should prevent the success response for the JSON save.
            // For now, we log the error but still return success for the primary JSON save.
        }

        res.status(200).json({ message: "Report updated successfully." });

    } catch (error: any) {
        console.error(`User ${userId}: Error saving report ${reportKey} to S3:`, error);
        res.status(500).json({ error: `Failed to save report to S3: ${error.message}` });
    }
});

// Common function to handle video processing and report generation
// Now accepts RequestWithS3File type
const handleVideoUploadAndGenerate = async (req: RequestWithS3File, res: Response) => { 
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    console.log(`User ${userId} received request for video processing (S3 direct)`);

    // --- BEGIN MULTER-S3 CHECK ---
    if (!req.file || !req.file.key || !req.file.location) { // Check for S3 key and location
        console.error(`User ${userId}: >>> Multer-S3 Error: req.file or S3 key/location is missing.`);
        if (req.file) {
             console.error('>>> req.file details:', JSON.stringify(req.file, null, 2));
        } else {
             console.error('>>> req.file is undefined');
        }
        console.error('>>> Request Headers:', JSON.stringify(req.headers, null, 2));
        res.status(400).json({ error: 'No video file uploaded or file could not be processed and uploaded to S3.' });
        return;
    } else {
        console.log(`User ${userId}: >>> Multer-S3 Success: req.file received.`);
        // Log S3 specific details
        console.log(`>>> req.file details: { fieldname: '${req.file.fieldname}', originalname: '${req.file.originalname}', mimetype: '${req.file.contentType}', size: ${req.file.size}, bucket: '${req.file.bucket}', key: '${req.file.key}', location: '${req.file.location}' }`);
    }
    // --- END MULTER-S3 CHECK ---

    const customer = req.body.customer as string || 'UnknownCustomer';
    const project = req.body.project as string || 'UnknownProject';
    console.log(`User ${userId}: Using customer=${customer}, project=${project}`);

    // Use the S3 key from multer-s3
    const uploadedVideoS3Key = req.file.key; 
    
    try {
        console.log(`User ${userId}: Starting report generation process from S3 video key: ${uploadedVideoS3Key}`);
        // Pass the S3 key instead of the local path
        // const reportJsonKey = await generateReportFunction(uploadedVideoS3Key, userId, customer, project);
        // Download the video from S3 to a local temporary file so ffmpeg can read it
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'report-'));
        const localVideoPath = path.join(tempDir, path.basename(uploadedVideoS3Key));
        console.log(`Downloading video ${uploadedVideoS3Key} from S3 to ${localVideoPath}`);
        const getObject = new GetObjectCommand({ Bucket: s3Bucket, Key: uploadedVideoS3Key });
        const s3Response = await s3Client.send(getObject);
        if (!s3Response.Body) throw new Error('Empty S3 response body for video download');
        await pipeline(s3Response.Body as Readable, fs.createWriteStream(localVideoPath));
        console.log(`Downloaded video to ${localVideoPath}`);
        // Use the local file path for report generation
        const reportJsonKey = await generateReportFunction(localVideoPath, userId, customer, project, uploadedVideoS3Key);
        console.log(`User ${userId}: Report generated successfully. User-scoped JSON Key: ${reportJsonKey}`);

        // Return only the key of the generated report JSON
        res.status(200).json({ reportJsonKey: reportJsonKey }); 

    } catch (error: any) {
        console.error(`User ${userId}: Error during report generation:`, error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    }
    // No finally block needed to delete local file
};

// POST Endpoint to handle video uploads and trigger report generation
router.post('/upload-video', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer-s3 middleware
    async (req: Request, res: Response) => {
        // Cast req to RequestWithS3File if necessary or ensure middleware adds types
        await handleVideoUploadAndGenerate(req as RequestWithS3File, res);
    }
);

// POST endpoint to trigger report generation manually (redundant but kept for compatibility)
router.post('/generate-report', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer-s3 middleware
    async (req: Request, res: Response) => {
        console.log("Manual /api/generate-report endpoint hit (using S3 upload).");
        await handleVideoUploadAndGenerate(req as RequestWithS3File, res);
    }
);

// POST endpoint for uploading a report image
router.post('/report-image', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => imageUploadMiddleware(req, res, next), // Apply image multer-s3 middleware
    async (req: RequestWithS3File, res: Response) => { // Use RequestWithS3File type
        console.log(`>>> POST /api/report-image handler reached (S3). Query: ${JSON.stringify(req.query)}, File received: ${!!req.file}`); 
        
        // Remove React Native specific handling - multer-s3 handles stream directly
        // if (!req.file && req.body && req.body.reportImage && typeof req.body.reportImage === 'object') { ... }
        
        const userId = ensureAuthenticatedHelper(req, res);
        if (!userId) return;
        
        const reportJsonKey = req.query.key as string;
        // We don't need imgKey from query anymore, the filename is generated by multer-s3 key function
        // const imgKey = req.query.imgKey as string;

        if (!reportJsonKey) {
            res.status(400).json({ error: "Missing 'key' query parameter for the report JSON." });
            return;
        }
        if (!reportJsonKey.startsWith(`users/${userId}/`)) {
            console.warn(`Auth violation: User ${userId} attempted image upload for key ${reportJsonKey}`);
            res.status(403).json({ error: "Forbidden access." });
            return;
        }
        
        // Check for file info from multer-s3
        if (!req.file || !req.file.key || !req.file.location) { 
            console.warn(`>>> POST /api/report-image handler: req.file or S3 key/location is missing after multer-s3`);
            res.status(400).json({ error: 'No image file uploaded or failed S3 upload' });
            return;
        }

        // Get info directly from multer-s3 result in req.file
        const newS3Key = req.file.key;
        const s3Url = req.file.location;
        const newFileName = path.basename(newS3Key); // Extract filename from the S3 key

        console.log(`User ${userId} report image uploaded by multer-s3 to: ${s3Url} (Key: ${newS3Key})`);

        // No need to manually upload the image to S3 - multer-s3 did it.
        // const putObjectParams = { ... }; 
        // const putImageCommand = new PutObjectCommand(putObjectParams);
        // await s3Client.send(putImageCommand);

        try {
            // Fetch the existing report JSON to add the image reference
            const getReportCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
            const reportDataResponse = await s3Client.send(getReportCommand);
            if (!reportDataResponse.Body) throw new Error("Failed to fetch report JSON body.");
            const reportJsonString = await reportDataResponse.Body.transformToString('utf-8');
            const reportData = JSON.parse(reportJsonString);

            if (!reportData.images) reportData.images = [];
            
            // Add the new image info (using data from multer-s3)
            reportData.images.push({
                fileName: newFileName, // Use filename derived from S3 key
                caption: "", // Default caption
                s3Url: s3Url // Use the S3 location URL
            });

            console.log(`User ${userId}: Saving updated report JSON with new report image: ${reportJsonKey}`);
            const putReportCommand = new PutObjectCommand({
                Bucket: s3Bucket,
                Key: reportJsonKey,
                Body: JSON.stringify(reportData, null, 2),
                ContentType: 'application/json'
            });
            await s3Client.send(putReportCommand);
            console.log(`User ${userId}: Successfully saved updated report JSON.`);
            
            // --- Regenerate HTML Viewer --- 
            try {
                console.log(`User ${userId}: Triggering viewer HTML regeneration after image add for key: ${reportJsonKey}`);
                const keyParts = reportJsonKey.replace(/^users\/[^\/]+\//, '').split('/'); 
                if (keyParts.length === 4) {
                    const customerName = keyParts[0];
                    const projectName = keyParts[1];
                    const reportFolderName = keyParts[2];
                    await generateAndUploadViewerHtml(
                        s3Client,
                        s3Bucket,
                        reportData, // Use the updated data
                        userId,
                        customerName,
                        projectName,
                        reportFolderName
                    );
                    console.log(`User ${userId}: Successfully regenerated viewer HTML after image add.`);
                } else {
                    console.error(`User ${userId}: Could not parse report key components for HTML regeneration: ${reportJsonKey}`);
                }
            } catch (htmlError: any) {
                console.error(`User ${userId}: Failed to regenerate viewer HTML after adding image:`, htmlError);
            }
            // --- End HTML Regeneration ---

            res.status(200).json({ 
                message: "Image uploaded and report updated successfully.",
                fileName: newFileName,
                s3Url: s3Url,
                updatedImages: reportData.images
            });

        } catch (error: any) {
            console.error(`User ${userId}: Error processing report image upload ${newS3Key}:`, error);
             if (error.name === 'NoSuchKey') {
                res.status(404).json({ error: "Report JSON not found at the specified key. Cannot add image reference." });
             } else {
                 res.status(500).json({ error: `Failed to update report with image reference: ${error.message}` });
             }
        }
    }
);

// DELETE endpoint for deleting a report image
// No changes needed here for multer-s3, it only modifies the JSON and doesn't handle uploads
router.delete('/report-image', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response) => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    const reportJsonKey = req.query.key as string;
    const imageFileName = req.query.fileName as string;

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
        const getReportCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = await s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) throw new Error("Failed to fetch report JSON body.");
        const reportJsonString = await reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);

        let imageRemoved = false;
        interface ReportImage {
            fileName: string;
            caption: string;
            s3Url: string;
        }
        if (reportData.images && Array.isArray(reportData.images)) {
            const initialLength = reportData.images.length;
            reportData.images = reportData.images.filter((img: ReportImage) => img.fileName !== imageFileName);
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
        const putReportCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        await s3Client.send(putReportCommand);
        console.log(`User ${userId}: Successfully saved updated report JSON.`);

         res.status(200).json({ 
            message: "Image reference removed successfully from report.",
            updatedImages: reportData.images
        });

    } catch (error: any) {
        console.error(`User ${userId}: Error removing image ${imageFileName} from report ${reportJsonKey}:`, error);
         if (error.name === 'NoSuchKey') {
             res.status(404).json({ error: "Report JSON not found at the specified key." });
        } else {
             res.status(500).json({ error: `Failed to remove image reference: ${error.message}` });
        }
    }
});

export default router; 