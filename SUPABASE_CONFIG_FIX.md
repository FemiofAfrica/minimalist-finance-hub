# 🔧 Fix Supabase Configuration for Password Reset

Based on your debug info, your reset password URLs are being stripped of parameters. This is a **Supabase configuration issue**.

## Debug Info Analysis
Your URL: `https://www.kpege.com/reset-password#` (notice the empty hash)
This means Supabase generated a URL with tokens, but they were stripped due to configuration mismatch.

## Step 1: Check Your Supabase Dashboard

1. **Go to your Supabase project**: https://app.supabase.com/project/idcgvnwatraddbsppxzl
2. **Navigate to**: Authentication → Settings → URL Configuration

## Step 2: Verify Site URL

**Current Setting Should Be:**
```
Site URL: https://www.kpege.com
```

**Common Mistakes:**
- ❌ `http://www.kpege.com` (missing HTTPS)
- ❌ `https://www.kpege.com/` (trailing slash)
- ❌ `http://localhost:5173` (wrong for production)

## Step 3: Update Redirect URLs

**Add ALL of these to your Redirect URLs list:**
```
https://www.kpege.com/reset-password
https://www.kpege.com/reset-password/*
https://www.kpege.com/**
```

## Step 4: Test the Configuration

After updating the settings:

1. **Wait 2-3 minutes** for changes to propagate
2. **Request a new password reset** (old links won't work)
3. **Click the new reset link from email**
4. **Check the debug info again**

## Step 5: Verify Email Template

Your email should contain a link like:
```
https://www.kpege.com/reset-password#access_token=eyJ...&refresh_token=eyJ...&type=recovery&expires_in=3600
```

If it doesn't have tokens after the `#`, the configuration is still wrong.

## Step 6: Additional Troubleshooting

If the issue persists:

### A. Check Email Raw Source
1. Right-click the email and "View Source" or "Show Original"
2. Look for the actual URL in the raw email
3. Verify it has the tokens in the URL

### B. Test with Different Email Client
1. Try the reset link in a different email client
2. Some corporate email systems strip URL parameters

### C. Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Look for any authentication errors around the time you clicked the link

## Expected Result

After fixing the configuration, your debug info should show:
```json
{
  "windowHash": "#access_token=eyJ...&refresh_token=eyJ...&type=recovery",
  "hasTokens": true,
  "hasRecoveryType": true,
  "isValid": true
}
```

## Quick Test Commands

You can also test this in your browser console after clicking a reset link:

```javascript
// Check what's actually in the URL
console.log('Full URL:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Has tokens:', window.location.hash.includes('access_token'));
```

## Contact Support

If you're still having issues after following these steps, the debug info shows:
- Time: 2025-06-05T10:44:15.864Z
- Action: no_tokens_found_direct_visit  
- URL: https://www.kpege.com/reset-password#

This confirms the configuration issue - the `#` indicates Supabase tried to add parameters but they were rejected due to URL mismatch. 