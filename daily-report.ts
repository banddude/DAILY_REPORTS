import dotenv from 'dotenv';
dotenv.config(); 

import OpenAI from 'openai';
import * as fs from "fs";
import { exec } from "child_process";
import path from 'path'; // Need path module
import { promisify } from 'util';
import { toFile } from 'openai/uploads'; // Add this import
import PDFDocument from 'pdfkit';

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

// Modify getDailyReport to accept the full transcription object AND profileData
async function getDailyReport(transcription: FullTranscription, profileData: any) {
  try {
    // Prepare a more readable transcript format for the LLM, including timestamps
    const timedTranscript = transcription.words.map(w => `[${w.start.toFixed(2)}] ${w.word}`).join(' ');

    // --- Read Config from profileData (NO DEFAULTS) ---
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
    await fs.promises.access(dirPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Extracts a frame from a video file at a specific timestamp using ffmpeg.
 */
async function extractFrame(videoPath: string, timestamp: number, outputDir: string, outputFilename: string): Promise<void> {
  const outputPath = path.join(outputDir, outputFilename);
  const command = `ffmpeg -ss ${timestamp.toFixed(6)} -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`;
  try {
    await execAsync(command);
    console.log(`Extracted frame at ${timestamp.toFixed(2)}s to ${outputPath}`);
  } catch (error) {
    console.error(`Error extracting frame at ${timestamp.toFixed(2)}s:`, error);
  }
}

/**
 * Reads frame data and extracts frames from the video.
 */
async function extractFramesFromData(videoPath: string, frameDataPath: string, outputDir: string): Promise<void> {
  try {
    await ensureDir(outputDir);
    const jsonData = await fs.promises.readFile(frameDataPath, 'utf-8');
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
    await fs.promises.access(audioPath);
    console.log(`Audio file ${audioPath} already exists. Skipping conversion.`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Converting video ${videoPath} to audio ${audioPath}...`);
      const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k -f mp3 "${audioPath}"`;
      await execAsync(command);
      console.log('Video to audio conversion complete.');
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

  // --- Read Config from profileData (NO DEFAULTS) ---
  const whisperModel = profileData.config.whisperModel; 
  // ---------------------------------------------------
  
  console.log(`Using whisper model: ${whisperModel}`); 

  // --- Add check to ensure config value exists --- 
  if (!whisperModel) {
    throw new Error('Required configuration (whisperModel) missing in profile.json');
  }
  // --------------------------------------------------

  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(fs.createReadStream(audioPath), path.basename(audioPath)), // Use fs.createReadStream and path.basename
    model: whisperModel, // Use variable
    response_format: "verbose_json",
    timestamp_granularities: ["word"]
  });
  console.log('Transcription complete.');
  return transcription;
}

// --- S3 Upload Logic --- 
// const s3Client = new S3Client({}); // Removed SDK client
// async function uploadDirectoryToS3(...) { ... } // Removed SDK upload function

// --- PDF Generation Logic (Reinstated and Updated) ---

async function generatePdfReport(reportDataPath: string, imagesDir: string, outputPdfPath: string, logoFilename: string): Promise<void> {
  try {
    const reportJsonString = await fs.promises.readFile(reportDataPath, 'utf-8');
    const reportData = JSON.parse(reportJsonString);

    // Extract metadata from the report data itself
    const reportMetadata = reportData.reportMetadata || { preparedBy: {}, companyInfo: { address: {} } }; // Provide default structure
    const companyInfo = reportMetadata.companyInfo || { address: {} };
    const preparedByInfo = reportMetadata.preparedBy || {};
    const companyAddress = companyInfo.address || {}; // Default address obj

    const doc = new PDFDocument({ margin: 50, layout: 'portrait', size: 'A4' });
    const writeStream = fs.createWriteStream(outputPdfPath);
    doc.pipe(writeStream);

    // --- Header --- 
    const logoPathInReportDir = path.join(path.dirname(outputPdfPath), logoFilename);
    let logoExists = false;
    try {
        await fs.promises.access(logoPathInReportDir);
        logoExists = true;
    } catch {}
    
    if (logoExists) {
        // Center logo using calculation - PDFKit doesn't have easy centering
        const logoWidth = 150; // Smaller logo for PDF header
        const logoHeight = 50; // Estimate or get actual height if possible
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoPathInReportDir, logoX, doc.y, { width: logoWidth });
        // Ensure we move down *past* the logo's height plus some padding
        doc.y = doc.y + logoHeight + 15; // Explicitly set y coordinate after logo + padding
    }
    
    doc.fontSize(18).font('Helvetica-Bold').text('Daily Job Report', { align: 'center' });
    doc.moveDown(0.5);

    // Company Info Block
    doc.fontSize(10).font('Helvetica'); // Regular font for details
    let infoStartY = doc.y;
    let infoBlock = '';
    if (companyInfo.name) infoBlock += `${companyInfo.name.trim()}\n`;
    if (companyAddress) { // Use companyAddress extracted from reportData
        if (companyAddress.street) infoBlock += `${companyAddress.street}${companyAddress.unit ? ' #' + companyAddress.unit : ''}\n`;
        if (companyAddress.city || companyAddress.state || companyAddress.zip) infoBlock += `${companyAddress.city || ''}${companyAddress.city && companyAddress.state ? ', ' : ''}${companyAddress.state || ''} ${companyAddress.zip || ''}\n`;
    }
    let contactLine = '';
    if (companyInfo.phone) contactLine += `Phone: ${companyInfo.phone}`;
    if (companyInfo.website) contactLine += `${contactLine ? ' | ' : ''}Website: ${companyInfo.website}`;
    if (contactLine) infoBlock += contactLine;
    // Draw info block centered
    doc.text(infoBlock, { align: 'center'});
    doc.moveDown(1);
    
    // Add Customer/Project Info if available
    if (reportData.customer && reportData.customer !== 'unknown_customer') {
        doc.fontSize(10).font('Helvetica-Bold').text(`Customer: ${reportData.customer}`, {align: 'center'});
        doc.moveDown(0.25);
    }
    if (reportData.project && reportData.project !== 'unknown_project') {
        doc.fontSize(10).font('Helvetica-Bold').text(`Project: ${reportData.project}`, {align: 'center'});
        doc.moveDown(0.5);
    }

    // Prepared By / Date
    let preparedLine = '';
    if (preparedByInfo.name) preparedLine += `Prepared By: ${preparedByInfo.name}${preparedByInfo.email ? ' (' + preparedByInfo.email + ')' : ''}`; // Use preparedByInfo
    const reportDirName = path.basename(path.dirname(outputPdfPath));
    const dateMatch = reportDirName.match(/(\d{4}-\d{2}-\d{2})/);
    let dateLine = `Date: ${dateMatch ? dateMatch[1] : 'N/A'}`;
    doc.fontSize(9).font('Helvetica');
    doc.text(preparedLine, {continued: true, align: 'left'});
    doc.text(dateLine, {align: 'right'});
    doc.moveDown(1.5);
    doc.lineCap('butt').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke(); // Separator line
    doc.moveDown(1);

    // --- Report Sections ---
    doc.fontSize(14).font('Helvetica-Bold').text('Narrative', { underline: false });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(reportData.narrative || 'N/A', { align: 'justify' });
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Work Completed');
    doc.moveDown(0.3);
    if (reportData.workCompleted?.length > 0) {
      doc.font('Helvetica').fontSize(10).list(reportData.workCompleted, { bulletRadius: 1.5 });
    } else {
      doc.font('Helvetica').fontSize(10).text('None reported.');
    }
    doc.moveDown(1);

    // Add Issues, Safety, Materials, Next Steps similarly, using doc.text, doc.list etc.
    doc.fontSize(14).font('Helvetica-Bold').text('Issues');
    doc.moveDown(0.3);
    if (reportData.issues?.length > 0) {
        reportData.issues.forEach((item: any) => {
            doc.font('Helvetica').fontSize(10).text(`• [${item.status || 'Unknown'}] ${item.description || 'N/A'}`);
            if(item.impact) doc.font('Helvetica-Oblique').fontSize(9).text(` Impact: ${item.impact}`, { indent: 20 });
            if(item.resolution) doc.font('Helvetica-Oblique').fontSize(9).text(` Resolution: ${item.resolution}`, { indent: 20 });
            doc.moveDown(0.2);
        });
    } else {
      doc.font('Helvetica').fontSize(10).text('None reported.');
    }
    doc.moveDown(1);
    
    doc.fontSize(14).font('Helvetica-Bold').text('Safety Observations');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text(reportData.safetyObservations || 'N/A', { align: 'justify' });
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Materials');
    doc.moveDown(0.3);
    if (reportData.materials?.length > 0) {
        reportData.materials.forEach((item: any) => {
            doc.font('Helvetica').fontSize(10).text(`• ${item.materialName} ${item.status ? '('+item.status+')' : ''}: ${item.note || 'N/A'}`);
        });
    } else {
      doc.font('Helvetica').fontSize(10).text('None reported.');
    }
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Next Steps');
    doc.moveDown(0.3);
    if (reportData.nextSteps?.length > 0) {
      doc.font('Helvetica').fontSize(10).list(reportData.nextSteps, { bulletRadius: 1.5 });
    } else {
      doc.font('Helvetica').fontSize(10).text('None specified.');
    }
    doc.moveDown(1);
    
    // --- Images Section (Restored Precise 2x2 Grid Layout) ---
    if (reportData.images?.length > 0) {
      doc.addPage(); 
      doc.fontSize(14).font('Helvetica-Bold').text('Images', { align: 'center' });
      const titleEndY = doc.y; // Y position after title
      doc.moveDown(1.5);
      const contentStartY = doc.y; // Y position where content starts

      // --- Define Layout Constants --- 
      const pageMargin = 50;
      const availableWidth = doc.page.width - (2 * pageMargin);
      const availableHeight = doc.page.height - contentStartY - pageMargin; // Height available below title
      const columnGap = 0; // No horizontal gap
      const rowGap = 5;    // Minimal vertical gap
      const imageWidth = (availableWidth - columnGap) / 2; 
      
      // Calculate row height needed to fit 2 rows
      const maxTotalRowHeight = (availableHeight - rowGap) / 2;
      
      const captionFontSize = 8;
      const captionMaxLines = 3;
      const captionLineHeight = captionFontSize * 1.2; 
      const spaceAfterImage = 5;
      const captionHeightAllocation = (captionLineHeight * captionMaxLines) + spaceAfterImage;
      
      // Ensure image height doesn't exceed available row space minus caption/padding
      let imageMaxHeight = maxTotalRowHeight - captionHeightAllocation; 
      if (imageMaxHeight < 100) imageMaxHeight = 100; // Set a minimum sensible height
      if (imageMaxHeight > 280) imageMaxHeight = 280; // Set a maximum sensible height

      const blockHeight = imageMaxHeight + captionHeightAllocation; // Height of one image+caption block

      // Define column X coordinates
      const col1X = pageMargin;
      const col2X = pageMargin + imageWidth + columnGap;
      
      // Define row Y coordinates (relative to contentStartY)
      let row1Y = contentStartY;
      let row2Y = row1Y + blockHeight + rowGap;

      doc.fontSize(captionFontSize).font('Helvetica-Oblique');

      for (let i = 0; i < reportData.images.length; i++) {
        const imageInfo = reportData.images[i];
        const imagePath = path.join(imagesDir, imageInfo.fileName);

        // --- Determine Position based on index i --- 
        const pageIndex = Math.floor(i / 4);
        const indexOnPage = i % 4;
        const rowIndex = Math.floor(indexOnPage / 2); // 0 or 1
        const colIndex = indexOnPage % 2;      // 0 or 1

        // --- Add New Page if needed ---
        if (pageIndex > 0 && indexOnPage === 0) { // Start of images 4, 8, 12...
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').text('Images (Continued)', { align: 'center' }); 
            doc.moveDown(1.5);
            row1Y = doc.y; // Reset Row 1 Y for new page
            row2Y = row1Y + blockHeight + rowGap;
            doc.fontSize(captionFontSize).font('Helvetica-Oblique'); // Reset font
        }

        // --- Calculate current X and Y --- 
        const currentX = (colIndex === 0) ? col1X : col2X;
        const currentY = (rowIndex === 0) ? row1Y : row2Y;

        try {
            await fs.promises.access(imagePath);

            // --- Draw Image (Sharp Corners, Centered) ---
            doc.image(imagePath, currentX, currentY, { 
                fit: [imageWidth, imageMaxHeight],
                align: 'center', // Center image horizontally within its box
                valign: 'center' // Center image vertically within its box
            });
            
            // --- Draw Caption --- 
            const captionY = currentY + imageMaxHeight + spaceAfterImage; 
            doc.text(imageInfo.caption || 'No caption', currentX, captionY, { 
                width: imageWidth, 
                align: 'center',
                indent: 0, // Explicitly remove indent
                lineBreak: true, 
                height: captionLineHeight * captionMaxLines, 
                ellipsis: true 
            });

        } catch (imgErr) {
            console.warn(`Image not found, skipping in PDF: ${imagePath}`);
            // Draw placeholder sharp rectangle and text
            const captionY = currentY + imageMaxHeight + spaceAfterImage;
            doc.rect(currentX, currentY, imageWidth, imageMaxHeight).stroke('#cccccc'); // Use sharp rect
            doc.fillColor('#aaaaaa').text('[Image Missing]', currentX, currentY + (imageMaxHeight/2 - 6), {align: 'center', width: imageWidth});
            doc.text(imageInfo.caption || 'No caption', currentX, captionY, { 
                width: imageWidth, align: 'center', lineBreak: true, 
                indent: 0, // Explicitly remove indent for placeholder too
                height: captionLineHeight * captionMaxLines, ellipsis: true 
            }).fillColor('black'); 
        }
      }
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
    console.log(`PDF report successfully generated at ${outputPdfPath}`);

  } catch (error: any) {
      console.error("Error generating PDF report:", error);
  }
}

// --- Main Report Generation Function --- 

export async function generateReport(inputVideoPath: string): Promise<string> {
  console.log(`Starting report generation for video: ${inputVideoPath}`);
  // --- Profile and Logo Setup ---
  let profileData: any = {};
  const profilePath = path.join(__dirname, 'profile.json'); // Use __dirname
  // Read profile data first
  try {
    const profileJsonString = await fs.promises.readFile(profilePath, 'utf-8');
    profileData = JSON.parse(profileJsonString);
    console.log('Profile data loaded.');
  } catch (error) {
    console.error(`Critical Error: Could not read profile data from ${profilePath}. Aborting.`, error);
    throw new Error(`Failed to read profile data: ${profilePath}`); // Throw error if profile missing
  }

  // --- Read Config from profileData (NO DEFAULTS) ---
  const logoSourceFilename = profileData.config.logoFilename; 
  // Removed inputVideoPath read here, it's now an argument
  // ---------------------------------------------------
  
  // --- Add check to ensure config value exists --- 
  if (!logoSourceFilename) {
    throw new Error('Required configuration (logoFilename) missing in profile.json');
  }
  // Removed check for inputVideoPath here
  // --------------------------------------------------
  console.log(`Using logo file: ${logoSourceFilename}`);
  const logoSourcePath = path.join(__dirname, logoSourceFilename); // Use __dirname

  // --- Timestamped Directory Setup ---
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const outputBaseDir = path.join('.', `report_${timestamp}`);
  await ensureDir(outputBaseDir);
  console.log(`Outputting files to: ${outputBaseDir}`);

  // --- Copy Logo to Output Directory ---
  const logoDestPath = path.join(outputBaseDir, logoSourceFilename);
  try {
      await fs.promises.copyFile(logoSourcePath, logoDestPath);
      console.log(`Logo copied to ${logoDestPath}`);
  } catch (error) {
      console.warn(`Warning: Could not copy logo from ${logoSourcePath}. Report will not include logo.`, error);
      // Allow continuing without logo
  }

  // --- Copy Original Video to Output Directory ---
  const videoPath = inputVideoPath; // Use function argument
  console.log(`Using input video: ${videoPath}`); // Log the video path being used
  const videoDestPath = path.join(outputBaseDir, path.basename(videoPath)); 
  try {
      await fs.promises.copyFile(videoPath, videoDestPath);
      console.log(`Original video copied to ${videoDestPath}`);
  } catch (error) {
      console.error(`!!! Critical Error: Could not copy source video from ${videoPath} to ${videoDestPath}. Aborting.`, error);
      throw new Error(`Failed to copy source video: ${videoPath}`); 
  }

  // --- Define Paths within the Timestamped Directory ---
  const audioPath = path.join(outputBaseDir, 'output.mp3');
  const transcriptDataPath = path.join(outputBaseDir, 'transcript_data.json');
  const reportJsonPath = path.join(outputBaseDir, 'daily_report.json');
  const framesDirPath = path.join(outputBaseDir, 'extracted_frames'); // Frames subdir
  const pdfOutputPath = path.join(outputBaseDir, 'daily_report.pdf');
  const viewerDestPath = path.join(outputBaseDir, 'report-viewer.html'); // Define viewer path
  const viewerSourcePath = path.join(__dirname, 'report-viewer.html'); // Add source path for viewer

  let transcriptionResult: FullTranscription | null = null;
  let reportJson: any = null; // To hold the report object
  let finalReportViewerUrl: string | null = null; // Variable to store the final URL

  try {
    // 1. Convert video to audio (using updated audioPath)
    await convertVideoToAudio(videoPath, audioPath);

    // 2. Transcribe audio (using updated audioPath)
    transcriptionResult = await transcribeAudio(audioPath, profileData);
    if (!transcriptionResult || !transcriptionResult.words || transcriptionResult.words.length === 0) {
      console.error('Transcription failed or produced empty result.');
      throw new Error('Transcription failed');
    }
    console.log('\nTranscript generated.');

    // Save the raw transcription data (using updated transcriptDataPath)
    await fs.promises.writeFile(transcriptDataPath, JSON.stringify(transcriptionResult, null, 2));
    console.log(`Raw transcript data saved to ${transcriptDataPath}`);

    // 3. Generate Report using Full Transcription
    console.log('\nStarting daily report generation based on transcript...');
    reportJson = await getDailyReport(transcriptionResult, profileData);
    if (!reportJson) {
        throw new Error('Report generation failed');
    }
    console.log('Report JSON generated by LLM (filenames not yet added).');

    // --- Delete Audio File ---
    try {
        await fs.promises.unlink(audioPath);
        console.log(`Intermediate audio file deleted: ${audioPath}`);
    } catch (deleteError) {
        console.warn(`Warning: Could not delete intermediate audio file ${audioPath}:`, deleteError);
    }
    // -------------------------

  } catch (error) {
    console.error("\nError during initial processing (audio/transcription/report):", error);
    // Clean up partially created directory if initial processing fails
    try {
        await fs.promises.rm(outputBaseDir, { recursive: true, force: true });
        console.log(`Cleaned up incomplete report directory: ${outputBaseDir}`);
    } catch (cleanupError) {
        console.error(`!!! Failed to cleanup incomplete directory: ${outputBaseDir}`, cleanupError);
    }
    throw error; // Re-throw the original error to be caught by the API endpoint
  }

  // --- Frame Extraction and Report Finalization ---
  try {
      await ensureDir(framesDirPath); // Ensure frames subdir exists
      console.log('\nStarting frame extraction based on report timestamps...');
      
      if (reportJson.images && Array.isArray(reportJson.images)) {
          const frameExtractionPromises: Promise<void>[] = [];
          for (let i = 0; i < reportJson.images.length; i++) {
              const imageInfo = reportJson.images[i];
              if (typeof imageInfo.timestamp !== 'number' || typeof imageInfo.caption !== 'string') {
                  console.warn(`Skipping image entry with invalid format: ${JSON.stringify(imageInfo)}`);
                  continue;
              }
              const timestamp = imageInfo.timestamp;
              const fileName = `frame_${timestamp.toFixed(2)}.jpg`;
              const caption = imageInfo.caption;
              frameExtractionPromises.push(
                  extractFrame(videoPath, timestamp, framesDirPath, fileName)
              );
              reportJson.images[i] = { fileName, caption }; 
          }
          await Promise.all(frameExtractionPromises);
          console.log('Frame extraction based on report completed.');
      } else {
          console.log('No images requested in the generated report.');
      }
      
      // 4. Prepare Final Report JSON (Customer, Project, Metadata, S3 URLs)
      // --- Determine S3 Path Components --- 
      const s3Bucket = process.env.AWS_S3_BUCKET;
      const awsRegion = process.env.AWS_REGION || 'us-east-1'; 
      reportJson.customer = profileData.company?.customer; 
      reportJson.project = profileData.company?.project; 
      if (!reportJson.customer || !reportJson.project) {
        // Throw error instead of just warning if critical for S3 path
         throw new Error("Customer or Project name missing in profile.json. Cannot determine S3 path.");
      }
      const customerFolder = reportJson.customer.replace(/[^a-zA-Z0-9\-\/_.]/g, '_').toLowerCase(); // Force lowercase
      const projectFolder = reportJson.project.replace(/[^a-zA-Z0-9\-\/_.]/g, '_').toLowerCase(); // Force lowercase
      const reportDirName = path.basename(outputBaseDir); 

      let baseS3Url: string | null = null;
      let s3TargetPath: string | null = null;

      if (s3Bucket) {
          const s3Host = `${s3Bucket}.s3.${awsRegion}.amazonaws.com`;
          baseS3Url = `https://${s3Host}/${customerFolder}/${projectFolder}/${reportDirName}/`;
          s3TargetPath = `s3://${s3Bucket}/${customerFolder}/${projectFolder}/${reportDirName}/`; 
          finalReportViewerUrl = `${baseS3Url}report-viewer.html`; // Store the viewer URL
      } else {
          throw new Error("AWS_S3_BUCKET not set in environment variables. Cannot upload report.");
      }
      // --------------------------------------

      // --- Add Metadata from Profile to the Report JSON --- 
      reportJson.reportMetadata = {
        preparedBy: {
          name: profileData.name || null, 
          email: profileData.email || null,
        },
        companyInfo: {
          name: profileData.company?.name || null,
          address: profileData.company?.address || null, 
          phone: profileData.company?.phone || null,
          website: profileData.company?.website || null,
        }
      };
      // ----------------------------------------------------

      // --- Add S3 URLs to Report JSON --- 
      reportJson.reportAssetsS3Urls = {
          baseUrl: baseS3Url, 
          videoUrl: baseS3Url ? `${baseS3Url}${path.basename(videoDestPath)}` : null,
          transcriptJsonUrl: baseS3Url ? `${baseS3Url}${path.basename(transcriptDataPath)}` : null,
          pdfUrl: baseS3Url ? `${baseS3Url}${path.basename(pdfOutputPath)}` : null,
          logoUrl: baseS3Url ? `${baseS3Url}${path.basename(logoDestPath)}` : null 
      };
      if (reportJson.images && Array.isArray(reportJson.images)) {
          reportJson.images.forEach((imageInfo: any) => {
              if (imageInfo.fileName) {
                  imageInfo.s3Url = baseS3Url ? `${baseS3Url}${path.basename(framesDirPath)}/${imageInfo.fileName}` : null;
              } else {
                  imageInfo.s3Url = null; 
              }
          });
      }
      // -----------------------------------      
      
      // --- Save the FINAL report JSON --- 
      await fs.promises.writeFile(reportJsonPath, JSON.stringify(reportJson, null, 2));
      console.log(`Final daily report with metadata and S3 URLs saved to ${reportJsonPath}`);
      // ----------------------------------      

      // 5. Generate PDF Report
      console.log('\nGenerating PDF report...');
      await generatePdfReport(reportJsonPath, framesDirPath, pdfOutputPath, logoSourceFilename);

      // 6. Copy Viewer HTML to Output Directory (ADD THIS STEP)
      try {
          await fs.promises.copyFile(viewerSourcePath, viewerDestPath);
          console.log(`Viewer HTML copied to ${viewerDestPath}`);
      } catch (error) {
          console.error(`!!! Critical Error: Could not copy viewer HTML from ${viewerSourcePath} to ${viewerDestPath}.`, error);
          // Consider if this should be a fatal error 
      }

      // 7. Upload Entire Report Directory to S3 using AWS CLI
      const localSourcePath = outputBaseDir; 
      if (s3Bucket && s3TargetPath) { // Check again (belt and suspenders)
          console.log(`\nAttempting to upload report directory ${localSourcePath} via AWS CLI to ${s3TargetPath}...`);
          // S3 upload logic (STS check, aws s3 cp command execution) remains the same...
          // ... [AWS CLI execution logic for both credential scenarios] ...
          const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
          const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
          let uploadSuccess = false;

          try { // Wrap entire upload/cleanup logic to ensure cleanup happens on error
              if (!awsAccessKeyId || !awsSecretAccessKey) {
                  console.warn("\nAWS keys not found in .env, using default CLI config...");
                  const uploadCommand = `aws s3 cp "${localSourcePath}" "${s3TargetPath}" --recursive`;
                  await execAsync(uploadCommand); // Throws on error
                  uploadSuccess = true;
              } else {
                  console.log("AWS keys found in .env, verifying with STS...");
                  const envPrefix = `AWS_ACCESS_KEY_ID="${awsAccessKeyId}" AWS_SECRET_ACCESS_KEY="${awsSecretAccessKey}" AWS_REGION="${awsRegion}" `;
                  const stsCommand = `${envPrefix} aws sts get-caller-identity`;
                  await execAsync(stsCommand); // Verify credentials
                  console.log("AWS Credentials appear valid.");
                  const uploadCommand = `${envPrefix} aws s3 cp "${localSourcePath}" "${s3TargetPath}" --recursive`;
                  await execAsync(uploadCommand); // Throws on error
                  uploadSuccess = true;
              }

              console.log(`Successfully uploaded report files to ${s3TargetPath}`);

              // --- Cleanup Local Directory (ONLY on successful upload) --- 
              console.log(`\nAttempting to delete local report directory: ${localSourcePath}`);
              await fs.promises.rm(localSourcePath, { recursive: true, force: true });
              console.log(`Successfully deleted local directory: ${localSourcePath}`);
              // ----------------------------------------------------------

          } catch (s3Error: any) {
               console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
               console.error(`!!! Failed S3 operation (STS check or upload):`, s3Error.message || s3Error);
               // Log specific AWS CLI errors if available
               if (s3Error.stderr) {
                   console.error("!!! AWS CLI stderr:", s3Error.stderr);
               }
               // Don't delete local files if upload failed
               console.error(`!!! Local report directory NOT deleted due to error: ${localSourcePath}`);
               console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
               throw new Error(`S3 operation failed: ${s3Error.message}`); // Re-throw to API
          }

      } else { 
          // This case should have been caught earlier by the s3Bucket check, but just in case
          throw new Error("S3 bucket/target path not configured correctly.");
      }

      // --- Return the S3 KEY for the JSON file --- 
      const reportJsonKey = `${customerFolder}/${projectFolder}/${reportDirName}/${path.basename(reportJsonPath)}`;
      console.log(`Report generation complete. JSON Key: ${reportJsonKey}`);
      return reportJsonKey; 
      // ----------------------------------------------

    } catch (postProcessingError) { // Catch errors during frame extraction, JSON finalization, PDF, S3 etc.
        console.error("\nError during report post-processing:", postProcessingError);
         // Attempt cleanup of the directory even if post-processing fails
        try {
            await fs.promises.rm(outputBaseDir, { recursive: true, force: true });
            console.log(`Cleaned up incomplete report directory after post-processing error: ${outputBaseDir}`);
        } catch (cleanupError) {
            console.error(`!!! Failed to cleanup directory after post-processing error: ${outputBaseDir}`, cleanupError);
        }
        throw postProcessingError; // Re-throw the error
    }
}
