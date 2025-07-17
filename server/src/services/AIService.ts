import OpenAI from 'openai';
import { configService } from './ConfigurationService';

export interface AIServiceConfig {
    useGemini: boolean;
    model: string;
    systemPrompt: string;
    reportSchema: any;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionResult {
    content: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

/**
 * Service for AI operations using OpenAI or Gemini
 * Provides unified interface for both AI providers
 */
export class AIService {
    
    /**
     * Create OpenAI client configured for the specified provider
     */
    private createClient(useGemini: boolean = false): OpenAI {
        const aiConfig = configService.getAIConfig(useGemini);
        
        // Validate that we have the required API key
        configService.validateAIConfig(useGemini);
        
        if (useGemini) {
            // Use Gemini API with OpenAI compatibility endpoint
            return new OpenAI({
                baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
                apiKey: aiConfig.apiKey,
            });
        } else {
            // Use standard OpenAI configuration
            return new OpenAI({
                apiKey: aiConfig.apiKey,
            });
        }
    }

    /**
     * Generate a chat completion using the specified AI provider
     */
    async generateChatCompletion(
        messages: ChatMessage[],
        config: AIServiceConfig
    ): Promise<ChatCompletionResult> {
        try {
            const client = this.createClient(config.useGemini);
            
            console.log(`Using model: ${config.model} ${config.useGemini ? '(via Gemini/Vertex AI)' : '(via OpenAI)'}`);
            
            // Prepare request options
            const requestOptions: any = {
                model: config.model,
                messages: messages,
            };
            
            // Only add response_format for OpenAI (Gemini doesn't support this parameter)
            if (!config.useGemini) {
                requestOptions.response_format = { type: "json_object" };
            }
            
            const response = await client.chat.completions.create(requestOptions);
            
            // Ensure a response is received
            if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
                throw new Error("No valid response message received from AI API");
            }
            
            // Extract and validate the content from the first choice
            const messageContent = response.choices[0].message.content;
            if (!messageContent) {
                throw new Error("No content in response message from AI API");
            }
            
            return {
                content: messageContent,
                usage: response.usage ? {
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens,
                    total_tokens: response.usage.total_tokens
                } : undefined
            };
            
        } catch (error: any) {
            console.error("Error generating AI chat completion:", error);
            console.error("Error details:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack
            });
            throw error;
        }
    }

    /**
     * Generate a structured JSON report from transcript using AI
     */
    async generateReportFromTranscript(
        transcript: string,
        config: AIServiceConfig
    ): Promise<any> {
        try {
            // Validate required config
            if (!config.model || !config.systemPrompt || !config.reportSchema) {
                throw new Error('Required configuration (model, systemPrompt, reportSchema) missing');
            }
            
            const messages: ChatMessage[] = [
                {
                    role: "system",
                    content: config.systemPrompt,
                },
                {
                    role: "user",
                    content: `Here is the Response Format:\\n\\n${JSON.stringify(config.reportSchema, null, 2)}`
                },
            ];
            
            const result = await this.generateChatCompletion(messages, config);
            
            // Parse the JSON response
            let reportJson;
            try {
                // For Gemini, might need to extract JSON from markdown code blocks
                if (config.useGemini) {
                    const jsonMatch = result.content.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
                    const jsonText = jsonMatch ? jsonMatch[1] : result.content;
                    reportJson = JSON.parse(jsonText);
                } else {
                    reportJson = JSON.parse(result.content);
                }
            } catch (parseError) {
                console.error("Failed to parse AI response as JSON:", parseError);
                console.error("Raw response:", result.content);
                throw new Error("AI response could not be parsed as valid JSON");
            }
            
            return reportJson;
            
        } catch (error: any) {
            console.error("Error generating report from transcript:", error);
            throw error;
        }
    }

    /**
     * Get the appropriate model name based on provider and config
     */
    getModelName(useGemini: boolean, configuredModel: string): string {
        return useGemini ? "gemini-2.5-flash" : configuredModel;
    }

    /**
     * Validate AI provider configuration
     */
    validateConfig(useGemini: boolean): void {
        configService.validateAIConfig(useGemini);
    }
}

// Export singleton instance
export const aiService = new AIService();