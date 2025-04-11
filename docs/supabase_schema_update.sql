-- SQL script to update the public.profiles table in Supabase
-- Adds columns based on profile.json structure

-- Add user phone
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;
COMMENT ON COLUMN public.profiles.phone IS 'User direct phone number';

-- Add company details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_street TEXT,
ADD COLUMN IF NOT EXISTS company_unit TEXT,
ADD COLUMN IF NOT EXISTS company_city TEXT,
ADD COLUMN IF NOT EXISTS company_state TEXT,
ADD COLUMN IF NOT EXISTS company_zip TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT;

COMMENT ON COLUMN public.profiles.company_name IS 'Company name from user profile';
COMMENT ON COLUMN public.profiles.company_street IS 'Company street address from user profile';
COMMENT ON COLUMN public.profiles.company_unit IS 'Company unit/suite number from user profile';
COMMENT ON COLUMN public.profiles.company_city IS 'Company city from user profile';
COMMENT ON COLUMN public.profiles.company_state IS 'Company state from user profile';
COMMENT ON COLUMN public.profiles.company_zip IS 'Company zip code from user profile';
COMMENT ON COLUMN public.profiles.company_phone IS 'Company phone number from user profile';
COMMENT ON COLUMN public.profiles.company_website IS 'Company website URL from user profile';

-- Add config details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS config_chat_model TEXT,
ADD COLUMN IF NOT EXISTS config_whisper_model TEXT,
ADD COLUMN IF NOT EXISTS config_logo_filename TEXT,
ADD COLUMN IF NOT EXISTS config_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS config_report_json_schema JSONB;

COMMENT ON COLUMN public.profiles.config_chat_model IS 'Default OpenAI chat model for report generation';
COMMENT ON COLUMN public.profiles.config_whisper_model IS 'Default OpenAI Whisper model for transcription';
COMMENT ON COLUMN public.profiles.config_logo_filename IS 'Filename of the logo used for reports (relative path or key)';
COMMENT ON COLUMN public.profiles.config_system_prompt IS 'System prompt used for the report generation LLM call';
COMMENT ON COLUMN public.profiles.config_report_json_schema IS 'The JSON schema definition used for report generation LLM call';

-- Note: Customer and Project details are intentionally omitted here as they are specified per-report.

SELECT 'Schema update script created.'; 