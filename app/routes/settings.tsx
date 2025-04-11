import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, json } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useState, useEffect } from 'react';
import { Form, useNavigation, useLoaderData, useActionData } from '@remix-run/react';
import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    return redirect("/login", { headers: response.headers });
  }

  // Extract first name from user metadata
  const firstName = user.user_metadata?.first_name || null;

  return json({ 
    email: user.email,
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    headers: response.headers,
  });
};

// Action function to handle profile updates
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const response = new Response();

    let supabase;
    try {
      supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
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
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!authUser) throw new Error("No authenticated user found");
      user = authUser;
    } catch (authError) {
      console.error("❌ Authentication error:", authError);
      return redirect("/login", { headers: response.headers });
    }

    // Process form data
    console.log("📝 Processing form data...");
    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    if (!firstName || !lastName) {
      return json({ 
        error: "Invalid form data",
        details: "First name and last name are required"
      }, { status: 400 });
    }

    // Update user metadata
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName }
      });
      if (updateError) throw updateError;
    } catch (updateError) {
      console.error("❌ Error updating user metadata:", updateError);
      return json({ 
        error: "Failed to update user metadata",
        details: updateError instanceof Error ? updateError.message : "Unknown error"
      }, { status: 500 });
    }

    // Update or create profile
    try {
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
      } else {
        // Create new profile
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
      }
    } catch (profileError) {
      console.error("❌ Error managing profile:", profileError);
      return json({ 
        error: "Failed to update profile",
        details: profileError instanceof Error ? profileError.message : "Unknown error",
        errorObject: profileError
      }, { status: 500 });
    }
    
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
  const { toast } = useToast();
  
  // Show success message when form submission completes
  React.useEffect(() => {
    if (actionData?.success && !isSubmitting) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData, isSubmitting]);

  return (
    <DashboardLayout firstName={firstName}>
      <div className="space-y-6">
        <div className="flex justify-center">
           <Tabs defaultValue="profile" className="w-[400px]">
             <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences" disabled>Preferences</TabsTrigger>
              <TabsTrigger value="security" disabled>Security</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
               <Form method="post">
                 <Card>
                   <CardHeader>
                     <CardTitle>Profile</CardTitle>
                     <CardDescription>Update your personal information.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      {showSuccess && (
                        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                          Profile updated successfully!
                        </div>
                      )}
                      {actionData?.error && (
                        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                          Error: {actionData.error} {actionData.details ? `(${actionData.details})` : ''}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" name="firstName" defaultValue={firstName ?? ''} required />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" name="lastName" defaultValue={lastName ?? ''} required />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" value={email ?? ''} readOnly disabled />
                      </div>
                   </CardContent>
                   <CardFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                     </Button>
                   </CardFooter>
                 </Card>
              </Form>
            </TabsContent>
            <TabsContent value="preferences">
               {/* Preferences content here (e.g., currency, theme) */}
            </TabsContent>
             <TabsContent value="security">
                {/* Security content here (e.g., password change) */}
            </TabsContent>
           </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
} 