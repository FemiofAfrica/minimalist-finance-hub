import * as pdfjsLib from 'pdfjs-dist';

/**
 * Initialize PDF.js worker with robust fallback handling
 */
export const initPDFWorker = (): void => {
  if (typeof window === 'undefined' || pdfjsLib.GlobalWorkerOptions.workerSrc) {
    return; // Already initialized or running server-side
  }

  try {
    // Get PDF.js version
    const version = pdfjsLib.version;
    console.log(`Initializing PDF.js worker (version: ${version})`);

    // Try multiple possible worker locations in order of preference
    const possibleWorkerSources = [
      // Local worker from public directory (most reliable)
      '/pdf.worker.min.js',
      // CDN with specific version
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
      // Fallback to a known working version if specific version fails
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js',
      // Final fallback to unpkg
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`,
    ];

    // Test load the worker from the first available source
    const loadWorker = async () => {
      for (const source of possibleWorkerSources) {
        try {
          // Try to fetch the worker script to see if it's available
          const response = await fetch(source, { method: 'HEAD' });
          if (response.ok) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = source;
            console.log(`PDF.js worker loaded from: ${source}`);
            return true;
          }
        } catch (e) {
          console.warn(`Failed to load PDF.js worker from ${source}:`, e);
        }
      }
      // If all sources fail, use fake worker mode as last resort
      console.warn('All PDF.js worker sources failed, falling back to fake worker mode');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      return false;
    };

    // Start worker loading process
    loadWorker().catch(err => {
      console.error('Fatal error initializing PDF.js worker:', err);
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    });
  } catch (error) {
    console.error('Error in PDF.js worker initialization:', error);
    // Set empty worker source to enable fake worker mode
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
};

/**
 * Extract text from a PDF file
 * @param file PDF file to extract text from
 * @returns Promise resolving to extracted text
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  // Ensure worker is initialized
  initPDFWorker();

  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items
        const pageText = textContent.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ');
          
        fullText += pageText + '\n';
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password protected.');
  }
};

/**
 * Convert a PDF to an image (first page) for OCR processing
 * @param file PDF file to convert
 * @param pageNumber Page number to convert (1-based)
 * @returns A File object with the converted image
 */
export const convertPdfToImage = async (file: File, pageNumber: number = 1): Promise<File | null> => {
  try {
    // Initialize PDF.js worker
    initPDFWorker();
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Ensure page number is valid
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      console.error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`);
      return null;
    }
    
    // Get the page
    const page = await pdf.getPage(pageNumber);
    
    // Set scale to get a reasonably sized image (adjust as needed)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
    
    // Convert canvas to a data URL and then to a Blob
    const dataUrl = canvas.toDataURL('image/png');
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Create a new File object from the Blob
    const fileName = file.name.replace(/\.pdf$/i, '') + '-page' + pageNumber + '.png';
    return new File([blob], fileName, { type: 'image/png' });
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    return null;
  }
};

export default {
  initPDFWorker,
  extractTextFromPDF,
  convertPdfToImage
}; 