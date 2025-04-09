# Daily Report Generator

This script automates the process of generating a daily work report from a video recording. It transcribes the video's audio, uses an LLM to summarize activities and identify key moments, extracts corresponding image frames, generates a formatted PDF report, and uploads all artifacts to an AWS S3 bucket.

## Features

*   Converts video (.MOV) to audio (.MP3) using `ffmpeg`.
*   Transcribes audio using OpenAI Whisper API (with word-level timestamps).
*   Generates a structured JSON report (narrative, work completed, issues, materials, safety, next steps, image timestamps/captions) using OpenAI GPT-4o-mini based on the transcript.
*   Extracts image frames from the source video corresponding to timestamps identified in the JSON report using `ffmpeg`.
*   Generates a professional PDF report using `pdfkit`, including:
    *   Company logo and details (from `profile.json`).
    *   Customer and Project information.
    *   Formatted sections for narrative, tasks, issues, etc.
    *   A 2x2 grid layout for extracted images with captions.
*   Uploads the complete report directory (original video, JSON report, PDF report, extracted images, logs, etc.) to a specified AWS S3 bucket using the AWS CLI v2.
*   Cleans up the local temporary report directory after successful S3 upload.

## Prerequisites

1.  **Node.js:** Required to run the TypeScript script. Download from [nodejs.org](https://nodejs.org/).
2.  **npm (or yarn):** Node.js package manager, usually included with Node.js.
3.  **ffmpeg:** Required for video-to-audio conversion and frame extraction. Install via your system's package manager (e.g., `brew install ffmpeg` on macOS, `sudo apt update && sudo apt install ffmpeg` on Debian/Ubuntu).
4.  **AWS CLI v2:** Required for uploading reports to S3. Follow the official installation guide: [Installing the AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html). Ensure it's configured or that credentials are provided via `.env`.

## Setup

1.  **Clone/Download:** Get the script files (`daily-report.ts`, `package.json`, etc.).
2.  **Install Dependencies:** Open a terminal in the project directory and run:
    ```bash
    npm install
    ```
3.  **Create `.env` File:** Create a file named `.env` in the root directory with the following variables:
    ```dotenv
    OPENAI_API_KEY=your_openai_api_key_here
    AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
    AWS_REGION=your_aws_region_here # e.g., us-east-1
    AWS_S3_BUCKET=your_s3_bucket_name_here
    ```
    *   Replace the placeholder values with your actual credentials.
    *   The AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are optional if the AWS CLI is already configured with credentials (e.g., via `~/.aws/credentials` or an IAM role). The script will attempt to use the default configuration if these are not found in `.env`.
4.  **Create `profile.json`:** Create a file named `profile.json` in the root directory. This file contains company, project, and user information used in the report header.
    *Example Structure:*
    ```json
    {
      "name": "Your Name",
      "email": "your.email@example.com",
      "company": {
        "name": "Your Company Inc.",
        "address": {
          "street": "123 Main St",
          "unit": "Suite 4",
          "city": "Anytown",
          "state": "CA",
          "zip": "90210"
        },
        "phone": "555-123-4567",
        "website": "www.example.com",
        "customer": "Example Customer",  // Used for S3 path
        "project": "Project Alpha"       // Used for S3 path
      }
    }
    ```
    *   The `customer` and `project` fields within `company` are used to construct the S3 upload path.
5.  **Place Source Files:**
    *   Place your source video file named exactly `IMG_3076.MOV` in the root directory.
    *   Place your company logo file named exactly `logo.png` in the root directory.

## Usage

Ensure all setup steps are complete. Run the script from the root directory using:

```bash
npx ts-node daily-report.ts
```

## Workflow

1.  The script creates a timestamped directory (e.g., `report_YYYY-MM-DDTHH-MM-SS-mmmZ`).
2.  Copies `logo.png` and `IMG_3076.MOV` into this directory.
3.  Converts `IMG_3076.MOV` to `output.mp3` inside the directory.
4.  Transcribes `output.mp3` using Whisper.
5.  Generates `daily_report.json` using GPT-4o-mini.
6.  Extracts frames specified in the JSON into an `extracted_frames` subdirectory.
7.  Generates `daily_report.pdf`.
8.  Uploads the entire `report_YYYY...` directory to S3 at `s3://<AWS_S3_BUCKET>/<customer>/<project>/report_YYYY.../`.
9.  Deletes the local `report_YYYY...` directory if the S3 upload was successful.

## Dependencies

*   `dotenv`: Loads environment variables from `.env`.
*   `openai`: Official OpenAI Node.js library.
*   `pdfkit`: PDF generation library.
*   `@types/*`: TypeScript type definitions.
*   `ts-node`: Executes TypeScript files directly.
*   `typescript`: TypeScript compiler. 