import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, FileUp, Plus } from "lucide-react";
import ChatInput from "@/components/ChatInput";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import OCRTransactionDialog from "@/components/transactions/OCRTransactionDialog";

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
}

const AddTransactionModal = ({ open, onOpenChange, onTransactionAdded }: AddTransactionModalProps) => {
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [addManuallyDialogOpen, setAddManuallyDialogOpen] = useState(false);

  const handleTransactionAdded = () => {
    if (onTransactionAdded) {
      onTransactionAdded();
    }
    // Close the main modal
    onOpenChange(false);
  };

  const openChatDialog = () => {
    onOpenChange(false); // Close main modal
    setChatDialogOpen(true);
  };

  const openOcrDialog = () => {
    onOpenChange(false); // Close main modal
    setOcrDialogOpen(true);
  };

  const openManualDialog = () => {
    onOpenChange(false); // Close main modal
    setAddManuallyDialogOpen(true);
  };

  return (
    <>
      {/* Main Add Transaction Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button 
              onClick={openChatDialog}
              className="flex flex-col items-center justify-center gap-3 p-6 h-auto"
              variant="outline"
              size="lg"
            >
              <Mic className="h-6 w-6 text-blue-500" />
              <div className="text-center">
                <div className="font-semibold text-base">Chat/Speak</div>
                <div className="text-sm text-muted-foreground">Use voice or natural language</div>
              </div>
            </Button>
            
            <Button 
              onClick={openOcrDialog}
              className="flex flex-col items-center justify-center gap-3 p-6 h-auto"
              variant="outline"
              size="lg"
            >
              <FileUp className="h-6 w-6 text-green-500" />
              <div className="text-center">
                <div className="font-semibold text-base">Scan Document</div>
                <div className="text-sm text-muted-foreground">Upload receipt or invoice</div>
              </div>
            </Button>
            
            <Button 
              onClick={openManualDialog}
              className="flex flex-col items-center justify-center gap-3 p-6 h-auto"
              variant="outline"
              size="lg"
            >
              <Plus className="h-6 w-6 text-amber-500" />
              <div className="text-center">
                <div className="font-semibold text-base">Add Manually</div>
                <div className="text-sm text-muted-foreground">Enter transaction details</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat/Speak Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction Using Chat/Speak</DialogTitle>
          </DialogHeader>
          <ChatInput onTransactionAdded={() => {
            handleTransactionAdded();
            setChatDialogOpen(false);
          }} />
        </DialogContent>
      </Dialog>
      
      {/* Scan Document Dialog */}
      <OCRTransactionDialog 
        open={ocrDialogOpen}
        setOpen={setOcrDialogOpen}
        onTransactionCreated={handleTransactionAdded}
      />
      
      {/* Add Manually Dialog */}
      <AddTransactionDialog 
        open={addManuallyDialogOpen}
        setOpen={setAddManuallyDialogOpen}
        onTransactionAdded={handleTransactionAdded}
      />
    </>
  );
};

export default AddTransactionModal; 