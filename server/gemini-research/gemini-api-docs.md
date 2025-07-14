# Google Gemini API Official Documentation Summary

## Overview

The Google Gemini Developer API (ai.google.dev) is the official non-Vertex AI option for accessing Google's generative AI models. It provides a REST API interface for developers to integrate Gemini models without requiring Google Cloud Platform.

## Base URL

```
https://generativelanguage.googleapis.com/v1beta/models/
```

## Authentication

The Gemini API uses API key authentication. You can obtain your API key from Google AI Studio (ai.google.dev).

### Authentication Methods

1. **Query Parameter**:
   ```
   ?key=$YOUR_API_KEY
   ```

2. **Header Authentication** (Recommended):
   ```
   x-goog-api-key: $GEMINI_API_KEY
   ```

### Environment Variables
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY` (takes precedence if both are set)

## Available Models (2025)

### Gemini 2.5 Models (Latest Generation)

- **gemini-2.5-flash**: Best price-performance ratio, supports thinking capabilities
- **gemini-2.5-pro**: State-of-the-art thinking model for complex reasoning
- **gemini-2.5-flash-lite**: Lowest latency and cost in the 2.5 family

### Gemini 2.0 Models

- **gemini-2.0-flash**: Next-gen features, native tool use, 1M token context
- **gemini-2.0-pro**: Best coding performance and complex prompts
- **gemini-2.0-flash-lite**: Better quality than 1.5 Flash at same speed/cost

### Gemini 1.5 Models (Being Phased Out)

- **gemini-1.5-flash**: Fast and versatile multimodal model
- **gemini-1.5-flash-8b**: Small model for lower intelligence tasks
- **gemini-1.5-pro**: Mid-size multimodal model

*Note: Starting April 29, 2025, Gemini 1.5 models are not available in projects with no prior usage.*

## Key Capabilities

- **Multimodal**: Text, image, audio, and video processing
- **Long Context**: Support for millions of tokens
- **Native Tool Use**: Built-in function calling
- **Structured Output**: JSON and other structured formats
- **Thinking Budget**: Fine-grained control over reasoning depth
- **Safety Settings**: Comprehensive content filtering

## Main API Endpoints

### 1. Generate Content
```
POST /v1beta/models/{model}:generateContent
```

### 2. Stream Generate Content
```
POST /v1beta/models/{model}:streamGenerateContent
```

### 3. Embed Content
```
POST /v1beta/models/{model}:embedContent
```

### 4. Count Tokens
```
POST /v1beta/models/{model}:countTokens
```

### 5. List Models
```
GET /v1beta/models
```

## Request Structure

### Basic Request Format
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Your prompt here"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1000
  },
  "safetySettings": [],
  "systemInstruction": {
    "parts": [
      {
        "text": "You are a helpful assistant."
      }
    ]
  }
}
```

### Key Parameters

- **contents**: Array of conversation messages
- **generationConfig**: Response configuration (temperature, max tokens, etc.)
- **safetySettings**: Content filtering rules
- **systemInstruction**: Contextual instructions for the model
- **tools**: External function definitions for function calling

## Response Format

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Generated response text"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": []
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

## Pricing (2025)

### Free Tier (Spark Plan)
- Available with rate limits
- No billing required
- Good for testing and small projects

### Paid Tier
- Higher rate limits
- Additional features
- Enterprise support

## OpenAI Compatibility (New in 2025)

Gemini models can now be accessed via the OpenAI library with minimal code changes:

```python
from openai import OpenAI

client = OpenAI(
    api_key="GEMINI_API_KEY",
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)
```

## Security Best Practices

1. Never expose API keys in client-side code
2. Use environment variables for API key storage
3. Implement server-side API calls for production
4. Treat API keys like passwords
5. Never commit API keys to version control

## Official Resources

- **Documentation**: https://ai.google.dev/gemini-api/docs
- **API Reference**: https://ai.google.dev/api
- **Google AI Studio**: https://ai.google.dev
- **Cookbook**: https://github.com/google-gemini/cookbook
- **REST Examples**: https://github.com/google/generative-ai-docs