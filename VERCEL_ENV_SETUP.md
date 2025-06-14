# Vercel Environment Variables Setup

## 🎯 **Add these to your Vercel Dashboard**

Go to: **Vercel Dashboard > Your Project > Settings > Environment Variables**

### **Production Environment Variables**

```bash
# Turnstile Configuration
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABgB5mCMRLQzF7Qf
TURNSTILE_SECRET_KEY=0x4AAAAAABgB5nn9EkiO9wgQk-XhOw06_NA

# Existing Supabase Configuration (should already be set)
VITE_SUPABASE_URL=https://idcgvnwatraddbsppxzl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2d2bndhdHJhZGRic3BweHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMzk4NDUsImV4cCI6MjA1ODcxNTg0NX0.wjxjOeLOa3F4j5OGvWZi8pCutea GBhue1pIp6O0x8u4

# Optional: Analytics
MIXPANEL_PROD_TOKEN=your_mixpanel_token_if_you_have_one
```

## 📋 **Steps to Add in Vercel**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. For each variable above:
   - Click **Add New**
   - Enter the **Name** (e.g., `VITE_TURNSTILE_SITE_KEY`)
   - Enter the **Value** (e.g., `0x4AAAAAABgB5mCMRLQzF7Qf`)
   - Select **Production** environment
   - Click **Save**

## ⚠️ **Important Notes**

- **VITE_** prefixed variables are exposed to the client (this is correct for Turnstile site key)
- **TURNSTILE_SECRET_KEY** is server-side only (no VITE_ prefix)
- Make sure to select **Production** environment for each variable
- After adding all variables, redeploy your application

---

**Next: Configure Supabase Secrets** 