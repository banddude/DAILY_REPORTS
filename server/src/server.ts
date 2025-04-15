import express from 'express';
import cors from 'cors';
import path from 'path'; // Import path module
import { generateReport } from './daily-report';
import { protect, ensureAuthenticated } from './authMiddleware';

// Routers & Initializers
import authRouter, { initializeAuthRoutes } from './routes/auth';
import s3AssetsRouter, { initializeS3AssetRoutes } from './routes/s3Assets';
import reportRouter, { initializeReportRoutes } from './routes/report';
import profileRouter, { initializeProfileRoutes } from './routes/profile';
import browseRouter, { initializeBrowseRoutes } from './routes/browse';

// Configurations
import { videoUpload, imageUpload } from './fileUploadConfig';
import { s3Client, s3Bucket, UPLOADS_DIR, DATA_DIR, port } from './config';

const app = express();

// Define path to the frontend build directory
// Assumes the compiled server.js is in server/dist, so ../ goes to server/, ../ goes to root
const frontendBuildPath = path.resolve(__dirname, '../../mobile-app/dist'); 

// --- Middleware Setup ---

// CORS (must be first)
app.use(
    cors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204
    })
);
app.use((req, res, next) => {
    res.setHeader('Vary', 'Origin');
    next();
});

// JSON Body Parser
app.use(express.json({ limit: '10mb' }));

// Serve static files from the React Native web build directory
app.use(express.static(frontendBuildPath));

// --- Initialize Routes with Dependencies ---
initializeAuthRoutes();
initializeReportRoutes(
    s3Client,
    s3Bucket,
    protect,
    ensureAuthenticated,
    videoUpload.single('video'),
    imageUpload.single('reportImage'),
    generateReport,
    UPLOADS_DIR
);
initializeS3AssetRoutes(s3Client, s3Bucket, protect, ensureAuthenticated);
initializeProfileRoutes(
    s3Client,
    s3Bucket,
    protect,
    ensureAuthenticated,
    imageUpload.single('logo'),
    UPLOADS_DIR
);
initializeBrowseRoutes(s3Client, s3Bucket, protect, ensureAuthenticated);

// --- Mount Routers ---

// API Routes (/api/*)
app.use('/api', authRouter);
app.use('/api', reportRouter);
app.use('/api', profileRouter);
app.use('/api', browseRouter);

// Mount S3 assets under /assets to avoid conflict with root
app.use('/assets', s3AssetsRouter);

// Serve frontend index.html for all other routes (SPA handling)
// This must be AFTER all API routes and static serving
app.get('*', (req, res) => {
  res.sendFile(path.resolve(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      // Log the error but still attempt to send a fallback or generic error
      console.error("Error sending index.html:", err);
      // Avoid sending the error stack trace to the client in production
      res.status(500).send('An error occurred serving the application.'); 
    }
  });
});

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} and host 0.0.0.0`);
}); 