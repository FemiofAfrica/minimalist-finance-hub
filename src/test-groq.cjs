const { Groq } = require("groq-sdk");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Simple test to check if Groq API is working
async function testGroq() {
  try {
    // Get the API key from environment variable
    const apiKey = process.env.VITE_GROQ_OCR_KEY;
    
    if (!apiKey) {
      console.error("❌ Error: VITE_GROQ_OCR_KEY not found in environment variables");
      return;
    }
    
    console.log("🔑 API Key found:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5));
    
    // Initialize Groq client
    const groq = new Groq({
      apiKey: apiKey,
    });
    
    console.log("🤖 Testing Groq API with a simple request...");
    
    // Simple test request
    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, the Groq API is working!' in JSON format"
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    
    console.log("✅ API Response received:");
    console.log(JSON.stringify(response.choices[0].message.content, null, 2));
    console.log("\n✨ Success! The Groq OCR API key is working correctly.\n");
    
  } catch (error) {
    console.error("❌ Error testing Groq API:", error);
  }
}

testGroq(); 