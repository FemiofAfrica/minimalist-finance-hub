# Cloudflare Turnstile Domain Configuration Fix

## Issue Description

The Cloudflare Turnstile captcha is not loading on the production site (kpege.com) but works fine on localhost. This typically indicates a domain configuration mismatch.

## Root Cause

Cloudflare Turnstile requires explicit domain allowlisting in the Cloudflare dashboard. If the production domain is not properly configured, the captcha widget will fail to load.

## Solution Steps

### 1. Check Current Turnstile Configuration

Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) → Turnstile → Your Site:

**Current Configuration Needed:**
- **Site Name**: Kpege Production
- **Domain**: `kpege.com` AND `www.kpege.com`
- **Widget Mode**: Managed (recommended)
- **Pre-Clearance**: Enabled (optional, for better UX)

### 2. Add Production Domains

In the Turnstile site configuration, ensure these domains are added:

```
kpege.com
www.kpege.com
```

**Important Notes:**
- ✅ DO include both `kpege.com` and `www.kpege.com`
- ✅ DO NOT include `https://` in the domain list
- ✅ DO NOT include trailing slashes `/`
- ✅ Use separate entries for each subdomain

### 3. Verify Environment Variables

#### Production (Vercel Dashboard)
Ensure these environment variables are set in Vercel:

```bash
VITE_TURNSTILE_SITE_KEY=your_production_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

#### Local Development (.env file)
```bash
VITE_TURNSTILE_SITE_KEY=your_development_or_production_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### 4. Site Key Configuration

You have two options for site keys:

#### Option A: Single Site Key (Recommended)
Use one site key for both development and production:
- **Domains**: `localhost`, `127.0.0.1`, `kpege.com`, `www.kpege.com`
- **Advantage**: Simpler management, works everywhere

#### Option B: Separate Site Keys
- **Development Site**: `localhost`, `127.0.0.1`
- **Production Site**: `kpege.com`, `www.kpege.com`
- **Advantage**: Better security separation

### 5. Debugging Steps

#### Check Console Errors
Open browser developer tools on production and look for:
```
Failed to load resource: https://challenges.cloudflare.com/turnstile/v0/api.js
Turnstile error: [10008] Invalid site key
```

#### Network Tab
Check if the Turnstile script is loading:
- ✅ Should see requests to `challenges.cloudflare.com`
- ❌ If blocked or 404, domain configuration is wrong

#### Test Environment Variable Access
Add this temporary debug code to Login.tsx:
```javascript
console.log('Turnstile Site Key:', import.meta.env.VITE_TURNSTILE_SITE_KEY);
```

### 6. Common Issues & Solutions

#### Issue: "Invalid site key" error
**Solution**: Verify the site key matches the one in Cloudflare dashboard

#### Issue: Captcha shows "Invalid domain"
**Solution**: Add the exact domain (without protocol) to Cloudflare Turnstile site configuration

#### Issue: Works on localhost but not production
**Solution**: Ensure production domain is added to the allowlist

#### Issue: Environment variable not found
**Solution**: Check Vercel environment variables are set and deployed

### 7. Testing the Fix

1. **Deploy the updated configuration**:
   ```bash
   git add .
   git commit -m "Fix Turnstile domain configuration"
   git push
   ```

2. **Wait for Vercel deployment** (2-3 minutes)

3. **Test on production site**:
   - Visit `https://kpege.com/login`
   - Check if captcha widget loads
   - Try completing the captcha
   - Verify no console errors

4. **Test different browsers**:
   - Chrome/Edge
   - Firefox  
   - Safari
   - Dia browser (as mentioned in the issue)

### 8. Validation Checklist

- [ ] Production domains added to Cloudflare Turnstile
- [ ] Environment variables set in Vercel dashboard
- [ ] Vite config properly exposes VITE_TURNSTILE_SITE_KEY
- [ ] No console errors on production site
- [ ] Captcha widget loads and functions
- [ ] Form submission works with captcha

### 9. Expected Behavior After Fix

- ✅ Captcha widget loads on production site
- ✅ No "Invalid site key" console errors
- ✅ Form submission works with completed captcha
- ✅ Works across different browsers including Dia browser

## Files Modified

1. `vite.config.js` - Fixed environment variable exposure
2. This documentation file for future reference

## Next Steps

After implementing this fix:
1. Test thoroughly on production
2. Update any documentation that references Turnstile setup
3. Consider implementing monitoring for captcha failures
4. Document the final working configuration for team reference

## Issue Update

✅ **Domain Configuration**: Verified to be correct with `kpege.com`, `www.kpege.com`, and `localhost`
✅ **Environment Variables**: Confirmed to be set properly in Vercel
✅ **Vite Configuration**: Fixed to properly expose `VITE_TURNSTILE_SITE_KEY`

The issue appears to be browser-specific (Dia browser) rather than configuration-related.

## Debugging Steps Added

### 1. Console Logging
Added comprehensive debug logging to help identify the exact issue:

```javascript
[Turnstile Debug] Environment check: {
  siteKey: 'Present/Missing',
  siteKeyFirst10: 'first 10 chars...',
  hostname: 'current domain',
  protocol: 'https/http',
  userAgent: 'browser detection'
}
```

### 2. Script Loading Check
Automatically checks if Turnstile scripts are loading:
```javascript
[Turnstile Debug] Script elements found: count
[Turnstile Debug] Script 0: https://challenges.cloudflare.com/...
```

### 3. Error Handling
Enhanced error logging with browser and domain context:
```javascript
[Turnstile] Error: error details
[Turnstile] User Agent: browser info
[Turnstile] Current Domain: hostname
[Turnstile] Site Key: first 10 chars...
``` 