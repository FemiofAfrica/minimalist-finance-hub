import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { 
  sendNotificationToUser, 
  sendNotificationToAllUsers 
} from '@/services/notificationService';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function Settings() {
  const { user } = useAuth();
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, isLiveConversionEnabled, toggleLiveConversion } = useCurrency();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState(currentCurrency.code);
  const [darkMode, setDarkMode] = useState(theme === 'dark');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [notificationTitle, setNotificationTitle] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [notificationType, setNotificationType] = useState<string>("info");
  const [notificationLink, setNotificationLink] = useState<string>("");
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Load user data
  useEffect(() => {
    if (user) {
      // Set email from auth
      setEmail(user.email || '');
      
      // Set name from user metadata if available
      if (user.user_metadata) {
        setFirstName(user.user_metadata.first_name || '');
        setLastName(user.user_metadata.last_name || '');
      }
    }
  }, [user]);
  
  // Load user profile data from the database
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        // Set email from auth (remains unchanged)
        setEmail(user.email || '');

        // Fetch profile from the 'profiles' table
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to handle cases where profile might not exist yet

          if (error) {
            console.error('Error fetching profile:', error);
            // Fall back to user metadata if there's an error
            if (user.user_metadata) {
              setFirstName(user.user_metadata.first_name || '');
              setLastName(user.user_metadata.last_name || '');
            }
            return;
          }

          if (profileData && (profileData.first_name || profileData.last_name)) {
            // Use profile data if available
            setFirstName(profileData.first_name || '');
            setLastName(profileData.last_name || '');
          } else {
            // If no profile exists or fields are empty, check user_metadata
            if (user.user_metadata) {
              setFirstName(user.user_metadata.first_name || '');
              setLastName(user.user_metadata.last_name || '');
            } else {
              setFirstName('');
              setLastName('');
            }
          }
        } catch (fetchError) {
          console.error('Exception fetching profile:', fetchError);
          // Fall back to user metadata in case of exception
          if (user.user_metadata) {
            setFirstName(user.user_metadata.first_name || '');
            setLastName(user.user_metadata.last_name || '');
          }
          toast({
            title: 'Error loading profile',
            description: 'Could not load your profile data.',
            variant: 'destructive',
          });
        }
      }
    };

    fetchProfile();
  }, [user, toast]);
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user) return; // Should not happen if user is on settings page, but good practice

    try {
      setLoading(true);

      const profileUpdate = {
        id: user.id, // Link to the auth user
        email: user.email, // Email is required in profiles table
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      // Upsert data into the 'profiles' table
      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdate, { onConflict: 'id' }) // Specify conflict column if needed, usually primary key 'id'
        .select() // Optionally select to confirm write, not strictly needed for upsert
        .single(); // Expect single row back

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile information has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle preferences update
  const handlePreferencesUpdate = async () => {
    try {
      setLoading(true);
      
      // Update currency preference using context function
      const selectedCurrency = supportedCurrencies.find(c => c.code === currency);
      if (selectedCurrency && selectedCurrency.code !== currentCurrency.code) {
        setCurrentCurrency(selectedCurrency); // This now persists to localStorage via context
      }
      
      // Update theme preference using context function
      // Check if the local state `darkMode` differs from the context `theme`
      if (darkMode !== (theme === 'dark')) {
        toggleTheme(); // This persists via context
      }
      
      // NOTE: No need to call toggleLiveConversion here as the Switch handles it directly.

      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user is admin
  useEffect(() => {
    const checkIfAdmin = async () => {
      if (user) {
        try {
          // Check if user has admin flag in user_metadata
          const isUserAdmin = user.user_metadata?.is_admin === true;
          setIsAdmin(isUserAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };
    
    checkIfAdmin();
  }, [user]);

  // Function to send notification to all users
  const handleSendToAll = async () => {
    if (!notificationTitle || !notificationMessage) {
      toast({
        title: "Error",
        description: "Please provide both title and message",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSending(true);
      
      const count = await sendNotificationToAllUsers(
        notificationTitle,
        notificationMessage,
        notificationType as any,
        notificationLink || undefined,
        expiryDays
      );
      
      toast({
        title: "Success",
        description: `Sent notification to ${count} users`,
      });
      
      // Reset form
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationType("info");
      setNotificationLink("");
      setExpiryDays(7);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification. Make sure you have admin privileges.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your account settings and preferences</p>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Tabs defaultValue="profile" className="w-full">
            <div className="border-b">
              <div className="px-6">
                <TabsList className="h-14 w-full justify-start space-x-6 rounded-none p-0 bg-transparent">
                  <TabsTrigger 
                    value="profile" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-14 rounded-none border-b-2 border-transparent px-4 font-medium text-base transition-all"
                  >
                    Profile
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preferences" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-14 rounded-none border-b-2 border-transparent px-4 font-medium text-base transition-all"
                  >
                    Preferences
                  </TabsTrigger>
                  <TabsTrigger 
                    value="security" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-14 rounded-none border-b-2 border-transparent px-4 font-medium text-base transition-all"
                  >
                    Security
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger 
                      value="admin" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-14 rounded-none border-b-2 border-transparent px-4 font-medium text-base transition-all"
                    >
                      Admin
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
            </div>
          
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-8 text-center">Personal Details</h2>
                <div className="grid gap-y-6 mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="firstName" className="font-medium text-base sm:w-1/3 sm:text-right">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      placeholder="Enter your first name"
                      className="bg-background sm:w-2/3 text-base"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="lastName" className="font-medium text-base sm:w-1/3 sm:text-right">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      placeholder="Enter your last name"
                      className="bg-background sm:w-2/3 text-base"
                    />
                  </div>
                </div>
                
                <h2 className="text-2xl font-semibold mb-8 text-center">Account Information</h2>
                <div className="grid gap-y-6 mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="email" className="font-medium text-base sm:w-1/3 sm:text-right">Email Address</Label>
                    <div className="sm:w-2/3">
                      <Input 
                        id="email" 
                        value={email} 
                        disabled 
                        placeholder="Your email address"
                        className="bg-muted/50 w-full text-base"
                      />
                      <p className="text-sm text-muted-foreground mt-1">Your email address cannot be changed</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-6 mt-8">
                  <Button 
                    onClick={handleProfileUpdate} 
                    disabled={loading}
                    className="px-8 py-2 h-11 text-base"
                  >
                    {loading ? 'Saving...' : 'Update Profile'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          
            {/* Preferences Tab */}
            <TabsContent value="preferences" className="p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-8 text-center">Currency Settings</h2>
                <div className="mb-10">
                  <div className="grid gap-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                      <Label htmlFor="currency" className="font-medium text-base sm:w-1/3 sm:text-right">Display Currency</Label>
                      <div className="sm:w-2/3">
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger id="currency" className="bg-background w-full text-base">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedCurrencies.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {`${c.name} (${c.symbol})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">Choose your preferred currency for displaying amounts</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-semibold mb-8 text-center">Appearance & Features</h2>
                <div className="space-y-6 mb-10">
                  <div className="flex items-center justify-between p-4 bg-muted/5 rounded-lg border">
                    <Label htmlFor="darkMode" className="font-medium text-base">Dark Mode</Label>
                    <Switch 
                      id="darkMode" 
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/5 rounded-lg border">
                    <div>
                      <Label htmlFor="liveConversion" className="font-medium text-base block">Live Currency Conversion</Label>
                      <p className="text-sm text-muted-foreground mt-1">Convert amounts automatically to your selected currency</p>
                    </div>
                    <Switch 
                      id="liveConversion" 
                      checked={isLiveConversionEnabled}
                      onCheckedChange={toggleLiveConversion}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-6 mt-8">
                  <Button 
                    onClick={handlePreferencesUpdate} 
                    disabled={loading}
                    className="px-8 py-2 h-11 text-base"
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          
            {/* Security Tab */}
            <TabsContent value="security" className="p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-8 text-center">Change Password</h2>
                <div className="grid gap-y-6 mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="currentPassword" className="font-medium text-base sm:w-1/3 sm:text-right">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Enter your current password"
                      className="bg-background sm:w-2/3 text-base"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="newPassword" className="font-medium text-base sm:w-1/3 sm:text-right">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Enter your new password"
                      className="bg-background sm:w-2/3 text-base"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="confirmPassword" className="font-medium text-base sm:w-1/3 sm:text-right">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm your new password"
                      className="bg-background sm:w-2/3 text-base"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-6 mt-8">
                  <Button className="px-8 py-2 h-11 text-base">
                    Change Password
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Admin Tab */}
            <TabsContent value="admin" className="p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-8 text-center">Admin Controls</h2>
                
                <Card className="shadow-sm border mb-10">
                  <CardHeader>
                    <CardTitle>Send Notifications</CardTitle>
                    <CardDescription>
                      Use this form to send notifications to all users on the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="notification-title">Notification Title</Label>
                        <Input
                          id="notification-title"
                          placeholder="Enter notification title"
                          value={notificationTitle}
                          onChange={e => setNotificationTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notification-message">Notification Message</Label>
                        <Textarea
                          id="notification-message"
                          placeholder="Enter notification message"
                          value={notificationMessage}
                          onChange={e => setNotificationMessage(e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="notification-type">Notification Type</Label>
                          <Select
                            value={notificationType}
                            onValueChange={setNotificationType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select notification type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Information</SelectItem>
                              <SelectItem value="success">Success</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="expiry-days">
                            Expiry (days)
                          </Label>
                          <Input
                            id="expiry-days"
                            type="number"
                            min={1}
                            max={30}
                            value={expiryDays}
                            onChange={e => setExpiryDays(parseInt(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Days until this notification expires
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notification-link">
                          Link (Optional)
                        </Label>
                        <Input
                          id="notification-link"
                          placeholder="e.g., /settings or /transactions"
                          value={notificationLink}
                          onChange={e => setNotificationLink(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a relative path to navigate to when the notification is clicked
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleSendToAll}
                      disabled={isSending || !notificationTitle || !notificationMessage}
                      className="w-full h-11"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send to All Users"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}