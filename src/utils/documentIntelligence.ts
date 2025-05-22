import { AnalyzeOperationOutput } from "@azure-rest/ai-document-intelligence";

/**
 * Analyze a document using Azure Document Intelligence
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
    
    // Create base64 representation of the file
    const base64Source = await fileToBase64(file);
    
    progressCallback?.(20);
    
    // Use our Vercel API proxy instead of direct Supabase calls
    // This avoids CORS issues
    const response = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Source }),
    });
    
    progressCallback?.(50);
    
    if (!response.ok) {
      let errorMessage = 'Error analyzing document';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    progressCallback?.(90);
    
    if (!data || !data.text) {
      throw new Error('No text could be extracted from the document');
    }
    
    progressCallback?.(100);
    return data.text;
  } catch (error) {
    console.error("Document processing error:", error);
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