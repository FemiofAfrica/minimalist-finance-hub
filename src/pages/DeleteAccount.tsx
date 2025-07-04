import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  requestAccountDeletion,
  getUserDataSummary,
  getAccountDeletionRequests,
  getDataTypesToDelete,
  getDataRetentionInfo,
  type UserDataSummary,
  type AccountDeletionRequest
} from '@/services/accountDeletionService';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Trash2, 
  Info, 
  Clock, 
  CheckCircle, 
  XCircle,
  Shield,
  Database,
  FileText,
  User,
  Settings2,
  ArrowLeft
} from 'lucide-react';
import PartialDeletion from '@/components/PartialDeletion';

const DeleteAccount: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [hasAccepted, setHasAccepted] = useState(false);
  const [dataSummary, setDataSummary] = useState<UserDataSummary | null>(null);
  const [existingRequests, setExistingRequests] = useState<AccountDeletionRequest[]>([]);
  const [deletionType, setDeletionType] = useState<'full' | 'partial' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [summary, requests] = await Promise.all([
        getUserDataSummary(),
        getAccountDeletionRequests()
      ]);
      
      setDataSummary(summary);
      setExistingRequests(requests);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load account information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!hasAccepted) {
      toast({
        title: 'Confirmation Required',
        description: 'You must accept the terms before proceeding',
        variant: 'destructive'
      });
      return;
    }

    if (confirmText.toLowerCase() !== 'delete my account') {
      toast({
        title: 'Confirmation Failed',
        description: 'Please type "DELETE MY ACCOUNT" to confirm',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await requestAccountDeletion(reason);
      
      if (response.success) {
        toast({
          title: 'Request Submitted',
          description: response.message || 'Your account deletion request has been submitted',
        });
        
        // Refresh data to show the new request
        await loadData();
        
        // Hide form
        setShowForm(false);
        
        // Reset form
        setReason('');
        setConfirmText('');
        setHasAccepted(false);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to submit deletion request',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deletion request',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dataTypesToDelete = getDataTypesToDelete();
  const retentionInfo = getDataRetentionInfo();
  
  const hasPendingRequest = existingRequests.some(req => 
    req.status === 'pending' || req.status === 'processing'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !dataSummary) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading account information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {deletionType === 'partial' ? 'Partial Data Deletion' : 'Account & Data Management'}
          </h1>
          <p className="text-gray-600">
            {deletionType === 'partial' 
              ? 'Choose specific data to delete while keeping your account active'
              : 'Choose how you want to manage your account and data'
            }
          </p>
        </div>

        {/* Back Button */}
        {deletionType && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => setDeletionType(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Options
            </Button>
          </div>
        )}

        {/* Back to settings */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>
        </div>

        {/* Deletion Type Selection */}
        {!deletionType && (
          <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="w-4 h-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                <strong>Choose Your Option:</strong> You can delete your entire account or just specific types of data.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Account Deletion */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-red-200">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Complete Account Deletion</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Delete your entire account and all associated data permanently. This cannot be undone.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Badge className="bg-red-100 text-red-800">Permanent</Badge>
                    </div>
                    <Button
                      onClick={() => setDeletionType('full')}
                      variant="destructive"
                      className="w-full"
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Partial Data Deletion */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-200">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                      <Settings2 className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Partial Data Deletion</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Delete only specific types of data while keeping your account active. Choose what to remove.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Badge className="bg-orange-100 text-orange-800">Selective</Badge>
                    </div>
                    <Button
                      onClick={() => setDeletionType('partial')}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      Select Data to Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Understanding Your Options
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Complete Account Deletion</h4>
                    <p className="text-sm text-gray-600">
                      This permanently deletes your entire account, including all financial data, transactions, 
                      settings, and removes your access to KPEGE. You would need to create a new account to use the service again.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Partial Data Deletion</h4>
                    <p className="text-sm text-gray-600">
                      This allows you to delete specific types of data (like transaction history, categories, or notifications) 
                      while keeping your account active. You can continue using KPEGE with the remaining data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Partial Deletion Component */}
        {deletionType === 'partial' && (
          <PartialDeletion
            onComplete={() => {
              toast({
                title: 'Request Submitted',
                description: 'Your partial deletion request has been submitted.',
              });
            }}
            onCancel={() => setDeletionType(null)}
          />
        )}

        {/* Full Account Deletion Content */}
        {deletionType === 'full' && (
          <>
            {/* Warning Alert */}
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
                All your financial data, transactions, and settings will be permanently deleted.
              </AlertDescription>
            </Alert>

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Deletion Request History
              </CardTitle>
              <CardDescription>
                Your previous account deletion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {existingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="font-medium">
                          Request submitted on {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-600">Reason: {request.reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Summary */}
        {dataSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Your Data Summary
              </CardTitle>
              <CardDescription>
                Overview of data that will be deleted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{dataSummary.accounts}</div>
                  <div className="text-sm text-gray-600">Accounts</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{dataSummary.transactions}</div>
                  <div className="text-sm text-gray-600">Transactions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{dataSummary.categories}</div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{dataSummary.total_records}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Data Types to be Deleted
            </CardTitle>
            <CardDescription>
              The following types of data will be permanently deleted from your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dataTypesToDelete.map((dataType, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{dataType}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Retention Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Data Retention Policy
            </CardTitle>
            <CardDescription>
              What happens to your data after deletion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Immediately Deleted:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {retentionInfo.immediatelyDeleted.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-700 mb-2">Anonymized:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {retentionInfo.anonymized.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Retention Period:</strong> {retentionInfo.retentionPeriod}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Request Account Deletion
            </CardTitle>
            <CardDescription>
              Submit a request to permanently delete your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPendingRequest ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="w-4 h-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">
                  You already have a pending deletion request. Please wait for it to be processed.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {!showForm ? (
                  <Button 
                    onClick={() => setShowForm(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reason for deletion (optional)
                      </label>
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please let us know why you're deleting your account..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Confirmation
                      </label>
                      <Input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type 'DELETE MY ACCOUNT' to confirm"
                        className="font-mono"
                      />
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="accept-terms"
                        checked={hasAccepted}
                        onCheckedChange={setHasAccepted}
                      />
                      <label
                        htmlFor="accept-terms"
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        I understand that this action is permanent and cannot be undone. 
                        I confirm that I want to delete my account and all associated data.
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitRequest}
                        disabled={
                          isLoading || 
                          !hasAccepted || 
                          confirmText.toLowerCase() !== 'delete my account'
                        }
                        variant="destructive"
                        className="flex-1"
                      >
                        {isLoading ? 'Submitting...' : 'Submit Deletion Request'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowForm(false);
                          setReason('');
                          setConfirmText('');
                          setHasAccepted(false);
                        }}
                        variant="outline"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Alternative options before deleting your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Before deleting your account, consider these alternatives:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li>Export your data from the Settings page</li>
                    <li>Contact support if you're having technical issues</li>
                    <li>Take a break by logging out instead of deleting</li>
                    <li>Try partial data deletion to remove only unwanted data</li>
                  </ul>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      Questions? Contact us at{' '}
                      <a href="mailto:privacy@kpege.com" className="text-blue-600 hover:underline">
                        privacy@kpege.com
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeleteAccount; 