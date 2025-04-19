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
    
    let finalKey = ''; 
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); 

    if (file.fieldname === 'video') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFolderName = `report_${timestamp}`; 
        const extension = path.extname(file.originalname); 
        finalKey = `users/${userId}/${customer}/${project}/${reportFolderName}/original_video${extension}`;
    } else if (file.fieldname === 'reportImage') {
        const reportKey = req.query.key ? decodeURIComponent(req.query.key as string) : null;
        const imgKey = req.query.imgKey as string; 
        if (!reportKey || !imgKey) {
            console.error('CRITICAL: Missing reportKey or imgKey for reportImage upload. Cannot determine correct S3 path.');
             return cb(new Error('Missing necessary context (reportKey or imgKey) to save report image.'));
        } else {
             const reportPathParts = reportKey.split('/'); 
             if (reportPathParts.length >= 5 && reportPathParts[0] === 'users' && reportPathParts[1] === userId) {
                 const reportBaseKey = reportPathParts.slice(0, 5).join('/'); 
                 const imageFileName = path.basename(imgKey); 
                 finalKey = `${reportBaseKey}/extracted_frames/${imageFileName}`; 
             } else {
                 console.error(`Could not parse reportKey '${reportKey}' for image path.`);
                 return cb(new Error('Invalid reportKey format for image path construction.'));
             }
        }
    } else if (file.fieldname === 'logo') {
        const extension = path.extname(file.originalname);
        finalKey = `users/${userId}/logo${extension}`; 
    } else {
         // Reject uploads with unexpected field names instead of using a fallback
         console.error(`Rejected upload: Unexpected file fieldname: ${file.fieldname}`);
         return cb(new Error(`Unsupported file fieldname: ${file.fieldname}`));
    }

    // Only proceed if a key was successfully generated
    if (finalKey) { 
        console.log(`Generated S3 key: ${finalKey}`);
        cb(null, finalKey);
    } else {
        // This should theoretically not be reached if all paths return or set finalKey
        console.error(`Failed to generate S3 key for fieldname: ${file.fieldname}`);
        cb(new Error('Internal error generating S3 key.'));
    }
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