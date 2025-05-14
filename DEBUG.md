# Debug Features

This document explains how to use and manage debug features in the application.

## ⚠️ CRITICAL: Debug Elements MUST NEVER Be in Production Code

**DO NOT RELY ON ENVIRONMENT VARIABLES** to conditionally hide debug features in production. These can fail and expose debugging tools to users.

**ALWAYS COMPLETELY REMOVE** all debug features before deploying to production:

1. Delete all debug UI elements, not just comment them out or conditionally render
2. Remove all debug function calls and imports
3. Remove debug service imports
4. Run a final review specifically to check for any debug components or functions

## Safe Debugging Approach

The safest approach is to keep debug features in development-only branches:

1. Create a feature branch for development with debug tools
2. When ready for production, create a clean PR that excludes all debug elements
3. Review the PR to ensure no debug features are included
4. Use a pre-commit hook to prevent debug code from being committed

### Recommended Code Markers

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

- Make debug code easy to find
- Use distinctive comments that can be searched for

### Pre-commit Hook Example

Add a pre-commit hook that fails if debug markers are found:

```bash
# Check for debug markers
if grep -r "DEBUG ONLY - REMOVE BEFORE COMMIT" --include="*.tsx" --include="*.ts" ./src; then
  echo "ERROR: Debug markers found. Remove debug code before committing."
  exit 1
fi
```

## Environment-Based Debug Features - DON'T USE FOR PRODUCTION SECURITY

❌ **NEVER RELY ON ENVIRONMENT VARIABLES FOR SECURITY**

Environment variables should only be used for configuration, not for hiding features that should never be accessible to users.

## Additional Debug Controls

If you must use environment variables for non-security-critical configuration:

```bash
VITE_ENABLE_DEBUG_FEATURES=1  # For development
VITE_ENABLE_DEBUG_FEATURES=0  # For production
```

But remember that the safest approach is to physically remove debug code from production builds.

## Recent Production Issue

We had a critical issue where debug buttons appeared in production because:

1. The button was only commented out, not physically removed
2. Debug functions and imports remained in the codebase
3. The code relied on environment variables instead of complete removal

Moving forward, the correct approach is:
1. Delete all debug UI elements completely
2. Remove debug-related functions and imports
3. Use separate development branches for debug features
4. Run specific pre-deployment checks focused on finding debug code 