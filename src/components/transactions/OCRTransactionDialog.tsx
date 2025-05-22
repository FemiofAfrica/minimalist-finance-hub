import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUploader from './DocumentUploader';
import OCRTransactionExtractor from './OCRTransactionExtractor';

interface OCRTransactionDialogProps {
  onTransactionCreated: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const OCRTransactionDialog = ({ onTransactionCreated, open, setOpen }: OCRTransactionDialogProps) => {
  const [ocrText, setOcrText] = useState('');
  const [currentTab, setCurrentTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleExtractedData = (text: string) => {
    setOcrText(text);
    setCurrentTab('extract');
  };
  
  const handleTransactionCreated = () => {
    onTransactionCreated();
    setOpen(false);
    setOcrText('');
    setCurrentTab('upload');
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // If closing dialog, reset state
      if (!newOpen) {
        setOcrText('');
        setCurrentTab('upload');
        setIsProcessing(false);
      }
      setOpen(newOpen);
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan and Process Receipts</DialogTitle>
        </DialogHeader>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              1. Upload Receipt
            </TabsTrigger>
            <TabsTrigger value="extract" disabled={!ocrText}>
              2. Create Transaction
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="pt-4">
            <DocumentUploader 
              onExtractedData={(text) => {
                setIsProcessing(true);
                handleExtractedData(text);
                // Allow processing animation to show briefly
                setTimeout(() => setIsProcessing(false), 500);
              }} 
            />
          </TabsContent>
          
          <TabsContent value="extract" className="pt-4">
            {ocrText && <OCRTransactionExtractor 
              ocrText={ocrText} 
              onTransactionCreated={handleTransactionCreated} 
            />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OCRTransactionDialog; 