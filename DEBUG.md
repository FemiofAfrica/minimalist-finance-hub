# Debug Features

This document explains how to use and manage debug features in the application.

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