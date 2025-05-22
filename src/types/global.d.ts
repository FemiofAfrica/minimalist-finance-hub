// Global type definitions

// Define window.ENV for client-side environment variables
interface Window {
  ENV?: {
    [key: string]: string | undefined;
  };
}

// Extend ProcessEnv interface with our custom environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    // Azure Document Intelligence (removed NEXT_PUBLIC_ prefix)
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?: string;
    AZURE_DOCUMENT_INTELLIGENCE_KEY?: string;
    
    // Other environment variables (keep as-is)
    // ... existing variables ...
  }
} 