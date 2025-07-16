import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable is required');
    process.exit(1);
}

/**
 * Upload video file to Gemini File API using resumable upload
 */
async function uploadVideoToGemini(videoPath: string): Promise<string> {
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;
    const mimeType = 'video/mp4'; // Assuming MP4 for now
    const displayName = path.basename(videoPath);

    console.log(`Uploading video: ${displayName} (${fileSize} bytes)`);

    // Step 1: Start resumable upload
    const startResponse = await fetch(`${GEMINI_API_BASE}/upload/v1beta/files`, {
        method: 'POST',
        headers: {
            'x-goog-api-key': GEMINI_API_KEY!,
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file: {
                display_name: displayName
            }
        })
    });

    if (!startResponse.ok) {
        throw new Error(`Failed to start upload: ${startResponse.status} ${startResponse.statusText}`);
    }

    const uploadUrl = startResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
        throw new Error('No upload URL received from Gemini API');
    }

    console.log('Upload URL received, uploading video data...');

    // Step 2: Upload the actual video data
    const videoData = fs.readFileSync(videoPath);
    
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Length': fileSize.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: videoData
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload video: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const fileInfo = await uploadResponse.json();
    console.log('Video uploaded successfully:', fileInfo.file.uri);
    
    return fileInfo.file.uri;
}

/**
 * Wait for file to be processed by Gemini
 */
async function waitForFileProcessing(fileUri: string, maxAttempts: number = 30): Promise<void> {
    const fileName = fileUri.split('/').pop();
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Checking file processing status (attempt ${attempt}/${maxAttempts})...`);
        
        const response = await fetch(`${GEMINI_API_BASE}/v1beta/files/${fileName}`, {
            headers: {
                'x-goog-api-key': GEMINI_API_KEY!
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to check file status: ${response.status} ${response.statusText}`);
        }

        const fileStatus = await response.json();
        console.log(`File state: ${fileStatus.state}`);

        if (fileStatus.state === 'ACTIVE') {
            console.log('File processing complete!');
            return;
        } else if (fileStatus.state === 'FAILED') {
            throw new Error('File processing failed');
        }

        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('File processing timeout - took too long to process');
}

/**
 * Generate content from uploaded video using Gemini API
 */
async function generateContentFromVideo(fileUri: string, prompt: string): Promise<string> {
    console.log('Generating content from video...');
    
    const response = await fetch(`${GEMINI_API_BASE}/v1beta/models/gemini-2.0-flash:generateContent`, {
        method: 'POST',
        headers: {
            'x-goog-api-key': GEMINI_API_KEY!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {
                        file_data: {
                            mime_type: 'video/mp4',
                            file_uri: fileUri
                        }
                    },
                    {
                        text: prompt
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate content: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini API');
    }

    const content = result.candidates[0].content.parts[0].text;
    console.log('Content generated successfully');
    
    return content;
}

/**
 * Main function to process video and extract action items
 */
export async function processVideoForActionItems(videoPath: string): Promise<string> {
    try {
        console.log('Starting Gemini video processing...');
        
        // Upload video to Gemini
        const fileUri = await uploadVideoToGemini(videoPath);
        
        // Wait for processing
        await waitForFileProcessing(fileUri);
        
        // Generate action items
        const prompt = "Please analyze this video and identify exactly 3 action items that should be taken based on what you see and hear. List them clearly as numbered items.";
        const actionItems = await generateContentFromVideo(fileUri, prompt);
        
        console.log('Video processing complete!');
        return actionItems;
        
    } catch (error) {
        console.error('Error processing video with Gemini:', error);
        throw error;
    }
}

/**
 * Main function to process video and generate a JSON report using specified schema.
 */
export async function generateReportFromVideo(videoPath: string, systemPrompt: string, reportSchema: object): Promise<object> {
    try {
        console.log('Starting Gemini video to report generation...');

        // Upload video to Gemini
        const fileUri = await uploadVideoToGemini(videoPath);

        // Wait for processing
        await waitForFileProcessing(fileUri);

        // Generate report using schema-based prompt
        const prompt = `${systemPrompt}\n\nPlease analyze this video and generate a daily report in JSON based on what you see and hear. Never mention the video directly. Your report should be as though it was written by the person in the video:\n\n${JSON.stringify(reportSchema, null, 2)}`;
        
        const reportContent = await generateContentFromVideo(fileUri, prompt);

        // Parse the JSON response (handle potential markdown wrapping)
        let reportJson;
        try {
            // For Gemini, might need to extract JSON from markdown code blocks
            const jsonMatch = reportContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : reportContent;
            reportJson = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("Failed to parse Gemini video response as JSON:", parseError);
            console.error("Raw response:", reportContent);
            throw new Error("Gemini video response could not be parsed as valid JSON");
        }

        console.log('Video report generation complete!');
        return reportJson;

    } catch (error) {
        console.error('Error processing video with Gemini for report generation:', error);
        throw error;
    }
}