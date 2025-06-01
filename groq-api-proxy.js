// Proxy server for the Groq API integration
import express from 'express';
import cors from 'cors';
import formidable from 'formidable';
import fs from 'fs';
import dotenv from 'dotenv';
import { createWorker } from 'tesseract.js'; // For local OCR fallback

// Load environment variables
dotenv.config();

const app = express();
const port = 3500; // Using a different port than the other proxy servers

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.kpege.com'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey']
}));

// For JSON body requests (used by categorize endpoint)
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Groq API proxy is running' });
});

// OCR API endpoint
app.post('/api/ocr', async (req, res) => {
  console.log('Received OCR request');
  try {
    // Get the GROQ API key from environment variables
    const groqApiKey = process.env.GROQ_OCR_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not configured, falling back to local OCR');
    }

    // Parse the incoming form data with files
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form data:', err);
        return res.status(500).json({ error: 'Error processing file upload' });
      }
      
      const file = files.receipt[0]; // Updated for formidable v3+
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('Processing file:', file.originalFilename, file.mimetype, file.size);
      
      let extractedText = '';
      
      // Process different file types
      if (file.mimetype.startsWith('image/')) {
        // For images, use Tesseract.js as a fallback for OCR
        if (!groqApiKey) {
          console.log('Using Tesseract.js for OCR (GROQ API key not available)');
          const worker = await createWorker();
          const { data } = await worker.recognize(file.filepath);
          extractedText = data.text;
          await worker.terminate();
        } else {
          // If we have the Groq API key, use their OCR capabilities
          console.log('Using GROQ API for image OCR');
          const imageBuffer = fs.readFileSync(file.filepath);
          const base64Image = imageBuffer.toString('base64');
          
          try {
            // Call Groq's OCR API
            const groqOcrResponse = await fetch('https://api.groq.com/v1/vision', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                image: base64Image,
                tasks: ['text_recognition']
              })
            });
            
            if (!groqOcrResponse.ok) {
              throw new Error(`Groq API returned ${groqOcrResponse.status}: ${await groqOcrResponse.text()}`);
            }
            
            const ocrResult = await groqOcrResponse.json();
            extractedText = ocrResult.text || '';
          } catch (error) {
            console.error('Error calling Groq vision API:', error);
            
            // Fall back to Tesseract
            console.log('Falling back to Tesseract.js');
            const worker = await createWorker();
            const { data } = await worker.recognize(file.filepath);
            extractedText = data.text;
            await worker.terminate();
          }
        }
      } else if (file.mimetype === 'application/pdf') {
        // For PDFs, use a simple extraction approach
        // In a production app, you would use a proper PDF text extractor
        console.log('Processing PDF file');
        
        extractedText = "PDF content would be extracted here";
        
        // If Groq API key is available, we could use it for PDF processing
        // but for now we'll just use the simple extraction
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
      
      console.log('Extracted text length:', extractedText.length);
      
      // Once we have extracted text, analyze it with Groq if available
      if (extractedText && groqApiKey) {
        try {
          console.log('Analyzing text with Groq');
          // Call Groq API with the extracted text for analysis
          const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "llama3-70b-8192",
              messages: [
                {
                  role: "system", 
                  content: "You are a helpful assistant that analyzes receipt text. Extract the following information: total amount, currency, date, merchant/beneficiary name, and categorize the expense (e.g., Dining, Transport, Utilities, etc.). Provide the information in a structured format."
                },
                {
                  role: "user",
                  content: extractedText
                }
              ],
              temperature: 0.0
            })
          });
          
          if (!groqResponse.ok) {
            throw new Error(`Groq API returned ${groqResponse.status}: ${await groqResponse.text()}`);
          }
          
          const analysis = await groqResponse.json();
          console.log('Groq analysis received');
          
          // Extract structured data from the LLM response
          const assistantResponse = analysis.choices[0].message.content;
          console.log('Assistant response:', assistantResponse);
          
          // Parse the LLM response to extract structured data
          const extractedData = extractStructuredData(assistantResponse);
          
          return res.status(200).json({
            success: true,
            text: extractedText,
            ...extractedData
          });
        } catch (error) {
          console.error('Error analyzing with Groq:', error);
          // Continue with basic response on error
        }
      }
      
      // If we don't have Groq or text extraction failed, return basic info
      console.log('Returning basic OCR result');
      
      // Create a basic response for the front-end
      let detectedAmount = 0;
      let detectedCurrency = "NGN"; // Default to NGN
      let detectedCategory = "Uncategorized";
      
      // Very basic amount extraction for fallback
      const amountMatch = extractedText.match(/\$?\d+[,.]?\d*/);
      if (amountMatch) {
        detectedAmount = parseFloat(amountMatch[0].replace(/[^\d.]/g, ''));
      }
      
      // Very basic category detection for fallback
      if (extractedText.toLowerCase().includes('restaurant') || 
          extractedText.toLowerCase().includes('cafe') ||
          extractedText.toLowerCase().includes('food')) {
        detectedCategory = 'Dining';
      } else if (extractedText.toLowerCase().includes('transfer') ||
                 extractedText.toLowerCase().includes('payment')) {
        detectedCategory = 'Transfer';
      }
      
      return res.status(200).json({
        success: extractedText.length > 0,
        text: extractedText,
        detectedAmount,
        detectedCurrency,
        detectedCategory,
        confidence: 0.5,
        details: null
      });
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({ error: 'Failed to process image', message: error.message });
  }
});

// Transaction categorization API endpoint
app.post('/api/categorize', async (req, res) => {
  console.log('Received categorization request');
  try {
    // Get the transaction text from the request body
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Transaction text is required' });
    }

    console.log('Categorizing text:', text);

    // Get the GROQ API key from environment variables
    const groqApiKey = process.env.GROQ_OCR_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not configured, falling back to basic categorization');
      return res.status(200).json(fallbackCategorization(text));
    }

    try {
      // Call Groq API for text analysis
      const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system", 
              content: "You are a helpful assistant that categorizes financial transactions. Analyze the text and categorize it as one of: Shopping, Groceries, Dining, Transport, Utilities, Housing, Entertainment, Transfer, Income, Healthcare, Education, Travel, or Subscription. Also determine if it's an expense, income, or transfer. If it's a transfer, extract the source and destination accounts if mentioned."
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.0
        })
      });
      
      if (!groqResponse.ok) {
        throw new Error(`Groq API returned ${groqResponse.status}: ${await groqResponse.text()}`);
      }
      
      const analysis = await groqResponse.json();
      console.log('Groq analysis received');
      
      // Extract structured data from the LLM response
      const assistantResponse = analysis.choices[0].message.content;
      console.log('Assistant response:', assistantResponse);
      
      // Parse the LLM response into our expected structure
      // Extract category
      let category = 'Miscellaneous';
      const categoryMatch = assistantResponse.match(/categor(y|ize):\s*([A-Za-z]+)/i);
      if (categoryMatch) {
        category = categoryMatch[2];
      }
      
      // Extract type
      let type = 'expense';
      if (assistantResponse.toLowerCase().includes('income')) {
        type = 'income';
      } else if (assistantResponse.toLowerCase().includes('transfer')) {
        type = 'transfer';
      }
      
      // Extract source and destination accounts for transfers
      let sourceAccount = '';
      let destinationAccount = '';
      if (type === 'transfer') {
        const sourceMatch = assistantResponse.match(/source(?:\s+account)?:\s*([^,\n.]+)/i);
        if (sourceMatch) {
          sourceAccount = sourceMatch[1].trim();
        }
        
        const destinationMatch = assistantResponse.match(/destination(?:\s+account)?:\s*([^,\n.]+)/i);
        if (destinationMatch) {
          destinationAccount = destinationMatch[1].trim();
        }
      }
      
      // Extract amount if present
      let extractedAmount = null;
      const amountMatch = assistantResponse.match(/amount:\s*([0-9,.]+)/i);
      if (amountMatch) {
        extractedAmount = amountMatch[1].replace(/,/g, '');
      }
      
      return res.status(200).json({
        success: true,
        category,
        type,
        confidence: 0.9,
        possibleCategories: [
          { name: category, score: 0.9 },
          { name: 'Miscellaneous', score: 0.1 }
        ],
        extractedAmount,
        sourceAccount,
        destinationAccount
      });
      
    } catch (error) {
      console.error('Error calling Groq API:', error);
      return res.status(200).json(fallbackCategorization(text));
    }
  } catch (error) {
    console.error('Categorization error:', error);
    return res.status(200).json(fallbackCategorization(text));
  }
});

// Fallback categorization function
function fallbackCategorization(text) {
  console.log('Using fallback categorization for:', text);
  // Simple categorization logic
  const categories = {
    'grocery': 'Groceries',
    'food': 'Dining',
    'restaurant': 'Dining',
    'cafe': 'Dining',
    'uber': 'Transport',
    'taxi': 'Transport',
    'bus': 'Transport',
    'electricity': 'Utilities',
    'water': 'Utilities',
    'internet': 'Utilities',
    'rent': 'Housing',
    'mortgage': 'Housing',
    'salary': 'Income',
    'payment received': 'Income',
    'transfer': 'Transfer'
  };
  
  let category = 'Miscellaneous';
  let type = 'expense'; // Default type
  const lowerText = text.toLowerCase();
  
  for (const [keyword, categoryName] of Object.entries(categories)) {
    if (lowerText.includes(keyword)) {
      category = categoryName;
      // Determine type based on category
      if (category === 'Income') {
        type = 'income';
      } else if (category === 'Transfer') {
        type = 'transfer';
      }
      break;
    }
  }
  
  // Extract source and destination for transfers
  let sourceAccount = '';
  let destinationAccount = '';
  
  if (type === 'transfer') {
    // Look for phrases like "from X to Y"
    const fromToMatch = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
      sourceAccount = fromToMatch[1].trim();
      destinationAccount = fromToMatch[2].trim();
    } else {
      // Default accounts
      sourceAccount = 'Main Account';
      destinationAccount = 'Savings';
    }
  }
  
  return {
    success: true,
    category,
    type,
    confidence: 0.7,
    possibleCategories: [
      { name: category, score: 0.7 },
      { name: 'Miscellaneous', score: 0.3 }
    ],
    sourceAccount,
    destinationAccount
  };
}

// Helper function to parse LLM response into structured data
function extractStructuredData(text) {
  console.log('Extracting structured data from LLM response');
  let detectedAmount = 0;
  let detectedCurrency = "NGN"; // Default to NGN
  let detectedCategory = "Miscellaneous";
  let details = {
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    beneficiary: '',
    reference: '',
    bankName: '',
    items: []
  };
  
  // Extract amount
  const amountMatch = text.match(/(?:total|amount):\s*(?:[₦$€£¥])?([0-9,.]+)/i);
  if (amountMatch) {
    detectedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract currency
  const currencyMatch = text.match(/currency:\s*([A-Z]{3})/i);
  if (currencyMatch) {
    detectedCurrency = currencyMatch[1];
  } else {
    // Try to extract from currency symbols
    const symbolMatch = text.match(/(?:total|amount):\s*([$€£¥₦])/i);
    if (symbolMatch) {
      const symbolToCurrency = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₦': 'NGN'
      };
      detectedCurrency = symbolToCurrency[symbolMatch[1]] || 'NGN';
    }
  }
  
  // Extract category
  const categoryMatch = text.match(/category:\s*([A-Za-z\s]+)/i);
  if (categoryMatch) {
    detectedCategory = categoryMatch[1].trim();
  }
  
  // Extract date
  const dateMatch = text.match(/date:\s*([A-Za-z0-9,\s]+)/i);
  if (dateMatch) {
    details.date = dateMatch[1].trim();
  }
  
  // Extract merchant/beneficiary
  const merchantMatch = text.match(/(?:merchant|beneficiary|recipient):\s*([^,\n.]+)/i);
  if (merchantMatch) {
    details.merchant = merchantMatch[1].trim();
    details.beneficiary = merchantMatch[1].trim();
  }
  
  return {
    detectedAmount,
    detectedCurrency,
    detectedCategory,
    confidence: 0.8,
    details
  };
}

// Start the server
app.listen(port, () => {
  console.log(`Groq API proxy server running at http://localhost:${port}`);
  console.log(`OCR endpoint: http://localhost:${port}/api/ocr`);
  console.log(`Categorization endpoint: http://localhost:${port}/api/categorize`);
}); 