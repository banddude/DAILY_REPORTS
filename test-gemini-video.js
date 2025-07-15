const { getDailyReportFromVideo } = require('./server/dist/gemini-video-simple.js');

// Mock config object similar to what the real system uses
const mockConfig = {
  system_prompt: "You are an AI assistant that generates daily work reports based on video content. Always respond with valid JSON.",
  report_json_schema: {
    "narrative": "string - Overall summary of work completed",
    "workCompleted": ["array", "of", "work", "items"],
    "issues": [
      {
        "description": "string - issue description",
        "status": "open|in_progress|resolved",
        "impact": "string - impact description",
        "resolution": "string - resolution or planned resolution"
      }
    ],
    "materials": [
      {
        "materialName": "string - name of material",
        "status": "string - status of material",
        "note": "string - additional notes"
      }
    ],
    "safetyObservations": "string - any safety observations",
    "nextSteps": ["array", "of", "next", "steps"]
  }
};

async function testGeminiVideo() {
  try {
    console.log('Testing Gemini video processing...');
    const result = await getDailyReportFromVideo('/tmp/test_video.mp4', mockConfig);
    console.log('Success! Generated report:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGeminiVideo();