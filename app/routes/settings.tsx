import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, json } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useState, useEffect } from 'react';
import { Form, useNavigation, useLoaderData, useActionData } from '@remix-run/react';
import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';

// Loader function to enforce authentication and load profile data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  
  // Securely get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If no user or error getting user, redirect to login
  if (userError || !user) {
    console.error("Error getting user or no user in loader:", userError);
    return redirect("/login", { headers: response.headers });
  }

  // Extract first name from user metadata
  const firstName = user.user_metadata?.first_name || null;

  // Return the authenticated user along with headers
  return json({ 
    email: user.email,
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    headers: response.headers,
  });
};

// Action function to handle profile updates
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🚀 Starting settings action...");
  try {
  const response = new Response();

    // Initialize Supabase client with error boundary
    let supabase;
    try {
      console.log("📡 Initializing Supabase client...");
      supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
      console.log("✅ Supabase client initialized");
    } catch (initError) {
      console.error("❌ Failed to initialize Supabase client:", initError);
      return json({ 
        error: "Service initialization failed",
        details: initError instanceof Error ? initError.message : "Unknown error"
      }, { status: 500 });
    }

    // Get user with error boundary
    let user;
    try {
      console.log("🔍 Getting authenticated user...");
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!authUser) throw new Error("No authenticated user found");
      user = authUser;
      console.log("✅ Found authenticated user:", user.id);
    } catch (authError) {
      console.error("❌ Authentication error:", authError);
      return redirect("/login", { headers: response.headers });
    }

    // Process form data
    console.log("📝 Processing form data...");
  const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    console.log("📋 Form data:", { firstName, lastName });

    if (!firstName || !lastName) {
      console.error("❌ Invalid form data - missing required fields");
      return json({ 
        error: "Invalid form data",
        details: "First name and last name are required"
      }, { status: 400 });
    }

    // Update user metadata
    try {
      console.log("🔄 Updating user metadata...");
      const { error: updateError } = await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName }
      });
      if (updateError) throw updateError;
      console.log("✅ User metadata updated successfully");
    } catch (updateError) {
      console.error("❌ Error updating user metadata:", updateError);
      return json({ 
        error: "Failed to update user metadata",
        details: updateError instanceof Error ? updateError.message : "Unknown error"
      }, { status: 500 });
    }

    // Update or create profile
    try {
      console.log("🔄 Checking profile existence...");
      
      // Use the regular client for all operations
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("❌ Error checking existing profile:", fetchError);
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile
        console.log("🔄 Updating existing profile...");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error("❌ Error updating profile:", updateError);
          throw updateError;
        }
        console.log("✅ Profile updated successfully");
      } else {
        // Create new profile
        console.log("🔄 Creating new profile...");
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error("❌ Error creating profile:", insertError);
          throw insertError;
        }
        console.log("✅ Profile created successfully");
      }
    } catch (profileError) {
      console.error("❌ Error managing profile:", profileError);
      return json({ 
        error: "Failed to update profile",
        details: profileError instanceof Error ? profileError.message : "Unknown error",
        errorObject: profileError
      }, { status: 500 });
    }

    console.log("🎉 Settings update completed successfully");
    return json({ success: true }, { 
      headers: response.headers
    });
  } catch (error) {
    console.error("❌ Unexpected error in settings action:", error);
    return json({ 
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error",
      errorObject: error
    }, { status: 500 });
  }
};

// Route component renders the actual page
export default function SettingsRoute() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const { email, firstName, lastName } = useLoaderData<typeof loader>();
  const isSubmitting = navigation.state === "submitting";
  const [showSuccess, setShowSuccess] = useState(false);
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, isLiveConversionEnabled, toggleLiveConversion } = useCurrency();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [currency, setCurrency] = useState(currentCurrency.code);
  const [darkMode, setDarkMode] = useState(theme === 'dark');

  // Show success message when form submission completes
  React.useEffect(() => {
    if (actionData?.success && !isSubmitting) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData, isSubmitting]);

  // Handle preferences update
  const handlePreferencesUpdate = async () => {
    try {
      // Update currency preference
      const selectedCurrency = supportedCurrencies.find(c => c.code === currency);
      if (selectedCurrency && selectedCurrency.code !== currentCurrency.code) {
        setCurrentCurrency(selectedCurrency);
      }
      
      // Update theme preference
      if (darkMode !== (theme === 'dark')) {
        toggleTheme();
      }
      
      toast({
        title: 'Success',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
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
                        defaultValue={firstName}
                        placeholder="Enter your first name"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        name="lastName"
                        defaultValue={lastName}
                        placeholder="Enter your last name"
                        required
                        disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    className="mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
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
                      Automatically convert amounts to the selected currency using live rates
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
                  className="mt-4"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Change your password to keep your account secure
                  </p>
                  <Form action="/auth/reset-password" method="post">
                    <Button type="submit" variant="outline">
                      Reset Password
                    </Button>
                  </Form>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" disabled>
                    Enable 2FA (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {showSuccess && (
          <div className="fixed bottom-4 right-4 flex items-center bg-green-50 px-4 py-2 rounded-lg text-green-700 text-sm shadow-lg">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Profile updated successfully
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 