# Server API Schema for Frontend Interaction

This document outlines the API endpoints provided by the backend server that the frontend application is expected to interact with.

**Authentication:** Endpoints marked with `Auth Required: Yes` need a valid Bearer token (User UUID) in the `Authorization` header: `Authorization: Bearer <USER_UUID>`.

**JSON Schemas:**
*   `ReportJSONObject`: The structure of the daily report JSON. This schema is dynamically defined by the `reportJsonSchema` field within the user's `profile.json` configuration file stored in S3 (`users/<UUID>/profile.json`).
*   `ProfileJSONObject`: The structure of the user's configuration file stored in S3 (`users/<UUID>/profile.json`). It typically contains fields like `config`, `customerDetails`, etc.
*   `ReportImage`: An object usually containing `{ fileName: string, caption: string, s3Url: string }`.

---

## Authentication Endpoints

### 1. Login

*   **Method:** `POST`
*   **Path:** `/api/login`
*   **Auth Required:** No
*   **Input:**
    *   **Body:** `{ "email": "user@example.com", "password": "user_password" }` (JSON)
*   **Output:**
    *   **Success (200):** `{ "success": true, "token": "user-uuid-string", "email": "user@example.com" }` (JSON)
    *   **Error (400):** `{ "success": false, "message": "Email and password are required." }` (JSON)
    *   **Error (401):** `{ "success": false, "message": "Invalid credentials." }` (JSON)
    *   **Error (500):** `{ "success": false, "message": "Login configuration error." }` (JSON)

### 2. Signup

*   **Method:** `POST`
*   **Path:** `/api/signup`
*   **Auth Required:** No
*   **Input:**
    *   **Body:** `{ "email": "newuser@example.com", "password": "new_password" }` (JSON)
*   **Output:**
    *   **Success (201):** `{ "success": true, "token": "new-user-uuid-string", "email": "newuser@example.com", "message"?: "User created, but profile initialization failed..." }` (JSON)
    *   **Error (400):** `{ "success": false, "message": "Email and password are required." }` (JSON)
    *   **Error (409):** `{ "success": false, "message": "Email already exists." }` (JSON)
    *   **Error (500):** `{ "success": false, "message": "Internal server error during signup." }` (JSON - General error)

---

## Report Management Endpoints

### 3. Browse Reports/Items

*   **Method:** `GET`
*   **Path:** `/api/browse-reports`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `customer` (string, optional): Filter by customer folder.
        *   `project` (string, optional): Filter by project folder (requires `customer`).
*   **Output:**
    *   **Success (200):** `{ "items": ["customer1", "customer2"] }` or `{ "items": ["projectA", "projectB"] }` or `{ "items": ["report_2024-01-01.json", "..."] }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to browse S3: <message>" }` (JSON)

### 4. Get Report JSON

*   **Method:** `GET`
*   **Path:** `/api/report`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The full S3 key for the report JSON (e.g., `users/<UUID>/customer/project/report_YYYY-MM-DD.json`).
*   **Output:**
    *   **Success (200):** `ReportJSONObject` (Raw JSON response, Content-Type: application/json)
    *   **Error (400):** `{ "error": "Missing 'key' query parameter." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (404):** `{ "error": "Report JSON not found at the specified key." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to fetch report from S3: <message>" }` (JSON)

### 5. Save/Update Report JSON

*   **Method:** `POST`
*   **Path:** `/api/report`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The full S3 key for the report JSON (e.g., `users/<UUID>/customer/project/report_YYYY-MM-DD.json`).
    *   **Body:** `ReportJSONObject` (JSON)
*   **Output:**
    *   **Success (200):** `{ "message": "Report updated successfully." }` (JSON)
    *   **Error (400):** `{ "error": "Missing 'key' query parameter." }` or `{ "error": "Missing or invalid JSON data in request body." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to save report to S3: <message>" }` (JSON)

### 6. Upload Video & Generate Report

*   **Method:** `POST`
*   **Path:** `/api/upload-video` (and potentially `/api/generate-report`, which seems redundant)
*   **Auth Required:** Yes
*   **Input:**
    *   **Form Data:**
        *   `video` (File, required): The video file to process.
        *   `customer` (string, optional): Customer name. Defaults to 'UnknownCustomer'.
        *   `project` (string, optional): Project name. Defaults to 'UnknownProject'.
*   **Output:**
    *   **Success (200):** `{ "editorUrl": "http://localhost:PORT/edit-report?key=...", "viewerUrl": "https://BUCKET.s3.REGION.amazonaws.com/..." }` (JSON)
    *   **Error (400):** `{ "error": "No video file uploaded..." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` (JSON)
    *   **Error (500):** `{ "error": "Report generation failed: <message>" }` (JSON)

### 7. Upload Report Image

*   **Method:** `POST`
*   **Path:** `/api/report-image`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The S3 key for the associated report JSON.
    *   **Form Data:**
        *   `reportImage` (File, required): The image file to upload.
    *   **_OR_ (React Native):**
        *   **Body:** `{ "reportImage": { "name": "...", "type": "...", "uri": "..." } }` (JSON, server currently mocks file data from this)
*   **Output:**
    *   **Success (200):** `{ "message": "...", "fileName": "upload_...", "s3Url": "https://...", "updatedImages": [ReportImage, ...] }` (JSON)
    *   **Error (400):** `{ "error": "Missing 'key' query parameter." }` or `{ "error": "No image file uploaded..." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to upload report image to S3: <message>" }` (JSON)

### 8. Delete Report Image (Reference)

*   **Method:** `DELETE`
*   **Path:** `/api/report-image`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The S3 key for the associated report JSON.
        *   `fileName` (string, required): The filename of the image reference to remove from the report JSON.
*   **Output:**
    *   **Success (200):** `{ "message": "Image reference removed successfully...", "updatedImages": [ReportImage, ...] }` or `{ "message": "Image not found in report...", "updatedImages": [...] }` (JSON)
    *   **Error (400):** `{ "error": "Missing 'key' query parameter." }` or `{ "error": "Missing 'fileName' query parameter." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (404):** `{ "error": "Report JSON not found..." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to remove image reference: <message>" }` (JSON)

---

## Profile Management Endpoints

### 9. Get User Profile

*   **Method:** `GET`
*   **Path:** `/api/profile`
*   **Auth Required:** Yes
*   **Input:** None
*   **Output:**
    *   **Success (200):** `ProfileJSONObject` (JSON)
    *   **Error (401):** `{ "error": "User not properly authenticated." }` (JSON)
    *   **Error (404):** `{ "error": "User profile not found...", "needsInitialization": true }` (JSON)
    *   **Error (500):** `{ "error": "Failed to read profile configuration: <message>" }` (JSON)

### 10. Save/Update User Profile

*   **Method:** `POST`
*   **Path:** `/api/profile`
*   **Auth Required:** Yes
*   **Input:**
    *   **Body:** `ProfileJSONObject` (JSON)
*   **Output:**
    *   **Success (200):** `{ "message": "Profile updated successfully." }` (JSON)
    *   **Error (401):** `{ "error": "User not properly authenticated." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to update profile configuration: <message>" }` (JSON)

### 11. Upload Logo

*   **Method:** `POST`
*   **Path:** `/api/upload-logo`
*   **Auth Required:** Yes
*   **Input:**
    *   **Form Data:**
        *   `logo` (File, required): The logo image file.
    *   **_OR_ (React Native):**
        *   **Body:** `{ "logo": { "name": "...", "type": "...", "uri": "..." } }` (JSON, server currently mocks file data from this)
*   **Output:**
    *   **Success (200):** `{ "message": "Logo uploaded successfully", "logoUrl": "/api/logo/<UUID>?t=..." }` (JSON)
    *   **Error (400):** `{ "error": "No logo file uploaded." }` (JSON)
    *   **Error (401):** `{ "error": "User not properly authenticated." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to upload logo: <message>" }` (JSON)

### 12. Initialize User Profile

*   **Method:** `POST`
*   **Path:** `/api/initialize-profile`
*   **Auth Required:** Yes
*   **Input:** None
*   **Output:**
    *   **Success (200):** `{ "message": "Profile initialized successfully.", "profile": ProfileJSONObject }` or `{ "message": "Profile already exists..." }` (JSON)
    *   **Error (401):** `{ "error": "User not properly authenticated." }` (JSON)
    *   **Error (404):** `{ "error": "Default profile template not found." }` (JSON)
    *   **Error (500):** `{ "error": "Failed to initialize profile: <message>" }` (JSON)

### 13. Get User Logo

*   **Method:** `GET`
*   **Path:** `/api/logo/:userId`
*   **Auth Required:** No (Accessible publicly by UUID)
*   **Input:**
    *   **Path Parameters:**
        *   `userId` (string, required): The UUID of the user whose logo is requested.
*   **Output:**
    *   **Success (200):** Image file stream (Content-Type: image/png or similar)
    *   **Error (400):** Text response `User ID is required`
    *   **Error (404):** Text response `Logo not found in S3.`
    *   **Error (500):** Text response `Failed to fetch logo from S3: <message>`

---

## S3 Asset Serving Endpoints

These endpoints proxy requests to S3, adding authentication.

### 14. View S3 Asset

*   **Method:** `GET`
*   **Path:** `/view-s3-asset`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The full S3 key of the asset (must start with `users/<UUID>/`).
*   **Output:**
    *   **Success (200):** File stream (Content-Type derived from S3 object/extension)
    *   **Error (400):** `{ "error": "Missing 'key' query parameter." }` (JSON)
    *   **Error (401/403):** `{ "error": "User not properly authenticated." }` or `{ "error": "Forbidden access." }` (JSON)
    *   **Error (404):** Text response `File not found in S3.`
    *   **Error (500):** Text response `Failed to fetch file from S3: <message>`

### 15. Edit S3 Asset (Likely same as View)

*   **Method:** `GET`
*   **Path:** `/edit-s3-asset`
*   **Auth Required:** Yes
*   **Input:**
    *   **Query Parameters:**
        *   `key` (string, required): The full S3 key of the asset (must start with `users/<UUID>/`).
*   **Output:** (Same as `/view-s3-asset`)
    *   **Success (200):** File stream
    *   **Error (400/401/403/404/500):** JSON or Text response.
*   **Note:** The purpose difference between this and `/view-s3-asset` isn't clear from the code; they seem functionally identical. 