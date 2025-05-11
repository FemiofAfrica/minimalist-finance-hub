# TypeScript Configuration Guide

## Overview

This project uses TypeScript with a configuration designed to handle deep type instantiation errors and declaration file issues. The setup allows the application to build correctly even when TypeScript reports errors.

## Key Configuration Details

The main `tsconfig.json` settings that help manage type errors:

```json
{
  "compilerOptions": {
    "noEmit": true,           // TypeScript doesn't output JS files (Vite handles this)
    "declaration": false,     // Prevents generation of .d.ts files
    "skipLibCheck": true,     // Skips type checking of library declaration files
    "strict": false,          // Relaxed type checking for more flexibility
    "typeRoots": ["./node_modules/@types"],
    "maxNodeModuleJsDepth": 1 // Limits depth of node_modules type checking
  },
  "exclude": ["node_modules", "supabase/functions", "dist"]
}
```

## Build Process

We've separated type checking from the build process:

- `npm run build` - Just builds the application with Vite, ignoring TypeScript errors
- `npm run type-check` - Runs TypeScript type checking without emitting files
- `npm run build:ci` - Runs type checking (but continues on errors) and then builds

## Handling Deep Type Instantiation Errors

For complex type issues, particularly with Supabase queries, we use one of these approaches:

1. Type assertions:
   ```typescript
   const { data, error } = await supabase.from('table')... as unknown as { 
     data: MyType[]; 
     error: Error | null;
   };
   ```

2. The `supabaseAny` helper:
   ```typescript
   const { data, error } = await supabaseAny.from('table')...
   ```

3. Using `@ts-expect-error` for specific lines:
   ```typescript
   // @ts-expect-error - Suppressing deep instantiation error
   const { data, error } = await supabase.from('table')...
   ```

## Deno Files

For Supabase Edge Functions using Deno, we:

1. Add `// @ts-nocheck` at the top of the file
2. Created separate configuration in `/supabase/functions`

## Recommendation

When working with TypeScript in this project:

1. Run `npm run type-check` to see type errors before committing
2. Use type assertions to fix specific errors
3. Don't rely on the absence of red squiggles in your editor to guarantee type safety 