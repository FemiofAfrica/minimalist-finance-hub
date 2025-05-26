import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Groq } from "groq-sdk";
import { useOcrSpace as extractTextWithOcr } from "./documentIntelligence";

// Define schema for receipt data
const receiptSchema = z.object({
  businessName: z.string().optional().describe("Name of the business or merchant on the receipt"),
  date: z.string().optional().describe("Date of the transaction in any recognized date format"),
  time: z.string().optional().describe("Time of the transaction if available"),
  total: z.number().optional().describe("Total amount of the transaction"),
  subtotal: z.number().optional().describe("Subtotal amount before tax and tip"),
  tax: z.number().optional().describe("Tax amount if listed"),
  tip: z.number().optional().describe("Tip or gratuity amount if listed"),
  paymentMethod: z.string().optional().describe("Method of payment (credit card, cash, etc.)"),
  items: z.array(
    z.object({
      description: z.string().describe("Item description or name"),
      quantity: z.number().optional().describe("Quantity of the item"),
      unitPrice: z.number().optional().describe("Unit price of the item"),
      amount: z.number().describe("Total amount for this item")
    })
  ).optional().describe("Line items on the receipt"),
  currency: z.string().optional().describe("Currency used in the transaction"),
  category: z.string().optional().describe("Category of expense (dining, groceries, etc.)"),
});

export type ReceiptData = z.infer<typeof receiptSchema>;

/**
 * Extracts structured data from a receipt image using OCR.space and Groq
 * @param file The receipt image file
 * @param progressCallback Optional callback for progress updates
 * @returns Structured receipt data
 */
export async function extractStructuredData(
  file: File,
  progressCallback?: (progress: number) => void
): Promise<ReceiptData> {
  const maxRetries = 2;
  let retryCount = 0;
  
  try {
    // Log diagnostic information
    console.log(`===== RECEIPT OCR PROCESS STARTED =====`);
    console.log(`File type: ${file.type}`);
    console.log(`File size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`Time started: ${new Date().toLocaleString()}`);
    
    const startTime = performance.now();
    progressCallback?.(10);
    
    // Step 1: Extract text using OCR.space
    console.log(`Step 1: Starting OCR text extraction at ${new Date().toLocaleString()}`);
    const ocrStartTime = performance.now();
    
    const rawText = await extractTextWithOcr(file, (progress) => {
      // Map OCR progress to first half of total progress
      progressCallback?.(10 + progress * 0.4);
    });
    
    const ocrEndTime = performance.now();
    console.log(`OCR extraction completed in ${((ocrEndTime - ocrStartTime) / 1000).toFixed(2)} seconds`);
    console.log(`Extracted text length: ${rawText.length} characters`);
    console.log(`Text sample: ${rawText.substring(0, 200)}...`);
    
    // Truncate text if it's too long to avoid timeouts
    const MAX_TEXT_LENGTH = 4000;
    let processedText = rawText;
    if (rawText.length > MAX_TEXT_LENGTH) {
      console.log(`Text is too long (${rawText.length} chars), truncating to ${MAX_TEXT_LENGTH} chars`);
      processedText = rawText.substring(0, MAX_TEXT_LENGTH);
    }
    
    progressCallback?.(50);
    
    // Function to process with Groq with retry logic
    const processWithGroq = async (): Promise<ReceiptData> => {
      try {
        console.log(`Step 2: Starting Groq processing (attempt ${retryCount + 1} of ${maxRetries + 1}) at ${new Date().toLocaleString()}`);
        const groqStartTime = performance.now();
        
        // Step 2: Use Groq to structure the data
        const groq = new Groq({
          apiKey: import.meta.env.VITE_GROQ_OCR_KEY || '',
          timeout: 120000, // Increase timeout to 120 seconds
        });
        
        // Generate JSON schema for system prompt
        const jsonSchema = JSON.stringify(zodToJsonSchema(receiptSchema, { target: "openAi" }), null, 2);
        console.log(`JSON schema generated, size: ${jsonSchema.length} characters`);
        
        progressCallback?.(60);
        
        console.log(`Making Groq API call with model: llama3-70b-8192`);
        console.log(`API Key prefix: ${import.meta.env.VITE_GROQ_OCR_KEY?.substring(0, 5)}...`);
        
        // Simplify the schema for better performance
        const simplifiedSchema = {
          businessName: "Store or business name",
          date: "Transaction date",
          total: "Total amount (number)",
          items: "Array of items with description and amount"
        };
        
        const response = await groq.chat.completions.create({
          model: "llama3-70b-8192", // Use larger model for better quality but still fast
          messages: [
            {
              role: "system",
              content: `You are an expert at extracting structured information from receipt text. Extract ONLY the most essential information from the receipt text into a simple JSON format.

Focus on these key fields:
- businessName: The name of the store or merchant
- date: The transaction date
- total: The total amount as a number without currency symbols
- items: An array of purchased items, each with description and amount fields

If the receipt text is incomplete or poor quality, just extract whatever information you can identify with confidence. If a field can't be determined, omit it rather than guessing.
Keep your response concise and ensure it's valid JSON.`
            },
            {
              role: "user",
              content: `Extract the key information from this receipt text into a clean JSON format:\n\n${processedText}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1, // Low temperature for more deterministic results
          max_tokens: 1024, // Limit response size for faster processing
        });
        
        const groqEndTime = performance.now();
        console.log(`Groq API call completed in ${((groqEndTime - groqStartTime) / 1000).toFixed(2)} seconds`);
        
        progressCallback?.(90);
        
        if (response?.choices?.[0]?.message?.content) {
          const output = JSON.parse(response.choices[0].message.content);
          console.log(`Parsed JSON successfully, fields found: ${Object.keys(output).join(", ")}`);
          
          const totalTime = performance.now() - startTime;
          console.log(`===== RECEIPT OCR PROCESS COMPLETED =====`);
          console.log(`Total processing time: ${(totalTime / 1000).toFixed(2)} seconds`);
          
          progressCallback?.(100);
          return output;
        }
        
        throw new Error("Failed to extract structured receipt information");
      } catch (error) {
        console.error(`Groq processing error (attempt ${retryCount + 1}):`, error);
        
        // If we haven't reached max retries, try again
        if (retryCount < maxRetries) {
          retryCount++;
          progressCallback?.(55 + (retryCount * 5)); // Update progress to show retry
          console.log(`Retry attempt ${retryCount} for Groq processing`);
          return processWithGroq(); // Recursive retry
        }
        throw error; // If we've used all retries, throw the error
      }
    };
    
    return await processWithGroq();
    
  } catch (error) {
    console.error("Structured OCR processing error:", error);
    
    // Provide more specific error information based on error type
    if (error.message?.includes('timeout') || error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      console.error("Timeout detected in structured OCR process");
      throw new Error("Processing timed out. Please try a simpler document or try again later.");
    }
    
    throw error;
  }
} 