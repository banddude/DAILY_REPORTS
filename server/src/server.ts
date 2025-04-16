import express from 'express';
import cors from 'cors';
import path from 'path'; // Import path module
import { generateReport } from './daily-report';
import { protect, ensureAuthenticated } from './authMiddleware';
import fs from 'fs'; // Add fs import at the top if not already present
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { supabase } from './config';

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
// On Railway, the 'copy-assets' build step copies mobile-app/dist/* into server/dist/
// So, the assets are served relative to __dirname (which is server/dist)
const frontendBuildPath = path.resolve(__dirname);

// --- Add Logging for Debugging Paths (Again) ---
console.log(`[Server Startup] Calculated frontend build path: ${frontendBuildPath}`);
console.log(`[Server Startup] Current working directory (cwd): ${process.cwd()}`);
console.log(`[Server Startup] Script directory (__dirname): ${__dirname}`);
// --- End Logging ---

// --- Health Check Endpoint ---
// Add this BEFORE other middleware/routes that might interfere
app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

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
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Vary', 'Origin');
    next();
});

// JSON Body Parser
app.use(express.json({ limit: '10mb' }));

// --- Add More Debug Logging ---
const resolvedIndexPath = path.resolve(frontendBuildPath, 'index.html');
console.log(`[Server Startup] Checking for index.html at: ${resolvedIndexPath}`);
try {
  fs.accessSync(resolvedIndexPath, fs.constants.R_OK);
  console.log(`[Server Startup] index.html FOUND and is readable at: ${resolvedIndexPath}`);
} catch (err) {
  console.error(`[Server Startup] index.html NOT FOUND or not readable at: ${resolvedIndexPath}`, err);
}
console.log(`[Server Startup] Listing contents of frontendBuildPath (${frontendBuildPath}):`);
try {
  const files = fs.readdirSync(frontendBuildPath);
  console.log(files.join('\n'));
} catch (err) {
  console.error(`[Server Startup] Error listing directory ${frontendBuildPath}:`, err);
}
// --- End More Debug Logging ---

// Serve static files from the React Native web build directory
app.use(express.static(frontendBuildPath, { index: 'index.html' })); // Explicitly set index

// --- Initialize Routes with Dependencies ---
initializeAuthRoutes();
initializeReportRoutes(
    s3Client,
    s3Bucket,
    protect,
    ensureAuthenticated,
    videoUpload.single('video'),
    imageUpload.single('reportImage'),
    generateReport
);
initializeS3AssetRoutes(s3Client, s3Bucket, protect, ensureAuthenticated);
initializeProfileRoutes(
    s3Client,
    s3Bucket,
    protect,
    ensureAuthenticated,
    imageUpload.single('logo')
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

// --- Inline Auth Routes (Temporary Debugging) ---

// Login Endpoint (moved from auth.ts)

// --- End Inline Auth Routes ---

// --- Add Logging Before Catch-All ---
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Request Log] Reached catch-all for path: ${req.path}`);
  next();
});
// --- End Logging Before Catch-All ---

// Serve frontend index.html for all other routes (SPA handling)
// This must be AFTER all API routes and static serving
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.resolve(frontendBuildPath, 'index.html'), (err: any) => {
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