# Independent Turnstile Setup Guide (Vercel)

This guide shows how to set up Cloudflare Turnstile independently of Supabase's built-in captcha configuration using **Vercel API routes**.

## Benefits of Independent Setup

- **Better Control**: You control the verification flow
- **Avoid Supabase Issues**: Bypasses Supabase's captcha validation problems
- **More Reliable**: Direct integration with Cloudflare's API
- **Better Error Handling**: Custom error messages and retry logic
- **Vercel Environment Variables**: Proper and secure environment variable support

## Setup Steps

### 1. Set Environment Variables in Vercel

In your Vercel dashboard:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add the following variable:

```bash
# REQUIRED: Your Turnstile secret key (server-side only)
TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here
```

**Important**: 
- `TURNSTILE_SECRET_KEY` is your **secret key** (different from site key)
- Get this from Cloudflare Dashboard > Turnstile > Your Site > Settings
- Keep this secret and never expose it client-side

### 2. Your Local Environment Variables

Your `.env` file should have:

```bash
# Existing variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Turnstile site key (public, client-side)
TURNSTILE_SITE_KEY=your_turnstile_site_key

# For local development testing (optional)
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### 3. Disable Supabase Captcha (Optional)

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

### After (Independent with Vercel)
```
User completes Turnstile → Token verified by Vercel API → Auth action proceeds
                          ✅ Direct verification with Cloudflare
```

## Code Changes Made

1. **New Vercel API Route**: `api/verify-turnstile.js`
   - Verifies tokens directly with Cloudflare
   - Proper environment variable support
   - Better error handling and CORS support

2. **Updated Utility**: `src/utils/turnstileVerification.ts`
   - Now calls Vercel API route instead of Supabase edge function
   - Error message mapping
   - Token format validation

3. **Updated Auth Context**: `src/contexts/AuthContext.tsx`
   - Verifies Turnstile independently before auth actions
   - No longer passes captcha tokens to Supabase
   - Better error handling

## Testing

1. **Local Development**:
   ```bash
   # Start your development server
   npm run dev
   
   # Test the API route (in another terminal)
   curl -X POST "http://localhost:5173/api/verify-turnstile" \
     -H "Content-Type: application/json" \
     -d '{"token":"test_token"}'
   ```

2. **Production Testing**:
   - Deploy to Vercel with environment variable set
   - Complete a Turnstile challenge
   - Check browser console for verification logs
   - Ensure auth actions work smoothly

## Deployment

### Vercel Deployment

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   ```bash
   TURNSTILE_SECRET_KEY=your_turnstile_secret_key
   ```
4. Deploy!

## Troubleshooting

### "Turnstile secret not configured"
- Ensure `TURNSTILE_SECRET_KEY` is set in Vercel environment variables
- Use the **secret key**, not the site key
- Redeploy after setting environment variables

### "Failed to verify with Turnstile service"
- Check Cloudflare's Turnstile service status
- Verify your secret key is correct
- Check domain configuration in Cloudflare dashboard

### API route not found (404)
- Ensure `api/verify-turnstile.js` exists in your project
- Check Vercel function logs in dashboard

### CORS errors
- The API route includes CORS headers for development
- For production, consider restricting origins to your domain

## Cleanup (Optional)

Since we're now using Vercel instead of Supabase edge functions, you can remove:

```bash
# Remove the Supabase edge function (optional)
rm -rf supabase/functions/verify-turnstile/
```

## Benefits Achieved

✅ **No more "timeout-or-duplicate" errors**
✅ **Independent captcha verification**
✅ **Proper environment variable support via Vercel**
✅ **Better error messages**
✅ **More reliable auth flow**
✅ **Full control over verification logic**
✅ **Easy deployment and scaling with Vercel** 