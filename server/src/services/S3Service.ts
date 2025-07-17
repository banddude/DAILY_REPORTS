import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, s3Bucket } from '../config';
import { Readable } from 'stream';

export interface S3UploadOptions {
    key: string;
    body: Buffer | Uint8Array | string | Readable;
    contentType?: string;
    contentDisposition?: string;
    metadata?: Record<string, string>;
}

export interface S3UploadResult {
    key: string;
    location: string;
    etag?: string;
}

export interface S3DownloadResult {
    body: Readable;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
}

/**
 * Service for Amazon S3 operations
 * Centralizes all S3 file operations with proper error handling
 */
export class S3Service {
    private client: S3Client;
    private bucket: string;

    constructor(client: S3Client = s3Client, bucket: string = s3Bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    /**
     * Upload a file to S3
     */
    async uploadFile(options: S3UploadOptions): Promise<S3UploadResult> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: options.key,
                Body: options.body,
                ContentType: options.contentType,
                ContentDisposition: options.contentDisposition,
                Metadata: options.metadata,
            });

            const response = await this.client.send(command);
            
            return {
                key: options.key,
                location: `https://${this.bucket}.s3.amazonaws.com/${options.key}`,
                etag: response.ETag,
            };
        } catch (error) {
            console.error(`Failed to upload file to S3: ${options.key}`, error);
            throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Download a file from S3
     */
    async downloadFile(key: string): Promise<S3DownloadResult> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const response = await this.client.send(command);
            
            if (!response.Body) {
                throw new Error('No file content received from S3');
            }

            return {
                body: response.Body as Readable,
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                metadata: response.Metadata,
            };
        } catch (error) {
            console.error(`Failed to download file from S3: ${key}`, error);
            throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a file from S3
     */
    async deleteFile(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.client.send(command);
        } catch (error) {
            console.error(`Failed to delete file from S3: ${key}`, error);
            throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if a file exists in S3
     */
    async fileExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            console.error(`Failed to check if file exists in S3: ${key}`, error);
            throw new Error(`S3 head request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get file metadata from S3
     */
    async getFileMetadata(key: string): Promise<{ contentType?: string; contentLength?: number; metadata?: Record<string, string>; lastModified?: Date }> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const response = await this.client.send(command);
            
            return {
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                metadata: response.Metadata,
                lastModified: response.LastModified,
            };
        } catch (error) {
            console.error(`Failed to get file metadata from S3: ${key}`, error);
            throw new Error(`S3 metadata request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload JSON data to S3
     */
    async uploadJson(key: string, data: any, metadata?: Record<string, string>): Promise<S3UploadResult> {
        return this.uploadFile({
            key,
            body: JSON.stringify(data, null, 2),
            contentType: 'application/json',
            metadata,
        });
    }

    /**
     * Download and parse JSON from S3
     */
    async downloadJson(key: string): Promise<any> {
        const result = await this.downloadFile(key);
        
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            
            result.body.on('data', (chunk) => chunks.push(chunk));
            result.body.on('end', () => {
                try {
                    const jsonString = Buffer.concat(chunks).toString('utf-8');
                    const data = JSON.parse(jsonString);
                    resolve(data);
                } catch (error) {
                    reject(new Error(`Failed to parse JSON from S3: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            });
            result.body.on('error', (error) => {
                reject(new Error(`Failed to read JSON from S3: ${error.message}`));
            });
        });
    }

    /**
     * Upload a buffer to S3
     */
    async uploadBuffer(key: string, buffer: Buffer, contentType?: string, metadata?: Record<string, string>): Promise<S3UploadResult> {
        return this.uploadFile({
            key,
            body: buffer,
            contentType,
            metadata,
        });
    }

    /**
     * Download a file as buffer
     */
    async downloadBuffer(key: string): Promise<Buffer> {
        const result = await this.downloadFile(key);
        
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            
            result.body.on('data', (chunk) => chunks.push(chunk));
            result.body.on('end', () => resolve(Buffer.concat(chunks)));
            result.body.on('error', (error) => reject(error));
        });
    }

    /**
     * Generate a public URL for an S3 object
     */
    generatePublicUrl(key: string): string {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }

    /**
     * List objects in S3 with optional prefix and delimiter
     */
    async listObjects(prefix?: string, delimiter?: string): Promise<any> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                Delimiter: delimiter
            });
            const response = await this.client.send(command);
            return response;
        } catch (error) {
            console.error(`Failed to list objects in S3 with prefix ${prefix}:`, error);
            throw new Error(`S3 list objects failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the bucket name
     */
    getBucket(): string {
        return this.bucket;
    }
}

// Export singleton instance
export const s3Service = new S3Service();