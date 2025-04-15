"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const daily_report_1 = require("./daily-report");
const authMiddleware_1 = require("./authMiddleware");
// Routers & Initializers
const auth_1 = __importStar(require("./routes/auth"));
const s3Assets_1 = __importStar(require("./routes/s3Assets"));
const report_1 = __importStar(require("./routes/report"));
const profile_1 = __importStar(require("./routes/profile"));
const browse_1 = __importStar(require("./routes/browse"));
// Configurations
const fileUploadConfig_1 = require("./fileUploadConfig");
const config_1 = require("./config");
const app = (0, express_1.default)();
// --- Middleware Setup ---
// CORS (must be first)
app.use((0, cors_1.default)({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use((req, res, next) => {
    res.setHeader('Vary', 'Origin');
    next();
});
// JSON Body Parser
app.use(express_1.default.json({ limit: '10mb' }));
// --- Initialize Routes with Dependencies ---
(0, auth_1.initializeAuthRoutes)();
(0, report_1.initializeReportRoutes)(config_1.s3Client, config_1.s3Bucket, authMiddleware_1.protect, authMiddleware_1.ensureAuthenticated, fileUploadConfig_1.videoUpload.single('video'), fileUploadConfig_1.imageUpload.single('reportImage'), daily_report_1.generateReport, config_1.UPLOADS_DIR);
(0, s3Assets_1.initializeS3AssetRoutes)(config_1.s3Client, config_1.s3Bucket, authMiddleware_1.protect, authMiddleware_1.ensureAuthenticated);
(0, profile_1.initializeProfileRoutes)(config_1.s3Client, config_1.s3Bucket, authMiddleware_1.protect, authMiddleware_1.ensureAuthenticated, fileUploadConfig_1.imageUpload.single('logo'), config_1.UPLOADS_DIR);
(0, browse_1.initializeBrowseRoutes)(config_1.s3Client, config_1.s3Bucket, authMiddleware_1.protect, authMiddleware_1.ensureAuthenticated);
// --- Mount Routers ---
// API Routes (/api/*)
app.use('/api', auth_1.default);
app.use('/api', report_1.default);
app.use('/api', profile_1.default);
app.use('/api', browse_1.default);
// Root Routes (/*)
app.use('/', s3Assets_1.default);
// Static file serving removed - Server is API only
// --- Start Server ---
app.listen(config_1.port, '0.0.0.0', () => {
    console.log(`Server listening on port ${config_1.port} and host 0.0.0.0`);
});
