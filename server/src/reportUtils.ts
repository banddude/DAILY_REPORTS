import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from 'fs/promises';
import path from 'path';
import { convertHtmlToPdfAndUpload } from './pdfUtils';

// --- Path Constants (relative to project root) ---
// Assuming this file lives in server/src/, like daily-report.ts
const PROJECT_ROOT = path.resolve(__dirname, '..'); 
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public'); 
const REPORT_VIEWER_HTML_PATH = path.join(PUBLIC_DIR, 'report-viewer.html');

// --- S3 Setup (Dependencies to be injected or passed) ---
// let s3Client: S3Client; // Assume s3Client is passed or initialized elsewhere
// let s3Bucket: string;  // Assume s3Bucket is passed or initialized elsewhere

interface ReportData {
    reportAssetsS3Urls?: { logoUrl?: string; baseUrl?: string };
    // Add other properties from your reportData structure if needed for replacements
    [key: string]: any; 
}

/**
 * Generates the report-viewer.html content by injecting JSON data 
 * and uploads it to the specified S3 key.
 *
 * @param s3Client - The S3 client instance.
 * @param s3Bucket - The S3 bucket name.
 * @param reportData - The JSON report data object.
 * @param userId - The user's UUID.
 * @param customerName - The customer name.
 * @param projectName - The project name.
 * @param reportFolderName - The specific folder name for this report (e.g., report_YYYY-MM-DDTHH-mm-ss-SSSZ).
 * @returns The S3 key where the HTML was uploaded.
 */
export async function generateAndUploadViewerHtml(
    s3Client: S3Client,
    s3Bucket: string,
    reportData: ReportData,
    userId: string,
    customerName: string,
    projectName: string,
    reportFolderName: string
): Promise<string> {

    // 1. Construct the S3 key for the viewer HTML
    const reportBaseKey = `users/${userId}/${customerName}/${projectName}/${reportFolderName}`;
    const viewerHtmlS3Key = `${reportBaseKey}/report-viewer.html`;
    console.log(`[generateAndUploadViewerHtml] Target S3 Key: ${viewerHtmlS3Key}`);

    // 2. Read the HTML template
    console.log(`[generateAndUploadViewerHtml] Reading HTML template from: ${REPORT_VIEWER_HTML_PATH}`);
    let htmlContent = await readFile(REPORT_VIEWER_HTML_PATH, 'utf-8');

    // 3. Inject report data into the HTML template
    // Ensure the reportData has the necessary structure for replacement
    // Example: Replace a placeholder like {{REPORT_DATA_JSON}}
    htmlContent = htmlContent.replace('{{REPORT_DATA_JSON}}', JSON.stringify(reportData));
    
    // Add logo URL if available in reportData (adjust placeholder as needed)
    const logoS3Url = reportData.reportAssetsS3Urls?.logoUrl;
    if (logoS3Url) {
        // Example placeholder: {{LOGO_URL}}
        htmlContent = htmlContent.replace('{{LOGO_URL}}', logoS3Url);
        console.log(`[generateAndUploadViewerHtml] Injected logo URL: ${logoS3Url}`);
    } else {
        // Handle case where logo is missing - replace with empty or default
        htmlContent = htmlContent.replace('{{LOGO_URL}}', ''); // Or a placeholder image path
        console.log(`[generateAndUploadViewerHtml] No logo URL found in report data.`);
    }

    // Example: Replace image URLs if stored in reportData
    // This depends heavily on how your HTML template consumes image URLs
    // Assuming reportData.images = [{fileName: "..."}, ...] and reportAssetsS3Urls.baseUrl exists
    // if (reportData.images && reportData.reportAssetsS3Urls?.baseUrl) {
    //     const imageBase = reportData.reportAssetsS3Urls.baseUrl;
    //     reportData.images.forEach((img: any, index: number) => {
    //         const imageUrl = `${imageBase}extracted_frames/${img.fileName}`;
    //         const placeholder = new RegExp(`{{\s*IMAGE_URL_${index}\s*}}`, 'g');
    //         htmlContent = htmlContent.replace(placeholder, imageUrl);
    //     });
    // }
    
    console.log('[generateAndUploadViewerHtml] Finished replacing placeholders in HTML template.');

    // 4. Upload the modified HTML to S3
    const putHtmlCommand = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: viewerHtmlS3Key,
        Body: htmlContent,
        ContentType: 'text/html',
        // ACL: 'public-read', // REMOVED AGAIN - Bucket disallows ACLs.
        // Public access MUST be handled by Bucket Policy in AWS S3 settings.
        // Add cache-busting headers
        CacheControl: 'no-cache, no-store, must-revalidate',
        Expires: new Date(0) // Set expires header to epoch time (already expired)
    });

    console.log(`[generateAndUploadViewerHtml] Uploading generated HTML to S3 bucket: ${s3Bucket}, Key: ${viewerHtmlS3Key} with Cache-Control`);
    await s3Client.send(putHtmlCommand);
    console.log(`[generateAndUploadViewerHtml] Successfully uploaded report viewer HTML to ${viewerHtmlS3Key}`);

    // 5. Generate PDF from the uploaded HTML
    const htmlUrl = `https://${s3Bucket}.s3.us-east-1.amazonaws.com/${viewerHtmlS3Key}`;
    const pdfS3Key = `${reportBaseKey}/report-viewer.pdf`;
    
    console.log(`[generateAndUploadViewerHtml] Converting HTML to PDF: ${htmlUrl}`);
    await convertHtmlToPdfAndUpload(s3Client, s3Bucket, htmlUrl, pdfS3Key);
    console.log(`[generateAndUploadViewerHtml] Successfully uploaded PDF to ${pdfS3Key}`);

    return viewerHtmlS3Key;
} 