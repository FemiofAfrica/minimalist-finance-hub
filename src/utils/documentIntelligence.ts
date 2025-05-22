import { AnalyzeOperationOutput } from "@azure-rest/ai-document-intelligence";
import { supabase } from "@/integrations/supabase/client";

// Publicly available CORS proxies (use as fallback)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors.eu.org/'
];

/**
 * Analyze a document using OCR.space and Groq AI
 * @param file The file to analyze (image or PDF)
 * @param progressCallback Optional callback for progress updates
 * @returns The extracted text
 */
export async function analyzeDocument(
  file: File,
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {
    progressCallback?.(10);
    
    // Step 1: Use OCR.space to extract text from image (handles CORS)
    progressCallback?.(20);
    const extractedText = await useOcrSpace(file, progressCallback);
    
    // Step 2: Process the extracted text with Groq AI via parse-transaction-groq
    // This step is handled by the OCRTransactionExtractor component which receives the text
    
    progressCallback?.(100);
    return extractedText;
    
  } catch (error) {
    console.error("Document processing error:", error);
    throw error;
  }
}

/**
 * Use OCR.space API (allows CORS requests from any origin)
 */
async function useOcrSpace(file: File, progressCallback?: (progress: number) => void): Promise<string> {
  progressCallback?.(30);
  
  console.log("Using OCR.space service");
  
  // Common free API key for OCR.space
  const API_KEY = 'K85772124988957';
  
  const formData = new FormData();
  formData.append('apikey', API_KEY);
  formData.append('file', file);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // More accurate OCR engine
  
  progressCallback?.(40);
  
  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });
    
    progressCallback?.(80);
    
    if (!response.ok) {
      console.error(`OCR.space error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('OCR.space error details:', errorText);
      throw new Error(`OCR.space returned status ${response.status}`);
    }
    
    const result = await response.json();
    console.log("OCR.space result:", result);
    
    if (!result.IsErroredOnProcessing && result.ParsedResults && result.ParsedResults.length > 0) {
      const parsedText = result.ParsedResults
        .map(result => result.ParsedText)
        .join('\n')
        .trim();
      
      if (parsedText) {
        console.log("Successfully extracted text using OCR.space");
        return parsedText;
      }
    }
    
    throw new Error(result.ErrorMessage || 'Failed to extract text');
    
  } catch (error) {
    console.error("OCR.space processing error:", error);
    throw error;
  }
}

/**
 * Convert a file to base64 encoding
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = (error) => reject(error);
  });
} 