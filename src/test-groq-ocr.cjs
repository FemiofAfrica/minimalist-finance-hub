const { Groq } = require("groq-sdk");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Sample receipt text that might come from OCR
const sampleReceiptText = `
WALMART
123 MAIN STREET
ANYTOWN, USA 12345
TEL: (555) 123-4567

RECEIPT #: 1234-5678-9012
DATE: 05/25/2025
TIME: 14:32:45

CASHIER: John
REGISTER: 12

MILK                   $3.99
BREAD                  $2.49
EGGS (12)              $3.29
BANANAS                $1.99
CHICKEN BREAST         $8.99

SUBTOTAL              $20.75
TAX (8%)               $1.66
TOTAL                 $22.41

PAYMENT: VISA **** 1234
APPROVED
THANK YOU FOR SHOPPING WITH US!
`;

// Function to test different models and text sizes
async function testOcrPerformance() {
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
      timeout: 60000 // 60 second timeout
    });
    
    // Models to test
    const models = [
      "llama3-8b-8192",
      "llama3-70b-8192"
    ];
    
    // Test sizes - Original and 10x larger
    const textSizes = [
      { name: "Original", text: sampleReceiptText },
      { name: "10x Larger", text: sampleReceiptText.repeat(10) }
    ];
    
    // Schema description
    const schemaDescription = `
    {
      "businessName": "Name of the business or merchant on the receipt",
      "date": "Date of the transaction in any recognized date format",
      "time": "Time of the transaction if available",
      "total": "Total amount of the transaction as a number",
      "subtotal": "Subtotal amount before tax and tip as a number",
      "tax": "Tax amount if listed as a number",
      "items": [
        {
          "description": "Item description or name",
          "quantity": "Quantity of the item as a number if available",
          "amount": "Total amount for this item as a number"
        }
      ]
    }`;
    
    // Test all combinations
    for (const model of models) {
      for (const { name, text } of textSizes) {
        console.log(`\n🧪 Testing model: ${model} with ${name} text (${text.length} chars)`);
        
        const startTime = Date.now();
        
        try {
          const response = await groq.chat.completions.create({
            model: model,
            messages: [
              {
                role: "system",
                content: `You are an expert at extracting structured information from receipt text. Extract the following information in a JSON format:
${schemaDescription}

Ensure the output is valid JSON with no syntax errors.`
              },
              {
                role: "user",
                content: `Extract the following information from this receipt text into JSON format:\n\n${text}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          });
          
          const endTime = Date.now();
          const timeElapsed = (endTime - startTime) / 1000;
          
          console.log(`✅ Response received in ${timeElapsed.toFixed(2)} seconds`);
          console.log(`Status: Success`);
          
          // Check if JSON is valid
          const parsed = JSON.parse(response.choices[0].message.content);
          console.log(`Fields found: ${Object.keys(parsed).join(", ")}`);
          
        } catch (error) {
          const endTime = Date.now();
          const timeElapsed = (endTime - startTime) / 1000;
          
          console.error(`❌ Error after ${timeElapsed.toFixed(2)} seconds:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error testing Groq API:", error);
  }
}

testOcrPerformance(); 