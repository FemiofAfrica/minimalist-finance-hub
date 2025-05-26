import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { extractStructuredData, ReceiptData } from '@/utils/structuredOcr';
import { MAX_FILE_SIZE } from '@/utils/imageCompression';

interface StructuredReceiptUploaderProps {
  onDataExtracted: (data: ReceiptData) => void;
}

const StructuredReceiptUploader = ({ onDataExtracted }: StructuredReceiptUploaderProps) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      }
      
      // Auto-process the file
      setTimeout(() => {
        processReceipt();
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

  const processReceipt = async () => {
    if (!currentFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    // Add a global timeout for the entire process
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Processing timed out after 2 minutes. Please try a clearer or simpler receipt."));
      }, 120000); // 2-minute timeout
    });
    
    try {
      // Use structured OCR to extract data with a timeout
      const extractionPromise = extractStructuredData(currentFile, setProgress);
      const data = await Promise.race([extractionPromise, timeoutPromise]) as ReceiptData;
      
      setExtractedData(data);
      onDataExtracted(data);
      
      toast({
        title: "Receipt Processed",
        description: "AI has successfully analyzed your receipt into structured data.",
        variant: "default",
      });
    } catch (err) {
      console.error('Structured OCR Error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error processing receipt. Please try another file or adjust its quality.';
      
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
    setExtractedData(null);
    setError(null);
    setProgress(0);
  };

  // Format currency value
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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
                Supports JPEG, PNG, and TIFF files
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum recommended size: {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB (larger files will be compressed)
              </p>
            </div>
          </div>
          
          {isMobile && (
            <>
              <div className="my-2 flex items-center">
                <span className="flex-grow border-t"></span>
                <span className="mx-2 text-xs uppercase text-muted-foreground">Or</span>
                <span className="flex-grow border-t"></span>
              </div>
              <Button variant="outline" className="w-full" onClick={triggerCameraInput}>
                <Camera className="mr-2 h-4 w-4" />
                Take Photo of Receipt
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
                    {(currentFile.size / 1024).toFixed(1)} KB
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
            
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-md border">
                <img 
                  src={previewUrl} 
                  alt="Receipt preview" 
                  className="max-h-[200px] w-full object-contain" 
                />
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
                  {progress >= 30 && progress < 50 && "Extracting text..."}
                  {progress >= 50 && progress < 90 && "Structuring data..."}
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
                  <div className="mt-2 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setError(null);
                        processReceipt(); // Try again with the same file
                      }}
                      disabled={isProcessing}
                    >
                      Try Again
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearFile}
                    >
                      Try Another File
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {extractedData && !isProcessing && !error && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-600">Receipt Processed Successfully</p>
                </div>
                
                <div className="space-y-4 mt-3">
                  {/* Receipt summary */}
                  <div className="bg-white/50 p-3 rounded border">
                    <h3 className="font-medium text-sm mb-2">Receipt Summary</h3>
                    <div className="space-y-1 text-sm">
                      {extractedData.businessName && (
                        <p><span className="font-medium">Business:</span> {extractedData.businessName}</p>
                      )}
                      {extractedData.date && (
                        <p><span className="font-medium">Date:</span> {extractedData.date}</p>
                      )}
                      {extractedData.total !== undefined && (
                        <p><span className="font-medium">Total:</span> {formatCurrency(extractedData.total)}</p>
                      )}
                      {extractedData.tax !== undefined && (
                        <p><span className="font-medium">Tax:</span> {formatCurrency(extractedData.tax)}</p>
                      )}
                      {extractedData.paymentMethod && (
                        <p><span className="font-medium">Payment Method:</span> {extractedData.paymentMethod}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Line items if available */}
                  {extractedData.items && extractedData.items.length > 0 && (
                    <div className="bg-white/50 p-3 rounded border">
                      <h3 className="font-medium text-sm mb-2">Line Items</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 font-medium">Item</th>
                              <th className="text-right py-1 font-medium">Qty</th>
                              <th className="text-right py-1 font-medium">Price</th>
                              <th className="text-right py-1 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extractedData.items.map((item, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-1">{item.description}</td>
                                <td className="text-right py-1">{item.quantity || 1}</td>
                                <td className="text-right py-1">{item.unitPrice ? formatCurrency(item.unitPrice) : '-'}</td>
                                <td className="text-right py-1">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    <p>View the complete structured data in the console</p>
                    <pre className="hidden">{JSON.stringify(extractedData, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
            
            {!isProcessing && !extractedData && !error && (
              <Button 
                onClick={processReceipt} 
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

export default StructuredReceiptUploader; 