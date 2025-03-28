import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    open: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8080,
      clientPort: 8080,
      timeout: 30000,
      overlay: false,
      webSocketServer: {
        options: {
          perMessageDeflate: false
        }
      }
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
