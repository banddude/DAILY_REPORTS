import { supabase } from '../config';

export interface TierConfig {
    id: number;
    subscription_level: string;
    whisper_model: string;
    chat_model: string;
    daily_report_system_prompt: string;
    report_json_schema: any;
    use_gemini?: boolean;
}

export interface EnvironmentConfig {
    awsRegion: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsS3Bucket: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    port: number;
    geminiApiKey?: string;
    openaiApiKey?: string;
}

/**
 * Centralized configuration service that handles:
 * - Environment variable access and validation
 * - Subscription tier configuration from database
 * - Configuration caching
 * - Default values and fallbacks
 */
export class ConfigurationService {
    private static instance: ConfigurationService;
    private tierConfigCache: Map<string, TierConfig> = new Map();
    private envConfig: EnvironmentConfig;

    private constructor() {
        this.envConfig = this.loadEnvironmentConfig();
        this.validateRequiredEnvironmentVariables();
    }

    /**
     * Get singleton instance of ConfigurationService
     */
    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }

    /**
     * Load and validate environment configuration
     */
    private loadEnvironmentConfig(): EnvironmentConfig {
        return {
            awsRegion: process.env.AWS_REGION || 'us-west-2',
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            awsS3Bucket: process.env.AWS_S3_BUCKET || '',
            supabaseUrl: process.env.SUPABASE_URL || '',
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
            port: this.parsePort(process.env.PORT),
            geminiApiKey: process.env.GEMINI_API_KEY,
            openaiApiKey: process.env.OPENAI_API_KEY
        };
    }

    /**
     * Parse and validate port number
     */
    private parsePort(portEnv?: string): number {
        const defaultPort = 3000;
        if (!portEnv) return defaultPort;
        
        const port = parseInt(portEnv, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.warn(`Invalid PORT env var "${portEnv}". Defaulting to ${defaultPort}.`);
            return defaultPort;
        }
        return port;
    }

    /**
     * Validate that all required environment variables are present
     */
    private validateRequiredEnvironmentVariables(): void {
        const requiredVars = [
            { name: 'AWS_S3_BUCKET', value: this.envConfig.awsS3Bucket },
            { name: 'AWS_ACCESS_KEY_ID', value: this.envConfig.awsAccessKeyId },
            { name: 'AWS_SECRET_ACCESS_KEY', value: this.envConfig.awsSecretAccessKey },
            { name: 'SUPABASE_URL', value: this.envConfig.supabaseUrl },
            { name: 'SUPABASE_ANON_KEY', value: this.envConfig.supabaseAnonKey }
        ];

        const missingVars = requiredVars.filter(v => !v.value);
        
        if (missingVars.length > 0) {
            const missingNames = missingVars.map(v => v.name).join(', ');
            console.error(`CRITICAL ERROR: Missing required environment variables: ${missingNames}`);
            process.exit(1);
        }
    }

    /**
     * Get environment configuration
     */
    public getEnvironmentConfig(): EnvironmentConfig {
        return { ...this.envConfig };
    }

    /**
     * Get configuration for a specific subscription tier
     */
    public async getConfigByTier(tier: string): Promise<TierConfig> {
        // Check cache first
        if (this.tierConfigCache.has(tier)) {
            return this.tierConfigCache.get(tier)!;
        }

        try {
            const { data: cfg, error } = await supabase
                .from('config')
                .select('*')
                .eq('subscription_level', tier)
                .single();

            if (error || !cfg) {
                throw new Error(`No config row found for tier: ${tier}. Error: ${error?.message || 'Unknown'}`);
            }

            // Validate required config fields
            const requiredFields = ['whisper_model', 'chat_model', 'daily_report_system_prompt', 'report_json_schema'];
            const missingFields = requiredFields.filter(field => !cfg[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Tier config for '${tier}' is missing required fields: ${missingFields.join(', ')}`);
            }

            // Parse JSON schema if it's a string
            if (typeof cfg.report_json_schema === 'string') {
                try {
                    cfg.report_json_schema = JSON.parse(cfg.report_json_schema);
                } catch (parseError) {
                    throw new Error(`Invalid JSON in report_json_schema for tier '${tier}': ${parseError}`);
                }
            }

            // Cache the result
            this.tierConfigCache.set(tier, cfg);
            
            return cfg;
        } catch (error) {
            console.error(`Failed to load config for tier '${tier}':`, error);
            throw error;
        }
    }

    /**
     * Clear configuration cache (useful for testing or config updates)
     */
    public clearCache(): void {
        this.tierConfigCache.clear();
    }

    /**
     * Get AI service configuration based on useGemini flag
     */
    public getAIConfig(useGemini: boolean = false): { apiKey: string | undefined, service: 'openai' | 'gemini' } {
        if (useGemini) {
            return {
                apiKey: this.envConfig.geminiApiKey,
                service: 'gemini'
            };
        } else {
            return {
                apiKey: this.envConfig.openaiApiKey,
                service: 'openai'
            };
        }
    }

    /**
     * Validate AI service configuration
     */
    public validateAIConfig(useGemini: boolean = false): void {
        const { apiKey, service } = this.getAIConfig(useGemini);
        
        if (!apiKey) {
            const envVar = useGemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
            throw new Error(`${envVar} environment variable is required for ${service} service`);
        }
    }

    /**
     * Get all available subscription tiers
     */
    public async getAvailableTiers(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('config')
                .select('subscription_level')
                .order('subscription_level');

            if (error) {
                throw new Error(`Failed to fetch available tiers: ${error.message}`);
            }

            return data.map(row => row.subscription_level);
        } catch (error) {
            console.error('Failed to load available tiers:', error);
            throw error;
        }
    }
}

// Export singleton instance for convenience
export const configService = ConfigurationService.getInstance();