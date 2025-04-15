"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeS3AssetRoutes = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const stream_1 = require("stream");
const router = (0, express_1.Router)();
// Dependency placeholders - these will be injected
let s3Client;
let s3Bucket;
let protectMiddleware;
let ensureAuthenticatedHelper;
// Initializer function to inject dependencies
const initializeS3AssetRoutes = (client, bucket, protect, // Pass the protect middleware
ensureAuth // Pass the helper function
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
};
exports.initializeS3AssetRoutes = initializeS3AssetRoutes;
// Common function to handle fetching and streaming S3 object
const streamS3Object = (req, res, purpose) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId)
        return;
    const s3Key = req.query.key;
    if (!s3Key) {
        res.status(400).json({ error: "Missing 'key' query parameter for the S3 asset." });
        return;
    }
    if (!s3Key.startsWith(`users/${userId}/`)) {
        console.warn(`Auth violation: User ${userId} attempted to ${purpose} key ${s3Key}`);
        res.status(403).json({ error: "Forbidden access." });
        return;
    }
    console.log(`User ${userId} attempting to fetch static file for ${purpose} from S3: ${s3Key}`);
    const getObjectParams = {
        Bucket: s3Bucket,
        Key: s3Key,
    };
    try {
        if (!s3Client || !s3Bucket) {
            throw new Error("S3 client or bucket not initialized in s3Assets module.");
        }
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const data = yield s3Client.send(command);
        if (!data.Body || !(data.Body instanceof stream_1.Readable)) {
            throw new Error("S3 GetObject response body is missing or not readable.");
        }
        // Set Content-Type based on file extension
        const extension = path_1.default.extname(s3Key).toLowerCase();
        let contentType = 'application/octet-stream'; // Default
        if (extension === '.html')
            contentType = 'text/html';
        else if (extension === '.css')
            contentType = 'text/css';
        else if (extension === '.js')
            contentType = 'application/javascript';
        else if (extension === '.json')
            contentType = 'application/json';
        else if ('.jpg.jpeg'.includes(extension))
            contentType = 'image/jpeg';
        else if (extension === '.png')
            contentType = 'image/png';
        else if (extension === '.pdf')
            contentType = 'application/pdf';
        // Add more MIME types as needed for view/edit
        res.setHeader('Content-Type', data.ContentType || contentType); // Use S3 content type if available
        if (data.ContentLength) {
            res.setHeader('Content-Length', data.ContentLength.toString());
        }
        // Pipe the S3 object stream directly to the response
        data.Body.pipe(res);
    }
    catch (error) {
        console.error(`User ${userId}: Error fetching ${purpose} asset ${s3Key} from S3:`, error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send(`${purpose === 'view' ? 'File' : 'Editor asset'} not found in S3.`);
        }
        else {
            res.status(500).send(`Failed to fetch ${purpose} asset from S3: ${error.message}`);
        }
    }
});
// GET endpoint to serve static files from S3 (Viewer)
router.get('/view-s3-asset', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield streamS3Object(req, res, 'view');
}));
// GET endpoint to serve static files from S3 (Editor - If Applicable)
router.get('/edit-s3-asset', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield streamS3Object(req, res, 'edit');
}));
exports.default = router;
