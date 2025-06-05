# Password Reset Troubleshooting Guide

This guide helps diagnose and fix password reset link issues in the Kpege finance application.

## Problem Summary

Users clicking password reset links from email receive an "Invalid Reset Link" error and are redirected back to login.

## Common Causes & Solutions

### 1. OTP Expired Error (Most Common in Development)

**Issue**: URL shows `error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

**Root Cause**: The password reset link has expired (typically after 1 hour) OR there's a configuration mismatch in Supabase.

**Solutions**:

#### For Development (localhost):
1. **Check Supabase Configuration**:
   - Go to your Supabase project dashboard
   - Navigate to **Authentication → Settings**
   - Set **Site URL** to: `http://localhost:5173`
   - Add to **Redirect URLs**: `http://localhost:5173/reset-password`

2. **Quick Test**: Request a new password reset immediately after configuring the URLs

#### For Production:
1. **Check Supabase Configuration**:
   - Set **Site URL** to: `https://www.kpege.com` (your actual domain)
   - Add to **Redirect URLs**: `https://www.kpege.com/reset-password`

2. **Timing**: Use the reset link within 1 hour of receiving it

### 2. Site URL Configuration Mismatch

**Issue**: Supabase project's Site URL doesn't match your actual deployment URL.

**Solution**:
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Check the "Site URL" field
4. Ensure it matches your domain exactly:
   - Development: `http://localhost:5173`
   - Production: `https://www.kpege.com`
5. Add your reset password URL to "Redirect URLs" list

### 3. Missing Redirect URLs

**Issue**: The reset password page URL is not in the allowed redirect URLs list.

**Solution**:
1. In Supabase dashboard → Authentication → Settings
2. Add these URLs to "Redirect URLs":
   - Development: `http://localhost:5173/reset-password`
   - Production: `https://www.kpege.com/reset-password`

### 4. Email Provider Link Prefetching

**Issue**: Some email providers (like Outlook/Microsoft Defender) automatically "prefetch" links for security, consuming the reset token before the user clicks it.

**Solution**: The system has been updated to handle this, but users should:
1. Click the reset link directly from their email
2. Don't forward the email or copy the link
3. Use the link within a reasonable time (tokens expire after 1 hour)

### 5. Browser/Cache Issues

**Issue**: Browser cache or extensions interfering with the reset process.

**Solution**:
1. Try opening the reset link in an incognito/private browser window
2. Clear browser cache and cookies for your site
3. Disable browser extensions temporarily
4. Try a different browser

## Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| `otp_expired` | Reset link has expired | Request a new reset link, check Supabase config |
| `otp_not_found` | Reset token not found | Check Supabase configuration, request new link |
| `access_denied` | Access denied to reset | Check redirect URLs in Supabase settings |

## Debugging Steps

### Step 1: Check Browser Console

1. Open browser developer tools (F12)
2. Go to Console tab
3. Try the password reset process
4. Look for log messages starting with `[Auth]` or `[ResetPassword]`
5. Check for any error messages

### Step 2: Examine the Reset Link URL

When you receive the reset email:
1. **Don't click the link yet**
2. Right-click and copy the link URL
3. Examine the URL structure:
   - **Valid**: `https://www.kpege.com/reset-password#access_token=xxx&refresh_token=yyy&type=recovery`
   - **Error**: `https://www.kpege.com/reset-password#error=access_denied&error_code=otp_expired`

### Step 3: Verify Environment Configuration

Check that your application has the correct environment variables:

```bash
# Check these environment variables exist and are correct
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Test Configuration

1. Request a password reset
2. Check the browser console logs for the redirect URL being used
3. Compare with what's configured in Supabase
4. Verify the email is actually sent (check spam folder)

## Quick Fixes

### Fix 1: Update Supabase Configuration (Development)

```bash
# Supabase Dashboard Settings:
Site URL: http://localhost:5173
Redirect URLs: 
  - http://localhost:5173/reset-password
```

### Fix 2: Update Supabase Configuration (Production)

```bash
# Supabase Dashboard Settings:
Site URL: https://www.kpege.com
Redirect URLs: 
  - https://www.kpege.com/reset-password
```

### Fix 3: Clear Browser State

```javascript
// Run this in browser console to clear auth state
localStorage.clear();
sessionStorage.clear();
// Then refresh the page and try again
```

### Fix 4: Test with Development Mode

The application includes a development testing mode. If you're in development:

1. Open browser console
2. Look for debug information
3. Check if the URL parsing is working correctly
4. Use the test page at `/test-reset-password`

## Development-Specific Issues

### Local Development Checklist

- [ ] Supabase Site URL is `http://localhost:5173`
- [ ] Redirect URLs include `http://localhost:5173/reset-password`
- [ ] Environment variables are correctly set
- [ ] Using the reset link immediately after receiving it

### Common Development Errors

1. **Forgot to update Supabase URLs**: Most common cause of `otp_expired` in development
2. **Using production URLs in development**: Check that Site URL matches your local server
3. **Case sensitivity**: Ensure URLs match exactly (including http vs https)

## Production Deployment Checklist

- [ ] Site URL in Supabase matches production domain
- [ ] Redirect URLs include `/reset-password` endpoint
- [ ] Email templates are configured with correct `{{ .ConfirmationURL }}`
- [ ] SSL certificate is valid on production domain
- [ ] DNS is properly configured

## Emergency Workaround

If password reset is completely broken, users can:

1. Create a new account with the same email (if the system allows)
2. Use the "Contact Support" option
3. Admin can manually reset passwords from Supabase dashboard

## Contact Information

If the issue persists:
- Check Supabase service status: https://status.supabase.com/
- Review Supabase Auth documentation
- Contact support with:
  - Browser console logs
  - The actual reset link URL (with tokens removed)
  - Supabase project configuration screenshots

## Recent Updates

The system has been updated with:
- Enhanced URL parsing logic
- Better error messages
- Improved debugging information
- Specific error handling for `otp_expired` and other Supabase errors
- Development mode configuration guidance

These updates should resolve most password reset issues, especially the common `otp_expired` error in development. 