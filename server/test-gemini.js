// Test Gemini API locally using OpenAI compatibility
const OpenAI = require('openai');

// Get API key from environment or use placeholder
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('❌ Please set GEMINI_API_KEY environment variable');
    process.exit(1);
}

// Test using OpenAI compatibility endpoint
const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

async function testGeminiAPI() {
    console.log('🧪 Testing Gemini API with OpenAI compatibility...');
    
    try {
        const completion = await client.chat.completions.create({
            model: 'gemini-2.5-flash',
            messages: [
                { 
                    role: 'system', 
                    content: 'You are a helpful assistant. Respond with JSON containing a report_title field.' 
                },
                { 
                    role: 'user', 
                    content: 'Generate a simple daily report JSON with a title about testing APIs. Include only a report_title field.' 
                }
            ],
            temperature: 0.7
        });

        console.log('✅ API call successful!');
        console.log('Model used:', completion.model);
        console.log('Response:', completion.choices[0].message.content);
        
        // Test JSON parsing
        try {
            const jsonResponse = JSON.parse(completion.choices[0].message.content);
            console.log('✅ JSON parsing successful!');
            console.log('Parsed JSON:', jsonResponse);
        } catch (parseError) {
            console.log('⚠️  Response is not valid JSON, trying to extract...');
            const content = completion.choices[0].message.content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    const extractedJson = JSON.parse(jsonMatch[1]);
                    console.log('✅ Extracted JSON successfully!');
                    console.log('Extracted:', extractedJson);
                } catch (extractError) {
                    console.log('❌ Could not extract valid JSON');
                }
            } else {
                console.log('❌ No JSON found in response');
            }
        }

    } catch (error) {
        console.log('❌ API call failed:');
        console.error('Error details:', error.message);
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
    }
}

testGeminiAPI();