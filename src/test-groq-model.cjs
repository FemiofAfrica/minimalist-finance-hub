const { Groq } = require("groq-sdk");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Test different Groq models
async function testGroqModels() {
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
    
    // Models to test
    const models = [
      "llama3-8b-8192",
      "llama3-70b-8192",
      "mixtral-8x7b-32768"
    ];
    
    for (const model of models) {
      console.log(`\n🤖 Testing model: ${model}`);
      const startTime = Date.now();
      
      try {
        // Simple test request
        const response = await groq.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: "Say 'Hello, I am working!' in a short sentence."
            }
          ],
          temperature: 0.1,
        });
        
        const endTime = Date.now();
        const timeElapsed = (endTime - startTime) / 1000;
        
        console.log(`✅ Response received in ${timeElapsed.toFixed(2)} seconds:`);
        console.log(`"${response.choices[0].message.content.trim()}"`);
        console.log(`Model: ${response.model}`);
        console.log(`Created: ${new Date(response.created * 1000).toISOString()}`);
        
      } catch (error) {
        console.error(`❌ Error testing model ${model}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Error testing Groq API:", error);
  }
}

testGroqModels(); 