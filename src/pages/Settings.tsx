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
            // Optionally show a toast error here
            return;
          }

          if (profileData) {
            setFirstName(profileData.first_name || '');
            setLastName(profileData.last_name || '');
          } else {
            // If no profile exists, initialize with empty strings
            setFirstName('');
            setLastName('');
            // Optionally, check user_metadata as a fallback for initial population?
            // if (user.user_metadata) {
            //   setFirstName(user.user_metadata.first_name || '');
            //   setLastName(user.user_metadata.last_name || '');
            // }
          }
        } catch (fetchError) {
          console.error('Exception fetching profile:', fetchError);
          toast({
            title: 'Error loading profile',
            description: 'Could not load your profile data.',
            variant: 'destructive',
          });
        }
      }
    };

    fetchProfile();
  }, [user, supabase, toast]); // Add supabase and toast to dependencies
  
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
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={email} 
                    disabled 
                    placeholder="Your email address"
                  />
                  <p className="text-sm text-muted-foreground">Your email address cannot be changed</p>
                </div>
                
                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={loading}
                  className="mt-4"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your application experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={currency} 
                    onValueChange={setCurrency}
                  >
                    <SelectTrigger id="currency" className="w-full md:w-[240px]">
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
                  <p className="text-sm text-muted-foreground">Choose your preferred currency for displaying amounts</p>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode" className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
                  </div>
                  <Switch 
                    id="darkMode" 
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
                
                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="liveConversion" className="text-base">Live Currency Conversion</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically convert amounts to the selected currency using live rates.
                    </p>
                  </div>
                  <Switch 
                    id="liveConversion" 
                    checked={isLiveConversionEnabled}
                    onCheckedChange={toggleLiveConversion}
                  />
                </div>
                
                <Button 
                  onClick={handlePreferencesUpdate} 
                  disabled={loading}
                  className="mt-4"
                >
                  {loading ? 'Updating...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" placeholder="Enter your current password" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" placeholder="Enter your new password" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="Confirm your new password" />
                </div>
                
                <Button className="mt-4">
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}