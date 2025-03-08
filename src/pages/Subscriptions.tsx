import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSubscriptions, deleteSubscription, convertSubscriptionToTransaction, createSubscription, updateSubscription } from '@/services/subscriptionService';
import { Subscription, SubscriptionFrequency } from '@/types/subscription';
import DashboardSidebar from '@/components/DashboardSidebar';
import { formatNaira } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2, Edit, CheckCircle, AlertCircle, CreditCard, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TransactionAutocomplete } from '@/components/ui/transaction-autocomplete';

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Function to adjust billing date to next cycle if it's in the past
  const adjustBillingDateIfNeeded = (billingDate: string, frequency: string): string => {
    const today = new Date();
    const nextBillingDate = new Date(billingDate);
    
    // If the billing date is in the past, calculate the next appropriate billing date
    if (nextBillingDate < today) {
      // Calculate how many cycles we need to add to get to a future date
      while (nextBillingDate < today) {
        switch (frequency) {
          case 'MONTHLY':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
          case 'ANNUALLY':
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            break;
          case 'CUSTOM':
            // For custom frequency, default to monthly
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          default:
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
      }
      return nextBillingDate.toISOString().split('T')[0];
    }
    
    // If the date is already in the future, return it as is
    return billingDate;
  };

  // Function to handle saving a new subscription
  const handleSaveSubscription = async () => {
    try {
      // Validate form data
      if (!formData.name) {
        toast({
          title: "Error",
          description: "Subscription name is required",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.amount <= 0) {
        toast({
          title: "Error",
          description: "Amount must be greater than zero",
          variant: "destructive",
        });
        return;
      }
      
      // Adjust the next billing date if it's in the past
      const adjustedBillingDate = adjustBillingDateIfNeeded(
        formData.next_billing_date,
        formData.frequency
      );
      
      // Create the subscription with adjusted billing date
      const newSubscription = await createSubscription({
        name: formData.name,
        description: formData.description,
        amount: formData.amount,
        frequency: formData.frequency as SubscriptionFrequency,
        next_billing_date: adjustedBillingDate,
        category_name: formData.category_name,
        category_type: formData.category_type,
        is_active: formData.is_active,
        auto_renew: formData.auto_renew,
        reminder_days: formData.reminder_days,
        provider_id: formData.provider_id
      });
      
      // Add the new subscription to the state
      setSubscriptions([...subscriptions, newSubscription]);
      
      // Close the dialog and show success message
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Subscription added successfully",
      });
      
      // Add the new subscription to the state
      setSubscriptions([...subscriptions, newSubscription]);
      
      // Close the dialog and show success message
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Subscription added successfully",
      });
    } catch (err) {
      console.error("Error saving subscription:", err);
      toast({
        title: "Error",
        description: "Failed to save subscription",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle updating an existing subscription
  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      // Validate form data
      if (!formData.name) {
        toast({
          title: "Error",
          description: "Subscription name is required",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.amount <= 0) {
        toast({
          title: "Error",
          description: "Amount must be greater than zero",
          variant: "destructive",
        });
        return;
      }
      
      // Adjust the next billing date if it's in the past
      const adjustedBillingDate = adjustBillingDateIfNeeded(
        formData.next_billing_date,
        formData.frequency
      );
      
      // Update the subscription with adjusted billing date
      const updatedSubscription = await updateSubscription({
        subscription_id: selectedSubscription.subscription_id,
        name: formData.name,
        description: formData.description,
        amount: formData.amount,
        frequency: formData.frequency as SubscriptionFrequency,
        next_billing_date: adjustedBillingDate,
        category_name: formData.category_name,
        category_type: formData.category_type,
        is_active: formData.is_active,
        auto_renew: formData.auto_renew,
        reminder_days: formData.reminder_days,
        provider_id: formData.provider_id
      });
      
      // Update the subscription in the state
      setSubscriptions(subscriptions.map(sub => 
        sub.subscription_id === updatedSubscription.subscription_id ? updatedSubscription : sub
      ));
      
      // Close the dialog and show success message
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Subscription updated successfully",
      });
    } catch (err) {
      console.error("Error updating subscription:", err);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
    }
  };

  // Form state for adding/editing subscriptions
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: 0,
    frequency: 'MONTHLY',
    next_billing_date: new Date().toISOString().split('T')[0],
    category_name: 'Subscriptions',
    category_type: 'EXPENSE',
    is_active: true,
    auto_renew: true,
    reminder_days: 3,
    provider_id: null as string | null
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      setError('Failed to load subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = () => {
    setFormData({
      name: '',
      description: '',
      amount: 0,
      frequency: 'MONTHLY',
      next_billing_date: new Date().toISOString().split('T')[0],
      category_name: 'Subscriptions',
      category_type: 'EXPENSE',
      is_active: true,
      auto_renew: true,
      reminder_days: 3,
      provider_id: null
    });
    setIsAddDialogOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      name: subscription.name,
      description: subscription.description || '',
      amount: subscription.amount,
      frequency: subscription.frequency,
      next_billing_date: subscription.next_billing_date,
      category_name: subscription.category_name || 'Subscriptions',
      category_type: subscription.category_type || 'EXPENSE',
      is_active: subscription.is_active,
      auto_renew: subscription.auto_renew,
      reminder_days: subscription.reminder_days,
      provider_id: subscription.provider_id
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      await deleteSubscription(subscriptionId);
      setSubscriptions(subscriptions.filter(sub => sub.subscription_id !== subscriptionId));
      toast({
        title: 'Subscription deleted',
        description: 'The subscription has been successfully removed.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete subscription.',
        variant: 'destructive',
      });
      console.error(err);
    }
  };

  const handleConfirmPayment = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsConfirmPaymentDialogOpen(true);
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsCancelDialogOpen(true);
  };

  const confirmCancelSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      setError(null); // Clear any previous errors
      
      const updatedSubscription = await updateSubscription({
        subscription_id: selectedSubscription.subscription_id,
        is_active: false
      });
      
      // Update the subscription in the state
      setSubscriptions(subscriptions.map(sub => 
        sub.subscription_id === updatedSubscription.subscription_id ? updatedSubscription : sub
      ));
      
      setIsCancelDialogOpen(false);
      toast({
        title: 'Subscription cancelled',
        description: 'The subscription has been successfully cancelled.',
      });
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription. Please try again.'); // Set error state
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription.',
        variant: 'destructive',
      });
    }
  };

  const processPaymentConfirmation = async () => {
    if (!selectedSubscription) return;
    
    try {
      await convertSubscriptionToTransaction(selectedSubscription.subscription_id);
      toast({
        title: 'Payment confirmed',
        description: 'The subscription payment has been recorded and the next billing date updated.',
      });
      setIsConfirmPaymentDialogOpen(false);
      loadSubscriptions(); // Reload to get updated next_billing_date
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to confirm payment.',
        variant: 'destructive',
      });
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        next_billing_date: date.toISOString().split('T')[0]
      }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const filteredSubscriptions = activeTab === 'all' 
    ? subscriptions 
    : activeTab === 'active' 
      ? subscriptions.filter(sub => sub.is_active) 
      : subscriptions.filter(sub => !sub.is_active);

  // Group subscriptions by category
  const subscriptionsByCategory = filteredSubscriptions.reduce((acc, subscription) => {
    const category = subscription.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subscription);
    return acc;
  }, {} as Record<string, Subscription[]>);

  // Calculate total monthly cost
  const calculateMonthlyTotal = () => {
    return subscriptions
      .filter(sub => sub.is_active)
      .reduce((total, sub) => {
        let monthlyAmount = sub.amount;
        
        // Convert to monthly equivalent
        if (sub.frequency === 'QUARTERLY') {
          monthlyAmount = sub.amount / 3;
        } else if (sub.frequency === 'ANNUALLY') {
          monthlyAmount = sub.amount / 12;
        }
        
        return total + monthlyAmount;
      }, 0);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP');
  };

  // Check if a subscription is due soon (within the next 7 days)
  const isDueSoon = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  // Get appropriate badge color based on frequency
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'MONTHLY':
        return 'bg-blue-100 text-blue-800';
      case 'QUARTERLY':
        return 'bg-purple-100 text-purple-800';
      case 'ANNUALLY':
        return 'bg-green-100 text-green-800';
      case 'CUSTOM':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get icon background and text color based on subscription name
  const getSubscriptionIconColors = (name: string) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('netflix')) {
      return {
        bgClass: 'bg-red-100 dark:bg-red-900/20',
        textClass: 'text-red-600 dark:text-red-400'
      };
    } else if (lowerName.includes('spotify')) {
      return {
        bgClass: 'bg-green-100 dark:bg-green-900/20',
        textClass: 'text-green-600 dark:text-green-400'
      };
    } else if (lowerName.includes('youtube') || lowerName.includes('google')) {
      return {
        bgClass: 'bg-blue-100 dark:bg-blue-900/20',
        textClass: 'text-blue-600 dark:text-blue-400'
      };
    } else if (lowerName.includes('apple')) {
      return {
        bgClass: 'bg-gray-100 dark:bg-gray-900/20',
        textClass: 'text-gray-600 dark:text-gray-400'
      };
    } else if (lowerName.includes('amazon') || lowerName.includes('prime')) {
      return {
        bgClass: 'bg-amber-100 dark:bg-amber-900/20',
        textClass: 'text-amber-600 dark:text-amber-400'
      };
    } else {
      return {
        bgClass: 'bg-violet-100 dark:bg-violet-900/20',
        textClass: 'text-violet-600 dark:text-violet-400'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <Button onClick={handleAddSubscription}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNaira(calculateMonthlyTotal())}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptions.filter(sub => sub.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptions.filter(sub => sub.is_active && isDueSoon(sub.next_billing_date)).length}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {Object.keys(subscriptionsByCategory).length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-500">No subscriptions found</h3>
            <p className="mt-2 text-gray-400">Add your first subscription to start tracking</p>
            <Button onClick={handleAddSubscription} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
            </Button>
          </div>
        ) : (
          Object.entries(subscriptionsByCategory).map(([category, subs]) => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subs.map(subscription => {
                  const { bgClass, textClass } = getSubscriptionIconColors(subscription.name);
                  return (
                    <Card 
                      key={subscription.subscription_id} 
                      className={`p-6 hover:shadow-lg transition-shadow duration-200 w-full ${!subscription.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header with name and badges */}
                          <div className="flex justify-between items-center mb-3">
                            <p className="text-sm font-medium text-muted-foreground/80 truncate">{subscription.name}</p>
                            <div className="flex gap-2 flex-shrink-0">
                              {!subscription.is_active && (
                                <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                                  Cancelled
                                </Badge>
                              )}
                              <Badge className={getFrequencyColor(subscription.frequency)}>
                                {subscription.frequency.charAt(0) + subscription.frequency.slice(1).toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Amount - centered */}
                          <div className="text-center mb-3">
                            <h3 className="text-2xl font-bold tracking-tight">
                              {formatNaira(subscription.amount)}
                            </h3>
                          </div>
                          
                          {/* Payment date - consistent layout */}
                          <div className="flex flex-col items-center mb-3">
                            <div className="flex items-center justify-center w-full">
                              <span className="text-sm text-muted-foreground">Next payment:</span>
                              <span className="text-sm font-medium ml-1">{formatDate(subscription.next_billing_date)}</span>
                              {isDueSoon(subscription.next_billing_date) && (
                                <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-800 border-amber-200 text-xs">
                                  Due soon
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Description */}
                          {subscription.description && (
                            <p className="text-sm text-muted-foreground truncate text-center mb-3">{subscription.description}</p>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex justify-center space-x-2">
                            {subscription.is_active && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleConfirmPayment(subscription)}
                                  className="text-xs"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" /> Confirm Payment
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleCancelSubscription(subscription)}
                                  className="text-xs text-red-500 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="mr-1 h-3 w-3" /> Cancel
                                </Button>
                              </>
                            )}
                            {!subscription.is_active && (
                              <span className="text-xs text-muted-foreground italic">Subscription cancelled</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Icon and edit/delete buttons */}
                        <div className="flex flex-col items-end space-y-2">
                          <div className={`${bgClass} p-3 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <CreditCard className={`w-6 h-6 ${textClass}`} />
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditSubscription(subscription)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSubscription(subscription.subscription_id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        {/* Add Subscription Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
              <DialogDescription>
                Add a new subscription to track recurring payments.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveSubscription();
            }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <div className="col-span-3">
                  <TransactionAutocomplete
                    value={formData.name}
                    onChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        name: value
                      }));
                    }}
                    onSelect={(transaction) => {
                      // Auto-fill other fields based on the selected transaction
                      setFormData(prev => ({
                        ...prev,
                        name: transaction.description,
                        amount: transaction.amount,
                        next_billing_date: transaction.date, // Use the transaction date instead of today's date
                        category_name: transaction.category_name || 'Subscriptions',
                        category_type: transaction.category_type || 'EXPENSE'
                      }));
                    }}
                    placeholder="Netflix, Spotify, etc."
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="frequency" className="text-right">
                  Frequency
                </Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => handleSelectChange('frequency', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="next_billing_date" className="text-right">
                  Next Billing
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="col-span-3 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.next_billing_date ? (
                        format(new Date(formData.next_billing_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.next_billing_date ? new Date(formData.next_billing_date) : undefined}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Input
                  id="category_name"
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Subscriptions"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right">
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleCheckboxChange('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    This subscription is currently active
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right">
                  <Label htmlFor="auto_renew">Auto-renew</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-3">
                  <input
                    type="checkbox"
                    id="auto_renew"
                    checked={formData.auto_renew}
                    onChange={(e) => handleCheckboxChange('auto_renew', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="auto_renew" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Automatically renew this subscription
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reminder_days" className="text-right">
                  Remind me
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="reminder_days"
                    name="reminder_days"
                    type="number"
                    value={formData.reminder_days}
                    onChange={handleInputChange}
                    className="w-20"
                    min="0"
                    max="30"
                  />
                  <span>days before renewal</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Subscription</Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Subscription Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
              <DialogDescription>
                Update your subscription details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateSubscription();
            }}>
              <div className="grid gap-4 py-4">
                {/* Same form fields as Add Dialog */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <div className="col-span-3">
                    <TransactionAutocomplete
                      value={formData.name}
                      onChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          name: value
                        }));
                      }}
                      onSelect={(transaction) => {
                        // Auto-fill other fields based on the selected transaction
                        setFormData(prev => ({
                          ...prev,
                          name: transaction.description,
                          amount: transaction.amount,
                          next_billing_date: transaction.date, // Use the transaction date instead of today's date
                          category_name: transaction.category_name || 'Subscriptions',
                          category_type: transaction.category_type || 'EXPENSE'
                        }));
                      }}
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="frequency" className="text-right">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => handleSelectChange('frequency', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="ANNUALLY">Annually</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="next_billing_date" className="text-right">Next Billing</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="col-span-3 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.next_billing_date ? (
                          format(new Date(formData.next_billing_date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.next_billing_date ? new Date(formData.next_billing_date) : undefined}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Input
                    id="category_name"
                    name="category_name"
                    value={formData.category_name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Subscriptions"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right">
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2 col-span-3">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleCheckboxChange('is_active', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      This subscription is currently active
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right">
                    <Label htmlFor="auto_renew">Auto-renew</Label>
                  </div>
                  <div className="flex items-center space-x-2 col-span-3">
                    <input
                      type="checkbox"
                      id="auto_renew"
                      checked={formData.auto_renew}
                      onChange={(e) => handleCheckboxChange('auto_renew', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="auto_renew" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Automatically renew this subscription
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reminder_days" className="text-right">Remind me</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="reminder_days"
                      name="reminder_days"
                      type="number"
                      value={formData.reminder_days}
                      onChange={handleInputChange}
                      className="w-20"
                      min="0"
                      max="30"
                    />
                    <span>days before renewal</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Subscription</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Confirm Payment Dialog */}
        <Dialog open={isConfirmPaymentDialogOpen} onOpenChange={setIsConfirmPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                Confirm that you've paid this subscription. This will record a transaction and update the next billing date.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedSubscription && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Subscription:</span>
                    <span>{selectedSubscription.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Amount:</span>
                    <span>{formatNaira(selectedSubscription.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Due Date:</span>
                    <span>{formatDate(selectedSubscription.next_billing_date)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={processPaymentConfirmation}>Confirm Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Subscription Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this subscription?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedSubscription && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Subscription:</span>
                    <span>{selectedSubscription.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Amount:</span>
                    <span>{formatNaira(selectedSubscription.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Frequency:</span>
                    <span>{selectedSubscription.frequency.charAt(0) + selectedSubscription.frequency.slice(1).toLowerCase()}</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center text-red-700">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Keep Subscription
              </Button>
              <Button variant="destructive" onClick={confirmCancelSubscription}>
                Cancel Subscription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SubscriptionsPage;