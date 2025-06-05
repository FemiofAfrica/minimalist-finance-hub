# 🔍 Production Reset Link Debugging Guide

## Check These Exact Settings in Supabase Dashboard

### Authentication → URL Configuration

**Site URL:** (Must match your Vercel domain exactly)
```
❌ Wrong: http://your-app.vercel.app (missing HTTPS)
❌ Wrong: https://your-app.vercel.app/ (trailing slash)  
❌ Wrong: https://localhost:5173 (wrong domain)
✅ Correct: https://your-app.vercel.app
```

**Redirect URLs:** (Add ALL of these)
```
https://your-app.vercel.app/reset-password
https://your-app.vercel.app/reset-password/*
https://your-app.vercel.app/**
```

## Common URL Format Issues

### What the reset link should look like:
```
https://your-app.vercel.app/reset-password#access_token=abc123...&expires_in=3600&refresh_token=def456...&token_type=bearer&type=recovery
```

### If you see this format, it's wrong:
```
❌ http://... (should be https)
❌ localhost:... (should be your production domain)
❌ .../reset-password?error=... (indicates Supabase rejected the link)
```

## Debug Steps

1. **Copy the EXACT URL from browser when you click email link**
2. **Check if domain matches your Supabase Site URL setting**
3. **Verify HTTPS vs HTTP**
4. **Look for error parameters in URL**

## Quick Test
Try manually visiting: `https://your-app.vercel.app/reset-password`
- Should show the password reset form in production
- If it shows "Reset Link Problem", the issue is URL validation 