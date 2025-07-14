# Google Gemini API Code Examples

## Table of Contents

1. [Basic cURL Examples](#basic-curl-examples)
2. [Python Examples](#python-examples)
3. [JavaScript Examples](#javascript-examples)
4. [Advanced Examples](#advanced-examples)
5. [OpenAI Library Compatibility](#openai-library-compatibility)

## Basic cURL Examples

### Simple Text Generation

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
```

### With Query Parameter Authentication

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "What is the capital of France?"
          }
        ]
      }
    ]
  }'
```

### With Generation Configuration

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Write a creative story about a robot"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.8,
      "maxOutputTokens": 500,
      "topP": 0.9,
      "topK": 40
    }
  }'
```

### Multi-turn Conversation

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, I am learning about AI."
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "text": "Hello! That is great! AI is a fascinating field. What specifically would you like to learn about?"
          }
        ]
      },
      {
        "role": "user",
        "parts": [
          {
            "text": "I want to understand machine learning basics."
          }
        ]
      }
    ]
  }'
```

### With System Instructions

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "systemInstruction": {
      "parts": [
        {
          "text": "You are a helpful coding assistant. Always provide clear, commented code examples."
        }
      ]
    },
    "contents": [
      {
        "parts": [
          {
            "text": "Write a Python function to calculate factorial"
          }
        ]
      }
    ]
  }'
```

### Thinking Budget Control

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Solve this complex math problem: What is the integral of x^2 * e^x?"
          }
        ]
      }
    ],
    "generationConfig": {
      "thinkingConfig": {
        "thinkingBudget": 20000
      }
    }
  }'
```

## Python Examples

### Using Native Google GenAI SDK

```python
import google.generativeai as genai

# Configure the API key
genai.configure(api_key="YOUR_GEMINI_API_KEY")

# Initialize the model
model = genai.GenerativeModel('gemini-2.5-flash')

# Simple text generation
response = model.generate_content("Explain quantum computing in simple terms")
print(response.text)

# With generation config
generation_config = genai.types.GenerationConfig(
    temperature=0.7,
    max_output_tokens=1000,
    top_p=0.9
)

response = model.generate_content(
    "Write a poem about the ocean",
    generation_config=generation_config
)
print(response.text)
```

### Using New Google GenAI Python SDK (v1.0)

```python
from google import genai

# Initialize client
client = genai.Client(api_key="YOUR_GEMINI_API_KEY")

# Simple generation
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Explain how AI works in a few words"
)
print(response.text)

# With system instructions
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Write a Python function to sort a list",
    config=genai.types.GenerateContentConfig(
        system_instruction="You are a Python expert. Provide clean, efficient code.",
        temperature=0.3
    )
)
print(response.text)
```

### Streaming Response

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_GEMINI_API_KEY")
model = genai.GenerativeModel('gemini-2.5-flash')

response = model.generate_content(
    "Write a long story about space exploration",
    stream=True
)

for chunk in response:
    print(chunk.text, end='', flush=True)
```

### Multi-modal Example (Text + Image)

```python
import google.generativeai as genai
import PIL.Image

genai.configure(api_key="YOUR_GEMINI_API_KEY")
model = genai.GenerativeModel('gemini-2.0-flash')

# Load an image
image = PIL.Image.open('path/to/your/image.jpg')

response = model.generate_content([
    "What's in this image?",
    image
])

print(response.text)
```

## JavaScript Examples

### Node.js with Google GenAI SDK

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY');

async function generateText() {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const prompt = "Explain the concept of machine learning";
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  console.log(text);
}

generateText();
```

### With Generation Config

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY');

async function generateWithConfig() {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1000,
      topP: 0.95,
      topK: 64,
    }
  });
  
  const prompt = "Write a creative short story";
  
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
}

generateWithConfig();
```

### Streaming in Node.js

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY');

async function streamGeneration() {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const prompt = "Tell me a long story about AI";
  
  const result = await model.generateContentStream(prompt);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    process.stdout.write(chunkText);
  }
}

streamGeneration();
```

### Browser JavaScript (Frontend)

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        {
            "imports": {
                "@google/generative-ai": "https://esm.run/@google/generative-ai"
            }
        }
    </script>
</head>
<body>
    <script type="module">
        import { GoogleGenerativeAI } from "@google/generative-ai";

        // WARNING: Don't use API keys in production frontend code
        const genAI = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY');

        async function run() {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const prompt = "What is JavaScript?";
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            document.body.innerHTML = `<p>${text}</p>`;
        }

        run();
    </script>
</body>
</html>
```

## Advanced Examples

### Function Calling

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_GEMINI_API_KEY")

def get_weather(city: str) -> str:
    """Get weather information for a city."""
    return f"The weather in {city} is sunny and 75°F"

# Define the function schema
weather_tool = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="get_weather",
            description="Get weather information for a city",
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "city": genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="Name of the city"
                    )
                },
                required=["city"]
            )
        )
    ]
)

model = genai.GenerativeModel('gemini-2.0-flash', tools=[weather_tool])

response = model.generate_content("What's the weather like in New York?")
print(response.text)
```

### Content Caching for Long Contexts

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_GEMINI_API_KEY")

# Create cached content for a large document
large_document = """[Your large document content here]"""

cached_content = genai.caching.CachedContent.create(
    model="models/gemini-2.5-flash",
    contents=[large_document],
    ttl=datetime.timedelta(hours=1)
)

model = genai.GenerativeModel.from_cached_content(cached_content)

response = model.generate_content("Summarize this document")
print(response.text)
```

### Batch Processing

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_GEMINI_API_KEY")

# Prepare batch requests
requests = []
for i in range(5):
    requests.append({
        "contents": [{"parts": [{"text": f"Write a haiku about topic {i}"}]}]
    })

# Create batch job
batch_job = genai.create_batch(
    model="gemini-2.5-flash",
    requests=requests
)

# Check status and get results
results = batch_job.get_results()
for result in results:
    print(result.response.text)
```

## OpenAI Library Compatibility

### Python with OpenAI Library

```python
from openai import OpenAI

# Initialize client with Gemini endpoint
client = OpenAI(
    api_key="YOUR_GEMINI_API_KEY",
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# Chat completion
response = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain photosynthesis"}
    ]
)

print(response.choices[0].message.content)
```

### Streaming with OpenAI Library

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_GEMINI_API_KEY",
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

stream = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")
```

### Function Calling with OpenAI Format

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_GEMINI_API_KEY",
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                },
                "required": ["location"],
            },
        },
    }
]

response = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[{"role": "user", "content": "What's the weather like in Boston?"}],
    tools=tools,
    tool_choice="auto"
)

print(response.choices[0].message)
```

### TypeScript/JavaScript with OpenAI Library

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_GEMINI_API_KEY',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

async function main() {
  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain TypeScript in simple terms' }
    ],
    model: 'gemini-2.5-flash',
  });

  console.log(completion.choices[0].message.content);
}

main();
```

## Testing Your Setup

### Quick Test Script (Python)

```python
import os
import google.generativeai as genai

# Test API key
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("Please set GEMINI_API_KEY environment variable")
    exit(1)

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say hello")
    print("✅ API is working!")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")
```

### Quick Test with cURL

```bash
#!/bin/bash

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Please set GEMINI_API_KEY environment variable"
    exit 1
fi

response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Say hello"
          }
        ]
      }
    ]
  }')

if echo "$response" | grep -q "candidates"; then
    echo "✅ API is working!"
    echo "$response" | jq -r '.candidates[0].content.parts[0].text'
else
    echo "❌ Error:"
    echo "$response"
fi
```