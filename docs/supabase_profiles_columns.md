# Supabase `public.profiles` Table Columns

This document lists the columns found in the `public.profiles` table.
The schema details (types, constraints) have been confirmed via direct inspection.

**Key Column Details:**
*   **`id`**: `uuid`, Primary Key, Foreign Key to `auth.users.id`
*   **`username`**: `text`, Unique
*   **`updated_at`**: `timestamp with time zone`, Default: `now()`
*   **`created_at`**: `timestamp with time zone`, Default: `now()`

**All Columns:**

*   `id`
*   `username`
*   `full_name`
*   `updated_at`
*   `created_at`
*   `phone`
*   `company_name`
*   `company_street`
*   `company_unit`
*   `company_city`
*   `company_state`
*   `company_zip`
*   `company_phone`
*   `company_website`
*   `config_chat_model`
*   `config_whisper_model`
*   `config_logo_filename`
*   `config_system_prompt`
*   `config_report_json_schema` 