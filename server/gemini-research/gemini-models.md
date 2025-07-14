# Google Gemini API Available Models (2025)

## Overview

This document provides a comprehensive list of all available Google Gemini models as of 2025, including their capabilities, use cases, and official model names for API calls.

## Current Model Families

### Gemini 2.5 Models (Latest Generation - Recommended)

#### Gemini 2.5 Flash
- **Official API Name**: `gemini-2.5-flash`
- **Preview Version**: `gemini-2.5-flash-preview-05-20`
- **Description**: Best model in terms of price-performance ratio
- **Key Features**:
  - First Flash model with thinking capabilities
  - Well-rounded capabilities for diverse tasks
  - Optimized for large-scale processing
  - Low latency and high volume processing
  - Excellent for agentic use cases
- **Best For**: Production applications requiring balance of quality and speed
- **Context Window**: 1M tokens
- **Multimodal**: Yes (text, image, audio, video)

#### Gemini 2.5 Pro
- **Official API Name**: `gemini-2.5-pro`
- **Description**: State-of-the-art thinking model
- **Key Features**:
  - Most advanced reasoning capabilities
  - Complex problem-solving in code, math, and STEM
  - Advanced thinking and reasoning
- **Best For**: Complex reasoning tasks, research, advanced problem-solving
- **Context Window**: 2M tokens
- **Multimodal**: Yes (text, image, audio, video)

#### Gemini 2.5 Flash-Lite
- **Official API Name**: `gemini-2.5-flash-lite`
- **Preview Version**: `gemini-2.5-flash-lite-preview-06-17`
- **Description**: Lowest latency and cost in the 2.5 model family
- **Key Features**:
  - Cost-effective upgrade from previous models
  - Optimized for speed and efficiency
  - Lightweight but capable
- **Best For**: High-volume, cost-sensitive applications
- **Context Window**: 1M tokens
- **Multimodal**: Yes (text, image, audio, video)

#### Gemini 2.5 Flash/Pro Preview TTS
- **Official API Names**: 
  - `gemini-2.5-flash-preview-tts`
  - `gemini-2.5-pro-preview-tts`
- **Description**: Text-to-speech specialized models
- **Key Features**:
  - High-quality speech synthesis
  - Natural voice generation
- **Best For**: Voice applications, accessibility, audio content creation

### Gemini 2.0 Models (Previous Latest Generation)

#### Gemini 2.0 Flash
- **Official API Name**: `gemini-2.0-flash`
- **Description**: Next-generation features with improved capabilities
- **Key Features**:
  - Superior speed compared to previous generations
  - Native tool use capabilities
  - 1M token context window
  - Enhanced multimodal processing
- **Best For**: Applications requiring fast response times with tool integration
- **Context Window**: 1M tokens
- **Multimodal**: Yes (text, image, audio, video)
- **Status**: Generally available

#### Gemini 2.0 Pro Experimental
- **Official API Name**: `gemini-2.0-pro`
- **Description**: Best model for coding performance and complex prompts
- **Key Features**:
  - Exceptional coding capabilities
  - Advanced reasoning for complex tasks
  - Experimental features and improvements
- **Best For**: Code generation, complex reasoning, development tasks
- **Context Window**: Extended context support
- **Multimodal**: Yes
- **Status**: Experimental

#### Gemini 2.0 Flash-Lite
- **Official API Name**: `gemini-2.0-flash-lite`
- **Description**: Improved quality over 1.5 Flash at same speed and cost
- **Key Features**:
  - Better quality than Gemini 1.5 Flash
  - Maintained speed and cost efficiency
  - Optimized for high-throughput applications
- **Best For**: Cost-effective applications with quality improvements
- **Context Window**: 1M tokens
- **Multimodal**: Yes

#### Gemini 2.0 Flash Preview Image Generation
- **Official API Name**: `gemini-2.0-flash-preview-image-gen`
- **Description**: Specialized for image generation and editing
- **Key Features**:
  - Improved image generation capabilities
  - Conversational image editing
  - Enhanced visual creativity
- **Best For**: Image creation, visual content, creative applications
- **Multimodal**: Yes (text-to-image, image editing)

#### Gemini 2.0 Flash Thinking Experimental
- **Official API Name**: `gemini-2.0-flash-thinking-experimental`
- **Description**: Experimental model with enhanced thinking capabilities
- **Key Features**:
  - Advanced reasoning and thinking
  - Step-by-step problem solving
  - Transparent thought processes
- **Best For**: Complex problem-solving, educational applications
- **Status**: Experimental (available in Gemini app)

### Gemini 1.5 Models (Legacy - Being Phased Out)

> **Important Notice**: Starting April 29, 2025, Gemini 1.5 Pro and Gemini 1.5 Flash models are not available in projects that have no prior usage of these models. All Gemini 1.5 models will be retired soon.

#### Gemini 1.5 Flash
- **Official API Name**: `gemini-1.5-flash`
- **Description**: Fast and versatile multimodal model
- **Key Features**:
  - Scaling across diverse tasks
  - Good balance of speed and capability
- **Best For**: Legacy applications (migration recommended)
- **Context Window**: 1M tokens
- **Status**: Being phased out

#### Gemini 1.5 Flash-8B
- **Official API Name**: `gemini-1.5-flash-8b`
- **Description**: Small model for lower intelligence tasks
- **Key Features**:
  - Lightweight and fast
  - Basic task processing
- **Best For**: Simple tasks, low-resource environments
- **Context Window**: 1M tokens
- **Status**: Being phased out

#### Gemini 1.5 Pro
- **Official API Name**: `gemini-1.5-pro`
- **Description**: Mid-size multimodal model for reasoning tasks
- **Key Features**:
  - Large data processing capabilities
  - Can process 2 hours of video, 19 hours of audio
  - 60,000 lines of code or 2,000 pages of text
- **Best For**: Data analysis, long-form content processing
- **Context Window**: 2M tokens
- **Status**: Being phased out

### Retired Models

#### Gemini 1.0 Models
- **Status**: All Gemini 1.0 models are retired (requests return 404 error)
- **Migration**: Use Gemini 2.0+ models instead

## Model Selection Guide

### For Production Applications
- **Best Overall**: `gemini-2.5-flash` - Best price-performance ratio
- **Highest Quality**: `gemini-2.5-pro` - For complex reasoning tasks
- **Most Cost-Effective**: `gemini-2.5-flash-lite` - For high-volume applications

### For Development and Testing
- **Coding Tasks**: `gemini-2.0-pro` - Best coding performance
- **Experimental Features**: `gemini-2.0-flash-thinking-experimental`
- **Image Generation**: `gemini-2.0-flash-preview-image-gen`

### For Specific Use Cases
- **Voice Applications**: `gemini-2.5-flash-preview-tts` or `gemini-2.5-pro-preview-tts`
- **Long Context**: `gemini-2.5-pro` (2M tokens)
- **Real-time Applications**: `gemini-2.5-flash-lite` (lowest latency)
- **Tool Integration**: `gemini-2.0-flash` (native tool use)

## Model Capabilities Comparison

| Model | Context Window | Multimodal | Thinking | Tool Use | Speed | Cost |
|-------|---------------|------------|----------|----------|-------|------|
| gemini-2.5-flash | 1M | ✅ | ✅ | ✅ | Fast | Medium |
| gemini-2.5-pro | 2M | ✅ | ✅ | ✅ | Medium | High |
| gemini-2.5-flash-lite | 1M | ✅ | ❌ | ✅ | Very Fast | Low |
| gemini-2.0-flash | 1M | ✅ | ❌ | ✅ | Fast | Medium |
| gemini-2.0-pro | Extended | ✅ | ✅ | ✅ | Medium | High |
| gemini-2.0-flash-lite | 1M | ✅ | ❌ | ✅ | Very Fast | Low |

## API Usage Examples

### Basic Model Selection
```bash
# Latest and recommended
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

# For complex reasoning
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"

# For cost optimization
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
```

### Python Model Usage
```python
import google.generativeai as genai

# Different models for different needs
models = {
    'general': 'gemini-2.5-flash',
    'complex_reasoning': 'gemini-2.5-pro',
    'cost_optimized': 'gemini-2.5-flash-lite',
    'coding': 'gemini-2.0-pro',
    'experimental': 'gemini-2.0-flash-thinking-experimental'
}

# Initialize with your preferred model
model = genai.GenerativeModel(models['general'])
```

## Model Aliases and Versioning

### Stable vs Preview Models
- **Stable models**: No suffix (e.g., `gemini-2.5-flash`)
- **Preview models**: Include preview and date (e.g., `gemini-2.5-flash-preview-05-20`)

### Auto-updating Aliases
- Base model names (e.g., `gemini-2.0-flash`) automatically point to the latest stable version
- Preview models have fixed versions for consistency

### Version Management
```python
# Use specific version for consistency
model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')

# Use auto-updating alias for latest features
model = genai.GenerativeModel('gemini-2.5-flash')
```

## Migration Recommendations

### From Gemini 1.5 Models
- `gemini-1.5-flash` → `gemini-2.5-flash`
- `gemini-1.5-pro` → `gemini-2.5-pro`
- `gemini-1.5-flash-8b` → `gemini-2.5-flash-lite`

### From OpenAI Models
- `gpt-4` → `gemini-2.5-pro`
- `gpt-4-turbo` → `gemini-2.5-flash`
- `gpt-3.5-turbo` → `gemini-2.5-flash-lite`

## Pricing Considerations (2025)

### Free Tier Models
All models available on free tier with rate limits:
- Lower request limits
- Reduced concurrent requests
- Good for testing and development

### Paid Tier Benefits
- Higher rate limits
- Priority access
- Additional features
- Enterprise support

## Future Model Updates

Google regularly updates the Gemini model family. Stay informed:
- **Documentation**: https://ai.google.dev/gemini-api/docs/models
- **Developer Blog**: https://developers.googleblog.com
- **Release Notes**: Check official announcements for new models and features

## Best Practices

1. **Start with gemini-2.5-flash** for most applications
2. **Use gemini-2.5-pro** for complex reasoning tasks
3. **Choose gemini-2.5-flash-lite** for cost optimization
4. **Test preview models** for early access to new features
5. **Monitor model updates** and migrate from deprecated models
6. **Use appropriate context windows** based on your data size needs