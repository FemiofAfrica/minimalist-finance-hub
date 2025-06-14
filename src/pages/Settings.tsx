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

import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { SupportBanner } from '@/components/ui/SupportBanner';
import NotificationTestCenter from '@/components/admin/NotificationTestCenter';
import ErrorLogsViewer from '@/components/admin/ErrorLogsViewer';
import { BiometricSettings } from '@/components/settings/BiometricSettings';

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
  
  // State for support banner text
  const [supportBannerText, setSupportBannerText] = useState<string>('');
  const [isLoadingBannerText, setIsLoadingBannerText] = useState<boolean>(false);
  const [isSavingBannerText, setIsSavingBannerText] = useState<boolean>(false);
  
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
          // Log the full user metadata for debugging
          // console.log("User metadata:", user.user_metadata);
          
          // Check if user has super admin flag in user_metadata
          const isUserAdmin = user.user_metadata?.is_super_admin === true;
          setIsAdmin(isUserAdmin);

          // If admin, fetch current banner text
          if (isUserAdmin) {
            fetchSupportBannerText();
          }
        } catch (e) {
          console.error("Error checking admin status:", e);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkIfAdmin();
  }, [user]);

  // Fetch support banner text
  const fetchSupportBannerText = async () => {
    setIsLoadingBannerText(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'support_banner_text')
        .maybeSingle(); // Use maybeSingle to handle if the key doesn't exist yet

      if (error) {
        throw error; // Let the catch block handle it
      }

      if (data && data.value) {
        setSupportBannerText(data.value as string);
      } else {
        // Key might not exist, or value is null. Set to empty string for the textarea.
        setSupportBannerText(''); 
        console.log('Support banner text not found or is null, initializing as empty for admin input.');
      }

    } catch (error: any) {
      console.error('Error fetching support banner text:', error.message);
      toast({
        title: 'Failed to load banner text',
        description: error.message || 'Could not retrieve the current support banner text.',
        variant: 'destructive',
      });
      setSupportBannerText('Error loading text.'); // Show error in textarea
    } finally {
      setIsLoadingBannerText(false);
    }
  };

  // Handle support banner text update
  const handleSaveBannerText = async () => {
    if (!isAdmin) return;
    setIsSavingBannerText(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'support_banner_text', value: supportBannerText, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        throw error; // Let the catch block handle it
      }

      toast({
        title: 'Support banner updated',
        description: 'The support banner text has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving support banner text:', error.message);
      toast({
        title: 'Save failed',
        description: error.message || 'There was an error saving the support banner text.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingBannerText(false);
    }
  };
  

  

  
  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Tabs defaultValue="profile" className="w-full">
            <div className="border-b">
              <div className="flex justify-center w-full text-center">
                <div className="inline-flex justify-center">
                  {console.log("Rendering tabs - isAdmin value:", isAdmin)}
                  <TabsList className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} bg-transparent rounded-none p-0`}>
                    <TabsTrigger 
                      value="profile" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 md:h-14 rounded-none border-b-2 border-transparent font-medium text-sm md:text-base transition-all px-4 md:px-8 mx-2 md:mx-4"
                    >
                      Profile
                    </TabsTrigger>
                    <TabsTrigger 
                      value="preferences" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 md:h-14 rounded-none border-b-2 border-transparent font-medium text-sm md:text-base transition-all px-4 md:px-8 mx-2 md:mx-4"
                    >
                      Preferences
                    </TabsTrigger>
                    <TabsTrigger 
                      value="security" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 md:h-14 rounded-none border-b-2 border-transparent font-medium text-sm md:text-base transition-all px-4 md:px-8 mx-2 md:mx-4"
                    >
                      Security
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger 
                        value="admin" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 md:h-14 rounded-none border-b-2 border-transparent font-medium text-sm md:text-base transition-all px-4 md:px-8 mx-2 md:mx-4"
                      >
                        Admin
                      </TabsTrigger>
                    )}
          </TabsList>
                </div>
              </div>
            </div>
          
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-4 md:p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Personal Details</h2>
                <div className="grid gap-y-4 md:gap-y-6 mb-8 md:mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="firstName" className="font-medium text-sm md:text-base sm:w-1/3 text-center">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      placeholder="Enter your first name"
                      className="bg-background sm:w-2/3 text-sm md:text-base"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="lastName" className="font-medium text-sm md:text-base sm:w-1/3 text-center">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      placeholder="Enter your last name"
                      className="bg-background sm:w-2/3 text-sm md:text-base"
                    />
                  </div>
                </div>
                
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Account Information</h2>
                <div className="grid gap-y-4 md:gap-y-6 mb-8 md:mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                    <Label htmlFor="email" className="font-medium text-sm md:text-base sm:w-1/3 text-center">Email Address</Label>
                    <div className="sm:w-2/3">
                  <Input 
                    id="email" 
                    value={email} 
                    disabled 
                    placeholder="Your email address"
                        className="bg-muted/50 w-full text-sm md:text-base"
                  />
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">Your email address cannot be changed</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center border-t pt-4 md:pt-6 mt-6 md:mt-8">
                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={loading}
                    className="px-6 md:px-8 py-2 h-10 md:h-11 text-sm md:text-base"
                >
                    {loading ? 'Saving...' : 'Update Profile'}
                </Button>
                </div>
              </div>
          </TabsContent>
          
            {/* Preferences Tab */}
            <TabsContent value="preferences" className="p-4 md:p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Currency Settings</h2>
                <div className="mb-8 md:mb-10">
                  <div className="grid gap-y-4 md:gap-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                      <Label htmlFor="currency" className="font-medium text-sm md:text-base sm:w-1/3 text-center">Display Currency</Label>
                      <div className="sm:w-2/3">
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger id="currency" className="bg-background w-full text-sm md:text-base">
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
                        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">Choose your preferred currency for displaying amounts</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Appearance & Features</h2>
                <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                  <div className="flex items-center justify-between p-3 md:p-4 bg-muted/5 rounded-lg border">
                    <Label htmlFor="darkMode" className="font-medium text-sm md:text-base">Dark Mode</Label>
                  <Switch 
                    id="darkMode" 
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
                
                  <div className="flex items-center justify-between p-3 md:p-4 bg-muted/5 rounded-lg border">
                    <div>
                      <Label htmlFor="liveConversion" className="font-medium text-sm md:text-base block">Live Currency Conversion</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Convert amounts automatically to your selected currency</p>
                  </div>
                  <Switch 
                    id="liveConversion" 
                    checked={isLiveConversionEnabled}
                    onCheckedChange={toggleLiveConversion}
                  />
                  </div>
                </div>
                
                <div className="flex justify-center border-t pt-4 md:pt-6 mt-6 md:mt-8">
                <Button 
                  onClick={handlePreferencesUpdate} 
                  disabled={loading}
                    className="px-6 md:px-8 py-2 h-10 md:h-11 text-sm md:text-base"
                >
                    {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
                </div>
              </div>
          </TabsContent>
          
            {/* Security Tab */}
            <TabsContent value="security" className="p-4 md:p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Security Settings</h2>
                
                {/* Biometric Authentication */}
                <BiometricSettings />
                
                {/* Password Change */}
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your account password for enhanced security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-y-4 md:gap-y-6 mb-8 md:mb-10">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                        <Label htmlFor="currentPassword" className="font-medium text-sm md:text-base sm:w-1/3 text-center">Current Password</Label>
                        <Input 
                          id="currentPassword" 
                          type="password" 
                          placeholder="Enter your current password"
                          className="bg-background sm:w-2/3 text-sm md:text-base text-center"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                        <Label htmlFor="newPassword" className="font-medium text-sm md:text-base sm:w-1/3 text-center">New Password</Label>
                        <Input 
                          id="newPassword" 
                          type="password" 
                          placeholder="Enter your new password"
                          className="bg-background sm:w-2/3 text-sm md:text-base text-center"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                        <Label htmlFor="confirmPassword" className="font-medium text-sm md:text-base sm:w-1/3 text-center">Confirm New Password</Label>
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          placeholder="Confirm your new password"
                          className="bg-background sm:w-2/3 text-sm md:text-base text-center"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center border-t pt-4 md:pt-6 mt-6 md:mt-8">
                      <Button className="px-6 md:px-8 py-2 h-10 md:h-11 text-sm md:text-base">
                        Change Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Admin Tab */}
            {isAdmin && (
              <TabsContent value="admin" className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h2>
                    <p className="text-muted-foreground">Manage notifications, monitor errors, and configure system settings</p>
                  </div>
                  
                  {/* Core Admin Features */}
                  <div className="grid gap-8">
                    {/* Notification Management */}
                    <NotificationTestCenter />
                    
                    {/* Error Monitoring */}
                    <ErrorLogsViewer />
                    
                    {/* System Configuration */}
                    <Card className="shadow-sm border">
                      <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                          <span>System Configuration</span>
                        </CardTitle>
                        <CardDescription>
                          Configure global system settings and banners
                        </CardDescription>
                      </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Support Banner Configuration */}
                        <div className="space-y-4">
                      <div className="text-center">
                            <h3 className="text-lg font-semibold mb-2">Support Banner</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                              Configure the scrolling banner displayed at the top of the application
                        </p>
                      </div>
                      
                      {isLoadingBannerText ? (
                            <div className="flex items-center justify-center space-x-2 py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              <p className="text-muted-foreground">Loading banner configuration...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center">
                                <Label htmlFor="supportBannerText" className="text-sm font-medium block text-center">Banner Text</Label>
                            <Textarea
                              id="supportBannerText"
                              value={supportBannerText}
                              onChange={(e) => setSupportBannerText(e.target.value)}
                              placeholder="Enter the support banner text here..."
                              rows={3}
                                  className="mt-2 text-center"
                            />
                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                  Leave empty to hide the banner. Changes take effect immediately after saving.
                            </p>
                          </div>
                          
                              {supportBannerText && (
                          <div className="text-center">
                                  <Label className="text-sm font-medium block text-center">Preview</Label>
                                  <div className="mt-2 border rounded-lg p-4 bg-muted/20">
                              <SupportBanner 
                                      initialText={supportBannerText}
                                className="static top-auto left-auto right-auto"
                                isPreviewMode={true}
                              />
                            </div>
                                </div>
                              )}

                              <div className="flex justify-center">
                                <Button 
                                  onClick={handleSaveBannerText} 
                                  disabled={isSavingBannerText || isLoadingBannerText}
                                  className="min-w-[120px]"
                                >
                                  {isSavingBannerText ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save Changes'
                                  )}
                            </Button>
                          </div>
                        </div>
                      )}
                        </div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}