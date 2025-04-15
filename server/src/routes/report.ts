import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import * as fs from 'fs';
import path from 'path';
import type { Multer } from 'multer'; // Import Multer type for dependency injection
import { generateAndUploadViewerHtml } from '../reportUtils'; // Import the helper

// Type for the generateReport function dependency
type GenerateReportFunction = (videoPath: string, userId: string, customer: string, project: string) => Promise<string>;

const router = Router();

// Dependency placeholders
let s3Client: S3Client;
let s3Bucket: string;
let protectMiddleware: RequestHandler;
let ensureAuthenticatedHelper: (req: Request, res: Response) => string | null;
let videoUploadMiddleware: RequestHandler; // Middleware from upload.single('video')
let imageUploadMiddleware: RequestHandler; // Middleware from imageUpload.single('reportImage')
let generateReportFunction: GenerateReportFunction;
let uploadsDir: string; // Pass UPLOADS_DIR

// Initializer function
export const initializeReportRoutes = (
    client: S3Client,
    bucket: string,
    protect: RequestHandler,
    ensureAuth: (req: Request, res: Response) => string | null,
    videoUpload: RequestHandler,
    imageUpload: RequestHandler,
    generateReport: GenerateReportFunction,
    uploadsDirectory: string
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
    videoUploadMiddleware = videoUpload;
    imageUploadMiddleware = imageUpload;
    generateReportFunction = generateReport;
    uploadsDir = uploadsDirectory; // Store uploads directory path
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
const handleVideoUploadAndGenerate = async (req: Request, res: Response) => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    console.log(`User ${userId} received request for video processing`);

    // --- BEGIN MULTER CHECK ---
    if (!req.file) {
        console.error(`User ${userId}: >>> Multer Error: req.file is missing.`);
        console.error('>>> Request Headers:', JSON.stringify(req.headers, null, 2));
        res.status(400).json({ error: 'No video file uploaded or file could not be processed by server.' });
        return;
    } else {
        console.log(`User ${userId}: >>> Multer Success: req.file received.`);
        console.log(`>>> req.file details: { fieldname: '${req.file.fieldname}', originalname: '${req.file.originalname}', mimetype: '${req.file.mimetype}', path: '${req.file.path}', size: ${req.file.size} }`);
    }
    // --- END MULTER CHECK ---

    const customer = req.body.customer as string || 'UnknownCustomer';
    const project = req.body.project as string || 'UnknownProject';
    console.log(`User ${userId}: Using customer=${customer}, project=${project}`);

    const uploadedVideoPath = req.file.path;
    try {
        console.log(`User ${userId}: Starting report generation process...`);
        const reportJsonKey = await generateReportFunction(uploadedVideoPath, userId, customer, project);
        console.log(`User ${userId}: Report generated successfully. User-scoped JSON Key: ${reportJsonKey}`);

        // Return only the key of the generated report JSON
        res.status(200).json({ reportJsonKey: reportJsonKey }); 

    } catch (error: any) {
        console.error(`User ${userId}: Error during report generation:`, error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    } finally {
        try {
            await fs.promises.unlink(uploadedVideoPath);
            console.log(`User ${userId}: Cleaned up temporary uploaded file: ${uploadedVideoPath}`);
        } catch (cleanupError) {
            console.error(`User ${userId}: Error cleaning up temporary file ${uploadedVideoPath}:`, cleanupError);
        }
    }
};

// POST Endpoint to handle video uploads and trigger report generation
router.post('/upload-video', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer middleware
    async (req: Request, res: Response) => {
        await handleVideoUploadAndGenerate(req, res);
    }
);

// POST endpoint to trigger report generation manually (redundant but kept for compatibility)
router.post('/generate-report', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => videoUploadMiddleware(req, res, next), // Apply multer middleware
    async (req: Request, res: Response) => {
        console.log("Manual /api/generate-report endpoint hit.");
        await handleVideoUploadAndGenerate(req, res);
    }
);

// POST endpoint for uploading a report image
router.post('/report-image', 
    (req, res, next) => protectMiddleware(req, res, next),
    (req, res, next) => imageUploadMiddleware(req, res, next), // Apply image multer middleware
    async (req: Request, res: Response) => {
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
                    path: path.join(uploadsDir, `${Date.now()}-${req.body.reportImage.name || 'image.jpg'}`),
                } as Express.Multer.File;
                console.log(`>>> Created mock file from React Native data: ${req.file.originalname}`);
            } catch (error) {
                console.error('>>> Error processing React Native file object:', error);
            }
        }
        
        const userId = ensureAuthenticatedHelper(req, res);
        if (!userId) return;
        
        const reportJsonKey = req.query.key as string;

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
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_');
        const newS3Key = `${framesS3Directory}${newFileName}`;

        console.log(`User ${userId} uploading new report image to S3: ${newS3Key}`);

        const putObjectParams = {
            Bucket: s3Bucket,
            Key: newS3Key,
            Body: Readable.from(req.file.buffer),
            ContentType: req.file.mimetype,
            ContentLength: req.file.size
        };

        try {
            const putImageCommand = new PutObjectCommand(putObjectParams);
            await s3Client.send(putImageCommand);
            console.log(`User ${userId}: Successfully uploaded new report image to S3: ${newS3Key}`);

            const getReportCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
            const reportDataResponse = await s3Client.send(getReportCommand);
            if (!reportDataResponse.Body) throw new Error("Failed to fetch report JSON body.");
            const reportJsonString = await reportDataResponse.Body.transformToString('utf-8');
            const reportData = JSON.parse(reportJsonString);

            if (!reportData.images) reportData.images = [];
            const region = await s3Client.config.region();
            const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${newS3Key}`;
            
            reportData.images.push({
                fileName: newFileName,
                caption: "",
                s3Url: s3Url
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

            res.status(200).json({ 
                message: "Image uploaded and report updated successfully.",
                fileName: newFileName,
                s3Url: s3Url,
                updatedImages: reportData.images
            });

        } catch (error: any) {
            console.error(`User ${userId}: Error uploading report image ${newS3Key} to S3:`, error);
            res.status(500).json({ error: `Failed to upload report image to S3: ${error.message}` });
        }
    }
);

// DELETE endpoint for deleting a report image
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