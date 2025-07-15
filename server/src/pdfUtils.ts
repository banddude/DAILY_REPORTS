import puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';

/**
 * Converts HTML URL to PDF and uploads to S3
 * @param s3Client - The S3 client instance
 * @param s3Bucket - The S3 bucket name
 * @param htmlUrl - The URL of the HTML report to convert
 * @param s3Key - The S3 key where the PDF should be uploaded
 * @returns Promise<string> - The S3 key where the PDF was uploaded
 */
export async function convertHtmlToPdfAndUpload(
    s3Client: S3Client,
    s3Bucket: string,
    htmlUrl: string,
    s3Key: string
): Promise<string> {
    console.log(`[convertHtmlToPdfAndUpload] Converting ${htmlUrl} to PDF...`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to the URL
        await page.goto(htmlUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Generate PDF with print-like settings
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        // Upload PDF to S3
        const uploadParams = {
            Bucket: s3Bucket,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        };
        
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`[convertHtmlToPdfAndUpload] PDF uploaded to S3: ${s3Key}`);
        
        return s3Key;
        
    } finally {
        await browser.close();
    }
}