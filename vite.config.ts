import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/remix/vite";
// import react from "@vitejs/plugin-react"; // No longer needed, Remix plugin handles it

installGlobals();

export default defineConfig({
  server: {
    port: 8080,
  },
  plugins: [
    remix({
      presets: [vercelPreset()],
      // Ensure assets are properly handled
      assetsBuildDirectory: "public/build",
      publicPath: "/build/",
      serverBuildPath: "build/index.js",
    }),
    // react(), // Removed redundant React plugin
    tsconfigPaths(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Add build configuration for proper asset handling
  build: {
    assetsDir: "build",
    rollupOptions: {
      output: {
        assetFileNames: "build/[name]-[hash][extname]",
        chunkFileNames: "build/[name]-[hash].js",
        entryFileNames: "build/[name]-[hash].js",
      },
    },
  },
}); 