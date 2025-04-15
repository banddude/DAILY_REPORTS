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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBrowseRoutes = void 0;
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const router = (0, express_1.Router)();
// Dependency placeholders
let s3Client;
let s3Bucket;
let protectMiddleware;
let ensureAuthenticatedHelper;
// Initializer function
const initializeBrowseRoutes = (client, bucket, protect, ensureAuth) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
};
exports.initializeBrowseRoutes = initializeBrowseRoutes;
// GET Endpoint to browse S3 for customers/projects/reports
router.get('/browse-reports', (req, res, next) => protectMiddleware(req, res, next), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId)
        return;
    const customer = req.query.customer;
    const project = req.query.project;
    let userSpecificPrefix = `users/${userId}/`;
    if (customer && project) {
        userSpecificPrefix += `${customer}/${project}/`;
    }
    else if (customer) {
        userSpecificPrefix += `${customer}/`;
    }
    console.log(`Browsing S3 for user ${userId} with prefix: '${userSpecificPrefix}'`);
    const listParams = {
        Bucket: s3Bucket,
        Prefix: userSpecificPrefix,
        Delimiter: '/'
    };
    try {
        if (!s3Client || !s3Bucket) {
            throw new Error("S3 client or bucket not initialized in browse module.");
        }
        const command = new client_s3_1.ListObjectsV2Command(listParams);
        const data = yield s3Client.send(command);
        // Extract folder names from CommonPrefixes or object keys if no delimiter
        let items = [];
        if (data.CommonPrefixes && data.CommonPrefixes.length > 0) {
            // Folders found
            items = data.CommonPrefixes.map(commonPrefix => {
                var _a;
                return ((_a = commonPrefix.Prefix) === null || _a === void 0 ? void 0 : _a.substring(userSpecificPrefix.length).replace(/\/$/, '')) || '';
            }).filter(name => name !== '');
        }
        else if (data.Contents && data.Contents.length > 0) {
            // Files found (likely at the report level)
            items = data.Contents
                .map(content => { var _a; return ((_a = content.Key) === null || _a === void 0 ? void 0 : _a.substring(userSpecificPrefix.length)) || ''; })
                .filter(name => name.endsWith('.json') && name !== 'profile.json'); // Filter for report JSON files
        }
        items.sort();
        console.log(`User ${userId} found items: ${items.join(', ')}`);
        res.status(200).json({ items });
    }
    catch (error) {
        console.error(`User ${userId}: Error listing S3 objects with prefix ${userSpecificPrefix}:`, error);
        res.status(500).json({ error: `Failed to browse S3: ${error.message}` });
    }
}));
exports.default = router;
