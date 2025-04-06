import { vitePlugin as remix } from "@remix-run/dev";
// import { vercelPreset } from "@vercel/remix/vite"; // Ensure this is removed/commented
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// import react from "@vitejs/plugin-react"; // No longer needed, Remix plugin handles it

export default defineConfig({
  server: {
    port: 8080,
  },
  plugins: [
    remix(), // Ensure no preset is here
    // react(), // Removed redundant React plugin
    tsconfigPaths(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
}); 