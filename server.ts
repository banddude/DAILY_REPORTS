import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import cors from 'cors'; // Import CORS
import { generateReport } from './daily-report'; // Use CommonJS style import (no extension)
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"; // Import S3 client and commands
import { Readable } from 'stream'; // Import Readable for S3 upload body
import { readFile, writeFile } from 'fs/promises'; // Added for async file operations

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:8081', // Expo web default
    'http://localhost:8082', // Expo web alternate
    // Add your deployed web app's frontend URL here later
    // e.g., 'https://app.yourdomain.com'
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.warn(`CORS blocked for origin: ${origin}`); // Log blocked origins
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow standard methods
  credentials: true // Allow cookies if needed later
};

app.use(cors(corsOptions));
// --------------------------

// --- AWS S3 Setup ---
// Ensure AWS credentials and region are configured in the environment (e.g., .env or IAM role)
const s3Client = new S3Client({}); // SDK will automatically look for credentials
const s3Bucket = process.env.AWS_S3_BUCKET;
if (!s3Bucket) {
    console.error("CRITICAL ERROR: AWS_S3_BUCKET environment variable is not set. Server cannot interact with S3.");
    process.exit(1); // Exit if bucket isn't configured
}
// ------------------

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); // Save uploaded files to the ./uploads/ directory
    },
    filename: function (req, file, cb) {
        // Use original filename + timestamp to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
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
        } else {
            console.warn(`Rejected file upload with MIME type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, etc.) are allowed.'));
        }
    }
});

// Multer configuration for IMAGE uploads (separate from video)
const imageUpload = multer({
    storage: multer.memoryStorage(), // Store image in memory temporarily
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit image size (e.g., 10MB)
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.warn(`Rejected image upload with MIME type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP images are allowed.'));
        }
    }
});

// Middleware for JSON body parsing (if you need to pass other params)
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit for potential large reports

// --- Serve Static Files (like header.html, include-header.js, etc.) ---
// Serve files directly from the 'dist' directory (which __dirname points to in the compiled JS)
app.use(express.static(__dirname));

// --- API Endpoints --- 

// NEW: Serve index.html for the root route
app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log(`Serving landing page from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            res.status(404).send("Landing page file not found.");
        }
    });
});

// GET Endpoint to serve the BROWSER HTML file
app.get('/browse', (req: express.Request, res: express.Response) => {
    const browserFilePath = path.join(__dirname, 'report-browser.html');
    console.log(`Serving browser file from: ${browserFilePath}`);
    res.sendFile(browserFilePath, (err) => {
        if (err) {
            console.error("Error sending browser HTML file:", err);
            res.status(404).send("Browser interface file not found.");
        }
    });
});

// GET Endpoint to serve the EDITOR HTML file
app.get('/edit-report', (req: express.Request, res: express.Response) => {
    // Construct the absolute path to the report-editor.html file
    const editorFilePath = path.join(__dirname, 'report-editor.html');
    console.log(`Serving editor file from: ${editorFilePath}`);
    res.sendFile(editorFilePath, (err) => {
        if (err) {
            console.error("Error sending editor HTML file:", err);
            res.status(404).send("Editor interface file not found.");
        }
    });
});

// GET Endpoint to browse S3 for customers/projects/reports
app.get('/api/browse-reports', async (req: express.Request, res: express.Response): Promise<void> => {
    const customer = req.query.customer as string | undefined;
    const project = req.query.project as string | undefined;

    let prefix = '';
    if (customer && project) {
        prefix = `${customer}/${project}/`; // List reports within a project
    } else if (customer) {
        prefix = `${customer}/`; // List projects within a customer
    } // else prefix remains '' to list customers (top-level)

    console.log(`Browsing S3 with prefix: '${prefix}'`);
    const listParams = {
        Bucket: s3Bucket,
        Prefix: prefix,
        Delimiter: '/' // List only immediate subdirectories
    };

    try {
        const command = new ListObjectsV2Command(listParams);
        const data = await s3Client.send(command);

        // Extract folder names from CommonPrefixes
        const items = data.CommonPrefixes?.map(commonPrefix => {
            // Remove the base prefix and the trailing slash to get the folder name
            return commonPrefix.Prefix?.substring(prefix.length).replace(/\/$/, '') || '';
        }).filter(name => name !== '') || []; // Filter out empty strings
        
        // Sort alphabetically for better UI
        items.sort(); 

        console.log(`Found items: ${items.join(', ')}`);
        res.status(200).json({ items });

    } catch (error: any) {
        console.error(`Error listing S3 objects with prefix ${prefix}:`, error);
        res.status(500).json({ error: `Failed to browse S3: ${error.message}` });
    }
});

// GET Endpoint to fetch report JSON from S3
app.get('/api/report', async (req: express.Request, res: express.Response): Promise<void> => {
    const reportKey = req.query.key as string; // e.g., amazon/DSD8/report_.../daily_report.json
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
        const command = new GetObjectCommand(getObjectParams);
        const data = await s3Client.send(command);
        
        if (!data.Body) {
             throw new Error("S3 GetObject response body is empty.");
        }
        
        // Convert the stream to string
        const bodyContents = await data.Body.transformToString('utf-8');
        
        // Send the JSON content directly
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(bodyContents);

    } catch (error: any) {
        console.error(`Error fetching report ${reportKey} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).json({ error: "Report JSON not found at the specified key." });
        } else {
             res.status(500).json({ error: `Failed to fetch report from S3: ${error.message}` });
        }
    }
});

// POST Endpoint to save updated report JSON to S3
app.post('/api/report', async (req: express.Request, res: express.Response): Promise<void> => {
    const reportKey = req.query.key as string; 
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
        const command = new PutObjectCommand(putObjectParams);
        await s3Client.send(command);
        console.log(`Successfully saved updated report to S3: ${reportKey}`);
        res.status(200).json({ message: "Report updated successfully." });

    } catch (error: any) {
        console.error(`Error saving report ${reportKey} to S3:`, error);
        res.status(500).json({ error: `Failed to save report to S3: ${error.message}` });
    }
});

// POST Endpoint to upload a new image for a report
app.post('/api/upload-image', imageUpload.single('newImage'), async (req: Request, res: Response): Promise<void> => {
    const reportJsonKey = req.query.key as string;

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
    const fileExtension = path.extname(req.file.originalname) || '.jpg'; // Default extension if needed
    const newFileName = `upload_${uniqueSuffix}${fileExtension}`.replace(/\s+/g, '_'); // Replace spaces
    const newS3Key = `${framesS3Directory}${newFileName}`;

    console.log(`Uploading new image to S3: ${newS3Key}`);

    const putObjectParams = {
        Bucket: s3Bucket,
        Key: newS3Key,
        Body: Readable.from(req.file.buffer), // Upload from memory buffer
        ContentType: req.file.mimetype,
        ContentLength: req.file.size // Explicitly provide the content length
    };

    try {
        // 1. Upload the image file
        const putImageCommand = new PutObjectCommand(putObjectParams);
        await s3Client.send(putImageCommand);
        console.log(`Successfully uploaded new image to S3: ${newS3Key}`);

        // 2. Fetch the current report JSON
        console.log(`Fetching current report JSON: ${reportJsonKey}`);
        const getReportCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = await s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = await reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);

        // 3. Add the new image info to the report data
        if (!reportData.images) { // Initialize array if it doesn't exist
            reportData.images = [];
        }
        const region = await s3Client.config.region(); // Get region for URL construction
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${newS3Key}`;
        
        reportData.images.push({
            fileName: newFileName,
            caption: "", // Add with empty caption initially
            s3Url: s3Url
        });

        // 4. Save the updated report JSON back to S3
        console.log(`Saving updated report JSON with new image: ${reportJsonKey}`);
        const putReportCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        await s3Client.send(putReportCommand);
        console.log(`Successfully saved updated report JSON to S3.`);

        // 5. Return success response (including the updated images array)
        res.status(200).json({ 
            message: "Image uploaded and report updated successfully.",
            fileName: newFileName,
            s3Url: s3Url, // Keep sending this for potential immediate use
            updatedImages: reportData.images // Send back the updated array
        });

    } catch (error: any) {
        console.error(`Error uploading image ${newS3Key} to S3:`, error);
        res.status(500).json({ error: `Failed to upload image to S3: ${error.message}` });
    }
});

// DELETE Endpoint to remove an image reference from a report's JSON
app.delete('/api/remove-image', async (req: Request, res: Response): Promise<void> => {
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

    console.log(`Request to remove image '${imageFileName}' from report ${reportJsonKey}`);

    try {
        // 1. Fetch the current report JSON
        const getReportCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: reportJsonKey });
        const reportDataResponse = await s3Client.send(getReportCommand);
        if (!reportDataResponse.Body) {
            throw new Error("Failed to fetch report JSON body.");
        }
        const reportJsonString = await reportDataResponse.Body.transformToString('utf-8');
        const reportData = JSON.parse(reportJsonString);

        // 2. Filter out the image to remove
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
             console.log(`Image '${imageFileName}' not found in report ${reportJsonKey}. No changes made.`);
             res.status(200).json({
                 message: "Image not found in report, no changes made.",
                 updatedImages: reportData.images || []
            });
             return; // Exit after sending response
        }

        // 3. Save the updated report JSON back to S3
        console.log(`Saving updated report JSON after removing image: ${reportJsonKey}`);
        const putReportCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: reportJsonKey,
            Body: JSON.stringify(reportData, null, 2),
            ContentType: 'application/json'
        });
        await s3Client.send(putReportCommand);
        console.log(`Successfully saved updated report JSON.`);

        // 4. Return success response with the updated images array
         res.status(200).json({ 
            message: "Image reference removed successfully from report.",
            updatedImages: reportData.images
        });
         // No explicit return needed here, sending response ends execution path

    } catch (error: any) {
        console.error(`Error removing image ${imageFileName} from report ${reportJsonKey}:`, error);
         if (error.name === 'NoSuchKey') {
             res.status(404).json({ error: "Report JSON not found at the specified key." });
        } else {
             res.status(500).json({ error: `Failed to remove image reference: ${error.message}` });
        }
         // No explicit return needed here either
    }
});

// POST Endpoint for report generation (UPDATED RESPONSE)
app.post('/generate-report', upload.single('video'), async (req: express.Request, res: express.Response): Promise<void> => {
    console.log('Received request for /generate-report');

    // --- BEGIN MULTER CHECK ---
    if (!req.file) {
        console.error('>>> Multer Error: req.file is missing. File upload likely failed or was not parsed correctly.');
        // Log headers to see Content-Type if available
        console.error('>>> Request Headers:', JSON.stringify(req.headers, null, 2));
        res.status(400).json({ error: 'No video file uploaded or file could not be processed by server.' });
        return;
    } else {
        console.log('>>> Multer Success: req.file received.');
        // Log minimal file info received by multer
        console.log(`>>> req.file details: { fieldname: '${req.file.fieldname}', originalname: '${req.file.originalname}', mimetype: '${req.file.mimetype}', path: '${req.file.path}', size: ${req.file.size} }`);
    }
    // --- END MULTER CHECK ---

    const uploadedVideoPath = req.file.path;
    // console.log(`Video uploaded temporarily to: ${uploadedVideoPath}`); // Already logged above
    try {
        console.log('Starting report generation process...');
        const reportJsonKey = await generateReport(uploadedVideoPath);
        console.log(`Report generated successfully. JSON Key: ${reportJsonKey}`);

        // Construct the localhost editor URL
        const editorUrl = `${req.protocol}://${req.get('host')}/edit-report?key=${encodeURIComponent(reportJsonKey)}`;
        console.log(`Editor URL: ${editorUrl}`);

        // Construct the S3 viewer URL
        const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/')); // e.g., customer/project/report_YYYY-MM-DD
        const viewerKey = `${reportBaseKey}/report-viewer.html`;
        // Get region from S3 client config
        const region = await s3Client.config.region(); 
        const viewerUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${viewerKey}`;
        console.log(`Viewer URL: ${viewerUrl}`);

        // Send back both URLs
        res.status(200).json({ 
            editorUrl: editorUrl,
            viewerUrl: viewerUrl
        });

    } catch (error: any) {
        console.error('Error during report generation:', error);
        res.status(500).json({ error: `Report generation failed: ${error.message}` });
    } finally {
        try {
            await fs.promises.unlink(uploadedVideoPath);
            console.log(`Cleaned up temporary uploaded file: ${uploadedVideoPath}`);
        } catch (cleanupError) {
            console.error(`Error cleaning up temporary file ${uploadedVideoPath}:`, cleanupError);
        }
    }
});

// GET Endpoint to serve the PROFILE EDITOR HTML file
app.get('/edit-profile', (req: express.Request, res: express.Response) => {
    const editorFilePath = path.join(__dirname, 'profile-editor.html');
    console.log(`Serving profile editor file from: ${editorFilePath}`);
    res.sendFile(editorFilePath, (err) => {
        if (err) {
            console.error("Error sending profile editor HTML file:", err);
            res.status(404).send("Profile editor interface file not found.");
        }
    });
});

// GET Endpoint to fetch profile.json content
app.get('/api/profile', async (req: Request, res: Response) => {
    const profilePath = path.join(__dirname, 'profile.json');
    console.log(`Fetching profile from: ${profilePath}`);
    try {
        const data = await readFile(profilePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (error: any) {
        console.error(`Error reading profile.json:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'profile.json not found.' });
        } else {
            res.status(500).json({ error: `Failed to read profile.json: ${error.message}` });
        }
    }
});

// POST Endpoint to save updated profile.json content
app.post('/api/profile', async (req: Request, res: Response) => {
    const profilePath = path.join(__dirname, 'profile.json');
    const updatedProfileData = req.body;

    if (!updatedProfileData || typeof updatedProfileData !== 'object' || Object.keys(updatedProfileData).length === 0) {
        res.status(400).json({ error: "Missing or invalid JSON data in request body." });
        return;
    }

    console.log(`Saving updated profile to: ${profilePath}`);
    try {
        // Validate if it's actually JSON before writing
        const profileString = JSON.stringify(updatedProfileData, null, 2);
        await writeFile(profilePath, profileString, 'utf-8');
        console.log(`Successfully saved updated profile to ${profilePath}`);
        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error: any) {
        console.error(`Error writing profile.json:`, error);
        // Handle potential JSON stringify errors (though less likely with prior checks)
        if (error instanceof SyntaxError) { 
             res.status(400).json({ error: `Invalid JSON format received: ${error.message}` });
        } else {
             res.status(500).json({ error: `Failed to save profile.json: ${error.message}` });
        }
    }
});

// POST Endpoint to upload a video and trigger report generation
app.post('/upload', upload.single('videoFile'), async (req: Request, res: Response) => {
    // ... existing code ...
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
}); 