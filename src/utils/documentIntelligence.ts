import { compressImageIfNeeded, MAX_FILE_SIZE } from "./imageCompression";
import { initPDFWorker, extractTextFromPDF, convertPdfToImage } from "./pdfUtils";
import * as pdfjsLib from 'pdfjs-dist';

// Publicly available CORS proxies (use as fallback)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors.eu.org/'
];

// Initialize worker immediately
initPDFWorker();

/**
 * Analyze a document using OCR.space and optionally PDFjs text extraction
 */
export async function analyzeDocument(
  file: File,
  progressCallback?: (progress: number) => void,
  options: { skipAzure?: boolean, maxPdfPages?: number } = {}
): Promise<string> {
  try {
    progressCallback?.(5);
    // Check file size and compress if needed
    if (file.size > MAX_FILE_SIZE) {
      progressCallback?.(10);
      console.log(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds limit of ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB. Compressing...`);
      const compressedFile = await compressImageIfNeeded(file);
      if (compressedFile.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large (${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB. Please try a smaller file or a clearer image.`);
      }
      file = compressedFile;
    }
    progressCallback?.(20);

    // For PDF files, try extracting text directly first as a fallback
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        console.log("Attempting to extract text directly from PDF...");
        // Try to reinitialize worker explicitly before extraction
        try {
          initPDFWorker();
        } catch (workerError) {
          console.warn("Error initializing PDF worker:", workerError);
        }
        
        // Use our PDF utility
        const pdfText = await extractTextFromPDF(file);
        if (pdfText && pdfText.trim().length > 0) {
          console.log("Successfully extracted text directly from PDF.");
          progressCallback?.(100);
          return pdfText;
        }
        console.log("PDF has no extractable text, will proceed with OCR.");
        
        // If direct text extraction failed but file is PDF, try converting to image first
        try {
          console.log("Converting first page of PDF to image for better OCR...");
          progressCallback?.(25);
          const pdfImage = await convertPdfToImage(file, 1); // Just convert first page
          if (pdfImage) {
            console.log("Successfully converted PDF to image for OCR");
            file = pdfImage; // Use the image for OCR instead
          }
        } catch (conversionError) {
          console.warn("Failed to convert PDF to image:", conversionError);
          // Continue with original PDF
        }
      } catch (pdfError) {
        console.warn("Failed to extract text directly from PDF:", pdfError);
        // Continue with OCR since direct extraction failed
      }
    }

    // Use OCR.space for all document processing
    console.log("Using OCR.space for document processing");
    try {
      const extractedText = await useOcrSpace(file, progressCallback, options);
      if (extractedText && extractedText.trim().length > 0) {
        console.log("OCR.space processing succeeded.");
        progressCallback?.(100);
        return extractedText;
      }
      throw new Error("OCR.space returned empty result");
    } catch (ocrSpaceError) {
      console.error("OCR.space processing failed.", ocrSpaceError);
      throw ocrSpaceError;
    }
  } catch (error) {
    console.error("Document processing error:", error);
    throw error;
  }
}

/**
 * Use OCR.space API (allows CORS requests from any origin)
 */
export async function useOcrSpace(file: File, progressCallback?: (progress: number) => void, options: { skipAzure?: boolean } = {}): Promise<string> {
  progressCallback?.(30);
  
  console.log(`Using OCR.space service with file size: ${(file.size / 1024).toFixed(2)} KB`);
  
  // Common free API key for OCR.space
  const API_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY || 
                 process.env.VITE_OCR_SPACE_API_KEY || 
                 'K85772124988957'; // Fallback to common free API key
  
  // Use simpler settings by default for better reliability
  // Only use advanced settings if the file is small and not a PDF
  const isSmallFile = file.size < 250 * 1024; // 250KB threshold
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  
  // For PDFs, we need to handle them differently as they often time out
  if (isPdf && file.size > 1024 * 1024) {
    // For large PDFs, we may need to split or extract specific pages
    console.log("PDF is large, compressing before OCR");
    try {
      // Try to compress the PDF first
      const compressedFile = await compressImageIfNeeded(file, 0.7); // Use higher compression
      file = compressedFile;
      console.log("PDF compressed successfully");
    } catch (compressionError) {
      console.warn("Failed to compress PDF:", compressionError);
      // Continue with original PDF
    }
  }
  
  // Try OCR.space API directly
  try {
    // Create form data for the OCR request
    const formData = new FormData();
    formData.append('apikey', API_KEY);
    formData.append('file', file, file.name);
    
    // Basic settings for better reliability
    formData.append('language', 'eng');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    
    // Add more parameters for small files for better results
    if (isSmallFile && !isPdf) {
      formData.append('isCreateSearchablePdf', 'false');
      formData.append('isSearchablePdfHideTextLayer', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('isTable', 'true');
      formData.append('isOverlayRequired', 'false');
    }
    
    // Try multiple CORS proxies if needed
    let proxyIndex = 0;
    let success = false;
    let lastError = null;
    let result = null;
    
    progressCallback?.(50);
    
    // Try direct request first, then fall back to proxies if needed
    const endpoints = [
      'https://api.ocr.space/parse/image',
      ...CORS_PROXIES.map(proxy => `${proxy}https://api.ocr.space/parse/image`)
    ];
    
    while (!success && proxyIndex < endpoints.length) {
      try {
        const url = endpoints[proxyIndex];
        console.log(`Trying OCR.space with endpoint: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`OCR.space API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.IsErroredOnProcessing || !data.ParsedResults || data.ParsedResults.length === 0) {
          throw new Error(data?.ErrorMessage || 'OCR.space processing failed with no results');
        }
        
        // Extract text from all parsed results
        const parsedText = data.ParsedResults
          .map(result => result.ParsedText || '')
          .join('\n')
          .trim();
        
        if (parsedText.length === 0) {
          throw new Error('OCR.space returned empty text');
        }
        
        result = parsedText;
        success = true;
        
      } catch (error) {
        console.warn(`OCR.space attempt ${proxyIndex + 1} failed:`, error);
        lastError = error;
        proxyIndex++;
      }
    }
    
    if (!success || !result) {
      throw lastError || new Error('All OCR.space attempts failed');
    }
    
    progressCallback?.(90);
    return result;
    
  } catch (error) {
    console.error('OCR.space processing failed:', error);
    throw error;
  }
}

/**
 * Convert a File object to a base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => {
      reject(error);
    };
  });
}
