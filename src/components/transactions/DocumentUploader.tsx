import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, CheckCircle, AlertCircle, Camera, Zap, Settings2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { analyzeDocument } from '@/utils/documentIntelligence';
import { MAX_FILE_SIZE } from '@/utils/imageCompression';
import { initPDFWorker } from '@/utils/pdfUtils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface DocumentUploaderProps {
  onExtractedData: (data: string) => void;
}

const DocumentUploader = ({ onExtractedData }: DocumentUploaderProps) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [useDirectOcr, setUseDirectOcr] = useState(() => 
    typeof localStorage !== 'undefined' && localStorage.getItem('useDirectOcr') === 'true'
  );
  const [advancedSettings, setAdvancedSettings] = useState({
    maxPdfPages: 5,
  });

  // Initialize PDF.js worker
  useEffect(() => {
    initPDFWorker();
  }, []);

  // Save the direct OCR preference to localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('useDirectOcr', useDirectOcr ? 'true' : 'false');
    }
  }, [useDirectOcr]);

  const handleFileSelected = (file: File | null) => {
    if (file) {
      setCurrentFile(file);
      
      // Display file size warning if the file is large but we'll try to handle it
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Large file detected",
          description: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds recommended limit. Attempting to compress automatically.`,
          variant: "warning",
        });
      }
      
      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      } else if (file.type === 'application/pdf') {
        setPreviewUrl(URL.createObjectURL(file));
      }
      
      // Auto-process the file
      setTimeout(() => {
        processImage();
      }, 500);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileSelected(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/tiff': [],
      'application/pdf': []
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileSelected(event.target.files[0]);
      event.target.value = '';
    }
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const processImage = async (retryCount = 0) => {
    if (!currentFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    try {
      // Use direct OCR.space if setting is enabled or retrying after a failure
      const skipAzure = useDirectOcr || retryCount > 0;
      
      // Use Azure Document Intelligence for all file types
      const text = await analyzeDocument(currentFile, setProgress, { 
        skipAzure,
        maxPdfPages: advancedSettings.maxPdfPages
      });
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the document. Try a clearer or different document.');
      }
      
      setExtractedText(text);
      onExtractedData(text);
      
      toast({
        title: "Document Processed",
        description: "AI has successfully analyzed your receipt.",
        variant: "default",
      });
    } catch (err) {
      console.error('Document Intelligence Error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error processing document. Please try another file or adjust its quality.';
      
      // If the error is a timeout or connection error and we haven't retried too many times
      if ((errorMessage.includes('timed out') || 
           errorMessage.includes('connection') || 
           errorMessage.includes('CORS') || 
           errorMessage.includes('fetch')) && retryCount < 2) {
        
        toast({
          title: "Processing Failed",
          description: retryCount === 0 
            ? "First attempt failed. Retrying with direct OCR processing..." 
            : "Retrying document processing...",
          variant: "default",
        });
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return processImage(retryCount + 1);
      }
      
      setError(errorMessage);
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (!error && progress < 100) setProgress(100); 
    }
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCurrentFile(null);
    setPreviewUrl(null);
    setExtractedText('');
    setError(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {!currentFile ? (
        <div className="space-y-4">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">Drag & drop a receipt or click to select</p>
              <p className="text-sm text-muted-foreground">
                Supports JPEG, PNG, TIFF, and PDF files
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                <p>For best results:</p>
                <ul className="list-disc list-inside text-left">
                  <li>Use PDFs with embedded text (not scanned)</li>
                  <li>Images should be clear and well-lit</li>
                  <li>File size under {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {isMobile && (
              <Button variant="outline" className="flex-1" onClick={triggerCameraInput}>
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
            )}
            
            <Button 
              variant={useDirectOcr ? "default" : "outline"} 
              size="sm"
              className={`${isMobile ? 'flex-1' : ''}`}
              onClick={() => setUseDirectOcr(!useDirectOcr)}
              title={useDirectOcr ? "Using direct OCR (faster)" : "Using Azure OCR (more accurate)"}
            >
              <Zap className={`mr-2 h-4 w-4 ${useDirectOcr ? 'text-yellow-300' : ''}`} />
              {useDirectOcr ? "Fast Mode: ON" : "Fast Mode: OFF"}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAdvancedSettings({...advancedSettings, maxPdfPages: 3})}>
                  Process first 3 PDF pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdvancedSettings({...advancedSettings, maxPdfPages: 5})}>
                  Process first 5 PDF pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdvancedSettings({...advancedSettings, maxPdfPages: 10})}>
                  Process first 10 PDF pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdvancedSettings({...advancedSettings, maxPdfPages: 20})}>
                  Process first 20 PDF pages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleCameraCapture}
              style={{ display: 'none' }}
            />
          </div>
          
          {isMobile && (
            <div className="my-2 flex items-center">
              <span className="flex-grow border-t"></span>
              <span className="mx-2 text-xs uppercase text-muted-foreground">Or</span>
              <span className="flex-grow border-t"></span>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium truncate max-w-[200px]">{currentFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(currentFile.size / 1024).toFixed(1)} KB {currentFile.type === 'application/pdf' && "(PDF)"}
                    {currentFile.size > MAX_FILE_SIZE && " (will be compressed)"}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearFile}
                disabled={isProcessing}
                title="Remove file and try another"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {previewUrl && currentFile.type !== 'application/pdf' && (
              <div className="mt-3 overflow-hidden rounded-md border">
                <img 
                  src={previewUrl} 
                  alt="Receipt preview" 
                  className="max-h-[200px] w-full object-contain" 
                />
              </div>
            )}
            
            {previewUrl && currentFile.type === 'application/pdf' && (
              <div className="mt-3 p-3 border rounded-md text-center">
                <FileText className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">PDF receipt (preview not available)</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">
                  Processing with AI...
                </p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progress < 30 && "Initializing..."}
                  {progress >= 30 && progress < 60 && "Analyzing document..."}
                  {progress >= 60 && progress < 90 && "Extracting text..."}
                  {progress >= 90 && "Finalizing results..."}
                </p>
              </div>
            )}
            
            {error && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-md flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Processing Failed</p>
                  <p className="text-xs text-destructive/80">{error}</p>
                  {error.includes('PDF') && (
                    <p className="text-xs mt-1">
                      Tip: For PDFs, try a document with text that can be selected, not a scanned image.
                    </p>
                  )}
                  {error.includes('timed out') && (
                    <p className="text-xs mt-1">
                      Tip: Try a smaller or clearer image, or convert your PDF to text format.
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearFile}
                    >
                      Try Another File
                    </Button>
                    
                    {(currentFile?.type === 'application/pdf' || currentFile?.name?.toLowerCase().endsWith('.pdf')) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setAdvancedSettings({...advancedSettings, maxPdfPages: 3});
                          setUseDirectOcr(true);
                          processImage(1);
                        }}
                      >
                        Try Fast Mode (3 pages)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {extractedText && !isProcessing && !error && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-600">Receipt Processed Successfully</p>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Extracted {extractedText.split('\n').length} lines of text
                </p>
                <div className="max-h-[150px] overflow-y-auto text-sm bg-white/50 p-2 rounded border">
                  <pre className="whitespace-pre-wrap break-words text-xs">{extractedText.substring(0, 200)}{extractedText.length > 200 ? '...' : ''}</pre>
                </div>
              </div>
            )}
            
            {!isProcessing && !extractedText && !error && (
              <Button 
                onClick={processImage} 
                className="w-full mt-3"
                disabled={isProcessing}
              >
                Process Receipt
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUploader; 