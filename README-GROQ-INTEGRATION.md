# Groq API Integration for Receipt Parsing and Transaction Categorization

This document provides instructions on how to properly integrate the Groq API for enhanced receipt parsing and transaction categorization in production.

## Overview

The current implementation simulates OCR and categorization features, but in production, you should use the Groq API key stored on Vercel to:

1. Process receipts using OCR capabilities
2. Categorize transactions using AI text analysis

## Setup Requirements

1. A Groq API key stored as `GROQ_OCR_KEY` in your Vercel environment variables
2. Vercel serverless functions for API endpoints
3. Client-side code that calls these endpoints

## Implementation Steps

### 1. Deploy the API Endpoints

The code already includes two API endpoint files that should be deployed to Vercel:

- `/api/ocr.js` - For OCR processing of receipts
- `/api/categorize.js` - For categorizing transaction text

These files need to be updated to actually call the Groq API instead of returning simulated responses.

### 2. Update the OCR API Endpoint

In the `/api/ocr.js` file, replace the simulation code with actual Groq API calls:

```javascript
// Get the file from the request (using formidable or similar)
const form = new formidable.IncomingForm();
form.parse(req, async (err, fields, files) => {
  if (err) {
    return res.status(500).json({ error: 'Error processing file upload' });
  }
  
  const file = files.receipt;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Read the file (if image) or extract text from PDF
  const fileBuffer = fs.readFileSync(file.path);
  
  // For images, use OCR to extract text
  // For PDFs, extract text directly
  
  // Call Groq API with the extracted text
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
  
  // Process the analysis to extract amount, category, etc.
  // Return structured data
});
```

### 3. Update the Categorization API Endpoint

In the `/api/categorize.js` file, replace the simulation code with actual Groq API calls:

```javascript
// Get the transaction text from the request
const { text } = req.body;

// Call Groq API for text analysis
const groqResponse = await fetch('https://api.groq.com/v1/text-analysis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${groqApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: text,
    tasks: ['categorization']
  })
});

const analysis = await groqResponse.json();

// Map Groq categories to our application categories
const categoryMapping = {
  // Map Groq categories to app categories
};

// Extract the category and confidence
const category = mapGroqCategory(analysis.categories[0].label);
const confidence = analysis.categories[0].confidence;

// Return the results
return res.status(200).json({
  success: true,
  category,
  confidence
});
```

## Client-Side Integration

The client-side code in `LandingPage.tsx` is already set up to call these API endpoints, but with simulation for the demo. In production:

1. For receipt processing:
   - Create a FormData object with the file
   - POST to `/api/ocr`
   - Process the response

2. For transaction categorization:
   - POST the transaction text to `/api/categorize`
   - Use the returned category

## Testing

1. Ensure your Vercel environment has the `GROQ_OCR_KEY` variable set
2. Deploy the API endpoints to Vercel
3. Test with real receipts and transaction descriptions

## Monitoring and Limits

- Monitor your Groq API usage to avoid exceeding quotas
- Consider implementing rate limiting for the API endpoints
- Add error handling for cases where the Groq API is unavailable

## Resources

- [Groq API Documentation](https://www.groq.com/docs/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Serverless Functions on Vercel](https://vercel.com/docs/functions) 