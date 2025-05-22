import { AnalyzeOperationOutput } from "@azure-rest/ai-document-intelligence";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Try multiple methods to process the document, in order of preference
    let result = null;
    let lastError = null;
    
    // Method 1: Try the Vercel API route
    try {
      console.log("Attempting to use Vercel API route");
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Source }),
      });
      
      if (response.ok) {
        result = await response.json();
        console.log("Successfully used Vercel API route");
      } else {
        const errorText = await response.text();
        console.warn(`Vercel API route failed (${response.status}):`, errorText);
        lastError = new Error(errorText || 'Error using Vercel API route');
      }
    } catch (error) {
      console.warn("Error using Vercel API route:", error);
      lastError = error;
    }
    
    // Method 2: Try direct Supabase call if Vercel API failed
    if (!result) {
      progressCallback?.(30);
      try {
        console.log("Falling back to direct Supabase call");
        const { data, error } = await supabase.functions.invoke('analyze-document', {
          body: { base64Source }
        });
        
        if (error) {
          console.warn("Supabase function error:", error);
          lastError = error;
        } else {
          result = data;
          console.log("Successfully used Supabase function");
        }
      } catch (error) {
        console.warn("Error using Supabase function:", error);
        lastError = error;
      }
    }
    
    // If both methods failed, throw the last error
    if (!result) {
      throw lastError || new Error('All document processing methods failed');
    }
    
    progressCallback?.(90);
    
    if (!result.text) {
      throw new Error('No text could be extracted from the document');
    }
    
    progressCallback?.(100);
    return result.text;
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