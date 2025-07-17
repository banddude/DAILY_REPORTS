import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, access, mkdir, readdir } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface TimestampData {
    timestamp: number;
    reason: string;
}

export interface FrameData {
    timestamps: TimestampData[];
}

export interface FrameExtractionResult {
    framesOutputDir: string;
    frameTimestampsPath: string;
    extractedFrames: string[];
}

/**
 * Service for video processing operations using ffmpeg
 * Centralizes all video manipulation tasks
 */
export class VideoProcessingService {
    
    /**
     * Creates a directory if it doesn't exist
     */
    private async ensureDir(dirPath: string): Promise<void> {
        try {
            await access(dirPath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`Creating directory (VideoProcessingService): ${dirPath}`);
                await mkdir(dirPath, { recursive: true });
            } else {
                throw error;
            }
        }
    }

    /**
     * Extracts a single frame from a video file at a specific timestamp using ffmpeg
     * FIXED: Uses output seeking (-ss after -i) for accurate timestamp selection
     */
    async extractFrame(videoPath: string, timestamp: number, outputDir: string, outputFilename: string): Promise<void> {
        const outputPath = path.join(outputDir, outputFilename);
        // IMPORTANT: -ss comes AFTER -i for accurate timestamp seeking
        const command = `ffmpeg -i "${videoPath}" -ss ${timestamp.toFixed(6)} -frames:v 1 -q:v 2 "${outputPath}"`;
        
        console.log(`Executing frame extraction command: ${command}`);
        
        try {
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log(`extractFrame stdout [${timestamp.toFixed(2)}s]:`, stdout);
            if (stderr) console.warn(`extractFrame stderr [${timestamp.toFixed(2)}s]:`, stderr);
            console.log(`Extracted frame at ${timestamp.toFixed(2)}s to ${outputPath}`);
        } catch (error: any) {
            console.error(`Error extracting frame at ${timestamp.toFixed(2)}s:`, error);
            // Log but don't throw - allow other frames to be processed
        }
    }

    /**
     * Extracts multiple frames from a video based on timestamp data
     */
    async extractFramesFromData(videoPath: string, frameDataPath: string, outputDir: string): Promise<string[]> {
        try {
            await this.ensureDir(outputDir);
            const jsonData = await readFile(frameDataPath, 'utf-8');
            const frameData: FrameData = JSON.parse(jsonData);

            if (!frameData.timestamps || frameData.timestamps.length === 0) {
                console.log('No timestamps found in the data file.');
                return [];
            }

            console.log(`Found ${frameData.timestamps.length} timestamps. Starting frame extraction...`);

            const extractionPromises = frameData.timestamps.map((item) => {
                const timestamp = item.timestamp;
                const outputFilename = `frame_${timestamp.toFixed(2)}.jpg`;
                return this.extractFrame(videoPath, timestamp, outputDir, outputFilename);
            });

            await Promise.all(extractionPromises);
            console.log('Frame extraction completed.');

            // Return list of extracted frame files
            const frameFiles = await readdir(outputDir);
            return frameFiles.filter(file => file.endsWith('.jpg'));

        } catch (err: any) {
            if (err.code === 'ENOENT' && err.path === frameDataPath) {
                console.error(`Error: Frame data file not found at ${frameDataPath}.`);
                console.error('Ensure frame timestamps were generated successfully.');
            } else {
                console.error('Error processing frames:', err.message);
            }
            throw err;
        }
    }

    /**
     * Extracts frames from video based on AI-selected timestamps
     */
    async extractFramesFromTimestamps(videoPath: string, timestamps: TimestampData[], outputDir: string): Promise<FrameExtractionResult> {
        try {
            await this.ensureDir(outputDir);

            if (!timestamps || timestamps.length === 0) {
                throw new Error("No valid timestamps provided for frame extraction");
            }

            console.log(`Extracting ${timestamps.length} frames from video`);

            // Create frame data object
            const frameData: FrameData = { timestamps };
            
            // Save frame timestamps for reference
            const frameTimestampsPath = path.join(path.dirname(outputDir), 'frame_timestamps.json');
            await writeFile(frameTimestampsPath, JSON.stringify(frameData, null, 2));

            // Extract frames
            const extractionPromises = timestamps.map((item) => {
                const timestamp = item.timestamp;
                const outputFilename = `frame_${timestamp.toFixed(2)}.jpg`;
                return this.extractFrame(videoPath, timestamp, outputDir, outputFilename);
            });

            await Promise.all(extractionPromises);
            
            // Get list of successfully extracted frames
            const extractedFrames = await readdir(outputDir);
            const frameFiles = extractedFrames.filter(file => file.endsWith('.jpg'));

            console.log(`Successfully extracted ${frameFiles.length} frames`);

            return {
                framesOutputDir: outputDir,
                frameTimestampsPath,
                extractedFrames: frameFiles
            };

        } catch (error) {
            console.error('Error in extractFramesFromTimestamps:', error);
            throw error;
        }
    }

    /**
     * Validates that a video file exists and is accessible
     */
    async validateVideoFile(videoPath: string): Promise<boolean> {
        try {
            await access(videoPath);
            return true;
        } catch (error) {
            console.error(`Video file not accessible: ${videoPath}`, error);
            return false;
        }
    }

    /**
     * Gets video information using ffprobe (if needed in the future)
     */
    async getVideoInfo(videoPath: string): Promise<{ duration?: number; width?: number; height?: number }> {
        try {
            const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
            const { stdout } = await execAsync(command);
            const info = JSON.parse(stdout);
            
            const videoStream = info.streams?.find((stream: any) => stream.codec_type === 'video');
            
            return {
                duration: parseFloat(info.format?.duration || '0'),
                width: videoStream?.width,
                height: videoStream?.height
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            return {};
        }
    }
}

// Export singleton instance
export const videoProcessingService = new VideoProcessingService();