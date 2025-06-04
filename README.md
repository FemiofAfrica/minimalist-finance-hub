# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/9e7980c0-6c09-4a72-9fca-0a7fe58c4f4e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9e7980c0-6c09-4a72-9fca-0a7fe58c4f4e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9e7980c0-6c09-4a72-9fca-0a7fe58c4f4e) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# Kpege - Personal Finance Tracker

A modern, AI-powered personal finance management application built with React, TypeScript, and Supabase.

## Features

- 💰 **Expense Tracking**: Track your daily expenses with AI-powered categorization
- 📊 **Financial Analytics**: Visualize your spending patterns with interactive charts
- 🔔 **Subscription Management**: Monitor and manage your recurring subscriptions
- 🤖 **AI-Powered OCR**: Extract transaction data from receipts using advanced OCR
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔒 **Secure Authentication**: Protected with Cloudflare Turnstile captcha
- 🌍 **Multi-Currency Support**: Track expenses in multiple currencies

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudflare Turnstile (Required for Auth)
TURNSTILE_SITE_KEY=your_turnstile_site_key

# OCR Services (Optional)
VITE_OCR_SPACE_API_KEY=your_ocr_space_api_key
GROQ_API_KEY=your_groq_api_key

# Analytics (Optional)
MIXPANEL_PROD_TOKEN=your_mixpanel_production_token
MIXPANEL_DEV_TOKEN=your_mixpanel_development_token
```

### Setup Instructions

1. **Supabase Setup**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key from the dashboard
   - Enable Turnstile in Authentication > Settings

2. **Cloudflare Turnstile Setup**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to Turnstile and create a new site
   - Add your domain(s) to the allowlist
   - Copy the site key (this is public and safe to use client-side)

3. **Optional Services**:
   - **OCR Space**: Get free API key at [ocr.space](https://ocr.space/ocrapi)
   - **Groq**: Get API key at [groq.com](https://groq.com)
   - **Mixpanel**: Set up analytics at [mixpanel.com](https://mixpanel.com)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd minimalist-finance-hub-1

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values

# Start development server
npm run dev
```

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   TURNSTILE_SITE_KEY=your_production_turnstile_site_key
   MIXPANEL_PROD_TOKEN=your_mixpanel_production_token
   ```
3. Deploy!

### Important Security Notes

- `TURNSTILE_SITE_KEY` is public and runs client-side (this is normal for Turnstile)
- Never expose your Supabase service role key or Turnstile secret key
- Use separate Turnstile site keys for development and production

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Security**: Cloudflare Turnstile
- **OCR**: Tesseract.js, OCR.space, Groq Vision
- **Charts**: Recharts
- **Deployment**: Vercel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Default Account Implementation

We've added a default account system to ensure transactions always have an account associated with them. This addresses the "No default account found for the user" error.

### Database Migration

Run the following SQL migration in your Supabase SQL Editor:

```sql
-- Run the migration script to add the is_default column to accounts table
-- Copy the contents of migrations/add_is_default_to_accounts.sql
```

## Account Number Implementation

To support storing account numbers for bank accounts, we've added a new column to the database.

### Database Migration

Run the following SQL migration in your Supabase SQL Editor:

```sql
-- Run the migration script to add the account_number column to accounts table
-- Copy the contents of migrations/add_account_number_to_accounts.sql
```

### Features:

1. Default account management
   - Each user must have one default account
   - Transactions without a specified account will use the default account
   - First account created is automatically set as default
   - Users can change which account is default

2. UI Enhancements
   - Default accounts have visual indicators
   - Default status can be toggled in the account creation/edit dialog
   - When deleting a default account, another account is automatically made default

### Implementation Details:

- Added `is_default` field to accounts table
- Created database triggers to ensure only one default account per user
- Added UI to allow setting an account as default
- Updated account service to handle default account logic
- Visual indicators for default accounts in the UI
- Added `account_number` field to accounts table for storing account numbers

# Kpege - Track Income and Expenses

Welcome to Kpege, an AI-powered, minimalist finance tracking application. This app aims to simplify personal finance management through an intuitive interface and intelligent features.

## Project info

**URL**: https://lovable.dev/projects/9e7980c0-6c09-4a72-9fca-0a7fe58c4f4e
**Website**: www.kpege.com

## Branding Information

The application has been rebranded to "Kpege":

- **Name**: Kpege
- **Website**: www.kpege.com
- **Page Title**: "Kpege | Track income and expenses | Financial insights"
- **Favicon**: The Kpege logo (green square with magnifying glass and "K")

### Updating the Favicon

If you need to update the favicon:

1. Save the Kpege logo as "kpege-logo.png" in the project root
2. Run the conversion script:
   ```
   node convert-kpege-icon.js
   ```
3. Alternatively, use an online tool like [favicon.io](https://favicon.io/favicon-converter/) to convert the image
4. Place the resulting favicon.ico file in the `public` directory
