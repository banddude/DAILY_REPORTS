import dotenv from 'dotenv';
dotenv.config(); 

import OpenAI from 'openai';
import * as fs from "fs";
import { exec } from "child_process";
import path from 'path'; // Need path module
import { promisify } from 'util';
import { toFile } from 'openai/uploads'; // Add this import
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"; // Import S3 client
import { readFile, writeFile, access, mkdir, copyFile, unlink, readdir, rm } from 'fs/promises'; // Use fs.promises consistently
import { generateAndUploadViewerHtml } from './reportUtils'; // Import the new helper
import { supabase } from './config'; // <<< Import Supabase client

// --- Path Constants (relative to project root) ---
const PROJECT_ROOT = path.resolve(__dirname, '..'); // Resolve to the root directory (one level up from dist/src/)
const PROCESSING_BASE_DIR = path.join(PROJECT_ROOT, 'processing_reports');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public'); // Path to the public directory
const DATA_DIR = path.join(PROJECT_ROOT, 'data'); // Path to the data directory
const REPORT_VIEWER_HTML_PATH = path.join(PUBLIC_DIR, 'report-viewer.html');
const LOGO_PNG_PATH = path.join(PUBLIC_DIR, 'logo.png');

// Ensure the base processing directory exists on startup
// Using async IIFE for top-level await compatibility with ensureDir
(async () => {
    try {
        await ensureDir(PROCESSING_BASE_DIR);
        console.log(`Ensured base processing directory exists: ${PROCESSING_BASE_DIR}`);
    } catch (error) {
        console.error(`CRITICAL: Failed to create base processing directory ${PROCESSING_BASE_DIR}. Exiting.`, error);
        process.exit(1);
    }
})();

// --- S3 Setup ---
const s3Client = new S3Client({}); 
const s3Bucket = process.env.AWS_S3_BUCKET;
if (!s3Bucket) {
    console.error("CRITICAL ERROR: AWS_S3_BUCKET environment variable is not set. Cannot upload reports.");
    process.exit(1); 
}

// Configuration for OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const execAsync = promisify(exec);

// Define interface for the transcription result needed
interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

interface FullTranscription {
  text: string;
  words: TranscriptionWord[];
  // Potentially other fields from verbose_json if needed
}

// User-specific profile helper - Get profile from SUPABASE
async function getUserProfile(userId: string): Promise<any> {
  try {
    console.log(`Fetching user profile from Supabase for user: ${userId}`);

    // Select ALL columns from the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*') // Fetch all columns
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`Supabase error fetching profile for user ${userId}:`, profileError);
      if (profileError.code === 'PGRST116') {
         throw new Error(`User profile not found in Supabase: ${userId}. Ensure profile exists.`);
      }
      throw new Error(`Supabase error: ${profileError.message}`);
    }

    if (!profileData) {
       throw new Error(`User profile not found in Supabase: ${userId}. Ensure profile exists.`);
    }
    
    console.log(`Successfully fetched profile from Supabase for user ${userId}`);

    // Reconstruct the nested profile structure using ALL fetched data
    const reconstructedProfile = {
        // Top-level fields (map snake_case to camelCase/expected names)
        name: profileData.full_name, 
        username: profileData.username,
        email: profileData.email, // Assuming email might be needed downstream (though not fetched explicitly before)
        phone: profileData.phone,
        
        // Nested company object
        company: {
            name: profileData.company_name,
            street: profileData.company_street, // Map address fields
            unit: profileData.company_unit,
            city: profileData.company_city,
            state: profileData.company_state,
            zip: profileData.company_zip,
            phone: profileData.company_phone,
            website: profileData.company_website
        },
        
        // Nested config object
        config: {
            chatModel: profileData.config_chat_model,
            whisperModel: profileData.config_whisper_model,
            systemPrompt: profileData.config_system_prompt,
            // Parse JSON string back into an object, handle null/undefined
            reportJsonSchema: profileData.config_report_json_schema 
                                ? JSON.parse(profileData.config_report_json_schema) 
                                : null, 
            logoFilename: profileData.config_logo_filename
        }
    };

    return reconstructedProfile;

  } catch (error: any) {
    // Catch errors from the try block (includes Supabase errors thrown)
    console.error(`Error in getUserProfile for ${userId}:`, error);
    // Re-throw the specific error message
    throw new Error(`Failed to get user profile from Supabase: ${error.message}`);
  }
}

// --- HARDCODED WHISPER MODEL ---
const WHISPER_MODEL = "whisper-1";

// Modify getDailyReport to accept the full transcription object AND profileData
async function getDailyReport(transcription: FullTranscription, profileData: any) {
  try {
    // Prepare a more readable transcript format for the LLM, including timestamps
    const timedTranscript = transcription.words.map(w => `[${w.start.toFixed(2)}] ${w.word}`).join(' ');

    // --- Read Config from profileData (using reconstructed structure) ---
    const chatModel = profileData.config.chatModel; 
    const systemPromptContent = profileData.config.systemPrompt;
    const reportSchema = profileData.config.reportJsonSchema;
    // ---------------------------------------------------

    console.log(`Using chat model: ${chatModel}`); 

    // --- Add checks to ensure config values exist --- 
    if (!chatModel || !systemPromptContent || !reportSchema) {
      throw new Error('Required configuration (chatModel, systemPrompt, reportJsonSchema) missing in profile.json');
    }
    // --------------------------------------------------

    const response = await openai.chat.completions.create({
      model: chatModel,
      messages: [
        {
          role: "system",
          content: systemPromptContent, // Use variable
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Here is the timed transcript of a video walkthrough:\n\n---\n${timedTranscript}\n---\n\nPlease generate a daily report in JSON based *only* on the content of this transcript and adhering strictly to the following JSON schema. Never mention the transcript or video walkthrough directly. Your report is to be as though it was writteen by the person doing the walkthrough.:` },
            { type: "text", text: JSON.stringify(reportSchema) }
          ]
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    // Ensure a response is received
    if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
      throw new Error("No valid response message received from OpenAI");
    }

    // Extract and parse the content from the first choice (corrected access)
    const messageContent = response.choices[0].message.content;
    if (!messageContent) {
      throw new Error("No content in response message from OpenAI");
    }
    
    const reportJson = JSON.parse(messageContent);

    // DON'T save the report yet - we need to modify image filenames first
    // const reportFilePath = 'daily_report.json';
    // await fs.promises.writeFile(reportFilePath, JSON.stringify(reportJson, null, 2));
    // console.log(`Daily report saved to ${reportFilePath}`);

    return reportJson; // Return the parsed JSON object
  } catch (error) {
    console.error("Error generating daily report:", error);
    return null; // Indicate failure by returning null
  }
}

// --- Frame Extraction Logic --- 

interface TimestampData {
  timestamp: number;
  reason: string;
}

interface FrameData {
  timestamps: TimestampData[];
}

/**
 * Creates a directory if it doesn't exist.
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath); // Use fs.promises.access
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Creating directory (ensureDir): ${dirPath}`); // Log path being created
      await mkdir(dirPath, { recursive: true }); // Use fs.promises.mkdir
    } else {
      throw error;
    }
  }
}

/**
 * Extracts a frame from a video file at a specific timestamp using ffmpeg.
 */
async function extractFrame(videoPath: string, timestamp: number, outputDir: string, outputFilename: string): Promise<void> {
  const outputPath = path.join(outputDir, outputFilename); // outputDir is already absolute
  const command = `ffmpeg -ss ${timestamp.toFixed(6)} -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`;
  console.log(`Executing frame extraction command: ${command}`); // Log command
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(`extractFrame stdout [${timestamp.toFixed(2)}s]:`, stdout);
    if (stderr) console.warn(`extractFrame stderr [${timestamp.toFixed(2)}s]:`, stderr);
    console.log(`Extracted frame at ${timestamp.toFixed(2)}s to ${outputPath}`);
  } catch (error: any) {
    console.error(`Error extracting frame at ${timestamp.toFixed(2)}s:`, error); // Log full error
    // Decide if you want to throw or just log and continue
    // throw error; // Uncomment to stop processing if one frame fails
  }
}

/**
 * Reads frame data and extracts frames from the video.
 */
async function extractFramesFromData(videoPath: string, frameDataPath: string, outputDir: string): Promise<void> {
  try {
    await ensureDir(outputDir);
    const jsonData = await readFile(frameDataPath, 'utf-8'); // Use fs.promises.readFile
    const frameData: FrameData = JSON.parse(jsonData);

    if (!frameData.timestamps || frameData.timestamps.length === 0) {
      console.log('No timestamps found in the data file.');
      return;
    }

    console.log(`Found ${frameData.timestamps.length} timestamps. Starting frame extraction...`);

    const extractionPromises = frameData.timestamps.map((item) => {
      const timestamp = item.timestamp;
      const outputFilename = `frame_${timestamp.toFixed(2)}.jpg`;
      return extractFrame(videoPath, timestamp, outputDir, outputFilename);
    });

    await Promise.all(extractionPromises);
    console.log('Frame extraction completed.');

  } catch (err: any) {
    if (err.code === 'ENOENT' && err.path === frameDataPath) {
      console.error(`Error: Frame data file not found at ${frameDataPath}.`);
      console.error('Ensure test.ts was run successfully to generate frame data.');
    } else {
      console.error('Error processing frames:', err.message);
    }
  }
}

// --- Video/Audio Processing Logic ---

/**
 * Convert a video (.mov or .mp4) file to an MP3 audio file using ffmpeg.
 */
async function convertVideoToAudio(videoPath: string, audioPath: string): Promise<void> {
  try {
    await access(audioPath); // Use fs.promises.access
    console.log(`Audio file ${audioPath} already exists. Skipping conversion.`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Converting video ${videoPath} to audio ${audioPath}...`);
      const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k -f mp3 "${audioPath}"`;
      console.log(`Executing audio conversion command: ${command}`); // Log command
      try {
          const { stdout, stderr } = await execAsync(command);
          if (stdout) console.log('convertVideoToAudio stdout:', stdout);
          if (stderr) console.warn('convertVideoToAudio stderr:', stderr);
          console.log('Video to audio conversion complete.');
      } catch (execError: any) {
          console.error(`ffmpeg execution failed for audio conversion:`, execError); // Log the actual error object
          throw execError; // Re-throw after logging to stop the process
      }
    } else {
      throw error; // Re-throw other access errors
    }
  }
}

/**
 * Transcribe an MP3 audio file using OpenAI's Whisper API.
 */
async function transcribeAudio(audioPath: string, profileData: any): Promise<any> {
  console.log(`Transcribing audio ${audioPath}...`);
  const whisperModel = WHISPER_MODEL;
  console.log("Using whisper model:", whisperModel);
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(fs.createReadStream(audioPath), path.basename(audioPath)),
    model: whisperModel,
    response_format: "verbose_json",
    timestamp_granularities: ["word"]
  });
  console.log('Transcription complete.');
  return transcription;
}

// --- S3 Upload Logic (Revised) ---

/**
 * Uploads a local file to S3.
 */
async function uploadFileToS3(localPath: string, s3Key: string, contentType: string): Promise<string> {
    console.log(`Uploading ${localPath} to s3://${s3Bucket}/${s3Key}`);
    try {
        const fileContent = await readFile(localPath);
        const putCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        });
        await s3Client.send(putCommand);
        console.log(`Successfully uploaded ${localPath} to ${s3Key}`);
        const region = await s3Client.config.region(); 
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3Key}`;
        return s3Url;
    } catch (error: any) {
        console.error(`Error uploading ${localPath} to S3 key ${s3Key}:`, error);
        throw new Error(`S3 upload failed for ${localPath}: ${error.message}`);
    }
}

// --- PDF Generation Logic (Using fs.promises) ---

async function generatePdfReport(reportDataPath: string, imagesDir: string, outputPdfPath: string, logoS3Url?: string): Promise<void> { 
    console.log(`Generating PDF report: ${outputPdfPath}`);
    try {
        const reportJsonString = await readFile(reportDataPath, 'utf-8');
        const reportData = JSON.parse(reportJsonString);
        console.log("Report JSON loaded for PDF generation.");

        // Check if logo URL is provided
        const hasLogo = !!logoS3Url;
        if (hasLogo) {
            console.log(`Using logo from S3 URL: ${logoS3Url}`);
        } else {
            console.log(`No logo URL provided. PDF will be generated without a logo.`);
        }

        // --- PDF Generation using pdfkit ---
        const doc = new PDFDocument({ 
            margin: 50, // Add margins
            size: 'A4'
        });
        const writeStream = fs.createWriteStream(outputPdfPath); // Keep fs for streams
        doc.pipe(writeStream);

        // --- PDF Header ---
        const pageMargin = 50;
        const logoWidth = 100; // Desired width
        const logoHeight = 50; // Desired height
        
        // Only try to add logo if URL is provided
        if (hasLogo) {
            try {
                // We'll need to fetch the logo from S3 first
                const logoResponse = await fetch(logoS3Url!);
                if (logoResponse.ok) {
                    const logoBuffer = await logoResponse.arrayBuffer();
                    
                    // Calculate position for top-right corner
                    const logoX = doc.page.width - pageMargin - logoWidth;
                    const logoY = pageMargin; // Place near top margin
                    
                    // Add logo to PDF from buffer
                    doc.image(Buffer.from(logoBuffer), logoX, logoY, {
                        fit: [logoWidth, logoHeight], // Fit logo into box
                        align: 'right'
                    });
                    
                    // Ensure content starts below the logo if placed near the top
                    doc.y = Math.max(doc.y, logoY + logoHeight + 10); // Move down past logo + padding
                } else {
                    console.warn(`Failed to fetch logo from S3: ${logoResponse.status} ${logoResponse.statusText}`);
                    doc.moveDown(1); // Add some space if logo fetch failed
                }
            } catch (logoError) {
                console.warn(`Error processing logo from S3: ${logoError}`);
                doc.moveDown(1); // Add some space if logo fetch failed
            }
        } else {
            doc.moveDown(1); // Add some space if no logo
        }

        doc.fontSize(24).font('Helvetica-Bold').text(reportData.report_title, pageMargin, pageMargin + (hasLogo ? 0 : -logoHeight/2), { // Adjust title Y slightly if no logo
            align: 'left',
            width: doc.page.width - (2 * pageMargin) - (hasLogo ? logoWidth + 10 : 0) // Leave space for logo if present
        });
        doc.fontSize(12).font('Helvetica').text(`Date: ${reportData.report_date}`, { align: 'left' });
        doc.moveDown(2);

        // --- PDF Body (Sections) ---
        if (reportData.sections && Array.isArray(reportData.sections)) {
            reportData.sections.forEach((section: any, index: number) => {
                doc.fontSize(16).font('Helvetica-Bold').text(section.title);
                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica').text(section.summary, { 
                    paragraphGap: 5,
                    indent: 15, // Indent paragraphs
                    lineGap: 2
                });
                doc.moveDown(1.5);

                // --- Images within Section (if any) ---
                if (section.images && Array.isArray(section.images)) {
                    section.images.forEach((imageInfo: any) => {
                        const imageFilename = imageInfo.fileName; 
                        const caption = imageInfo.caption;
                        const imagePath = path.join(imagesDir, imageFilename); // Construct path to local image
                        
                        try {
                            // Check if the image file exists locally before trying to embed
                            if (fs.existsSync(imagePath)) { 
                                console.log(`Embedding image ${imageFilename} in PDF.`);
                                doc.image(imagePath, {
                                    fit: [500, 400], // Fit image within page bounds (adjust as needed)
                                    align: 'center',
                                    valign: 'center'
                                });
                                doc.moveDown(0.5);
                                if (caption) {
                                    doc.fontSize(10).font('Helvetica-Oblique').text(caption, { align: 'center' });
                                    doc.moveDown(0.5);
                                }
                                doc.moveDown(1);
                            } else {
                                console.warn(`Image file not found locally: ${imagePath}. Skipping embedding.`);
                                doc.fontSize(10).font('Helvetica-Oblique').fillColor('red').text(`[Image not found: ${imageFilename}]`, { align: 'center' });
                                doc.fillColor('black').moveDown(1);
                            }
                        } catch (imgError) {
                            console.error(`Error embedding image ${imageFilename}:`, imgError);
                            doc.fontSize(10).font('Helvetica-Oblique').fillColor('red').text(`[Error loading image: ${imageFilename}]`, { align: 'center' });
                            doc.fillColor('black').moveDown(1);
                        }
                    });
                    doc.moveDown(1); // Add space after images section
                }
            });
        } else {
            doc.fontSize(12).font('Helvetica').text('No report sections found.');
        }

        // --- Finalize PDF ---
        doc.end();

        // Wait for the stream to finish writing
        await new Promise<void>((resolve, reject) => { // Explicitly type Promise
            writeStream.on('finish', () => resolve()); // Wrap resolve
            writeStream.on('error', reject);
        });

        console.log(`PDF report generated successfully at ${outputPdfPath}`);

    } catch (error) {
        console.error("Error generating PDF report:", error);
        throw error; // Re-throw error to be caught by the main function
    }
}

// --- Frame Selection Logic ---

/**
 * Simply uses the timestamps provided by the AI in the report JSON.
 * No additional processing or selection - just convert to the expected format.
 */
async function selectFrameTimestamps(transcription: FullTranscription, numFrames: number = 5, reportJson: any = null): Promise<TimestampData[]> {
    if (!reportJson || !reportJson.images || !Array.isArray(reportJson.images) || reportJson.images.length === 0) {
        throw new Error("No valid images with timestamps in the report JSON");
    }

    console.log(`Using ${reportJson.images.length} timestamps directly from the AI-generated report`);
    
    // Simply convert the AI-provided timestamps to the expected format
    const selectedTimestamps: TimestampData[] = reportJson.images.map((img: { timestamp: number; caption: string }) => ({
        timestamp: img.timestamp,
        reason: img.caption
    }));
    
    console.log(`Selected ${selectedTimestamps.length} timestamps from AI report data`);
    return selectedTimestamps;
}

// --- Main Orchestration Logic --- 

/**
 * Orchestrates the entire report generation process: 
 * video -> audio -> transcription -> report JSON -> frame timestamps -> frame extraction -> PDF (optional) -> S3 upload.
 * Returns the S3 key of the generated report JSON file.
 */
export async function generateReport(inputVideoPath: string, userId: string, customerNameInput?: string, projectNameInput?: string): Promise<string> { 
    // Ensure defaults are applied immediately
    const customerName = customerNameInput || 'UnknownCustomer';
    const projectName = projectNameInput || 'UnknownProject';
    
    const startTime = Date.now();
    function logStep(msg: string, start?: number) {
      const now = Date.now();
      if (start) {
        console.log(`[${new Date().toISOString()}] ${msg} (${now - start}ms)`);
      } else {
        console.log(`[${new Date().toISOString()}] ${msg}`);
      }
      return now;
    }
    logStep(`Generating report for user: ${userId}`);
    logStep(`Processing video: ${inputVideoPath}`);
    logStep(`Report path will use customer: ${customerName}, project: ${projectName}`);

    // 1. Create a unique directory for this processing job
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const processingDir = path.join(PROCESSING_BASE_DIR, `report_${userId}_${timestamp}`); 
    await ensureDir(processingDir);
    logStep(`Created processing directory: ${processingDir}`);

    // Define paths within the unique processing directory
    const audioOutputPath = path.join(processingDir, 'output_audio.mp3');
    const transcriptionJsonPath = path.join(processingDir, 'transcription.json');
    const frameTimestampsPath = path.join(processingDir, 'frame_timestamps.json');
    const reportJsonPath = path.join(processingDir, 'daily_report.json');
    const framesOutputDir = path.join(processingDir, 'extracted_frames');

    try {
        // 2. Read Profile Data
        let stepStart = logStep('Fetching profile data for user: ' + userId);
        const profileData = await getUserProfile(userId);
        logStep('Fetched profile data', stepStart);
        if (!profileData) {
            throw new Error("Failed to load profile data for the user");
        }

        // 3. Convert Video to Audio
        stepStart = logStep('Converting video to audio...');
        await convertVideoToAudio(inputVideoPath, audioOutputPath);
        logStep('Converted video to audio', stepStart);

        // 4. Transcribe Audio
        let transcription: FullTranscription;
        if (fs.existsSync(transcriptionJsonPath)) {
            logStep(`Transcription file ${transcriptionJsonPath} found, loading...`);
            const transData = await readFile(transcriptionJsonPath, 'utf-8');
            transcription = JSON.parse(transData);
        } else {
            stepStart = logStep('Transcribing audio...');
            transcription = await transcribeAudio(audioOutputPath, profileData);
            if (!transcription) throw new Error("Transcription failed.");
            await writeFile(transcriptionJsonPath, JSON.stringify(transcription, null, 2));
            logStep('Transcribed audio', stepStart);
        }

        // 5. Generate Daily Report JSON
        stepStart = logStep('Generating daily report JSON...');
        const reportJson = await getDailyReport(transcription, profileData);
        logStep('Generated daily report JSON', stepStart);
        if (!reportJson) throw new Error("Daily report generation failed.");

        // 6. Select Timestamps for Frames
        stepStart = logStep('Selecting timestamps for frame extraction...');
        const selectedTimestamps = await selectFrameTimestamps(transcription, profileData.config.numFrames, reportJson);
        await writeFile(frameTimestampsPath, JSON.stringify({ timestamps: selectedTimestamps }, null, 2));
        logStep(`Selected ${selectedTimestamps.length} frame timestamps`, stepStart);

        // 7. Extract Frames
        await ensureDir(framesOutputDir);
        stepStart = logStep(`Extracting frames to ${framesOutputDir}...`);
        await extractFramesFromData(inputVideoPath, frameTimestampsPath, framesOutputDir);
        logStep('Extracted frames', stepStart);

        // 8. Construct S3 Keys
        const customer = customerName || 'UnknownCustomer';
        const project = projectName || 'UnknownProject';
        logStep(`Using customer=${customer}, project=${project} for S3 paths`);
        
        const s3BaseKey = `users/${userId}/${customer}/${project}/report_${timestamp}`;
        const s3ReportJsonKey = `${s3BaseKey}/daily_report.json`;
        const s3FramesBaseKey = `${s3BaseKey}/extracted_frames/`;
        const s3ViewerHtmlKey = `${s3BaseKey}/report-viewer.html`;
        const s3TranscriptionKey = `${s3BaseKey}/transcription.json`;
        const s3VideoKey = `${s3BaseKey}/source_video${path.extname(inputVideoPath)}`;
        const s3PdfKey = `${s3BaseKey}/daily_report.pdf`; // S3 Key for PDF

        // Get logo key directly from profile data (fetched earlier by getUserProfile)
        const s3LogoKey = profileData.config.logoFilename; 
        if (s3LogoKey) {
            logStep(`Found logo filename in profile: ${s3LogoKey}. Will use for PDF.`);
        } else {
            logStep(`No logo filename found in profile. Report PDF will not have a logo.`);
            // DO NOT throw an error here - allow generation without logo
        }

        // 9. Add Image URLs to Report JSON (and upload frames)
        stepStart = logStep('Adding image URLs to report and uploading frames...');
        const aiGeneratedImages = reportJson.images || [];
        const captionMap = new Map();
        for (const img of aiGeneratedImages) {
            if (img.timestamp && img.caption) {
                captionMap.set(img.timestamp.toFixed(2), img.caption);
            }
        }
        reportJson.images = [];
        const frameFiles = await readdir(framesOutputDir);
        for (const frameFile of frameFiles) {
            const localFramePath = path.join(framesOutputDir, frameFile);
            const frameS3Key = `${s3FramesBaseKey}${frameFile}`;
            const timestampMatch = frameFile.match(/frame_(\d+\.\d+)\.jpg/);
            const timestamp = timestampMatch ? timestampMatch[1] : null;
            if (!timestamp || !captionMap.has(timestamp)) {
                logStep(`No caption found for timestamp ${timestamp}, skipping frame ${frameFile}`);
                continue;
            }
            const caption = captionMap.get(timestamp);
            try {
                const frameS3Url = await uploadFileToS3(localFramePath, frameS3Key, 'image/jpeg');
                reportJson.images.push({ fileName: frameFile, caption: caption, s3Url: frameS3Url });
            } catch (uploadError) {
                logStep(`Failed to upload frame ${frameFile}. Skipping. Error: ${uploadError}`);
            }
        }
        reportJson.images.sort((a: { fileName: string }, b: { fileName: string }) => a.fileName.localeCompare(b.fileName));
        logStep('Uploaded all frames', stepStart);

        // 10. Save Final Report JSON Locally (before uploading)
        stepStart = logStep('Saving final report JSON locally...');
        await writeFile(reportJsonPath, JSON.stringify(reportJson, null, 2));
        logStep('Saved final report JSON locally', stepStart);

        // Get the S3 URL for the logo to include in the report (if it exists)
        const region = await s3Client.config.region();
        const logoS3Url = s3LogoKey ? `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3LogoKey}` : '';
        if (!profileData.name) throw new Error("User name is missing in the profile data");
        if (!profileData.company?.name) throw new Error("Company name is missing in the profile data");
        reportJson.reportMetadata = {
          generatedAt: new Date().toISOString(),
          customer: customer,
          project: project,
          preparedBy: {
            name: profileData.name,
            email: profileData.email || '',
            phone: profileData.phone || ''
          },
          companyInfo: {
            name: profileData.company.name,
            address: profileData.company.address || {},
            phone: profileData.company.phone || '',
            website: profileData.company.website || ''
          }
        };
        reportJson.reportAssetsS3Urls = {
          baseUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3BaseKey}`,
          logoUrl: logoS3Url,
          viewerUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3ViewerHtmlKey}`,
          transcriptionUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3TranscriptionKey}`,
          videoUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3VideoKey}`
        };
        await writeFile(reportJsonPath, JSON.stringify(reportJson, null, 2));
        logStep('Updated report JSON with metadata and asset URLs');

        // 11. Upload Report Files to S3
        stepStart = logStep('Uploading report assets to S3...');
        
        // ---> Add specific logging for the main JSON upload <---
        logStep(`Attempting to upload: ${reportJsonPath} to S3 key: ${s3ReportJsonKey}`);
        try {
            await uploadFileToS3(reportJsonPath, s3ReportJsonKey, 'application/json');
            logStep(`Successfully completed upload call for: ${s3ReportJsonKey}`);
        } catch (jsonUploadError) {
            logStep(`!!! FAILED to upload main report JSON (${s3ReportJsonKey}): ${jsonUploadError}`);
            // Re-throw the error to ensure the main catch block handles it
            throw jsonUploadError; 
        }
        // ---> End specific logging <---
        
        await uploadFileToS3(REPORT_VIEWER_HTML_PATH, s3ViewerHtmlKey, 'text/html');
        await uploadFileToS3(transcriptionJsonPath, s3TranscriptionKey, 'application/json');
        if (fs.existsSync(frameTimestampsPath)) { // Only upload if it exists
             await uploadFileToS3(frameTimestampsPath, `${s3BaseKey}/frame_timestamps.json`, 'application/json');
        }
        if (process.env.UPLOAD_SOURCE_VIDEO !== 'false') {
            logStep(`Uploading source video to S3: ${s3VideoKey}`);
            await uploadFileToS3(inputVideoPath, s3VideoKey, `video/${path.extname(inputVideoPath).substring(1)}`);
        }
        logStep('Uploaded all report assets to S3', stepStart);
        logStep(`Report uploaded successfully to S3 bucket: ${s3Bucket}, base key: ${s3BaseKey}`);

        // 12. Generate and Upload Report Viewer HTML using the helper function
        logStep('Generating and uploading report viewer HTML');
        if (!s3Bucket) {
            throw new Error("Internal Server Error: S3 bucket configuration is missing.");
        }
        try {
            await generateAndUploadViewerHtml(
                s3Client,
                s3Bucket,
                reportJson,
                userId,
                customerName,
                projectName,
                `report_${timestamp}`
            );
            logStep('Successfully generated and uploaded report viewer HTML.');
        } catch (htmlError: any) {
            logStep(`!!! FAILED to generate/upload report viewer HTML: ${htmlError.message}`);
            // Decide if this should be a fatal error for the overall generation process
            // For now, we log it but still return the JSON key as generation was mostly successful.
            // throw new Error(`Failed to generate viewer HTML: ${htmlError.message}`);
        }

        // 13. Return the S3 key of the report JSON
        logStep('Report generation complete', startTime);
        return s3ReportJsonKey;

    } catch (error: any) {
        logStep(`Error in generateReport function: ${error.message}`);
        try {
            logStep(`Attempting to cleanup failed processing directory: ${processingDir}`);
            await rm(processingDir, { recursive: true, force: true });
            logStep(`Cleanup successful for: ${processingDir}`);
        } catch (cleanupError) {
            logStep(`Failed to cleanup processing directory ${processingDir}: ${cleanupError}`);
        }
        throw error;
    } finally {
        try {
            logStep(`Cleaning up processing directory: ${processingDir}`);
            await rm(processingDir, { recursive: true, force: true });
            logStep(`Cleanup successful for: ${processingDir}`);
        } catch (cleanupError) {
            logStep(`Error cleaning up processing directory ${processingDir}: ${cleanupError}`);
        }
    }
}