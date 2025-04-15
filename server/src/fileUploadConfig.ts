import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
// Import UPLOADS_DIR from the central config file
import { UPLOADS_DIR } from './config';

// Ensure uploads directory exists
// This check is important here as this module might be imported before server.ts fully runs
if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Uploads directory not found at ${UPLOADS_DIR}, creating...`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure Multer for general file storage (used for videos)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR); // Use imported constant for uploads directory
    },
    filename: function (req, file, cb) {
        // Use original filename + timestamp to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

export const videoUpload = multer({
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
export const imageUpload = multer({
    storage: multer.memoryStorage(), // Store image in memory temporarily
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