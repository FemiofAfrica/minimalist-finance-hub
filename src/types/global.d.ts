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
    NEXT_PUBLIC_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?: string;
    NEXT_PUBLIC_AZURE_DOCUMENT_INTELLIGENCE_KEY?: string;
  }
} 