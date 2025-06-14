# Super Admin Setup Guide

## 🎯 **Create Super Admin User**

### **Step 1: User Registration**
1. **Go to your production app** (once deployed)
2. **Sign up** with email: `phermmodynamic@gmail.com`
3. **Complete the onboarding process**

### **Step 2: Grant Super Admin Privileges**

Once the user is registered, you need to update their role in the database.

#### **Option A: Using Supabase Dashboard**
1. Go to **Supabase Dashboard** > **Table Editor**
2. Select the **auth.users** table
3. Find the user with email `phermmodynamic@gmail.com`
4. Edit the **raw_user_meta_data** column
5. Add or update the JSON to include: `{"role": "super_admin"}`

#### **Option B: Using SQL Editor**
1. Go to **Supabase Dashboard** > **SQL Editor**
2. Run this query:

```sql
-- Update user to super admin
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb
WHERE email = 'phermmodynamic@gmail.com';

-- Verify the update
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'phermmodynamic@gmail.com';
```

### **Step 3: Verify Super Admin Access**
1. **Log in** to the app with `phermmodynamic@gmail.com`
2. **Go to Settings**
3. **Check if "Admin" tab is visible** - this confirms super admin access
4. **Test Error Logs Viewer** - you should see the error logging interface

## 🔐 **Security Notes**

- Only users with `"role": "super_admin"` in their metadata can access admin features
- The error logs are protected by RLS policies that check for super admin role
- Super admin privileges are required to:
  - View error logs
  - Resolve errors
  - Access admin dashboard features

## ✅ **Verification Checklist**

- [ ] User `phermmodynamic@gmail.com` can sign up and log in
- [ ] User has `"role": "super_admin"` in raw_user_meta_data
- [ ] Admin tab is visible in Settings page
- [ ] Error Logs Viewer loads without errors
- [ ] Can view and resolve error logs
- [ ] Push notifications work for critical errors (if configured) 