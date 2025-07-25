import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import path from 'path';

// Gemini REST endpoint & key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY env var required');
}

function getVideoMimeType(videoPath: string): string {
  const ext = path.extname(videoPath).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.mov': return 'video/quicktime';
    case '.avi': return 'video/x-msvideo';
    case '.webm': return 'video/webm';
    case '.mkv': return 'video/x-matroska';
    case '.m4v': return 'video/x-m4v';
    default: return 'video/mp4'; // fallback
  }
}

async function uploadVideoToGemini(videoPath: string): Promise<string> {
  console.log(`Starting uploadVideoToGemini with path: ${videoPath}`);
  
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found at path: ${videoPath}`);
  }
  
  const size = fs.statSync(videoPath).size;
  console.log(`Video file exists, size: ${size} bytes`);
  
  if (size === 0) {
    throw new Error(`Video file is empty (0 bytes): ${videoPath}`);
  }
  
  const mimeType = getVideoMimeType(videoPath);
  console.log(`Uploading video with MIME type: ${mimeType}, size: ${size} bytes`);
  
  console.log('Starting Gemini upload request...');
  const start = await fetch(`${GEMINI_BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY!,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': size.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { display_name: path.basename(videoPath) } })
  });
  
  console.log(`Upload start response status: ${start.status}`);
  if (!start.ok) {
    const errorText = await start.text();
    console.error('Upload start failed:', errorText);
    throw new Error(`Upload start failed: ${start.status} ${errorText}`);
  }
  
  const uploadUrl = start.headers.get('x-goog-upload-url');
  console.log(`Got upload URL: ${uploadUrl ? 'YES' : 'NO'}`);
  if (!uploadUrl) throw new Error('No upload URL from Gemini');

  console.log('Reading video file and uploading...');
  const bytes = fs.readFileSync(videoPath);
  const fin = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Length': size.toString()
    },
    body: bytes
  });
  
  console.log(`Upload finalize response status: ${fin.status}`);
  if (!fin.ok) {
    const errorText = await fin.text();
    console.error('Upload finalize failed:', errorText);
    throw new Error(`Upload finalize failed: ${fin.status} ${errorText}`);
  }
  
  const response = await fin.json();
  console.log('Upload successful, file URI:', response.file?.uri);
  return response.file.uri;
}

async function waitUntilActive(fileUri: string): Promise<void> {
  const id = fileUri.split('/').pop();
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${GEMINI_BASE}/v1beta/files/${id}`, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY! }
    });
    const status = await res.json();
    console.log(`Gemini file status check ${i + 1}/30: ${status.state}`);
    if (status.state === 'ACTIVE') return;
    if (status.state === 'FAILED') {
      console.error('Gemini file processing failed. Status response:', JSON.stringify(status, null, 2));
      throw new Error(`Gemini processing failed: ${status.error?.message || 'Unknown error'}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timed out waiting for Gemini');
}

async function askGemini(fileUri: string, mimeType: string, systemPrompt: string): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
              { text: systemPrompt }
            ]
          }
        ]
      })
    }
  );
  const data = await res.json();
  
  // Log the full response for debugging
  console.log("Gemini API response status:", res.status);
  console.log("Gemini API response data:", JSON.stringify(data, null, 2));
  
  if (!res.ok) {
    throw new Error(`Gemini API request failed with status ${res.status}: ${JSON.stringify(data)}`);
  }
  
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  
  if (!text) {
    console.log("No text content found in Gemini response");
    if (data.error) {
      throw new Error(`Gemini API error: ${JSON.stringify(data.error)}`);
    }
  }
  
  return text;
}

export async function getDailyReportFromVideo(
  videoPath: string,
  cfg: any
): Promise<any> {
  try {
    const systemPromptContent = cfg.daily_report_system_prompt;
    const reportSchema = cfg.report_json_schema;
    
    console.log(`Using Gemini 2.5 for video analysis`);
    console.log(`Video path: ${videoPath}`); 

    if (!systemPromptContent || !reportSchema) {
      throw new Error('Required configuration (daily_report_system_prompt, report_json_schema) missing in config');
    }
    
    const mimeType = getVideoMimeType(videoPath);
    const fileUri = await uploadVideoToGemini(videoPath);
    await waitUntilActive(fileUri);
    
    const messageContent = await askGemini(fileUri, mimeType, systemPromptContent);
    
    if (!messageContent) {
      throw new Error("No content in response message from Gemini API");
    }
    
    let reportJson;
    try {
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : messageContent;
      reportJson = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse Gemini API response as JSON:", parseError);
      console.error("Raw response:", messageContent);
      throw new Error("Gemini API response could not be parsed as valid JSON");
    }

    return reportJson;
  } catch (error: any) {
    console.error("Error generating daily report from video:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    // Don't return null, throw the error so we can see what's actually failing
    throw new Error(`Daily report generation failed: ${error.message}`);
  }
}