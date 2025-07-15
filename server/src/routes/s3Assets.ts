import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { convertHtmlToPdfAndUpload } from '../pdfUtils';

const router = Router();

// Dependency placeholders - these will be injected
let s3Client: S3Client;
let s3Bucket: string;
let protectMiddleware: RequestHandler;
let ensureAuthenticatedHelper: (req: Request, res: Response) => string | null;

// Initializer function to inject dependencies
export const initializeS3AssetRoutes = (
    client: S3Client,
    bucket: string,
    protect: RequestHandler, // Pass the protect middleware
    ensureAuth: (req: Request, res: Response) => string | null // Pass the helper function
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
};

// Common function to handle fetching and streaming S3 object
const streamS3Object = async (req: Request, res: Response, purpose: 'view' | 'edit') => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    const s3Key = req.query.key as string;

    if (!s3Key) {
        res.status(400).json({ error: "Missing 'key' query parameter for the S3 asset." });
        return;
    }
    if (!s3Key.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to ${purpose} key ${s3Key}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }

    console.log(`User ${userId} attempting to fetch static file for ${purpose} from S3: ${s3Key}`);

    const getObjectParams = {
        Bucket: s3Bucket,
        Key: s3Key,
    };

    try {
        if (!s3Client || !s3Bucket) {
            throw new Error("S3 client or bucket not initialized in s3Assets module.");
        }

        // Special handling for PDF requests - generate if missing
        if (s3Key.endsWith('.pdf') && s3Key.includes('report-viewer.pdf')) {
            try {
                const command = new GetObjectCommand(getObjectParams);
                const data = await s3Client.send(command);
                
                if (!data.Body || !(data.Body instanceof Readable)) {
                    throw new Error("S3 GetObject response body is missing or not readable.");
                }
                
                // PDF exists, serve it normally
                res.setHeader('Content-Type', 'application/pdf');
                if (data.ContentLength) {
                    res.setHeader('Content-Length', data.ContentLength.toString());
                }
                data.Body.pipe(res);
                return;
                
            } catch (pdfError: any) {
                if (pdfError.name === 'NoSuchKey') {
                    // PDF doesn't exist, try to generate it from HTML
                    console.log(`PDF not found at ${s3Key}, attempting to generate from HTML...`);
                    
                    const htmlKey = s3Key.replace('/report-viewer.pdf', '/report-viewer.html');
                    const htmlUrl = `https://${s3Bucket}.s3.us-east-1.amazonaws.com/${htmlKey}`;
                    
                    try {
                        // Generate PDF and upload to S3
                        await convertHtmlToPdfAndUpload(s3Client, s3Bucket, htmlUrl, s3Key);
                        
                        // Now fetch the newly created PDF
                        const newPdfCommand = new GetObjectCommand(getObjectParams);
                        const newPdfData = await s3Client.send(newPdfCommand);
                        
                        if (!newPdfData.Body || !(newPdfData.Body instanceof Readable)) {
                            throw new Error("Generated PDF response body is missing or not readable.");
                        }
                        
                        res.setHeader('Content-Type', 'application/pdf');
                        if (newPdfData.ContentLength) {
                            res.setHeader('Content-Length', newPdfData.ContentLength.toString());
                        }
                        newPdfData.Body.pipe(res);
                        return;
                        
                    } catch (generationError: any) {
                        console.error(`Failed to generate PDF for ${s3Key}:`, generationError);
                        throw pdfError; // Fall back to original error
                    }
                } else {
                    throw pdfError;
                }
            }
        }

        // Normal file handling for non-PDF files
        const command = new GetObjectCommand(getObjectParams);
        const data = await s3Client.send(command);

        if (!data.Body || !(data.Body instanceof Readable)) {
             throw new Error("S3 GetObject response body is missing or not readable.");
        }

        // Set Content-Type based on file extension
        const extension = path.extname(s3Key).toLowerCase();
        let contentType = 'application/octet-stream'; // Default
        if (extension === '.html') contentType = 'text/html';
        else if (extension === '.css') contentType = 'text/css';
        else if (extension === '.js') contentType = 'application/javascript';
        else if (extension === '.json') contentType = 'application/json';
        else if ('.jpg.jpeg'.includes(extension)) contentType = 'image/jpeg';
        else if (extension === '.png') contentType = 'image/png';
        else if (extension === '.pdf') contentType = 'application/pdf';
        // Add more MIME types as needed for view/edit

        res.setHeader('Content-Type', data.ContentType || contentType); // Use S3 content type if available
        if (data.ContentLength) {
            res.setHeader('Content-Length', data.ContentLength.toString());
        }

        // Pipe the S3 object stream directly to the response
        data.Body.pipe(res);

    } catch (error: any) {
        console.error(`User ${userId}: Error fetching ${purpose} asset ${s3Key} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send(`${purpose === 'view' ? 'File' : 'Editor asset'} not found in S3.`);
        } else {
             res.status(500).send(`Failed to fetch ${purpose} asset from S3: ${error.message}`);
        }
    }
};

// GET endpoint to serve static files from S3 (Viewer)
// REVERTED: Needs authentication again
router.get('/view-s3-asset', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response) => {
    // const userId = ensureAuthenticatedHelper(req, res);
    // if (!userId) {
    //     return;
    // }
    await streamS3Object(req, res, 'view');
});

// GET endpoint to serve static files from S3 (Editor - If Applicable)
// Keep authentication for potentially sensitive editor assets
router.get('/edit-s3-asset', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response) => {
    await streamS3Object(req, res, 'edit');
});

export default router; 