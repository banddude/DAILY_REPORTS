# Daily Reports AI - Video-to-Report Automation Platform

**Transform your field video walkthroughs into structured, actionable reports effortlessly.**

## 1. Overview

Daily Reports AI is a comprehensive platform designed to automate the tedious process of documenting site visits, inspections, or any activity captured via video. Users upload video recordings through a dedicated mobile application. The backend system then leverages cutting-edge AI to transcribe the audio, analyze the content, extract key information and relevant visual frames, and generate detailed, structured reports. These reports are stored securely in the cloud and accessible via the mobile app for viewing, editing, and management.

The platform is built with efficiency and customization in mind, allowing users to tailor the AI models, report structure, and system prompts to their specific needs through a user-friendly profile management interface within the app.

## 2. Target Audience & Use Cases

This application is ideal for professionals and businesses that rely on regular field documentation, including:

*   **Construction Managers:** Documenting daily progress, safety checks, material deliveries, and identified issues on job sites.
*   **Field Service Technicians:** Recording completed work, diagnosing problems, and noting required follow-ups during service calls.
*   **Inspectors (Home, Insurance, Compliance):** Capturing findings during inspections and automatically generating structured reports.
*   **Project Managers:** Monitoring remote site activities and receiving concise summaries without watching hours of footage.
*   **Real Estate Agents:** Creating property walkthrough summaries or condition reports.
*   **Anyone needing to convert spoken observations during a video recording into a formal written report.**

## 3. Advertising Copy & Key Selling Points

**Headline:** **Stop Typing, Start Reporting: AI-Powered Daily Reports from Your Videos.**

**Body:** Tired of spending hours transcribing videos and manually compiling daily reports? Daily Reports AI automates the entire process. Simply record a video walkthrough, upload it through our mobile app, and let our intelligent system do the rest. We use advanced AI to:

*   **Transcribe** your spoken commentary with high accuracy.
*   **Analyze** the content to understand key activities, issues, and observations.
*   **Generate** structured, professional reports based on your custom templates.
*   **Extract** relevant visual frames from your video to illustrate key points.
*   **Store** everything securely in the cloud for easy access.

**Key Selling Points:**

*   **Save Hours:** Dramatically reduce the time spent on manual reporting.
*   **Improve Accuracy:** AI transcription captures details you might miss.
*   **Ensure Consistency:** Standardize report formats across your team using custom schemas stored in your profile.
*   **Enhance Communication:** Share clear, concise, and visually supported reports easily.
*   **Customizable AI:** Tailor the transcription and report generation models (Whisper, GPT models) and prompts to your specific industry and needs via your profile settings.
*   **Mobile First:** Upload videos and manage reports directly from the field using our intuitive mobile app.
*   **Secure Cloud Storage:** Profile data managed in Supabase, with report assets and logos stored reliably in AWS S3.
*   **Edit & Refine:** Easily review and edit generated reports within the app before finalizing.

## 4. Technology Stack

The platform utilizes a modern technology stack chosen for performance, scalability, and development efficiency:

*   **Frontend (Mobile App):**
    *   **Framework:** React Native with Expo (Managed Workflow)
    *   **Language:** TypeScript
    *   **Navigation:** React Navigation (Native Stack, Bottom Tabs)
    *   **State Management:** React Context API (e.g., `AuthContext`)
    *   **Key Libraries:** Expo SDK (AV, ImagePicker, DocumentPicker, etc.), `react-native-webview`
*   **Backend:**
    *   **Framework:** Node.js with Express
    *   **Language:** TypeScript
    *   **Key Libraries:**
        *   `@aws-sdk/client-s3`: For AWS S3 interactions.
        *   `@supabase/supabase-js`: For interacting with Supabase DB and Auth.
        *   `openai`: For interacting with OpenAI APIs (Whisper, Chat Completions).
        *   `multer`: For handling file uploads (video, images).
        *   `ffmpeg`: (System dependency) Used via `child_process` for video-to-audio conversion and frame extraction.
        *   `pdfkit`: For PDF generation.
        *   `cors`, `dotenv`.
*   **AI Services:**
    *   **Transcription:** OpenAI Whisper API (model selectable via user profile).
    *   **Report Generation:** OpenAI Chat Completions API (GPT models, model and system prompt configured via user profile).
*   **Cloud Storage & Database:**
    *   **Database & Auth:** Supabase (PostgreSQL database manages user accounts and profile data, including configuration settings like prompts, schemas, model choices, and logo filename; Supabase Auth handles authentication).
    *   **File Storage:** AWS S3 (Used for storing generated report assets: JSON, PDF, images, transcription, video. Also stores the user's company logo image).

## 5. Architecture & Workflow

The application follows a client-server architecture with integrated AI services and distinct data storage layers:

1.  **Authentication:** Users sign up or log in via the mobile app. The backend uses Supabase Auth to manage user authentication and issue JWTs.
2.  **Profile Management:** User profile data (personal info, company details, AI model preferences, system prompt, report schema, logo filename) is stored and retrieved from the `profiles` table in the Supabase PostgreSQL database via the `/api/profile` endpoints.
3.  **Logo Upload:** The mobile app uploads the logo image file via `/api/upload-logo`. The backend saves the file to S3 (`users/<user_id>/<logo_filename>`) and updates the `config_logo_filename` field in the user's Supabase profile.
4.  **Video Upload:** The user selects customer/project context and uploads a video file via the mobile app (`/api/upload-video` or `/api/generate-report`).
5.  **Backend Processing (`daily-report.ts`):**
    *   The backend receives the video and context.
    *   It fetches the user's profile data (system prompt, schema, model choices) from **Supabase** using the `getUserProfile` function.
    *   Converts video to audio (`ffmpeg`).
    *   Transcribes audio using OpenAI Whisper (using the model specified in the user's profile).
    *   Generates a structured JSON report using OpenAI Chat Completions (using the model and system prompt from the user's profile).
    *   Selects relevant frame timestamps based on the report.
    *   Extracts image frames from the video (`ffmpeg`).
    *   Fetches the user's logo filename from their **Supabase** profile.
    *   Generates a PDF report, embedding extracted frames and fetching the logo image from **S3** using the path stored in the profile.
    *   Uploads all generated assets (report JSON, report PDF, extracted frames, transcription, viewer HTML, source video) to a unique, timestamped folder in **S3** under `users/<user_id>/<customer>/<project>/`.
    *   Saves metadata (including S3 URLs of assets) within the uploaded `daily_report.json`.
6.  **Report Access:**
    *   The mobile app receives URLs for viewing (via `report-viewer.html` served from S3) or editing the report.
    *   The `ReportEditorScreen` fetches the `daily_report.json` file from **S3** via the `/api/report` GET endpoint (using the decoded S3 key).
    *   Saving edits involves sending the modified JSON to the `/api/report` POST endpoint, which overwrites the `daily_report.json` file in **S3** (using the decoded S3 key) and regenerates the viewer HTML.

## 6. Setup & Environment Variables

To run the backend server locally, you need to create a `.env` file in the `server/` directory with the following environment variables:

```dotenv
# Supabase Credentials (Required)
# Get these from your Supabase project settings (Project Settings > API)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
# This is the Service Role Key (needed for backend operations that bypass RLS)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AWS Credentials (Required)
# Configure AWS credentials securely (e.g., via environment variables, shared credentials file, or IAM role)
# Ensure the credentials have S3 permissions (GetObject, PutObject, DeleteObject) for the specified bucket.
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region # e.g., us-east-1
AWS_S3_BUCKET=your_s3_bucket_name

# OpenAI API Key (Required)
OPENAI_API_KEY=your_openai_api_key

# Server Configuration (Optional)
PORT=8080 # Default port for the backend server

# Optional: Set to "false" to disable uploading the original source video to S3
UPLOAD_SOURCE_VIDEO=true 
```

**Frontend Environment:**

The mobile app (`mobile-app/`) requires certain backend details. Create an `.env` file in the `mobile-app/` directory:

```dotenv
# URL of your running backend server
EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip-or-domain>:8080
# S3 Bucket details (needed for constructing some URLs on the client)
EXPO_PUBLIC_S3_BUCKET_NAME=your_s3_bucket_name
EXPO_PUBLIC_AWS_REGION=your_aws_region
```

**Note:** Replace placeholder values with your actual credentials and configuration.
