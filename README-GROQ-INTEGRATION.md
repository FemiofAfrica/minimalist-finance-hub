# Groq API Integration for FinTrack

This document explains how to set up and use the Groq API integration for OCR (Optical Character Recognition) and text categorization in the FinTrack application.

## Overview

The integration consists of two main components:

1. **OCR API** - Extracts text from images and PDFs of receipts and financial documents
2. **Categorization API** - Analyzes text descriptions and categorizes financial transactions

Both APIs use Groq's LLM capabilities to provide intelligent text processing and categorization.

## Setup

### 1. Get a Groq API Key

1. Go to [Groq Console](https://console.groq.com/)
2. Create an account or login
3. Get your API key from the console dashboard

### 2. Configure the API Key

#### For Local Development

Create a `.env` file in the project root and add your Groq API key:

```
GROQ_OCR_KEY=your_groq_api_key_here
```

#### For Vercel Deployment

Add the environment variable in the Vercel dashboard:
- Key: `GROQ_OCR_KEY`
- Value: Your Groq API key

### 3. Run the Application

For local development with the Groq API proxy:

```bash
npm run dev:full
```

This will start:
- The Vite development server (frontend)
- The Supabase proxy server
- The Groq API proxy server

## API Endpoints

### OCR API

**Endpoint:** `/api/ocr`

**Method:** POST

**Description:** Extracts text from images or PDFs and analyzes the content for financial information.

**Request:**
- Use `FormData` with a file field named `receipt`

**Response:**
```json
{
  "success": true,
  "text": "Extracted text from the document",
  "detectedAmount": 1000,
  "detectedCurrency": "NGN",
  "detectedCategory": "Dining",
  "confidence": 0.8,
  "details": {
    "date": "2024-05-20",
    "merchant": "Restaurant Name",
    "beneficiary": "John Doe",
    "reference": "Payment reference",
    "bankName": "Bank name if applicable",
    "items": []
  }
}
```

### Categorization API

**Endpoint:** `/api/categorize`

**Method:** POST

**Description:** Analyzes transaction text and categorizes it based on content.

**Request:**
```json
{
  "text": "Spent 5000 on groceries yesterday"
}
```

**Response:**
```json
{
  "success": true,
  "category": "Groceries",
  "type": "expense",
  "confidence": 0.9,
  "possibleCategories": [
    { "name": "Groceries", "score": 0.9 },
    { "name": "Miscellaneous", "score": 0.1 }
  ],
  "extractedAmount": "5000",
  "sourceAccount": "",
  "destinationAccount": ""
}
```

## Fallback Mechanisms

Both APIs have fallback mechanisms in case the Groq API is unavailable:

1. **OCR Fallback:** Uses Tesseract.js for local OCR processing
2. **Categorization Fallback:** Uses a simple rule-based approach for categorization

## Deployment Notes

When deploying to production:

1. Make sure the `GROQ_OCR_KEY` environment variable is set
2. For Vercel deployment, the API endpoints should work automatically as serverless functions
3. For other hosting, make sure the API endpoints are properly routed to the Express server

## Troubleshooting

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify that your Groq API key is correct and has sufficient credits
3. For local development, make sure all proxy servers are running correctly

## Limitations

- PDF processing is currently limited and may not extract all text accurately
- Large files may encounter timeouts or size limitations
- The categorization accuracy depends on the quality of the extracted text and the model's understanding

## Future Improvements

- Add support for better PDF processing
- Implement more robust error handling and retries
- Enhance the categorization algorithm with user feedback
- Add support for itemized receipt processing 