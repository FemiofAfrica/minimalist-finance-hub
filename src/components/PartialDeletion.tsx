import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  accountDeletionService, 
  AvailableDataTypes, 
  DataTypeInfo, 
  PartialDataSummary,
  PartialDeletionRequest 
} from '@/services/accountDeletionService';

interface PartialDeletionProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const PartialDeletion: React.FC<PartialDeletionProps> = ({ onComplete, onCancel }) => {
  const [categorizedDataTypes, setCategorizedDataTypes] = useState<{
    low: AvailableDataTypes;
    medium: AvailableDataTypes;
    high: AvailableDataTypes;
  } | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [dataSummary, setDataSummary] = useState<PartialDataSummary | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [partialDeletionRequests, setPartialDeletionRequests] = useState<PartialDeletionRequest[]>([]);
  const [step, setStep] = useState<'selection' | 'confirmation' | 'status'>('selection');
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDataTypes.length > 0) {
      loadDataSummary();
    } else {
      setDataSummary(null);
    }
  }, [selectedDataTypes]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [categorized, requests] = await Promise.all([
        accountDeletionService.getCategorizedDataTypes(),
        accountDeletionService.getPartialDeletionRequests(),
      ]);
      
      setCategorizedDataTypes(categorized);
      setPartialDeletionRequests(requests);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data types. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataSummary = async () => {
    try {
      const summary = await accountDeletionService.getPartialDataSummary(selectedDataTypes);
      setDataSummary(summary);
    } catch (error) {
      console.error('Error loading data summary:', error);
    }
  };

  const handleDataTypeToggle = (dataType: string) => {
    setSelectedDataTypes(prev =>
      prev.includes(dataType)
        ? prev.filter(type => type !== dataType)
        : [...prev, dataType]
    );
  };

  const handleSubmit = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: 'No Data Selected',
        description: 'Please select at least one data type to delete.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await accountDeletionService.requestPartialDeletion(
        selectedDataTypes,
        reason || undefined
      );

      if (response.success) {
        toast({
          title: 'Request Submitted',
          description: 'Your partial deletion request has been submitted successfully.',
        });
        setStep('status');
        await loadInitialData(); // Refresh the requests
        onComplete?.();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to submit partial deletion request.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting partial deletion request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit partial deletion request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await accountDeletionService.cancelPartialDeletionRequest(requestId);
      toast({
        title: 'Request Cancelled',
        description: 'Your partial deletion request has been cancelled.',
      });
      await loadInitialData(); // Refresh the requests
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel the request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
    }
  };

  const getImpactIcon = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low':
        return <Info className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const renderDataTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Select Data to Delete</h2>
        <p className="text-gray-600">
          Choose specific types of data you want to delete while keeping your account active.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Partial Deletion:</strong> This will delete only the selected data types while keeping your account active. 
          This is permanent and cannot be undone.
        </AlertDescription>
      </Alert>

      {categorizedDataTypes && Object.entries(categorizedDataTypes).map(([impactLevel, dataTypes]) => (
        <Card key={impactLevel} className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg capitalize">{impactLevel} Impact Data</CardTitle>
              <Badge className={`${getImpactColor(impactLevel as 'low' | 'medium' | 'high')} flex items-center gap-1`}>
                {getImpactIcon(impactLevel as 'low' | 'medium' | 'high')}
                {impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dataTypes).map(([key, info]: [string, DataTypeInfo]) => (
                <div key={key} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id={key}
                    checked={selectedDataTypes.includes(key)}
                    onCheckedChange={() => handleDataTypeToggle(key)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {info.name}
                    </Label>
                    <p className="text-xs text-gray-600">{info.description}</p>
                    <p className="text-xs text-orange-600 font-medium">{info.warning}</p>
                    {dataSummary && dataSummary.data_types[key] !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {dataSummary.data_types[key]} record{dataSummary.data_types[key] !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedDataTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected data types:</p>
              <div className="flex flex-wrap gap-2">
                {selectedDataTypes.map(type => (
                  <Badge key={type} variant="secondary">
                    {categorizedDataTypes && Object.values(categorizedDataTypes).find(category => 
                      Object.keys(category).includes(type)
                    )?.[type]?.name || type}
                  </Badge>
                ))}
              </div>
              {dataSummary && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Records to be deleted:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(dataSummary.data_types).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reason (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Please let us know why you want to delete this data (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={selectedDataTypes.length === 0 || isSubmitting}
          className="bg-red-600 hover:bg-red-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Partial Deletion Request'
          )}
        </Button>
      </div>
    </div>
  );

  const renderPartialDeletionRequests = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Your Partial Deletion Requests</h3>
        <p className="text-gray-600">Track the status of your partial deletion requests</p>
      </div>

      {partialDeletionRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No partial deletion requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {partialDeletionRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(request.status)}
                      <span className="font-medium capitalize">{request.status}</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <strong>Data Types:</strong> {request.data_types.join(', ')}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      {request.deletion_summary && (
                        <div className="text-sm text-gray-600">
                          <strong>Deletion Summary:</strong>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                            {Object.entries(request.deletion_summary).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelRequest(request.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'selection' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'selection' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Select Data</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'status' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'status' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Track Status</span>
            </div>
          </div>
        </div>
      </div>

      {step === 'selection' && renderDataTypeSelection()}
      {step === 'status' && renderPartialDeletionRequests()}

      <div className="mt-6 flex justify-center">
        <div className="flex space-x-2">
          <Button
            variant={step === 'selection' ? 'default' : 'outline'}
            onClick={() => setStep('selection')}
          >
            Select Data
          </Button>
          <Button
            variant={step === 'status' ? 'default' : 'outline'}
            onClick={() => setStep('status')}
          >
            Track Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartialDeletion; 