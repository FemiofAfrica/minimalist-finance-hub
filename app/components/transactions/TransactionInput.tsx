import { useState } from 'react';
import { Form, useFetcher } from '@remix-run/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ChatInput from '@/components/ChatInput';
import VoiceInput from '@/components/VoiceInput';
import AddTransactionDialog from '@/components/AddTransactionDialog';

interface TransactionInputProps {
  onTransactionAdded?: () => void;
}

const TransactionInput: React.FC<TransactionInputProps> = ({ onTransactionAdded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fetcher = useFetcher();
  const { toast } = useToast();

  const handleTransactionSuccess = () => {
    toast({
      title: 'Success',
      description: 'Transaction added successfully!',
    });
    if (onTransactionAdded) {
      onTransactionAdded();
    }
  };

  const handleTransactionError = (error: string) => {
    toast({
      title: 'Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handleTextInput = async (text: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('intent', 'createTransaction');
    formData.append('text', text);

    fetcher.submit(formData, {
      method: 'post',
      action: '/transactions',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <ChatInput onTransactionAdded={handleTransactionSuccess} />
        <VoiceInput
          onTextCaptured={handleTextInput}
          disabled={isProcessing}
          onProvisionalTextUpdate={(text) => {
            // Handle provisional text updates if needed
          }}
        />
        <AddTransactionDialog />
      </div>
    </div>
  );
};

export default TransactionInput;