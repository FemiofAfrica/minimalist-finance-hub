import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSubscriptions, deleteSubscription, convertSubscriptionToTransaction, createSubscription, updateSubscription, getUpcomingSubscriptions } from '@/services/subscriptionService';
import { Subscription, SubscriptionFrequency } from '@/types/subscription';
import { fetchCategories, createCategory } from '@/services/categoryService';
import { Category } from '@/types/category';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
import { CalendarIcon, PlusCircle, Trash2, Edit, CheckCircle, AlertCircle, CreditCard, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TransactionAutocomplete } from '@/components/ui/transaction-autocomplete';
import { useCurrency } from '@/contexts/CurrencyContext';
import { checkSubscriptionRenewals } from '@/services/notificationService';
import { FinanceEvents } from '@/integrations/mixpanel/events';
import { useAuth } from '@/contexts/AuthContext';

// Define the original base currency of the incoming data
const APP_BASE_CURRENCY = "NGN";

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isFutureDateWarningOpen, setIsFutureDateWarningOpen] = useState<boolean>(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dueSoonCount, setDueSoonCount] = useState<number>(0);
  const [renewingSubscriptionId, setRenewingSubscriptionId] = useState<string | null>(null);
  const { formatPossiblyConvertedCurrency, isLiveConversionEnabled, currentCurrency, exchangeRates } = useCurrency();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  
  // Helper function to convert NGN amounts to USD (which is the base currency in CurrencyContext)
  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[APP_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    // If conversion fails, return original amount
    return amountNgn;
  };
  
  const formatAmount = (amountNgn: number) => {
    // Display amounts in their original currency without conversion
    return formatNaira(amountNgn);
    
    // Note: The currency conversion code below is commented out as it was causing confusion
    // for users who input subscription values in their local currency but see converted values
    /*
    // First convert from NGN to USD (base currency for the context)
    const amountUsd = convertNgnToUsd(amountNgn);
    
    // Then use the context formatter which will handle any further conversions
    return amountUsd !== null 
      ? formatPossiblyConvertedCurrency(amountUsd) 
      : formatNaira(amountNgn); // Fallback to direct NGN formatting
    */
  };

  const adjustBillingDateIfNeeded = (billingDate: string, frequency: string): string => {
    const today = new Date();
    const nextBillingDate = new Date(billingDate);
    
    if (nextBillingDate < today) {
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
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          default:
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
      }
      return nextBillingDate.toISOString().split('T')[0];
    }
    
    return billingDate;
  };

  const proceedWithSubscriptionSave = async () => {
    try {
      setError(null);
      
      if (!formData.name) {
        setError('Subscription name is required');
        return;
      }
      
      if (formData.amount <= 0) {
        setError('Amount must be greater than 0');
        return;
      }
      
      if (!formData.category_id || formData.category_id === "new") {
        setError('Please select a valid category');
        return;
      }

      console.log("Form frequency before sending:", formData.frequency);
      
      const subscriptionToSave: Omit<Subscription, 'subscription_id' | 'created_at' | 'updated_at'> = {
        user_id: user?.id || '',
        name: formData.name,
        description: formData.description,
        amount: formData.amount,
        frequency: formData.frequency as SubscriptionFrequency,
        next_billing_date: adjustBillingDateIfNeeded(formData.next_billing_date, formData.frequency),
        category_id: formData.category_id,
        category_name: formData.category_name,
        category_type: formData.category_type,
        is_active: formData.is_active,
        auto_renew: formData.auto_renew,
        reminder_days: formData.reminder_days,
        provider_id: formData.provider_id
      };

      console.log("Typed frequency to send:", subscriptionToSave.frequency);

      const newSubscription = await createSubscription(subscriptionToSave);
      
      // Track subscription added event
      FinanceEvents.trackAddSubscription({
        subscriptionName: subscriptionToSave.name,
        amount: subscriptionToSave.amount,
        billingCycle: subscriptionToSave.frequency.toLowerCase() as any,
        category: subscriptionToSave.category_name
      });
      
      setSubscriptions([...subscriptions, newSubscription]);
      
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: 'Subscription added',
        description: 'Your subscription has been successfully added.',
      });
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError('Failed to save subscription. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to save subscription.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
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
      
      const adjustedBillingDate = adjustBillingDateIfNeeded(
        formData.next_billing_date,
        formData.frequency
      );
      
      const updatedSubscription = await updateSubscription({
        subscription_id: selectedSubscription.subscription_id,
        name: formData.name,
        description: formData.description,
        amount: formData.amount,
        frequency: formData.frequency as SubscriptionFrequency,
        next_billing_date: adjustedBillingDate,
        category_id: formData.category_id,
        category_name: formData.category_name,
        category_type: formData.category_type,
        is_active: formData.is_active,
        auto_renew: formData.auto_renew,
        reminder_days: formData.reminder_days,
        provider_id: formData.provider_id
      });
      
      setSubscriptions(subscriptions.map(sub => 
        sub.subscription_id === updatedSubscription.subscription_id ? updatedSubscription : sub
      ));
      
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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: 0,
    frequency: 'MONTHLY',
    next_billing_date: new Date().toISOString().split('T')[0],
    category_id: null as string | null,
    category_name: 'Subscriptions',
    category_type: 'EXPENSE',
    is_active: true,
    auto_renew: true,
    reminder_days: 3,
    provider_id: null as string | null
  });

  useEffect(() => {
    loadSubscriptions();
    loadCategories();
    // Check for subscription renewals to generate notifications
    checkSubscriptionRenewals().catch(err => {
      console.error("Error checking subscription renewals:", err);
    });
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSubscriptions();
      setSubscriptions(data);

      const upcomingSubs = await getUpcomingSubscriptions(7);
      setDueSoonCount(upcomingSubs.length);

    } catch (err) {
      setError('Failed to load subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await fetchCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: 0,
      frequency: 'MONTHLY',
      next_billing_date: new Date().toISOString().split('T')[0],
      category_id: null,
      category_name: 'Subscriptions',
      category_type: 'EXPENSE',
      is_active: true,
      auto_renew: true,
      reminder_days: 3,
      provider_id: null
    });
    setNewCategoryName('');
  };

  const handleAddSubscription = () => {
    resetForm();
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
      category_id: subscription.category_id,
      category_name: subscription.category_name || 'Subscriptions',
      category_type: subscription.category_type || 'EXPENSE',
      is_active: subscription.is_active,
      auto_renew: subscription.auto_renew,
      reminder_days: subscription.reminder_days,
      provider_id: subscription.provider_id
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      await deleteSubscription(selectedSubscription.subscription_id);
      setSubscriptions(subscriptions.filter(sub => sub.subscription_id !== selectedSubscription.subscription_id));
      setIsDeleteDialogOpen(false);
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

  const handleRenewSubscription = async (subscription: Subscription) => {
    try {
      setRenewingSubscriptionId(subscription.subscription_id);
      
      await convertSubscriptionToTransaction(subscription.subscription_id);
      
      toast({
        title: 'Subscription Renewed',
        description: `${subscription.name} has been renewed and the next payment date updated.`,
      });
      
      loadSubscriptions();
    } catch (err) {
      console.error("Error renewing subscription:", err);
      toast({
        title: "Error",
        description: "Failed to renew subscription",
        variant: "destructive",
      });
    } finally {
      setRenewingSubscriptionId(null);
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
      setError(null);
      
      const updatedSubscription = await updateSubscription({
        subscription_id: selectedSubscription.subscription_id,
        is_active: false
      });
      
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
      setError('Failed to cancel subscription. Please try again.');
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
      loadSubscriptions();
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
      // Fix timezone issues by creating a new date with just the year, month, and day components
      // This ensures the date selected is the date that's stored without timezone offset issues
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create new date at noon to avoid any potential timezone boundary issues
      const localDate = new Date(year, month, day, 12, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        next_billing_date: localDate.toISOString().split('T')[0]
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

  const subscriptionsByCategory = filteredSubscriptions.reduce((acc, subscription) => {
    const category = subscription.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subscription);
    return acc;
  }, {} as Record<string, Subscription[]>);

  const calculateMonthlyTotal = () => {
    return subscriptions
      .filter(sub => sub.is_active)
      .reduce((total, sub) => {
        let monthlyAmount = sub.amount;
        
        if (sub.frequency === 'QUARTERLY') {
          monthlyAmount = sub.amount / 3;
        } else if (sub.frequency === 'ANNUALLY') {
          monthlyAmount = sub.amount / 12;
        }
        
        return total + monthlyAmount;
      }, 0);
  };

  const formatDate = (dateString: string) => {
    // Create a date from the string and handle timezone issues
    const dateParts = dateString.split('-');
    // Create date at noon to avoid timezone issues at day boundaries
    const date = new Date(
      parseInt(dateParts[0]),     // year
      parseInt(dateParts[1]) - 1, // month (0-indexed)
      parseInt(dateParts[2]),     // day
      12, 0, 0                    // noon
    );
    return format(date, 'PPP');
  };

  const isDueSoon = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingCategory(true);
      const newCategory = await createCategory({
        name: newCategoryName,
        type: formData.category_type?.toLowerCase() as 'income' | 'expense' | 'transfer' || 'expense',
      });

      setCategories([...categories, newCategory]);
      setFormData(prev => ({
        ...prev,
        category_id: newCategory.category_id,
        category_name: newCategory.name,
      }));
      setNewCategoryName('');
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    } catch (err) {
      console.error("Error adding category:", err);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleFormSubmit = async () => {
    try {
      setError(null);
      
      // Check if the billing date is in the future
      const billingDate = new Date(formData.next_billing_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      billingDate.setHours(0, 0, 0, 0);
      
      if (billingDate > today) {
        // Show warning for future dates
        setIsFutureDateWarningOpen(true);
        return;
      }
      
      // Proceed with saving if date is today or past
      await proceedWithSubscriptionSave();
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError('Failed to save subscription. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to save subscription.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6 md:py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h3 className="text-lg font-semibold">Your Subscriptions</h3>
          <Button onClick={handleAddSubscription} className="flex items-center text-sm md:text-base">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 md:mb-6 text-sm md:text-base">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatAmount(calculateMonthlyTotal())}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">
                {subscriptions.filter(sub => sub.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">
                {dueSoonCount}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6 md:mb-8 flex justify-center">
          <TabsList>
            <TabsTrigger value="all" className="text-sm md:text-base">All</TabsTrigger>
            <TabsTrigger value="active" className="text-sm md:text-base">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="text-sm md:text-base">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {Object.keys(subscriptionsByCategory).length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-base sm:text-lg md:text-xl font-medium text-gray-500 mb-2 md:mb-3">No subscriptions found</h3>
            <p className="text-sm sm:text-base text-gray-400 mb-4 md:mb-6">Add your first subscription to start tracking</p>
            <Button onClick={handleAddSubscription} className="text-sm md:text-base">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
            </Button>
          </div>
        ) : (
          Object.entries(subscriptionsByCategory).map(([category, subs]) => (
            <div key={category} className="mb-6 md:mb-8">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 md:mb-4 text-center">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {subs.map(subscription => {
                  const formatFrequency = (freq: string) => freq.charAt(0) + freq.slice(1).toLowerCase();
                  
                  return (
                    <Card 
                      key={subscription.subscription_id} 
                      className={`w-full flex flex-col hover:shadow-md transition-shadow duration-200 overflow-hidden border ${!subscription.is_active ? 'opacity-70 bg-muted/40' : 'bg-card'}`}
                    >
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-center mb-4">
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${getFrequencyColor(subscription.frequency)}`}>
                            {formatFrequency(subscription.frequency)}
                          </Badge>
                          <div className="flex">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSubscription(subscription)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSubscription(subscription)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1.5 mb-4">
                          <h3 className="text-base font-semibold leading-tight" title={subscription.name}>{subscription.name}</h3>
                          <p className="text-xl font-bold">{formatAmount(subscription.amount)}</p>
                          <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                            <CalendarIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span>Next payment is on {formatDate(subscription.next_billing_date)}</span>
                          </div>
                        </div>
                        <div className="mt-auto pt-3 border-t flex justify-center items-center">
                          {subscription.is_active ? (
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs"
                                onClick={() => handleEditSubscription(subscription)}
                                title="Manage Subscription"
                              >
                                Manage
                              </Button>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs"
                                onClick={() => handleRenewSubscription(subscription)}
                                disabled={renewingSubscriptionId === subscription.subscription_id}
                                title="Renew Subscription"
                              >
                                {renewingSubscriptionId === subscription.subscription_id ? (
                                  <>
                                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                    Renewing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Renew
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleCancelSubscription(subscription)}
                                title="Cancel Plan"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-center w-full">
                              <Badge variant="outline" className="border-destructive/50 text-destructive text-xs px-1.5 py-0.5">
                                Cancelled
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add New Subscription</DialogTitle>
              <DialogDescription>
                Track your recurring subscriptions and get reminders when they're due.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleFormSubmit();
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-center">
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
                        setFormData(prev => ({
                          ...prev,
                          name: transaction.description,
                          amount: transaction.amount,
                          next_billing_date: transaction.date,
                          category_id: transaction.category_id,
                          category_name: transaction.category_name || 'Subscriptions',
                          category_type: transaction.category_type || 'EXPENSE'
                        }));
                      }}
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-center">
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
                  <Label htmlFor="amount" className="text-center">
                    Amount
                  </Label>
                  <div className="col-span-3">
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
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="frequency" className="text-center">
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
                  <Label htmlFor="next_billing_date" className="text-center">
                    Next Billing
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="col-span-3 justify-center text-center font-normal"
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
                  <Label htmlFor="category" className="text-center">
                    Category
                  </Label>
                  <div className="col-span-3">
                    <div className="flex space-x-2">
                      <Select
                        value={formData.category_id === "new" ? "new" : formData.category_id || "uncategorized"}
                        onValueChange={(value) => {
                          if (value === "new") {
                            setFormData(prev => ({
                              ...prev,
                              category_id: "new"
                            }));
                            return;
                          }
                          if (value === "uncategorized") {
                            setFormData(prev => ({
                              ...prev,
                              category_id: null,
                              category_name: "Uncategorized",
                              category_type: "EXPENSE"
                            }));
                            return;
                          }
                          const selectedCategory = categories.find(c => c.category_id === value);
                          if (selectedCategory) {
                            setFormData(prev => ({
                              ...prev,
                              category_id: selectedCategory.category_id,
                              category_name: selectedCategory.name,
                              category_type: selectedCategory.type.toUpperCase()
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uncategorized">Uncategorized</SelectItem>
                          {categories
                            .filter(c => c.type === 'expense')
                            .map(category => (
                              <SelectItem key={category.category_id} value={category.category_id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          <SelectItem value="new">+ Add New Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.category_id === "new" && (
                      <div className="mt-2 flex space-x-2">
                  <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category name"
                          className="flex-1"
                  />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleAddCategory}
                          disabled={isAddingCategory || !newCategoryName.trim()}
                        >
                          {isAddingCategory ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-center">
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
                  <div className="text-center">
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
                  <Label htmlFor="reminder_days" className="text-center">
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
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-center">
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
                        setFormData(prev => ({
                          ...prev,
                          name: transaction.description,
                          amount: transaction.amount,
                          next_billing_date: transaction.date,
                          category_id: transaction.category_id,
                          category_name: transaction.category_name || 'Subscriptions',
                          category_type: transaction.category_type || 'EXPENSE'
                        }));
                      }}
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-center">
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
                  <Label htmlFor="amount" className="text-center">
                    Amount
                  </Label>
                  <div className="col-span-3">
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
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="frequency" className="text-center">
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
                  <Label htmlFor="next_billing_date" className="text-center">
                    Next Billing
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="col-span-3 justify-center text-center font-normal"
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
                  <Label htmlFor="category" className="text-center">
                    Category
                  </Label>
                  <div className="col-span-3">
                    <div className="flex space-x-2">
                      <Select
                        value={formData.category_id === "new" ? "new" : formData.category_id || "uncategorized"}
                        onValueChange={(value) => {
                          if (value === "new") {
                            setFormData(prev => ({
                              ...prev,
                              category_id: "new"
                            }));
                            return;
                          }
                          if (value === "uncategorized") {
                            setFormData(prev => ({
                              ...prev,
                              category_id: null,
                              category_name: "Uncategorized",
                              category_type: "EXPENSE"
                            }));
                            return;
                          }
                          const selectedCategory = categories.find(c => c.category_id === value);
                          if (selectedCategory) {
                            setFormData(prev => ({
                              ...prev,
                              category_id: selectedCategory.category_id,
                              category_name: selectedCategory.name,
                              category_type: selectedCategory.type.toUpperCase()
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uncategorized">Uncategorized</SelectItem>
                          {categories
                            .filter(c => c.type === 'expense')
                            .map(category => (
                              <SelectItem key={category.category_id} value={category.category_id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          <SelectItem value="new">+ Add New Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.category_id === "new" && (
                      <div className="mt-2 flex space-x-2">
                  <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category name"
                          className="flex-1"
                  />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleAddCategory}
                          disabled={isAddingCategory || !newCategoryName.trim()}
                        >
                          {isAddingCategory ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-center">
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
                  <div className="text-center">
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
                  <Label htmlFor="reminder_days" className="text-center">
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
                <Button type="submit">Update Subscription</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isConfirmPaymentDialogOpen} onOpenChange={setIsConfirmPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                This will record a payment for this subscription and update the next billing date.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedSubscription && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Subscription:</span>
                    <span>{selectedSubscription.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Amount:</span>
                    <span>{formatAmount(selectedSubscription.amount)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Due date:</span>
                    <span>{formatDate(selectedSubscription.next_billing_date)}</span>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={processPaymentConfirmation}>
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isFutureDateWarningOpen} onOpenChange={setIsFutureDateWarningOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Future Billing Date Warning</DialogTitle>
              <DialogDescription>
                The billing date you selected is in the future. No transaction will be automatically created until that date.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Subscription:</span>
                <span>{formData.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Amount:</span>
                <span>{formatAmount(formData.amount)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Next billing:</span>
                <span>{formatDate(formData.next_billing_date)}</span>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mt-4">
                <strong>Note:</strong> Since this is a future date, no transaction will be created now. 
                You'll need to manually create transactions for future payments when they become due.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFutureDateWarningOpen(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                setIsFutureDateWarningOpen(false);
                await proceedWithSubscriptionSave();
              }}>
                Continue Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Delete Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this subscription? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedSubscription && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Subscription:</span>
                    <span>{selectedSubscription.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Amount:</span>
                    <span>{formatAmount(selectedSubscription.amount)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Frequency:</span>
                    <span>{selectedSubscription.frequency.charAt(0) + selectedSubscription.frequency.slice(1).toLowerCase()}</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mt-4">
                    <strong>Warning:</strong> This will permanently delete the subscription and cannot be undone.
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSubscription}>
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this subscription? This will mark it as inactive.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedSubscription && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Subscription:</span>
                    <span>{selectedSubscription.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Amount:</span>
                    <span>{formatAmount(selectedSubscription.amount)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Frequency:</span>
                    <span>{selectedSubscription.frequency.charAt(0) + selectedSubscription.frequency.slice(1).toLowerCase()}</span>
                  </div>
                </>
              )}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Go Back
              </Button>
              <Button variant="destructive" onClick={confirmCancelSubscription}>
                Cancel Subscription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionsPage;
