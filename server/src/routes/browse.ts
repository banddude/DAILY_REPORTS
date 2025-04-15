import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const router = Router();

// Dependency placeholders
let s3Client: S3Client;
let s3Bucket: string;
let protectMiddleware: RequestHandler;
let ensureAuthenticatedHelper: (req: Request, res: Response) => string | null;

// Initializer function
export const initializeBrowseRoutes = (
    client: S3Client,
    bucket: string,
    protect: RequestHandler,
    ensureAuth: (req: Request, res: Response) => string | null
) => {
    s3Client = client;
    s3Bucket = bucket;
    protectMiddleware = protect;
    ensureAuthenticatedHelper = ensureAuth;
};

// GET Endpoint to browse S3 for customers/projects/reports
router.get('/browse-reports', (req, res, next) => protectMiddleware(req, res, next), async (req: Request, res: Response): Promise<void> => {
    const userId = ensureAuthenticatedHelper(req, res);
    if (!userId) return;

    const customer = req.query.customer as string | undefined;
    const project = req.query.project as string | undefined;

    let userSpecificPrefix = `users/${userId}/`;
    if (customer && project) {
        userSpecificPrefix += `${customer}/${project}/`;
    } else if (customer) {
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
        const command = new ListObjectsV2Command(listParams);
        const data = await s3Client.send(command);

        // Extract folder names from CommonPrefixes or object keys if no delimiter
        let items: string[] = [];
        if (data.CommonPrefixes && data.CommonPrefixes.length > 0) {
            // Folders found
            items = data.CommonPrefixes.map(commonPrefix => {
                return commonPrefix.Prefix?.substring(userSpecificPrefix.length).replace(/\/$/, '') || '';
            }).filter(name => name !== '');
        } else if (data.Contents && data.Contents.length > 0) {
            // Files found (likely at the report level)
            items = data.Contents
                .map(content => content.Key?.substring(userSpecificPrefix.length) || '')
                .filter(name => name.endsWith('.json') && name !== 'profile.json'); // Filter for report JSON files
        }
        
        items.sort(); 

        console.log(`User ${userId} found items: ${items.join(', ')}`);
        res.status(200).json({ items });

    } catch (error: any) {
        console.error(`User ${userId}: Error listing S3 objects with prefix ${userSpecificPrefix}:`, error);
        res.status(500).json({ error: `Failed to browse S3: ${error.message}` });
    }
});

export default router; 