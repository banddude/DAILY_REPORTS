import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set. Gemini service will not be available.");
}

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export interface GeminiTranscriptionOptions {
    model?: string;
    prompt?: string;
}

export interface GeminiChatOptions {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
}

/**
 * Transcribe audio using Gemini API (placeholder - Gemini doesn't have direct audio transcription)
 * This would need to be implemented with a different approach or service
 */
export async function transcribeWithGemini(audioPath: string, options: GeminiTranscriptionOptions = {}): Promise<any> {
    throw new Error("Gemini API does not support direct audio transcription. Use OpenAI Whisper or other transcription service.");
}

/**
 * Generate daily report using Gemini API
 */
export async function generateReportWithGemini(
    transcription: any,
    systemPrompt: string,
    reportSchema: any,
    options: GeminiChatOptions = {}
): Promise<any> {
    if (!ai) {
        throw new Error("Gemini API is not configured. Please set GEMINI_API_KEY environment variable.");
    }

    // Always use gemini-2.5-flash regardless of config model
    const model = "gemini-2.5-flash";
    
    try {
        // Prepare the timed transcript format for Gemini
        const timedTranscript = transcription.words 
            ? transcription.words.map((w: any) => `[${w.start.toFixed(2)}] ${w.word}`).join(' ')
            : transcription.text;

        const prompt = `${systemPrompt}

Here is the timed transcript of a video walkthrough:

---
${timedTranscript}
---

Please generate a daily report in JSON based *only* on the content of this transcript and adhering strictly to the following JSON schema. Never mention the transcript or video walkthrough directly. Your report is to be as though it was written by the person doing the walkthrough.:

${JSON.stringify(reportSchema, null, 2)}`;

        console.log(`Using Gemini model: ${model}`);
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });

        if (!response.text) {
            throw new Error("No response text received from Gemini API");
        }

        // Try to extract JSON from the response
        let reportJson;
        try {
            // Gemini might wrap JSON in markdown code blocks
            const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : response.text;
            reportJson = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", parseError);
            console.error("Raw response:", response.text);
            throw new Error("Gemini response could not be parsed as valid JSON");
        }

        return reportJson;

    } catch (error: any) {
        console.error("Error generating report with Gemini:", error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

/**
 * Check if Gemini API is available
 */
export function isGeminiAvailable(): boolean {
    return ai !== null;
}