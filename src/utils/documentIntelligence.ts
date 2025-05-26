import { AnalyzeOperationOutput } from "@azure-rest/ai-document-intelligence";
import { supabase } from "@/integrations/supabase/client";
import { compressImageIfNeeded, MAX_FILE_SIZE } from "./imageCompression";
import { getSupabaseFunctionsUrl } from "./env";
import * as pdfjsLib from 'pdfjs-dist';

// Publicly available CORS proxies (use as fallback)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors.eu.org/'
];

// Initialize PDF.js worker - fixed to use HTTPS and better error handling
const initPDFWorker = () => {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      // Try to use the bundled worker first (most reliable)
      if (typeof pdfjsLib.PDFWorker !== 'undefined') {
        // Let PDF.js handle worker creation automatically
        console.log('Using bundled PDF.js worker');
        return;
      }

      // If bundled worker isn't available, use CDN with fallback
      const workerVersion = pdfjsLib.version;
      
      // Try to load from application's public directory first (most reliable)
      const localWorkerPath = `/pdf.worker.min.js`;
      
      // Check if local worker exists
      fetch(localWorkerPath, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // Use local worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
            console.log('Using local PDF.js worker');
          } else {
            // Fallback to CDN
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.js`;
            console.log(`Using CDN PDF.js worker with version ${workerVersion}`);
          }
        })
        .catch(() => {
          // If fetch fails, use CDN as last resort
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.js`;
          console.log(`Using CDN PDF.js worker with version ${workerVersion} (fallback)`);
        });
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error);
    }
  }
};

// Initialize worker immediately
initPDFWorker();

/**
 * Analyze a document using Supabase Edge Function (Azure OCR) and fallback to OCR.space
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
        const pdfText = await extractTextFromPdf(file, progressCallback, options.maxPdfPages || 10);
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

    // If skipAzure is true, skip directly to OCR.space
    if (options.skipAzure) {
      console.log("Bypassing Azure OCR and using OCR.space directly");
      try {
        const extractedText = await useOcrSpace(file, progressCallback);
        if (extractedText && extractedText.trim().length > 0) {
          console.log("OCR.space direct mode succeeded.");
          progressCallback?.(100);
          return extractedText;
        }
        throw new Error("OCR.space returned empty result");
      } catch (ocrSpaceError) {
        console.error("OCR.space direct mode failed.", ocrSpaceError);
        throw ocrSpaceError;
      }
    }

    // Step 1: Try Azure OCR via Supabase Edge Function
    try {
      // Check if we should skip Azure OCR based on local storage preference
      const skipAzure = localStorage.getItem('useDirectOcr') === 'true';
      if (skipAzure) {
        console.log("Skipping Azure OCR based on local storage preference");
        throw new Error("Local preference is to skip Azure OCR");
      }

      // Get the correct Supabase functions URL for this environment
      const supabaseFunctionsUrl = getSupabaseFunctionsUrl();
      const isBrowser = typeof window !== 'undefined';
      const isLocalDevelopment = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // Use a proxy approach to avoid CORS issues in local development
      let functionEndpoint;
      if (isLocalDevelopment) {
        // Use relative URL to avoid CORS - this will go through the Vite dev server proxy
        functionEndpoint = '/api/proxy/analyze-document';
        console.log("Using local proxy for Supabase function to avoid CORS issues");
      } else {
        functionEndpoint = `${supabaseFunctionsUrl}/analyze-document`;
      }
      
      // Skip Azure/Supabase in development if environment hint suggests it's not set up
      const isLocal = supabaseFunctionsUrl.includes('localhost');
      if (isLocal && !import.meta.env.VITE_USE_LOCAL_FUNCTIONS) {
        console.log("Skipping Azure OCR in development as local functions are not enabled. Set VITE_USE_LOCAL_FUNCTIONS=true to use local functions.");
        throw new Error("Local Supabase functions not enabled");
      }
      
      console.log("Trying Azure OCR via Supabase Edge Function...", functionEndpoint);
      const base64Source = await fileToBase64(file);
      
      try {
        const response = await fetch(functionEndpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            // Add Supabase anon key for authentication
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
            // Add Supabase URL as a header so our proxy knows where to forward the request
            'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
          },
          body: JSON.stringify({ base64Source }),
        });
        
        if (!response.ok) {
          let errorMsg = `HTTP error ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          throw new Error(`Azure OCR function failed: ${errorMsg}`);
        }
        
        const data = await response.json();
        if (data.text && data.text.trim().length > 0) {
          console.log("Azure OCR (Supabase) succeeded.");
          progressCallback?.(100);
          return data.text;
        } else {
          throw new Error("Azure OCR function returned empty result");
        }
      } catch (fetchError) {
        console.error("Fetch error when calling Azure OCR:", fetchError);
        throw new Error(`Azure OCR function failed: ${fetchError.message}`);
      }
    } catch (azureError) {
      console.warn("Azure OCR (Supabase) failed, falling back to OCR.space.", azureError);
      // Step 2: Fallback to OCR.space
      try {
        const extractedText = await useOcrSpace(file, progressCallback);
        if (extractedText && extractedText.trim().length > 0) {
          console.log("OCR.space fallback succeeded.");
          progressCallback?.(100);
          return extractedText;
        }
        throw new Error("OCR.space returned empty result");
      } catch (ocrSpaceError) {
        console.error("Both Azure (Supabase) and OCR.space failed.", ocrSpaceError);
        throw ocrSpaceError;
      }
    }
  } catch (error) {
    console.error("Document processing error:", error);
    throw error;
  }
}

/**
 * Use Azure Document Intelligence OCR (prebuilt-read v4.0)
 */
async function useAzureDocumentIntelligence(file: File, progressCallback?: (progress: number) => void): Promise<string> {
  const endpoint = import.meta.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = import.meta.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Azure Document Intelligence endpoint or key is not set in environment variables.");
  }

  // Azure Document Intelligence v4.0 prebuilt-read endpoint
  const url = `${endpoint.replace(/\/$/, '')}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-10-31`;

  // Prepare the request
  const formData = new FormData();
  formData.append('file', file);

  progressCallback?.(30);

  // Start the analysis
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OCR request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // Get the operation-location for polling
  const operationLocation = response.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('Azure OCR response missing operation-location header.');
  }

  // Poll for result
  let pollCount = 0;
  let result = null;
  while (pollCount < 30) { // up to ~30 seconds
    await new Promise(res => setTimeout(res, 1000));
    progressCallback?.(35 + pollCount * 2);
    const pollResponse = await fetch(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });
    if (!pollResponse.ok) {
      throw new Error(`Azure OCR polling failed: ${pollResponse.status} ${pollResponse.statusText}`);
    }
    const pollResult = await pollResponse.json();
    if (pollResult.status === 'succeeded') {
      result = pollResult;
      break;
    } else if (pollResult.status === 'failed') {
      throw new Error('Azure OCR analysis failed.');
    }
    pollCount++;
  }
  if (!result) {
    throw new Error('Azure OCR polling timed out.');
  }

  // Extract text from result
  const pages = result.analyzeResult?.content || '';
  if (!pages || typeof pages !== 'string') {
    throw new Error('Azure OCR returned no text.');
  }
  return pages;
}

/**
 * Use OCR.space API (allows CORS requests from any origin)
 */
export async function useOcrSpace(file: File, progressCallback?: (progress: number) => void): Promise<string> {
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
      console.log(`Compressed PDF size: ${(file.size / 1024).toFixed(2)} KB`);
    } catch (compressError) {
      console.warn("Failed to compress PDF:", compressError);
      // Continue with original file
    }
  }
  
  // For most cases, use the simple settings first (more reliable)
  try {
    console.log("Trying OCR with simple settings (faster)");
    return await tryOcrWithSettings(file, {
      scale: 'false',
      OCREngine: '1', // Faster OCR engine
      isTable: isPdf ? 'true' : 'false', // Enable table detection for PDFs
      filetype: isPdf ? 'pdf' : 'auto',
      detectOrientation: 'true',
      language: 'eng'
    }, progressCallback, isPdf ? 45000 : 30000); // Longer timeout for PDFs
  } catch (error) {
    // Only try the advanced settings for small non-PDF files or if explicitly requested
    if (isSmallFile && !isPdf) {
      console.log("Simple OCR failed, trying with advanced settings");
      // Continue to try with advanced settings
      return tryOcrWithSettings(file, {
        scale: 'true',
        OCREngine: '2', // More accurate OCR engine
        isTable: 'true', // Better for receipts with tabular data
        filetype: 'auto',
        detectOrientation: 'true',
        language: 'eng'
      }, progressCallback, 60000); // Use shorter timeout for advanced engine
    }
    
    // For PDFs, try with different OCR engine if the first one failed
    if (isPdf) {
      console.log("Simple OCR failed for PDF, trying with alternative engine");
      return tryOcrWithSettings(file, {
        scale: 'false',
        OCREngine: '2', // Try more accurate engine
        isTable: 'true',
        filetype: 'pdf',
        detectOrientation: 'true',
        language: 'eng'
      }, progressCallback, 60000);
    }
    
    // For PDFs or large files, we don't retry with advanced settings
    throw error;
  }
}

/**
 * Helper function to try OCR with different settings
 */
async function tryOcrWithSettings(
  file: File, 
  settings: { 
    scale: string, 
    OCREngine: string, 
    isTable: string,
    filetype: string,
    detectOrientation: string,
    language: string
  },
  progressCallback?: (progress: number) => void,
  timeoutMs: number = 30000 // 30 second default timeout
): Promise<string> {
  // Use environment variable for API key if available, otherwise fall back to common key
  const API_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY || 
                  process.env.VITE_OCR_SPACE_API_KEY || 
                  'K85772124988957'; // Fallback to common free API key
  
  const formData = new FormData();
  formData.append('apikey', API_KEY);
  formData.append('file', file);
  formData.append('language', settings.language);
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', settings.scale);
  formData.append('OCREngine', settings.OCREngine);
  formData.append('isTable', settings.isTable);
  formData.append('filetype', settings.filetype);
  formData.append('detectOrientation', settings.detectOrientation);
  
  console.log(`OCR settings: ${JSON.stringify(settings)}`);
  progressCallback?.(40);
  
  try {
    // Set up fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`OCR.space timeout reached after ${timeoutMs/1000} seconds`);
      controller.abort();
    }, timeoutMs);
    
    // Add a retry mechanism for network issues
    let response;
    let retries = 0;
    const maxRetries = 1; // Reduce retry attempts to speed up overall process
    
    while (retries <= maxRetries) {
      try {
        response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        break; // Success, exit the retry loop
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw fetchError; // Don't retry timeouts
        }
        retries++;
        if (retries > maxRetries) {
          throw fetchError; // Max retries reached, propagate the error
        }
        console.log(`Fetch attempt ${retries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
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
    
    if (result.IsErroredOnProcessing) {
      if (result.ErrorMessage && result.ErrorMessage.includes("PDF file is password protected")) {
        throw new Error("The PDF is password protected. Please provide an unprotected PDF.");
      }
      throw new Error(result.ErrorMessage || 'OCR.space processing failed');
    }
    
    throw new Error(result.ErrorMessage || 'Failed to extract text');
    
  } catch (error) {
    console.error("OCR.space processing error:", error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error("OCR processing timed out. For PDFs, try a document with embedded text or use a clearer image.");
    }
    
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

/**
 * Extract text directly from a PDF without OCR
 * This will only work for PDFs with embedded text, not scanned documents
 */
async function extractTextFromPdf(
  file: File, 
  progressCallback?: (progress: number) => void,
  maxPages: number = 10
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Re-initialize PDF.js worker to ensure it's loaded
      initPDFWorker();
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      progressCallback?.(30);
      
      // Load the PDF document with more robust error handling
      let pdf;
      try {
        pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          disableFontFace: true,
          ignoreErrors: true,
          nativeImageDecoderSupport: 'none'
        }).promise;
      } catch (loadError) {
        console.error('Error loading PDF document:', loadError);
        return reject(new Error('Failed to load PDF. The file may be corrupted or password protected.'));
      }
      
      progressCallback?.(40);
      
      // Total number of pages
      const numPages = pdf.numPages;
      
      if (numPages === 0) {
        return reject(new Error('PDF contains no pages.'));
      }
      
      // Limit pages to process for large PDFs
      const pagesToProcess = Math.min(numPages, maxPages);
      if (numPages > maxPages) {
        console.log(`PDF has ${numPages} pages, but only processing the first ${maxPages} to avoid timeouts.`);
      }
      
      let extractedText = '';
      let textContentAvailable = false;
      
      // Process each page up to the limit
      for (let i = 1; i <= pagesToProcess; i++) {
        // Update progress based on page processing
        progressCallback?.(40 + Math.floor((i / pagesToProcess) * 50));
        
        try {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          
          if (content && content.items && content.items.length > 0) {
            textContentAvailable = true;
            
            // Extract text from each item on the page
            const pageText = content.items
              .map((item: any) => item.str || '')
              .join(' ');
            
            extractedText += pageText + '\n\n';
          }
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      if (numPages > maxPages) {
        extractedText += `\n[Note: Only showing text from the first ${maxPages} of ${numPages} pages]\n`;
      }
      
      progressCallback?.(95);
      
      if (textContentAvailable && extractedText.trim().length > 0) {
        resolve(extractedText);
      } else {
        reject(new Error('No text found in PDF. It may be a scanned document or image-based PDF.'));
      }
      
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      reject(error);
    }
  });
}

/**
 * Convert a PDF page to an image for better OCR processing
 */
async function convertPdfToImage(file: File, pageNumber: number = 1): Promise<File | null> {
  try {
    // Re-initialize PDF.js worker to ensure it's loaded
    initPDFWorker();
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      disableFontFace: true,
      ignoreErrors: true,
    }).promise;
    
    // Ensure requested page exists
    if (pdf.numPages < pageNumber) {
      throw new Error(`PDF only has ${pdf.numPages} pages, can't convert page ${pageNumber}`);
    }
    
    // Get the requested page
    const page = await pdf.getPage(pageNumber);
    
    // Set scale for good quality but reasonable size
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render the PDF page to the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        
        // Create a File object from the blob
        const imageFile = new File(
          [blob], 
          `pdf-page-${pageNumber}.png`, 
          { type: 'image/png' }
        );
        
        resolve(imageFile);
      }, 'image/png', 0.9); // 90% quality
    });
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    return null;
  }
} 