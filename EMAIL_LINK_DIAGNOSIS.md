# 🔍 Email Link Diagnosis Guide

Your Supabase configuration looks perfect, but you're still getting empty URL parameters. Let's diagnose the email link generation and delivery.

## Possible Issues (Since Config is Correct)

### 1. Email Provider Link Scanning
Some email providers (Outlook, Gmail with corporate security) automatically scan/prefetch links, which can "consume" the reset token.

### 2. Email Template Issues
The email template might not be generating the correct URL format.

### 3. Browser/Security Software
Browser extensions or security software might be stripping parameters.

## Diagnostic Tests

### Test 1: Raw Email Inspection
1. **Open the reset password email**
2. **Right-click → "View Source" or "Show Original"**
3. **Search for "reset-password" in the raw email**
4. **Look for the actual URL in the email**

**What to check:**
- Does the raw email contain `{{.ConfirmationURL}}` instead of an actual URL?
- Does the URL have `#access_token=` in the raw email?

### Test 2: Copy Link Instead of Clicking
1. **Request a new password reset**
2. **Right-click the reset button → "Copy Link"**
3. **Paste it in a text editor to see the full URL**
4. **Manually paste it in browser address bar**

### Test 3: Different Email Client
1. **Forward the reset email to a different email account** (Gmail, Yahoo, etc.)
2. **Try clicking the link from the different client**

### Test 4: Incognito/Private Mode
1. **Open an incognito/private browser window**
2. **Paste the reset link directly**
3. **Check if URL parameters are preserved**

### Test 5: Mobile vs Desktop
1. **Try the reset link on a mobile device**
2. **Compare with desktop behavior**

## Enhanced Debug Features

With the latest updates, you'll now see THREE levels of URL capture:

1. **Page Load Capture (HTML Script)** - Captures URL before any JavaScript runs
2. **React Mount Capture** - Captures URL when React component mounts  
3. **URL Analysis** - Detailed parsing after processing

## Expected Debug Output

If the email link is correct, you should see:

```
Page Load Capture: https://www.kpege.com/reset-password#access_token=eyJ...
React Mount Capture: https://www.kpege.com/reset-password#access_token=eyJ...
Final Analysis: hasTokens=true, hasRecoveryType=true
```

If you see empty hashes at ALL THREE levels, the issue is in:
1. Email generation
2. Email delivery/scanning
3. Browser/security interference

## Debugging Commands

Run these in browser console on the reset password page:

```javascript
// Check all stored URL captures
console.log('Page Load:', JSON.parse(localStorage.getItem('kpege_page_load_url') || '{}'));
console.log('Immediate:', JSON.parse(localStorage.getItem('kpege_immediate_url_capture') || '{}'));
console.log('Debug Info:', JSON.parse(localStorage.getItem('kpege_password_reset_debug') || '{}'));

// Check current URL state
console.log('Current URL:', window.location.href);
console.log('Current Hash:', window.location.hash);
```

## Test a Manual URL

Try this test URL (replace with real tokens from a working system):
```
https://www.kpege.com/reset-password#access_token=test_token&refresh_token=test_refresh&type=recovery&expires_in=3600
```

## Next Steps

1. **Deploy these debugging enhancements**
2. **Request a NEW password reset**
3. **Try Test 2 (copy link instead of clicking)**
4. **Check the enhanced debug output**
5. **Share the results of Test 1 (raw email inspection)**

The multi-level capture will show us exactly where the URL parameters are being lost! 