# Development Setup Guide

This guide helps you set up the Kpege finance application for local development.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### 3. Start Development Server
```bash
npm run dev
```

## Turnstile (Captcha) in Development

### The Issue
The application uses Cloudflare Turnstile for captcha verification. The verification happens through a Vercel serverless function at `/api/verify-turnstile` which is not available during local development.

### The Solution
The application automatically handles this by:

1. **Mock Verification**: When the API endpoint returns 404 (not found), the system automatically uses mock verification in development mode
2. **Graceful Fallback**: Network errors or API unavailability triggers the mock verification
3. **Development Indicators**: The UI shows when mock verification is being used

### What You'll See

When testing password reset in development, you'll see console messages like:
```
[Turnstile] API endpoint not available in development mode, using mock verification
[Auth] Using development mock verification - this would require real captcha in production
```

This is normal and expected behavior.

## Setting Up Real Turnstile Verification (Optional)

If you want to test with real Turnstile verification in development:

### Option 1: Use Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Run with serverless functions
vercel dev
```

### Option 2: Environment Variables
Add to your `.env` file:
```bash
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### Option 3: Create Local API Endpoint
Create a local Express server or use a tool like `json-server` to mock the API endpoint.

## Testing Password Reset

### Local Testing Steps
1. Go to `http://localhost:5173/login`
2. Click "Forgot Password"
3. Enter an email address
4. Complete the captcha (or it will be mocked automatically)
5. Click "Send Reset Link"

### Expected Behavior
- In development: Mock verification will be used automatically
- Console will show detailed logging of the process
- Toast notification will confirm email was sent

### Testing the Reset Link
Since emails won't be sent in local development, you can test the reset page directly:
1. Go to `http://localhost:5173/test-reset-password` (development only)
2. Test different URL formats to ensure parsing works correctly

## Troubleshooting

### Common Issues

#### 1. "Verification service error: 404 Not Found"
**Expected in development** - The mock verification will automatically kick in.

#### 2. Supabase Connection Errors
Check your `.env` file has the correct Supabase credentials.

#### 3. Captcha Widget Not Loading
Check that `VITE_TURNSTILE_SITE_KEY` is set in your `.env` file.

### Debug Tools

#### Console Logging
Look for messages starting with:
- `[Auth]` - Authentication flow
- `[Turnstile]` - Captcha verification
- `[ResetPassword]` - Password reset page

#### Test Page
Visit `http://localhost:5173/test-reset-password` to debug URL parsing.

## Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Turnstile Verification | Mocked if API unavailable | Real verification |
| Email Sending | Logged to console | Real emails sent |
| Error Logging | Verbose console output | Minimal logging |
| Debug Tools | Test pages available | Hidden |

## Environment Files

### Example .env
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Turnstile Configuration (optional for development)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA... 
TURNSTILE_SECRET_KEY=0x4AAAAAAA... # Only needed for real verification

# Optional: Mixpanel (analytics)
VITE_MIXPANEL_TOKEN=your-mixpanel-token
```

### Security Notes
- Never commit `.env` files to version control
- Use different Turnstile keys for development and production
- The development mock is only active when `import.meta.env.DEV` is true

## Next Steps

1. Start the development server: `npm run dev`
2. Test the password reset flow
3. Check the console for mock verification messages
4. Use the test page at `/test-reset-password` for debugging

The application is designed to work seamlessly in development mode with automatic fallbacks for external services. 