import { supabase } from '../config';

export interface MasterConfig {
    id: number;
    config_chat_model?: string;
    config_whisper_model?: string;
    config_system_prompt?: string;
    report_json_schema?: any;
    use_gemini?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface UpdateMasterConfigData {
    config_chat_model?: string;
    config_whisper_model?: string;
    config_system_prompt?: string;
    report_json_schema?: any;
    use_gemini?: boolean;
}

/**
 * Repository for master configuration operations
 * Centralizes all database access for master_config table
 */
export class ConfigRepository {
    /**
     * Get master configuration
     */
    async getMasterConfig(): Promise<MasterConfig> {
        try {
            const { data, error } = await supabase
                .from('master_config')
                .select('*')
                .single();

            if (error) {
                throw new Error(`Failed to fetch master config: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error fetching master config:', error);
            throw error;
        }
    }

    /**
     * Update master configuration
     */
    async updateMasterConfig(updates: UpdateMasterConfigData): Promise<MasterConfig> {
        try {
            // Remove undefined/null fields
            const cleanedUpdates = Object.fromEntries(
                Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null)
            );

            if (Object.keys(cleanedUpdates).length === 0) {
                throw new Error('No valid fields to update');
            }

            // First get the existing master config row ID
            const { data: existing, error: idError } = await supabase
                .from('master_config')
                .select('id')
                .single();

            if (idError || !existing) {
                throw new Error(`Failed to find master config row: ${idError?.message || 'No rows found'}`);
            }

            // Update the master config
            const { data, error } = await supabase
                .from('master_config')
                .update(cleanedUpdates)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update master config: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error updating master config:', error);
            throw error;
        }
    }

    /**
     * Check if master config exists
     */
    async masterConfigExists(): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('master_config')
                .select('id')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw new Error(`Error checking master config existence: ${error.message}`);
            }

            return !!data;
        } catch (error) {
            console.error('Error checking master config existence:', error);
            throw error;
        }
    }

    /**
     * Create initial master config (for setup)
     */
    async createMasterConfig(configData: UpdateMasterConfigData): Promise<MasterConfig> {
        try {
            const { data, error } = await supabase
                .from('master_config')
                .insert(configData)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create master config: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error creating master config:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const configRepository = new ConfigRepository();