// Server-side API endpoint for OCR processing
// This would need to be deployed to Vercel with the GROQ_OCR_KEY environment variable
import formidable from 'formidable';
import fs from 'fs';
import { createWorker } from 'tesseract.js'; // For local OCR fallback

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // Only allow POST requests with files
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the GROQ API key from environment variables
    const groqApiKey = process.env.GROQ_OCR_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not configured, falling back to local OCR');
    }

    // Parse the incoming form data with files
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error processing file upload' });
      }
      
      const file = files.receipt;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      let extractedText = '';
      
      // Process different file types
      if (file.mimetype.startsWith('image/')) {
        // For images, use Tesseract.js as a fallback for OCR
        if (!groqApiKey) {
          const worker = await createWorker();
          const { data } = await worker.recognize(file.filepath);
          extractedText = data.text;
          await worker.terminate();
        } else {
          // If we have the Groq API key, use their OCR capabilities
          // This is a simplified example - you would upload the image to Groq
          // Using multipart/form-data or convert to base64
          const imageBuffer = fs.readFileSync(file.filepath);
          const base64Image = imageBuffer.toString('base64');
          
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
          
          const ocrResult = await groqOcrResponse.json();
          extractedText = ocrResult.text || '';
        }
      } else if (file.mimetype === 'application/pdf') {
        // For PDFs, you would use a PDF parsing library
        // This is a simplified example
        const pdfBuffer = fs.readFileSync(file.filepath);
        
        // In a real implementation, use a library like pdf-parse
        // For demo, we're skipping actual PDF text extraction
        extractedText = "PDF content would be extracted here";
        
        // If Groq API key is available, use it for better extraction
        if (groqApiKey) {
          // Here you would convert the PDF to text and send to Groq
          // or use Groq's direct PDF processing capabilities if available
        }
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
      
      // Once we have extracted text, analyze it with Groq
      if (extractedText && groqApiKey) {
        // Call Groq API with the extracted text for analysis
        const groqResponse = await fetch('https://api.groq.com/v1/text-analysis', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: extractedText,
            tasks: ['entity_extraction', 'categorization']
          })
        });
        
        const analysis = await groqResponse.json();
        
        // Process the analysis to extract structured data
        const extractedData = processAnalysis(analysis, extractedText);
        
        return res.status(200).json({
          success: true,
          text: extractedText,
          ...extractedData
        });
      } else {
        // If we don't have Groq or text extraction failed, return basic info
        return res.status(200).json({
          success: extractedText.length > 0,
          text: extractedText,
          detectedAmount: 0,
          detectedCurrency: "Unknown",
          detectedCategory: "Uncategorized",
          confidence: 0,
          details: null
        });
      }
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
}

// Helper function to process Groq analysis into structured data
function processAnalysis(analysis, rawText) {
  // Extract entities (like amounts, dates, names)
  const entities = analysis.entities || [];
  
  // Find monetary amounts
  const amountEntities = entities.filter(e => e.type === 'MONEY' || e.type === 'NUMBER');
  let detectedAmount = 0;
  let detectedCurrency = "NGN"; // Default to NGN
  
  if (amountEntities.length > 0) {
    // Find the most likely total amount (usually the largest or marked as "total")
    // This is a simplified approach - in reality, you'd use more heuristics
    const totalEntity = amountEntities.reduce((largest, current) => {
      // If the text contains "total" near this entity, prioritize it
      const isNearTotal = rawText.indexOf('total') !== -1 && 
                          Math.abs(rawText.indexOf('total') - rawText.indexOf(current.text)) < 50;
      
      if (isNearTotal) return current;
      if (!largest) return current;
      
      // Otherwise, take the largest amount
      const currentValue = parseFloat(current.text.replace(/[^\d.]/g, ''));
      const largestValue = parseFloat(largest.text.replace(/[^\d.]/g, ''));
      
      return currentValue > largestValue ? current : largest;
    }, null);
    
    if (totalEntity) {
      detectedAmount = parseFloat(totalEntity.text.replace(/[^\d.]/g, ''));
      // Try to detect currency symbol
      const currencyMatch = totalEntity.text.match(/[$€£¥₦]/);
      if (currencyMatch) {
        const symbolToCurrency = {
          '$': 'USD',
          '€': 'EUR',
          '£': 'GBP',
          '¥': 'JPY',
          '₦': 'NGN'
        };
        detectedCurrency = symbolToCurrency[currencyMatch[0]] || 'NGN';
      }
    }
  }
  
  // Extract category
  const categories = analysis.categories || [];
  const categoryMapping = {
    'shopping': 'Shopping',
    'groceries': 'Groceries',
    'food': 'Dining',
    'restaurant': 'Dining',
    'transport': 'Transport',
    'utilities': 'Utilities',
    'housing': 'Housing',
    'entertainment': 'Entertainment',
    'transfer': 'Transfer',
    'bank_transfer': 'Bank Transfer'
  };
  
  let detectedCategory = 'Miscellaneous';
  let confidence = 0;
  
  if (categories.length > 0) {
    const topCategory = categories[0];
    // Map Groq category to app category
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (topCategory.label.toLowerCase().includes(key)) {
        detectedCategory = value;
        break;
      }
    }
    confidence = topCategory.confidence || 0;
  }
  
  // Extract other details (date, merchant, etc.)
  const dateEntities = entities.filter(e => e.type === 'DATE');
  const organizationEntities = entities.filter(e => e.type === 'ORGANIZATION');
  const personEntities = entities.filter(e => e.type === 'PERSON');
  
  const details = {
    date: dateEntities.length > 0 ? dateEntities[0].text : new Date().toISOString().split('T')[0],
    merchant: organizationEntities.length > 0 ? organizationEntities[0].text : 'Unknown',
    beneficiary: personEntities.length > 0 ? personEntities[0].text : '',
    reference: '',
    items: []
  };
  
  // For detailed receipt items, you would need more complex parsing
  // This is a simplified approach
  
  return {
    detectedAmount,
    detectedCurrency,
    detectedCategory,
    confidence,
    details
  };
} 