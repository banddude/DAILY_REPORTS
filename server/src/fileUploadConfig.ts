import multer from 'multer';
import path from 'path';
// Remove fs import, no longer needed for local storage
// import * as fs from 'fs'; 
import { S3Client } from '@aws-sdk/client-s3'; // Import S3Client
import multerS3 from 'multer-s3'; // Import multer-s3
import { Request } from 'express'; // Import Request type

// Import S3Client and bucket name from the central config file
import { s3Client, s3Bucket } from './config'; // Assuming s3Client and s3Bucket are exported from config.ts

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
    
    // Default path - might need adjustment if other upload types exist
    let finalKey = ''; 
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Keep suffix for filename uniqueness if needed

    if (file.fieldname === 'video') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFolderName = `report_${timestamp}`; // Consistent folder name
        const extension = path.extname(file.originalname); // Get extension
        // Construct the key for the original video within the report folder
        finalKey = `users/${userId}/${customer}/${project}/${reportFolderName}/original_video${extension}`;
        // Optionally add suffix if multiple videos could be uploaded simultaneously for the *exact* same report:
        // finalKey = `users/${userId}/${customer}/${project}/${reportFolderName}/original_video-${uniqueSuffix}${extension}`;
    } else if (file.fieldname === 'reportImage') {
        const reportKey = req.query.key ? decodeURIComponent(req.query.key as string) : null;
        const imgKey = req.query.imgKey as string; // imgKey is the original filename from the report json
        if (!reportKey || !imgKey) {
            // Fallback or error - Need a reliable way to get context for images
            // Log an error, but maybe let it proceed to a default path? Or reject?
            console.error('CRITICAL: Missing reportKey or imgKey for reportImage upload. Cannot determine correct S3 path.');
             // Rejecting the upload is safer than putting it in a random location
             return cb(new Error('Missing necessary context (reportKey or imgKey) to save report image.'));
        } else {
             // Construct a path based on the report's structure, ensuring it's within the user's space
             // Report key: users/{userId}/Customer/Project/report_ts/daily_report.json
             const reportPathParts = reportKey.split('/'); 
             if (reportPathParts.length >= 5 && reportPathParts[0] === 'users' && reportPathParts[1] === userId) {
                 const reportBaseKey = reportPathParts.slice(0, 5).join('/'); // users/userId/cust/proj/reportFolder
                 const imageFileName = path.basename(imgKey); // Use the filename provided in the query
                 finalKey = `${reportBaseKey}/extracted_frames/${imageFileName}`; // Use the specific filename
             } else {
                 console.error(`Could not parse reportKey '${reportKey}' for image path.`);
                 return cb(new Error('Invalid reportKey format for image path construction.'));
             }
        }
    } else if (file.fieldname === 'logo') {
        // Handle logo uploads (assuming they go to a profile/config area)
        const extension = path.extname(file.originalname);
        // Overwrite previous logos with a consistent name
        finalKey = `users/${userId}/profile/config/logo${extension}`; 
    } else {
         // Handle unexpected field names
         console.warn(`Unexpected file fieldname: ${file.fieldname}. Uploading to default location.`);
         const extension = path.extname(file.originalname);
         finalKey = `users/${userId}/uploads/unexpected-${file.fieldname}-${uniqueSuffix}${extension}`;
    }

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