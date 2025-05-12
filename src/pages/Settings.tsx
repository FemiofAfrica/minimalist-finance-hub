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
  
  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto py-6">
        <div className="flex flex-col items-center mb-8 border-b pb-4 text-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm overflow-hidden">
          <Tabs defaultValue="profile" className="w-full">
            <div className="border-b">
              <div className="px-4">
                <TabsList className="bg-transparent h-12 w-full justify-center space-x-4 rounded-none p-0">
                  <TabsTrigger 
                    value="profile" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 rounded-none border-b-2 border-transparent px-4 text-base"
                  >
                    Profile
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preferences" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 rounded-none border-b-2 border-transparent px-4 text-base"
                  >
                    Preferences
                  </TabsTrigger>
                  <TabsTrigger 
                    value="security" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-12 rounded-none border-b-2 border-transparent px-4 text-base"
                  >
                    Security
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-6">
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Personal Details</h2>
                <div className="grid grid-cols-1 gap-y-6 mb-8">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="firstName" className="font-medium text-left text-lg w-1/3">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      placeholder="Enter your first name"
                      className="bg-background w-2/3 text-base"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="lastName" className="font-medium text-left text-lg w-1/3">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      placeholder="Enter your last name"
                      className="bg-background w-2/3 text-base"
                    />
                  </div>
                </div>
                
                <h2 className="text-2xl font-semibold mb-6 text-center">Account Information</h2>
                <div className="flex flex-col space-y-6 mb-8">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="email" className="font-medium text-left text-lg w-1/3">Email Address</Label>
                    <div className="w-2/3">
                      <Input 
                        id="email" 
                        value={email} 
                        disabled 
                        placeholder="Your email address"
                        className="bg-muted/50 w-full text-base"
                      />
                      <p className="text-sm text-muted-foreground text-left mt-1">Your email address cannot be changed</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-4 mt-6">
                  <Button 
                    onClick={handleProfileUpdate} 
                    disabled={loading}
                    className="px-8 py-2 text-base"
                  >
                    {loading ? 'Saving...' : 'Update Profile'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          
            {/* Preferences Tab */}
            <TabsContent value="preferences" className="p-6">
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Currency Settings</h2>
                <div className="mb-8">
                  <div className="flex flex-col space-y-6">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="currency" className="font-medium text-left text-lg w-1/3">Display Currency</Label>
                      <div className="w-2/3">
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
                        <p className="text-sm text-muted-foreground text-left mt-1">Choose your preferred currency for displaying amounts</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-semibold mb-6 text-center">Appearance & Features</h2>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 bg-muted/5 rounded-lg border">
                    <Label htmlFor="darkMode" className="font-medium text-lg">Dark Mode</Label>
                    <Switch 
                      id="darkMode" 
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/5 rounded-lg border">
                    <Label htmlFor="liveConversion" className="font-medium text-lg">Live Currency Conversion</Label>
                    <Switch 
                      id="liveConversion" 
                      checked={isLiveConversionEnabled}
                      onCheckedChange={toggleLiveConversion}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-4 mt-6">
                  <Button 
                    onClick={handlePreferencesUpdate} 
                    disabled={loading}
                    className="px-8 py-2 text-base"
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          
            {/* Security Tab */}
            <TabsContent value="security" className="p-6">
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Change Password</h2>
                <div className="space-y-6 mb-8">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="currentPassword" className="font-medium text-left text-lg w-1/3">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Enter your current password"
                      className="bg-background w-2/3 text-base"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Label htmlFor="newPassword" className="font-medium text-left text-lg w-1/3">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Enter your new password"
                      className="bg-background w-2/3 text-base"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Label htmlFor="confirmPassword" className="font-medium text-left text-lg w-1/3">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm your new password"
                      className="bg-background w-2/3 text-base"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-4 mt-6">
                  <Button className="px-8 py-2 text-base">
                    Change Password
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}