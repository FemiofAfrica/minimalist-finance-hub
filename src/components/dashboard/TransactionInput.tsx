import { useState } from "react";
import { Card } from "@/components/ui/card";
import ChatInput from "@/components/ChatInput";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { Button } from "@/components/ui/button";
import { Mic, FileUp, Plus } from "lucide-react";
import OCRTransactionDialog from "@/components/transactions/OCRTransactionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TransactionInputProps {
  onTransactionAdded: () => void;
}

const TransactionInput = ({ onTransactionAdded }: TransactionInputProps) => {
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [addManuallyDialogOpen, setAddManuallyDialogOpen] = useState(false);

  return (
    <Card className="p-6 mb-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            onClick={() => setChatDialogOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 h-auto"
            variant="outline"
          >
            <Mic className="h-5 w-5 mb-1 text-blue-500" />
            <div className="text-center">
              <div className="font-medium">Chat/Speak</div>
              <div className="text-sm text-muted-foreground">Use voice or chat</div>
            </div>
          </Button>
          
          <Button 
            onClick={() => setOcrDialogOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 h-auto"
            variant="outline"
          >
            <FileUp className="h-5 w-5 mb-1 text-green-500" />
            <div className="text-center">
              <div className="font-medium">Scan a document</div>
              <div className="text-sm text-muted-foreground">Upload receipt or invoice</div>
            </div>
          </Button>
          
          <Button 
            onClick={() => setAddManuallyDialogOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 h-auto"
            variant="outline"
          >
            <Plus className="h-5 w-5 mb-1 text-amber-500" />
            <div className="text-center">
              <div className="font-medium">Add manually</div>
              <div className="text-sm text-muted-foreground">Enter transaction details</div>
            </div>
          </Button>
        </div>
      </div>
      
      {/* Chat/Speak Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction Using Chat/Speak</DialogTitle>
          </DialogHeader>
          <ChatInput onTransactionAdded={() => {
            onTransactionAdded();
            setChatDialogOpen(false);
          }} />
        </DialogContent>
      </Dialog>
      
      {/* Scan Document Dialog */}
      <OCRTransactionDialog 
        open={ocrDialogOpen}
        setOpen={setOcrDialogOpen}
        onTransactionCreated={() => {
          onTransactionAdded();
        }}
      />
      
      {/* Add Manually Dialog */}
      <AddTransactionDialog 
        open={addManuallyDialogOpen}
        setOpen={setAddManuallyDialogOpen}
        onTransactionAdded={() => {
          onTransactionAdded();
        }}
      />
    </Card>
  );
};

export default TransactionInput;