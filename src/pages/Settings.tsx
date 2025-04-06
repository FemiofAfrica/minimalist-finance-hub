import { useState, useEffect } from 'react';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
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
import type { User } from "@supabase/auth-helpers-remix";

// Type for loader data
type LoaderData = {
  user: User | null;
  firstName: string | null;
};

// Define type for action data returned from settings action
type SettingsActionData = {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: string;
};

export default function Settings() {
  // Get user and firstName from loader
  const { user, firstName: loadedFirstName } = useLoaderData<LoaderData>(); 
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, isLiveConversionEnabled, toggleLiveConversion } = useCurrency();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const actionData = useActionData<SettingsActionData>();
  
  const [loading, setLoading] = useState(false);
  // Initialize state from loader data where possible
  const [firstName, setFirstName] = useState(loadedFirstName || ''); 
  const [lastName, setLastName] = useState(''); // Needs profile fetch for lastName
  const [email, setEmail] = useState(user?.email || ''); // Get email from loader user
  const [currency, setCurrency] = useState(currentCurrency.code);
  const [darkMode, setDarkMode] = useState(theme === 'dark');
  
  // Effect to show toast based on action result
  useEffect(() => {
    if (actionData?.message) {
      toast({ title: 'Success', description: actionData.message });
    }
    if (actionData?.error) {
      toast({ title: 'Error', description: actionData.error, variant: 'destructive' });
    }
    // Reset loading state if needed, though Remix handles form state automatically
    setLoading(false); 
  }, [actionData, toast]);
  
  // Effect to load profile details not loaded by loader (like lastName)
  useEffect(() => {
    if (user) {
      // Email is already set from loader data
      // Fetch only lastName now
      const fetchLastName = async () => {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('last_name') // Only fetch lastName
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching last name:', error);
            return;
          }
          if (profileData) {
            setLastName(profileData.last_name || '');
          }
        } catch (fetchError) {
          console.error('Exception fetching last name:', fetchError);
        }
      };
      fetchLastName();
    }
  }, [user]); // Removed toast dependency here unless needed for errors
  
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
    <DashboardLayout userName={firstName || undefined}>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            {loadedFirstName ? `Hope you're having a great day, ${loadedFirstName}!` : "Manage your account settings and preferences"}
          </p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Form method="post">
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
                        name="firstName"
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        name="lastName"
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
                      name="email"
                      value={email} 
                      disabled 
                      placeholder="Your email address"
                    />
                    <p className="text-sm text-muted-foreground">Your email address cannot be changed</p>
                  </div>
                  
                  <Button 
                    type="submit"
                    className="mt-4"
                  >
                    Update Profile
                  </Button>
                </CardContent>
              </Card>
            </Form>
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