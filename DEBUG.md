# Debug Features

This document explains how to use and manage debug features in the application.

## ⚠️ IMPORTANT: Debug Elements Must Be Removed For Production

**DO NOT** rely on environment variables to conditionally hide debug features in production. These can fail and expose debugging tools to users.

Instead, before deployment:
1. Remove all debug UI elements entirely
2. Ensure debug function calls are removed
3. Run a final review to check for any debugging features

## Safe Debugging Approach

### Development-Only Branches

The safest approach is to keep debug features in development-only branches:

1. Create a feature branch for development with debug tools
2. When ready for production, create a clean PR that excludes debug elements
3. Review the PR to ensure no debug features are included

### Using Comments for Local Development

```tsx
// ==== DEBUG ONLY - REMOVE BEFORE COMMIT ====
<Button 
  variant="outline" 
  onClick={handleDebug} 
  className="flex items-center gap-2"
  title="Debug account balances"
>
  <Bug className="h-4 w-4" />
</Button>
// ==== END DEBUG SECTION ====
```

These special comment markers:
- Make debug code easy to find
- Remind developers to remove the code
- Can be detected by linters and pre-commit hooks

## Recommended Pre-Commit Hook

Add a pre-commit hook that fails if debug markers are found:

```bash
#!/bin/sh
# Check for debug markers
if grep -r "DEBUG ONLY - REMOVE BEFORE COMMIT" --include="*.tsx" --include="*.ts" ./src; then
  echo "ERROR: Debug markers found. Remove debug code before committing."
  exit 1
fi
```

## Feature Flags Alternative

For safer handling of features that should be toggled between environments, consider using a feature flag service rather than environment variables.

## Environment-Based Debug Features

Debug features like the debug button in the Accounts & Cards page are configured to only appear in development environments. The application checks `process.env.NODE_ENV` to determine whether to show these features.

### How It Works

In components like `CardsList.tsx`, debug UI elements are conditionally rendered:

```tsx
{process.env.NODE_ENV !== 'production' && (
  <Button 
    variant="outline" 
    onClick={handleDebug} 
    className="flex items-center gap-2"
    title="Debug account balances"
  >
    <Bug className="h-4 w-4" />
  </Button>
)}
```

### Environment Configuration

For local development:
- The app will run in development mode by default
- Debug features will be visible

For production builds:
- Set `NODE_ENV=production` during the build process
- Debug features will be automatically hidden

## Build Configuration

### Vite

If using Vite, production builds automatically set NODE_ENV to 'production'. No additional configuration is needed.

```bash
# Development - debug features visible
npm run dev

# Production - debug features hidden
npm run build
```

### Other Build Systems

For other build systems, ensure NODE_ENV is set appropriately:

```bash
# For production builds
NODE_ENV=production npm run build
```

## Additional Debug Controls

For more granular control, you can create additional environment variables like:

```
VITE_ENABLE_DEBUG_FEATURES=1  # For development
VITE_ENABLE_DEBUG_FEATURES=0  # For production
```

And then check this value in your code:

```tsx
{import.meta.env.VITE_ENABLE_DEBUG_FEATURES === '1' && (
  <DebugComponent />
)}
```

## Git Practices

To avoid accidentally committing debug code:

1. Use pre-commit hooks to check for debug-specific code patterns
2. Consider using feature flags managed by a feature flag service
3. For temporary debug code, use specially formatted comments that linters can detect:

```tsx
// DEBUG_ONLY_REMOVE_BEFORE_COMMIT
<DebugButton />
``` 