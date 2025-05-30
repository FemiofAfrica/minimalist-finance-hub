import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

/**
 * Initialize PDF.js worker with robust fallback handling
 */
export const initPDFWorker = () => {
  const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  
  console.log(`Initialized PDF.js ${pdfjsLib.version} with matching worker version`);
};

/**
 * Extract text from a PDF file
 * @param file PDF file to extract text from
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract and concatenate text from the page
      const pageText = textContent.items
        .map((item: TextItem) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    console.log(`Successfully extracted text from PDF with ${pdf.numPages} pages`);
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password protected.');
  }
}

/**
 * Convert a PDF to an image (first page) for OCR processing
 * @param file PDF file to convert
 * @param pageNumber Page number to convert (1-based)
 * @returns A File object with the converted image
 */
export async function convertPdfToImage(file: File, pageNum = 1): Promise<File | null> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Get the requested page
    if (pageNum > pdf.numPages) {
      pageNum = 1;
    }
    const page = await pdf.getPage(pageNum);
    
    // Set scale for reasonable resolution (72dpi)
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context could not be created');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to file
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF to image'));
          return;
        }
        
        const file = new File([blob], 'pdf-image.png', {
          type: 'image/png'
        });
        
        resolve(file);
      }, 'image/png');
    });
    
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    return null;
  }
}

export default {
  initPDFWorker,
  extractTextFromPDF,
  convertPdfToImage
}; 