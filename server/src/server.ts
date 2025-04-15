import express from 'express';
import cors from 'cors';
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

// Root Routes (/*)
app.use('/', s3AssetsRouter);

// Static file serving removed - Server is API only

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} and host 0.0.0.0`);
}); 