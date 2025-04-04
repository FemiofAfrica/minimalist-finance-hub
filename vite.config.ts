import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '127.0.0.1',
    port: 8080,
    open: false,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
      ],
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 8080,
      clientPort: 8080,
      timeout: 60000,
      overlay: true,
      webSocketServer: {
        options: {
          perMessageDeflate: false
        }
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    dedupe: ['react', 'react-dom']
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild"
  }
}));
