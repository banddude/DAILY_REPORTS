import multer from 'multer';
import path from 'path';
// Remove fs import, no longer needed for local storage
// import * as fs from 'fs'; 
import { S3Client } from '@aws-sdk/client-s3'; // Import S3Client
import multerS3 from 'multer-s3'; // Import multer-s3
import { Request } from 'express'; // Import Request type

// Import S3Client and bucket name from the central config file
import { s3Client, s3Bucket } from './config'; // Assuming s3Client and s3Bucket are exported from config.ts

// Remove local uploads directory creation logic
// import { UPLOADS_DIR } from './config';
// if (!fs.existsSync(UPLOADS_DIR)) {
//     console.log(`Uploads directory not found at ${UPLOADS_DIR}, creating...`);
//     fs.mkdirSync(UPLOADS_DIR, { recursive: true });
// }

// --- Configure multer-s3 Storage --- 

// Helper function to generate S3 key based on request context
const generateS3Key = (req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
    // Ensure user context is available (added by auth middleware)
    const userId = (req as any).user?.id;
    if (!userId) {
        return cb(new Error('User not authenticated for S3 key generation'));
    }

    // Use customer/project from body for video uploads
    const customer = req.body.customer || 'UnknownCustomer';
    const project = req.body.project || 'UnknownProject';
    
    // Use reportKey/imgKey from query for image uploads
    // We need a way to determine the context - maybe check fieldname?
    let baseKey = `users/${userId}/uploads`; // Default upload path

    if (file.fieldname === 'video') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        baseKey = `users/${userId}/${customer}/${project}/uploads/${timestamp}`;
    } else if (file.fieldname === 'reportImage') {
        const reportKey = req.query.key ? decodeURIComponent(req.query.key as string) : null;
        const imgKey = req.query.imgKey as string;
        if (!reportKey || !imgKey) {
            // Fallback or error - Need a reliable way to get context for images
            // For now, using a generic upload path
            console.warn('Missing reportKey or imgKey for reportImage upload, using default path.');
        } else {
             // Construct a path based on the report's structure, ensuring it's within the user's space
            // Example: users/{userId}/Customer/Project/report_ts/images/
            const reportPathParts = reportKey.split('/'); // e.g., [users, userId, cust, proj, reportFolder, daily_report.json]
            if (reportPathParts.length >= 5 && reportPathParts[0] === 'users' && reportPathParts[1] === userId) {
                baseKey = `${reportPathParts.slice(0, 5).join('/')}/images`; // Put images in a subfolder of the report
            } else {
                 console.warn(`Could not parse reportKey '${reportKey}' for image path, using default.`);
            }
        }
    } else if (file.fieldname === 'logo') {
        // Handle logo uploads (assuming they go to a profile/config area)
        baseKey = `users/${userId}/profile/config`;
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = path.parse(file.originalname).name; // Get base name without extension
    const extension = path.extname(file.originalname); // Get extension
    const finalKey = `${baseKey}/${filename}-${uniqueSuffix}${extension}`;
    
    console.log(`Generated S3 key: ${finalKey}`);
    cb(null, finalKey);
};

const s3Storage = multerS3({
    s3: s3Client, // Use the imported S3 client
    bucket: s3Bucket, // Use the imported bucket name
    // acl: 'private', // Default is private, explicitly set if needed
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set Content-Type
    metadata: function (req: Request, file: Express.Multer.File, cb: (error: any, metadata?: any) => void) {
        cb(null, { fieldName: file.fieldname });
    },
    key: generateS3Key // Use the key generation function
});

// Remove old disk storage configuration
// const storage = multer.diskStorage({ ... });

// --- Multer Middleware Instances --- 

export const videoUpload = multer({
    storage: s3Storage, // Use S3 storage
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
export const imageUpload = multer({
    storage: s3Storage, // Use S3 storage (was memoryStorage)
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit image size (e.g., 10MB)
    fileFilter: (req, file, cb) => {
        // Allow common image MIME types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            console.warn(`Rejected file upload with MIME type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only image files are allowed.'));
        }
    }
}); 