import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0',
    port: 8080,
    open: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8080,
      clientPort: 8080,
<<<<<<< Updated upstream
      timeout: 30000,
      overlay: false,
      webSocketServer: {
        options: {
          perMessageDeflate: false
        }
      }
=======
      timeout: 60000,
      overlay: true
>>>>>>> Stashed changes
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild"
  }
}));
