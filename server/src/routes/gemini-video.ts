import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processVideoForActionItems } from '../gemini-video';

const router = express.Router();

// Configure multer for temporary file storage
const upload = multer({
    dest: '/tmp/gemini-videos/',
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept video files
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

// Ensure temp directory exists
const tempDir = '/tmp/gemini-videos/';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * POST /api/gemini-video
 * Upload a video file and get 3 action items using Gemini
 */
router.post('/gemini-video', upload.single('video'), async (req, res) => {
    console.log('Received Gemini video processing request');
    
    try {
        if (!req.file) {
            res.status(400).json({ 
                error: 'No video file provided' 
            });
            return;
        }

        console.log(`Processing video: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Process video with Gemini
        const actionItems = await processVideoForActionItems(req.file.path);
        
        // Clean up temp file
        try {
            fs.unlinkSync(req.file.path);
            console.log('Temporary file cleaned up');
        } catch (cleanupError) {
            console.warn('Failed to clean up temp file:', cleanupError);
        }
        
        // Return action items
        res.json({
            success: true,
            filename: req.file.originalname,
            actionItems: actionItems
        });
        
    } catch (error: any) {
        console.error('Error processing video with Gemini:', error);
        
        // Clean up temp file if it exists
        if (req.file?.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.warn('Failed to clean up temp file after error:', cleanupError);
            }
        }
        
        res.status(500).json({
            error: 'Failed to process video',
            message: error.message
        });
        return;
    }
});

/**
 * GET /api/gemini-video/test
 * Simple test endpoint to verify the route is working
 */
router.get('/gemini-video/test', (req, res) => {
    res.json({
        message: 'Gemini video endpoint is working!',
        timestamp: new Date().toISOString()
    });
});

export default router;