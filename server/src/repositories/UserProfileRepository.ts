import { supabase } from '../config';

export interface UserProfile {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    phone?: string;
    company_name?: string;
    company_street?: string;
    company_unit?: string;
    company_city?: string;
    company_state?: string;
    company_zip?: string;
    company_phone?: string;
    company_website?: string;
    chat_model?: string;
    whisper_model?: string;
    config_logo_filename?: string;
    daily_report_system_prompt?: string;
    report_json_schema?: any;
    subscription_level?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateProfileData {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    phone?: string;
    company_name?: string;
    company_street?: string;
    company_unit?: string;
    company_city?: string;
    company_state?: string;
    company_zip?: string;
    company_phone?: string;
    company_website?: string;
    config_chat_model?: string;
    config_whisper_model?: string;
    config_logo_filename?: string;
    config_system_prompt?: string;
    report_json_schema?: any;
    subscription_level?: string;
}

/**
 * Repository for user profile operations
 * Centralizes all database access for user profile data
 */
export class UserProfileRepository {
    /**
     * Get user profile by ID
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw new Error(`Failed to fetch profile for user ${userId}: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error(`Error fetching profile for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get user profile by email
     */
    async getProfileByEmail(email: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`Failed to fetch profile for email ${email}: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error(`Error fetching profile for email ${email}:`, error);
            throw error;
        }
    }

    /**
     * Create a new user profile
     */
    async createProfile(profileData: CreateProfileData): Promise<UserProfile> {
        try {
            // Remove undefined/null fields before inserting
            const cleanedData = Object.fromEntries(
                Object.entries(profileData).filter(([_, value]) => value !== undefined && value !== null)
            );

            const { data, error } = await supabase
                .from('profiles')
                .insert(cleanedData)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create profile: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error creating profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        try {
            // Remove undefined/null fields and id from updates
            const { id, created_at, updated_at, ...updateData } = updates;
            const cleanedUpdates = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
            );

            if (Object.keys(cleanedUpdates).length === 0) {
                throw new Error('No valid fields to update');
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(cleanedUpdates)
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update profile for user ${userId}: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error(`Error updating profile for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Update user's logo filename
     */
    async updateLogoFilename(userId: string, logoFilename: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ config_logo_filename: logoFilename })
                .eq('id', userId);

            if (error) {
                throw new Error(`Failed to update logo filename for user ${userId}: ${error.message}`);
            }
        } catch (error) {
            console.error(`Error updating logo filename for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get user's logo filename
     */
    async getLogoFilename(userId: string): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('config_logo_filename')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`Failed to fetch logo filename for user ${userId}: ${error.message}`);
            }

            return data.config_logo_filename || null;
        } catch (error) {
            console.error(`Error fetching logo filename for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Check if user profile exists
     */
    async profileExists(userId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw new Error(`Error checking if profile exists for user ${userId}: ${error.message}`);
            }

            return !!data;
        } catch (error) {
            console.error(`Error checking profile existence for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Delete user profile
     */
    async deleteProfile(userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) {
                throw new Error(`Failed to delete profile for user ${userId}: ${error.message}`);
            }
        } catch (error) {
            console.error(`Error deleting profile for user ${userId}:`, error);
            throw error;
        }
    }
}

// Export singleton instance
export const userProfileRepository = new UserProfileRepository();