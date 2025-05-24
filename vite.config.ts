import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
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
    plugins: [
      react(),
      // Add a plugin to simulate process.env in the browser
      {
        name: 'vite-plugin-env-compat',
        config: () => ({
          define: {
            'process.env': env
          }
        })
      }
    ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    dedupe: ['react', 'react-dom']
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild",
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
  }
});
