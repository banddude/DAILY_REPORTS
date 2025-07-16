import dotenv from 'dotenv';
dotenv.config(); 

import OpenAI from 'openai';
import { createWriteStream, createReadStream } from 'fs'; // Specifically import stream functions
import { exec, spawn } from "child_process";
import path from 'path'; // Need path module
import { promisify } from 'util';
import { Readable } from 'stream'; // Import Readable for streaming to S3
import { tmpdir } from 'os'; // Import os.tmpdir for temporary files
import { toFile } from 'openai/uploads'; // Add this import
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"; // Import S3 client
import { readFile, writeFile, unlink, access, mkdir, rm } from 'fs/promises'; // Keep necessary ones
import { generateAndUploadViewerHtml } from './reportUtils'; // Import the new helper
import { supabase } from './config'; // <<< Import Supabase client
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // Import presigner
import type { ChildProcess } from "child_process";
import { Upload } from "@aws-sdk/lib-storage";

// --- Path Constants (relative to project root) ---
// const PROJECT_ROOT = path.resolve(__dirname, '..'); // Resolve to the root directory (one level up from dist/src/)
// const PROCESSING_BASE_DIR = path.join(PROJECT_ROOT, 'processing_reports');
// const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public'); // Path to the public directory
// const DATA_DIR = path.join(PROJECT_ROOT, 'data'); // Path to the data directory
// const REPORT_VIEWER_HTML_PATH = path.join(PUBLIC_DIR, 'report-viewer.html');
// const LOGO_PNG_PATH = path.join(PUBLIC_DIR, 'logo.png');

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
            reportJsonSchema: profileData.report_json_schema 
                                ? JSON.parse(profileData.report_json_schema) 
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

// Simplify getDailyReport to pull config from master_config only
async function getDailyReport(
  transcription: FullTranscription,
  masterConfig: { chatModel: string; systemPrompt: string; reportJsonSchema: any }
) {
  try {
    // Prepare a more readable transcript format for the LLM
    const timedTranscript = transcription.words.map(w => `[${w.start.toFixed(2)}] ${w.word}`).join(' ');

    // --- Read Config from master_config settings ---
    const chatModel           = masterConfig.chatModel;
    const systemPromptContent = masterConfig.systemPrompt;
    const reportSchema        = masterConfig.reportJsonSchema;
    // ---------------------------------------------------

    console.log(`Using chat model: ${chatModel}`);
    if (!chatModel || !systemPromptContent || !reportSchema) {
      throw new Error('Required configuration missing in master_config');
    }
    const response = await openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: "system", content: systemPromptContent },
        { role: "user", content: [
            { type: "text", text: `Here is the timed transcript of a video walkthrough:\n\n---\n${timedTranscript}\n---\n\nPlease generate a daily report in JSON based *only* on the content of this transcript and adhering strictly to the following JSON schema. Never mention the transcript or video walkthrough directly. Your report is to be as though it was writteen by the person doing the walkthrough.:` },
            { type: "text", text: JSON.stringify(reportSchema) }
          ]
        }
      ],
      response_format: { type: "json_object" }
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

// --- Frame Extraction Logic (Stream output directly to S3) ---

interface TimestampData {
  timestamp: number;
  reason: string;
}

interface FrameData {
  timestamps: TimestampData[];
}

// Extracts frame using presigned URL, streams output directly to S3 key
async function extractAndUploadFrame(videoPresignedUrl: string, timestamp: number, s3Key: string): Promise<string> {
  const step = `Frame [${timestamp.toFixed(3)}s -> ${s3Key}]`; // For logging
  console.log(`${step}: Starting extraction and upload...`);
  
  const ffmpegArgs = [
      '-ss', timestamp.toFixed(6),
      '-i', videoPresignedUrl,
      '-frames:v', '1',       // Extract only one frame
      '-q:v', '2',            // Quality setting (2-5 is good for JPEG)
      '-c:v', 'mjpeg',        // Output codec JPEG
      '-f', 'image2pipe',    // Output format to pipe
      'pipe:1'               // Output to stdout
  ];

  console.log(`${step}: Spawning ffmpeg process...`);
  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrOutput = '';
  ffmpegProcess.stderr.on('data', (data) => {
      stderrOutput += data.toString();
      // console.warn(`ffmpeg frame stderr chunk: ${data}`);
  });
  
  if (!ffmpegProcess.stdout) {
      throw new Error(`${step}: Failed to get stdout stream from ffmpeg.`);
  }
  const frameStream = ffmpegProcess.stdout;

  // --- Setup ffmpeg exit promise FIRST ---
  // To ensure listeners are attached before process potentially exits quickly
  const ffmpegExitPromise = new Promise<number | null>((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
           console.log(`${step}: ffmpeg process 'close' event received (code: ${code}).`);
           resolve(code);
      });
      ffmpegProcess.on('error', (err) => {
           console.error(`${step}: ffmpeg process 'error' event:`, err);
           console.error(`${step}: ffmpeg stderr before error:\n${stderrOutput}`);
           reject(err);
      }); 
  });
  // -------------------------------------

  try {
    console.log(`${step}: Configuring S3 upload stream...`);
    const parallelUploadS3 = new Upload({
      client: s3Client,
      params: {
          Bucket: s3Bucket,
          Key: s3Key,
          Body: frameStream, // Pipe ffmpeg stdout directly
          ContentType: 'image/jpeg'
      },
      // Optional: configure queue size and part size for large streams if needed
      // queueSize: 4,
      // partSize: 1024 * 1024 * 5, // 5MB
    });

    // Optional: Log progress
    // parallelUploadS3.on("httpUploadProgress", (progress) => {
    //   console.log(`S3 frame upload progress for ${s3Key}:`, progress);
    // });

    console.log(`${step}: Starting S3 upload (await parallelUploadS3.done())...`);
    await parallelUploadS3.done();
    console.log(`${step}: S3 upload finished.`);
    
    console.log(`${step}: Waiting for ffmpeg process to exit (await ffmpegExitPromise)...`);
    const ffmpegExitCode = await ffmpegExitPromise; // Await the promise we set up earlier
    console.log(`${step}: ffmpeg process exited (code: ${ffmpegExitCode}).`);

    if (ffmpegExitCode !== 0) {
        console.error(`${step}: ffmpeg extraction process failed. Stderr:\n${stderrOutput}`);
        throw new Error(`ffmpeg frame extraction failed for timestamp ${timestamp} with exit code ${ffmpegExitCode}.`);
    }

    const region = await s3Client.config.region(); 
    const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    return s3Url;

  } catch (error: any) {
    console.error(`${step}: Error during frame processing/upload:`, error);
    if (!ffmpegProcess.killed) ffmpegProcess.kill();
    throw error; 
  }
}

// Extracts frames using presigned URL and streams directly to S3
// No longer uses tempOutputDir
async function extractAndUploadFramesFromTimestamps(videoPresignedUrl: string, timestampData: TimestampData[], s3FramesBaseKey: string): Promise<{ s3Url: string; fileName: string; caption: string }[]> {
  console.log(`Starting frame extraction/upload loop for ${timestampData.length} timestamps...`);
  const uploadedFramesInfo: { s3Url: string; fileName: string; caption: string }[] = [];
  const uploadPromises: Promise<void>[] = [];

  for (const item of timestampData) {
      const timestamp = item.timestamp;
      const frameFileName = `frame_${timestamp.toFixed(3).replace('.', '-')}.jpg`; 
      const frameS3Key = `${s3FramesBaseKey}${frameFileName}`;
      
      console.log(`Queueing processing for frame timestamp ${timestamp} -> ${frameS3Key}`);
      const uploadPromise = extractAndUploadFrame(videoPresignedUrl, timestamp, frameS3Key)
          .then(s3Url => {
              uploadedFramesInfo.push({ 
                  s3Url: s3Url, 
                  fileName: frameFileName, 
                  caption: item.reason 
              });
              console.log(`Completed processing for frame ${frameFileName}`);
          })
          .catch(error => {
              // Log error but don't stop other frames
              console.warn(`Failed to extract/upload frame for timestamp ${timestamp}. Skipping. Error: ${error}`);
          });
      uploadPromises.push(uploadPromise);
  }
  
  console.log('Waiting for all frame processing promises (Promise.allSettled)...');
  const results = await Promise.allSettled(uploadPromises);
  console.log('Promise.allSettled completed for frames.');
  console.log('Frame processing results:', JSON.stringify(results, null, 2)); // Log detailed results
  
  console.log(`Frame extraction/upload process completed. Successfully processed ${uploadedFramesInfo.length} / ${timestampData.length} frames.`);
  // Sort results by filename (derived from timestamp) before returning
  uploadedFramesInfo.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return uploadedFramesInfo;
}

// --- Video/Audio Processing Logic (Streaming) ---

// Converts video (from presigned URL) to audio stream (stdout)
async function convertVideoToAudioStream(videoPresignedUrl: string): Promise<ChildProcess> {
  console.log(`Converting video from presigned URL to audio stream...`);
  const ffmpegArgs = [
      '-i', videoPresignedUrl, 
      '-vn',                 
      '-acodec', 'libmp3lame',
      '-ar', '44100',         
      '-ac', '2',             
      '-ab', '192k',         
      '-f', 'mp3',           
      'pipe:1'               
  ];
  
  console.log(`Spawning ffmpeg process: ffmpeg ${ffmpegArgs.join(' ')}`);
  
  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'] 
  });

  ffmpegProcess.stderr.on('data', (data) => {
      console.warn(`ffmpeg stderr: ${data}`);
  });

  return ffmpegProcess; 
}

// Transcribes an audio stream directly
async function transcribeAudioStream(audioStream: Readable, originalFileName: string): Promise<FullTranscription> {
  console.log(`Transcribing audio stream (${originalFileName})...`);
  const whisperModel = WHISPER_MODEL; 
  console.log("Using whisper model:", whisperModel);

  try {
      // Use toFile with the stream directly
      const transcriptionInput = await toFile(audioStream, originalFileName); 

      const transcription = await openai.audio.transcriptions.create({
        file: transcriptionInput,
        model: whisperModel,
        response_format: "verbose_json",
        timestamp_granularities: ["word"]
      });
      console.log('Transcription complete.');
      return transcription as FullTranscription; 
  } catch (error) {
       console.error("Error during audio stream transcription:", error);
       // Ensure the audio stream is destroyed if transcription fails mid-way
       if (!audioStream.destroyed) {
           audioStream.destroy();
       }
       throw error; // Re-throw
  }
}

// --- S3 Upload Logic (Revised for temp files and in-memory data) ---

/**
 * Uploads a local file (likely from temp dir) to S3.
 */
async function uploadFileToS3(localPath: string, s3Key: string, contentType: string): Promise<string> {
    console.log(`Uploading ${localPath} to s3://${s3Bucket}/${s3Key}`);
    let fileStream;
    try {
        // Use a stream for potentially large temp files (like audio)
        fileStream = createReadStream(localPath);
        const putCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: fileStream,
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
    } finally {
         // Ensure stream is closed if it was opened
        if (fileStream && !fileStream.destroyed) {
            fileStream.destroy();
        }
    }
}

/**
 * Uploads in-memory data (like JSON) to S3.
 */
async function uploadDataToS3(data: string | Buffer | Readable, s3Key: string, contentType: string): Promise<string> {
    console.log(`Uploading in-memory data to s3://${s3Bucket}/${s3Key}`);
    try {
        const putCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: data,
            ContentType: contentType
        });
        await s3Client.send(putCommand);
        console.log(`Successfully uploaded data to ${s3Key}`);
        const region = await s3Client.config.region(); 
        const s3Url = `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3Key}`;
        return s3Url;
    } catch (error: any) {
        console.error(`Error uploading data to S3 key ${s3Key}:`, error);
        throw new Error(`S3 upload failed for ${s3Key}: ${error.message}`);
    }
}

// --- PDF Generation Logic (Modified for temp paths and S3 logo) ---
// Needs modification to accept temp image paths if generatePdfReport is kept.
// For now, assuming PDF generation might be removed or significantly changed.
// async function generatePdfReport(...) { ... }

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

// --- Main Orchestration Logic (Adjusted for Frame Streaming) ---

export async function generateReport(videoS3Key: string, userId: string, customerNameInput?: string, projectNameInput?: string): Promise<string> { 
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
    logStep(`Processing video from S3 Key: ${videoS3Key}`);
    logStep(`Report path will use customer: ${customerName}, project: ${projectName}`);

    // Temporary directory no longer needed for frames or other files
    const tempId = `report_${userId}_${Date.now()}`;
    let s3ReportJsonKey = ''; 
    let ffmpegAudioProcess: ChildProcess | null = null;
    let transcription: FullTranscription;
    let profileData: any;

    try {
        // 1. Generate Presigned URL for Video Input
        let stepStart = logStep(`Generating presigned URL for video: ${videoS3Key}`);
        const getCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: videoS3Key });
        const videoPresignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 }); 
        logStep('Generated presigned URL', stepStart);
        
        // --- Start Audio Conversion (Streaming) ---
        stepStart = logStep('Starting video to audio stream conversion...');
        ffmpegAudioProcess = await convertVideoToAudioStream(videoPresignedUrl);
        if (!ffmpegAudioProcess?.stdout) {
            throw new Error("Failed to get stdout stream from ffmpeg audio process.");
        }
        const audioInputStream = ffmpegAudioProcess.stdout;
        
        // --- Setup ffmpeg process completion promise --- 
        const ffmpegCompletionPromise = new Promise<number | null>((resolve, reject) => {
            let stderrOutput = ''; 
            ffmpegAudioProcess?.stderr?.on('data', (data) => {
                stderrOutput += data.toString();
            });
            ffmpegAudioProcess?.on('close', (code) => {
                if (code !== 0) {
                    console.error(`ffmpeg process closed with non-zero code: ${code}`);
                    console.error(`ffmpeg full stderr:\n${stderrOutput}`);
                    reject(new Error(`ffmpeg audio conversion failed with exit code ${code}. Stderr: ${stderrOutput.substring(0, 500)}...`));
                } else {
                    resolve(code);
                }
            });
            ffmpegAudioProcess?.on('error', (err) => {
                console.error('ffmpeg process error event:', err);
                console.error(`ffmpeg full stderr before error:\n${stderrOutput}`);
                reject(err);
            });
        });
        // -------------------------------------------
        logStep('Spawned ffmpeg for audio streaming', stepStart);

        // --- Start Profile Fetch in Parallel (for metadata/logo) ---
        stepStart = logStep('Fetching profile data in parallel...');
        const profilePromise = getUserProfile(userId);

        // --- Start Master Config Fetch ---
        stepStart = logStep('Fetching master_config settings...');
        const { data: masterRow, error: masterError } = await supabase
            .from('master_config')
            .select('config_chat_model, config_system_prompt, report_json_schema')
            .single();
        if (masterError || !masterRow) {
            throw new Error(masterError?.message || 'Failed to load master_config');
        }
        const rawSchema = masterRow.report_json_schema;
        const parsedSchema = rawSchema
            ? (typeof rawSchema === 'string' ? JSON.parse(rawSchema) : rawSchema)
            : null;
        const masterConfigData = {
            chatModel: masterRow.config_chat_model,
            systemPrompt: masterRow.config_system_prompt,
            reportJsonSchema: parsedSchema
        };
        logStep('Fetched master_config settings', stepStart);

        // 4. Transcribe Audio Stream
        logStep('Transcribing audio stream...'); 
        try {
            transcription = await transcribeAudioStream(audioInputStream, `audio_${tempId}.mp3`);
        } catch (transcriptionError) {
             if (ffmpegAudioProcess && !ffmpegAudioProcess.killed) {
                 logStep('Killing ffmpeg process due to transcription error...');
                 ffmpegAudioProcess.kill();
                 ffmpegAudioProcess = null;
             }
             throw transcriptionError; 
        }
        logStep('Finished transcription call', stepStart); 
        
        // ---- START Transcription Upload in Parallel ----
        stepStart = logStep('Uploading transcription JSON in parallel...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); 
        const s3BaseKey = `users/${userId}/${customerName}/${projectName}/report_${timestamp}`;
        const s3TranscriptionKey = `${s3BaseKey}/transcription.json`;
        if (!transcription) throw new Error("Transcription data is missing after processing."); 
        // Start upload but don't await yet
        const transcriptionUploadPromise = uploadDataToS3(JSON.stringify(transcription, null, 2), s3TranscriptionKey, 'application/json');
        // ---------------------------------------------
        
        // --- Wait for ffmpeg process completion AFTER transcription ---
        stepStart = logStep('Waiting for ffmpeg audio process to complete (while transcription uploads)...');
        const ffmpegAudioExitCode = await ffmpegCompletionPromise; 
        logStep(`ffmpeg audio process completed with exit code ${ffmpegAudioExitCode}`, stepStart);
        ffmpegAudioProcess = null; 
        // ------------------------------------------------------------

        // --- Await Transcription Upload --- 
        // Ensure transcription upload finished before potentially needing it (though not strictly required by current logic)
        stepStart = logStep('Waiting for transcription JSON upload...');
        await transcriptionUploadPromise;
        logStep('Finished uploading transcription JSON', stepStart); 
        // --------------------------------
        
        // --- Await Profile Data (user metadata) ---
        stepStart = logStep('Waiting for profile data...');
        const profileData = await profilePromise;
        logStep('Received profile data', stepStart);
        if (!profileData) {
            throw new Error("Failed to load profile data");
        }
        // -----------------------------------------------

        // --- Define remaining S3 Keys --- 
        s3ReportJsonKey = `${s3BaseKey}/daily_report.json`; 
        const s3FramesBaseKey = `${s3BaseKey}/extracted_frames/`;
        const s3ViewerHtmlKey = `${s3BaseKey}/report-viewer.html`;
        // --------------------------------
        
        // 5. Generate Daily Report JSON (in memory)
        stepStart = logStep('Generating daily report JSON...');
        const reportJson = await getDailyReport(transcription, masterConfigData);
        logStep('Generated daily report JSON', stepStart);
        if (!reportJson) throw new Error("Daily report generation failed.");

        // 6. Select timestamps for frames based on returned report JSON images
        stepStart = logStep('Selecting timestamps for frame extraction...');
        const selectedTimestamps = await selectFrameTimestamps(
          transcription,
          reportJson.images.length,
          reportJson
        );
        logStep(`Selected ${selectedTimestamps.length} frame timestamps`, stepStart);

        // 7. Extract & Upload Frames (using presigned URL input, streams to S3)
        stepStart = logStep(`Extracting frames and uploading directly to S3...`);
        const uploadedFramesInfo = await extractAndUploadFramesFromTimestamps(videoPresignedUrl, selectedTimestamps, s3FramesBaseKey);
        logStep(`Extracted and uploaded ${uploadedFramesInfo.length} frames`, stepStart);

        // 8. Get logo key and URL (per-user logo)
        const s3LogoKey = profileData.config.logoFilename;
        const region = await s3Client.config.region();
        const logoS3Url = s3LogoKey ? `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3LogoKey}` : '';

        // 9. Add Frame URLs to Report JSON (in memory)
        stepStart = logStep('Adding frame URLs to report JSON...');
        reportJson.images = []; 
        for (const frameInfo of uploadedFramesInfo) {
            reportJson.images.push({ 
                fileName: frameInfo.fileName, 
                caption: frameInfo.caption, 
                s3Url: frameInfo.s3Url 
            });
        }
        logStep('Added frame URLs to report JSON', stepStart);

        // 10. Add Metadata and Asset URLs to Report JSON (in memory)
        reportJson.reportMetadata = {
          generatedAt: new Date().toISOString(),
          customer: customerName,
          project: projectName,
          preparedBy: {
            name: profileData.name,
            email: profileData.email || '',
            phone: profileData.phone || ''
          },
          companyInfo: {
            name: profileData.company.name,
            address: profileData.company.street ? { 
              street: profileData.company.street,
              unit: profileData.company.unit || '',
              city: profileData.company.city || '',
              state: profileData.company.state || '',
              zip: profileData.company.zip || ''
            } : {},
            phone: profileData.company.phone || '',
            website: profileData.company.website || ''
          }
        };
        reportJson.reportAssetsS3Urls = {
          baseUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3BaseKey}`,
          logoUrl: logoS3Url,
          viewerUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3ViewerHtmlKey}`,
          transcriptionUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3TranscriptionKey}`,
          videoUrl: `https://${s3Bucket}.s3.${region}.amazonaws.com/${videoS3Key}` 
        };
        logStep('Added metadata and asset URLs to report JSON');

        // --- Steps 11 & 12: Upload Final JSON and HTML in Parallel ---
        stepStart = logStep('Starting final report JSON and HTML uploads in parallel...');
        
        // Start JSON Upload Promise
        const reportJsonUploadPromise = uploadDataToS3(JSON.stringify(reportJson, null, 2), s3ReportJsonKey, 'application/json');
        
        // Start HTML Generation/Upload Promise
        if (!s3Bucket) {
            throw new Error("Internal Server Error: S3 bucket configuration is missing.");
        }
        const reportFolderName = s3BaseKey.split('/').pop() || `report_${timestamp}`; 
        const htmlUploadPromise = generateAndUploadViewerHtml(
            s3Client,
            s3Bucket, 
            reportJson, 
            userId,
            customerName,
            projectName,
            reportFolderName 
        );

        // Wait for both final uploads to complete
        const [jsonUploadResult, htmlUploadResult] = await Promise.allSettled([
             reportJsonUploadPromise,
             htmlUploadPromise
        ]);
        
        // Check results (optional, but good practice)
        if (jsonUploadResult.status === 'rejected') {
            console.error("Final Report JSON upload failed:", jsonUploadResult.reason);
            // Decide if this should throw an error
        }
        if (htmlUploadResult.status === 'rejected') {
            console.error("HTML Viewer generation/upload failed:", htmlUploadResult.reason);
             // Decide if this should throw an error
        }
        
        logStep('Finished final report JSON and HTML uploads', stepStart);
        // -----------------------------------------------------------

        // 13. Return the S3 key of the report JSON
        logStep('Report generation complete', startTime);
        return s3ReportJsonKey;

    } catch (error: any) {
        logStep(`Error in generateReport function: ${error.message} ${error.stack}`);
        // Ensure ffmpeg process is killed if it's still running due to an error elsewhere
         if (ffmpegAudioProcess && !ffmpegAudioProcess.killed) {
             logStep('Killing ffmpeg audio process due to error...');
             ffmpegAudioProcess.kill();
             ffmpegAudioProcess = null;
         }
        throw error; // Re-throw the error after logging
    } finally {
        // 14. Cleanup Temporary Directory (REMOVED)
        logStep('GenerateReport finished.'); 
    }
}