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

# FinTrack - Minimalist Finance Hub

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
