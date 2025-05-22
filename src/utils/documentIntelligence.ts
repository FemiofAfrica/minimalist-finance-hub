import DocumentIntelligence, {
  isUnexpected,
  getLongRunningPoller,
  AnalyzeOperationOutput
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";

// Environment variables should be set server-side only
const DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.NEXT_PUBLIC_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const DOCUMENT_INTELLIGENCE_API_KEY = process.env.NEXT_PUBLIC_AZURE_DOCUMENT_INTELLIGENCE_KEY;

/**
 * Creates and returns a Document Intelligence client
 */
export function getDocumentIntelligenceClient() {
  if (!DOCUMENT_INTELLIGENCE_ENDPOINT || !DOCUMENT_INTELLIGENCE_API_KEY) {
    throw new Error("Azure Document Intelligence credentials not configured. Contact your administrator.");
  }

  return DocumentIntelligence(
    DOCUMENT_INTELLIGENCE_ENDPOINT,
    { key: DOCUMENT_INTELLIGENCE_API_KEY }
  );
}

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
    
    const client = getDocumentIntelligenceClient();
    
    // Use the prebuilt-layout model for OCR
    const initialResponse = await client
      .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
      .post({
        contentType: "application/json",
        body: {
          base64Source
        }
      });
    
    progressCallback?.(30);
    
    if (isUnexpected(initialResponse)) {
      throw new Error(initialResponse.body.error?.message || "Unexpected error analyzing document");
    }
    
    const poller = getLongRunningPoller(client, initialResponse);
    
    // Poll for results, updating progress as we go
    let prevProgress = 30;
    const result = await poller.pollUntilDone({
      updatePollingProgress: (progress) => {
        // Scale progress from 30% to 90%
        const scaledProgress = 30 + Math.floor(progress * 60);
        if (scaledProgress > prevProgress) {
          prevProgress = scaledProgress;
          progressCallback?.(scaledProgress);
        }
      }
    }) as { body: AnalyzeOperationOutput };
    
    progressCallback?.(90);
    
    // Extract the text content from all pages
    let extractedText = "";
    
    if (result.body.analyzeResult?.pages) {
      for (const page of result.body.analyzeResult.pages) {
        // Get all lines from this page
        if (page.lines) {
          for (const line of page.lines) {
            extractedText += line.content + "\n";
          }
        }
        
        extractedText += "\n"; // Add an extra line between pages
      }
    }
    
    progressCallback?.(100);
    return extractedText.trim();
  } catch (error) {
    console.error("Azure Document Intelligence error:", error);
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