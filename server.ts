import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { generateReport } from './daily-report'; // Use CommonJS style import (no extension)
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"; // Import S3 client and commands

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default

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

// Middleware for JSON body parsing (if you need to pass other params)
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit for potential large reports

// --- API Endpoints --- 

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

// POST Endpoint for report generation (UPDATED RESPONSE)
app.post('/generate-report', upload.single('video'), async (req: express.Request, res: express.Response): Promise<void> => { 
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

// Basic root route for testing server status
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Daily Report API Server is running.');
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
}); 