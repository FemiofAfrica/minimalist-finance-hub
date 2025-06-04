# Independent Turnstile Setup Guide

This guide shows how to set up Cloudflare Turnstile independently of Supabase's built-in captcha configuration.

## Benefits of Independent Setup

- **Better Control**: You control the verification flow
- **Avoid Supabase Issues**: Bypasses Supabase's captcha validation problems
- **More Reliable**: Direct integration with Cloudflare's API
- **Better Error Handling**: Custom error messages and retry logic

## Setup Steps

### 1. Deploy the Verification Edge Function

```bash
# Deploy the new edge function
supabase functions deploy verify-turnstile
```

### 2. Set Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and add:

```bash
# REQUIRED: Your Turnstile secret key (server-side only)
TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here
```

**Important**: 
- `TURNSTILE_SECRET_KEY` is your **secret key** (different from site key)
- Get this from Cloudflare Dashboard > Turnstile > Your Site > Settings
- Keep this secret and never expose it client-side

### 3. Update Environment Variables

Your `.env` file should have:

```bash
# Existing variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Turnstile site key (public, client-side)
TURNSTILE_SITE_KEY=your_turnstile_site_key

# Other optional variables...
```

### 4. Disable Supabase Captcha (Optional)

In your Supabase dashboard:
1. Go to Authentication > Settings
2. Under "Security and Protection"
3. Disable "Enable Captcha protection"

This prevents conflicts with your independent implementation.

## How It Works

### Before (Problematic)
```
User completes Turnstile → Token passed to Supabase → Supabase validates → Auth action
                          ❌ Supabase often rejects valid tokens
```

### After (Independent)
```
User completes Turnstile → Token verified by your edge function → Auth action proceeds
                          ✅ Direct verification with Cloudflare
```

## Code Changes Made

1. **New Edge Function**: `supabase/functions/verify-turnstile/index.ts`
   - Verifies tokens directly with Cloudflare
   - Better error handling
   - CORS support

2. **New Utility**: `src/utils/turnstileVerification.ts`
   - Client-side verification helper
   - Error message mapping
   - Token format validation

3. **Updated Auth Context**: `src/contexts/AuthContext.tsx`
   - Verifies Turnstile independently before auth actions
   - No longer passes captcha tokens to Supabase
   - Better error handling

## Testing

1. **Local Development**:
   ```bash
   # Start Supabase locally
   supabase start
   
   # Deploy functions locally
   supabase functions deploy verify-turnstile --no-verify-jwt
   
   # Test the function
   curl -X POST "http://localhost:54321/functions/v1/verify-turnstile" \
     -H "Content-Type: application/json" \
     -d '{"token":"test_token"}'
   ```

2. **Production Testing**:
   - Complete a Turnstile challenge
   - Check browser console for verification logs
   - Ensure auth actions work smoothly

## Rollback Plan

If you need to rollback:

1. Revert `AuthContext.tsx` changes
2. Re-enable Supabase captcha in dashboard
3. Remove the edge function:
   ```bash
   supabase functions delete verify-turnstile
   ```

## Troubleshooting

### "Turnstile secret not configured"
- Ensure `TURNSTILE_SECRET_KEY` is set in Supabase dashboard
- Use the **secret key**, not the site key

### "Failed to verify with Turnstile service"
- Check Cloudflare's Turnstile service status
- Verify your secret key is correct
- Check domain configuration in Cloudflare dashboard

### Edge function not found
- Deploy the function: `supabase functions deploy verify-turnstile`
- Check function exists in Supabase dashboard

### CORS errors
- The edge function includes CORS headers
- Ensure your domain is in Turnstile's allowed domains list

## Benefits Achieved

✅ **No more "timeout-or-duplicate" errors**
✅ **Independent captcha verification**
✅ **Better error messages**
✅ **More reliable auth flow**
✅ **Full control over verification logic** 