import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { useIsMobile } from '@/hooks/use-mobile';

// Initialize PDF.js worker in a safer way
const initPDFWorker = () => {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Use the ES module worker file from the public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
};

interface DocumentUploaderProps {
  onExtractedData: (data: string) => void;
}

const DocumentUploader = ({ onExtractedData }: DocumentUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF.js worker on component mount
  useEffect(() => {
    initPDFWorker();
  }, []);

  const handleFileSelected = (file: File | null) => {
    if (file) {
      setCurrentFile(file);
      setError(null);
      setExtractedText('');
      setProgress(0);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

  const processImage = async () => {
    if (!currentFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    try {
      let text = '';
      
      if (currentFile.type === 'application/pdf') {
        text = await processPdfFile(currentFile, setProgress, toast);
      } else {
        const worker = await createWorker();
        
        try {
          await worker.reinitialize('eng');
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,./-:; ',
          });
          const result = await worker.recognize(currentFile, {}, { text: true });
          text = result.data.text;
        } catch (recognizeErr) {
          console.error('Failed to recognize text from image:', recognizeErr);
          throw new Error('Failed to extract text from the image. Try a clearer image or different format.');
        } finally {
          await worker.terminate();
        }
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the document. Try a clearer or different document.');
      }
      
      setExtractedText(text);
      onExtractedData(text);
      
      toast({
        title: "OCR Completed",
        description: "The document has been successfully processed.",
        variant: "default",
      });
    } catch (err) {
      console.error('OCR Error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error processing document. Please try another file or adjust its quality.';
      
      setError(errorMessage);
      toast({
        title: "OCR Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (!error && progress < 100) setProgress(100); 
    }
  };
  
  const processPdfFile = async (
    file: File, 
    setProgress: (value: number) => void,
    toast: {
      (props: { title?: string; description?: string; variant?: "default" | "destructive" }): void;
    }
  ): Promise<string> => {
    const initialPdfLoadProgress = 20;
    setProgress(5);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      setProgress(initialPdfLoadProgress / 2);
      
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let extractedText = '';
      
      setProgress(initialPdfLoadProgress);

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        extractedText += pageText + '\n\n';
        setProgress(initialPdfLoadProgress + Math.floor((i / numPages) * 10));
      }
      
      if (extractedText.trim().length === 0) {
        toast({
          title: "PDF Processing",
          description: `No text layer found. Attempting OCR on ${numPages} page(s). This may take a moment...`,
          variant: "default",
        });
        
        let ocrTextFromPages = '';
        const ocrPhaseStartProgress = 30;
        const ocrPhaseTotalProgress = 65;
        const progressPerOcrPageTotal = ocrPhaseTotalProgress / numPages;

        const worker = await createWorker();
        
        try {
            await worker.reinitialize('eng');
            await worker.setParameters({
              tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,./-:; ',
            });

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
              const baseProgressForPage = ocrPhaseStartProgress + (pageNum - 1) * progressPerOcrPageTotal;
              setProgress(baseProgressForPage);
          
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
                console.warn(`Could not create canvas context for page ${pageNum}`);
                continue; 
          }
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
              await page.render({ canvasContext: context, viewport: viewport }).promise;
              setProgress(baseProgressForPage + progressPerOcrPageTotal * 0.2);

          const dataUrl = canvas.toDataURL('image/png');
          
              const result = await worker.recognize(dataUrl);
              ocrTextFromPages += result.data.text + '\n\n';
              setProgress(baseProgressForPage + progressPerOcrPageTotal);
            }
            extractedText = ocrTextFromPages;
            if (extractedText.trim().length > 0) {
            toast({
              title: "OCR Completed",
                    description: "Successfully extracted text from PDF using OCR.",
              variant: "default",
            });
          } else {
                throw new Error("OCR could not extract any text from the PDF pages.");
            }
        } finally {
            await worker.terminate();
        }
      }
      
      setProgress(95);
      
      if (extractedText.trim().length === 0) {
        toast({
          title: "PDF Processing Issue",
          description: "No text could be extracted from this PDF, even after OCR attempt.",
          variant: "default",
        });
        return ""; 
      }
      
      setProgress(100);
      return extractedText;
    } catch (error) {
      console.error('PDF processing error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process PDF.";
      toast({
        title: "PDF Processing Error",
        description: `Failed to process the PDF document. ${errorMessage}`,
        variant: "destructive",
      });
      throw new Error(`Error processing PDF: ${errorMessage}`);
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
        <>
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Drag & drop a document or click to select</p>
            <p className="text-sm text-muted-foreground">
              Supports JPEG, PNG, TIFF, and PDF files
            </p>
          </div>
        </div>
          {isMobile && (
            <>
              <div className="my-4 flex items-center">
                <span className="flex-grow border-t"></span>
                <span className="mx-2 text-xs uppercase text-muted-foreground">Or</span>
                <span className="flex-grow border-t"></span>
              </div>
              <Button variant="outline" className="w-full" onClick={triggerCameraInput}>
                <Camera className="mr-2 h-4 w-4" />
                Scan with Camera
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleCameraCapture}
                style={{ display: 'none' }}
              />
            </>
          )}
        </>
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
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {previewUrl && currentFile.type !== 'application/pdf' && (
              <div className="mt-3 overflow-hidden rounded-md border">
                <img 
                  src={previewUrl} 
                  alt="Document preview" 
                  className="max-h-[200px] w-full object-contain" 
                />
              </div>
            )}
            
            {previewUrl && currentFile.type === 'application/pdf' && (
              <div className="mt-3 p-3 border rounded-md text-center">
                <FileText className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">PDF file preview not available</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {currentFile.type === 'application/pdf' 
                    ? 'Processing PDF document...' 
                    : 'Processing image...'}
                </p>
                <Progress value={progress} />
              </div>
            )}
            
            {error && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-md flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            
            {extractedText && !isProcessing && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <p className="font-medium">Text Extracted Successfully</p>
                </div>
                <div className="max-h-[150px] overflow-y-auto text-sm">
                  <pre className="whitespace-pre-wrap break-words">{extractedText.substring(0, 300)}...</pre>
                </div>
              </div>
            )}
            
            {!isProcessing && !extractedText && (
              <Button 
                onClick={processImage} 
                className="w-full mt-3"
                disabled={isProcessing}
              >
                Process Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUploader; 