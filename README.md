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
*   **Ensure Consistency:** Standardize report formats across your team using custom schemas.
*   **Enhance Communication:** Share clear, concise, and visually supported reports easily.
*   **Customizable AI:** Tailor the transcription and report generation models (Whisper, GPT models) and prompts to your specific industry and needs.
*   **Mobile First:** Upload videos and manage reports directly from the field using our intuitive mobile app.
*   **Secure Cloud Storage:** Access your reports anytime, anywhere, backed by AWS S3.
*   **Edit & Refine:** Easily review and edit generated reports within the app before finalizing.

## 4. Technology Stack

The platform utilizes a modern technology stack chosen for performance, scalability, and development efficiency:

*   **Frontend (Mobile App):**
    *   **Framework:** React Native with Expo (Managed Workflow)
    *   **Language:** TypeScript
    *   **Styling:** NativeWind (Tailwind CSS for React Native) - *Inferred from `nativewind-env.d.ts`*
    *   **Navigation:** React Navigation (Native Stack, Bottom Tabs)
    *   **State Management:** React Context API (e.g., `AuthContext`)
    *   **Key Libraries:** Expo SDK (AV, ImagePicker, DocumentPicker, etc.), `react-native-webview`
*   **Backend:**
    *   **Framework:** Node.js with Express
    *   **Language:** TypeScript
    *   **Key Libraries:**
        *   `@aws-sdk/client-s3`: For AWS S3 interactions.
        *   `openai`: For interacting with OpenAI APIs (Whisper, Chat Completions).
        *   `multer`: For handling file uploads (video, images).
        *   `ffmpeg`: (System dependency) Used via `child_process` for video-to-audio conversion and frame extraction.
        *   `pdfkit`: For PDF generation (capability exists but is currently disabled).
        *   `cors`, `dotenv`, `uuid`.
*   **AI Services:**
    *   **Transcription:** OpenAI Whisper API (model selectable by user).
    *   **Report Generation:** OpenAI Chat Completions API (GPT models, selectable by user).
*   **Cloud Storage:**
    *   **File Storage:** AWS S3 (Used for storing original videos, audio files, transcriptions, extracted images, generated reports, user logos).
*   **Authentication:**
    *   Custom JWT-based authentication handled by the backend (`authMiddleware.ts`). User credentials seem to be managed via API interaction (sign up/login), potentially storing user info in a backend mechanism not fully detailed but likely involving S3 for profile storage.
*   **Database:**
    *   No traditional SQL/NoSQL database is explicitly configured in the visible backend setup. User profile data (`profile.json`) and report data (`daily_report.json`) are stored as JSON files directly in AWS S3, scoped by user ID.

## 5. Architecture & Workflow

The application follows a client-server architecture with AI services integrated into the backend processing pipeline.
