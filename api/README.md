# Kpege API - Serverless Functions

This directory contains Vercel serverless functions for the Kpege financial app.

## Endpoints

### `/api/ocr`
- **Method**: POST
- **Purpose**: Extract text and financial data from receipt images and PDFs
- **Input**: FormData with `receipt` file field
- **Output**: JSON with extracted text, amount, category, and details

### `/api/categorize`
- **Method**: POST  
- **Purpose**: Categorize financial transactions from text descriptions
- **Input**: JSON with `text` field
- **Output**: JSON with category, type, and confidence scores

## Environment Variables

For production deployment, set these environment variables in Vercel:

- `GROQ_API_KEY` or `GROQ_OCR_KEY`: Your Groq API key for enhanced text analysis

## Features

- **CORS Support**: Configured for cross-origin requests
- **Fallback Logic**: Works without API keys using basic text analysis
- **File Processing**: Handles both images and PDFs
- **Intelligent Demo Data**: Generates realistic receipt data for testing
- **Error Handling**: Graceful fallbacks and proper error responses

## Deployment

These functions are automatically deployed to Vercel when pushed to the main branch. The Vercel configuration in `vercel.json` routes `/api/*` requests to these functions. 