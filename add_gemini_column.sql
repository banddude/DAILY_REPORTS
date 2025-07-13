-- Add use_gemini column to master_config table

-- Check if column exists first, then add if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'master_config' 
        AND column_name = 'use_gemini'
    ) THEN
        ALTER TABLE master_config ADD COLUMN use_gemini BOOLEAN DEFAULT false;
        
        -- Update existing rows to have default value
        UPDATE master_config SET use_gemini = false WHERE use_gemini IS NULL;
        
        RAISE NOTICE 'Added use_gemini column to master_config table';
    ELSE
        RAISE NOTICE 'use_gemini column already exists in master_config table';
    END IF;
END $$;