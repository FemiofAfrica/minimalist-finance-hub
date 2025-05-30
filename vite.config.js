import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for use in config
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  // Get the Supabase URL from environment variables
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://idcgvnwatraddbsppxzl.supabase.co';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Proxy API requests to avoid CORS issues in development
      proxy: {
        // Handle proxy for Supabase functions
        '/api/proxy/analyze-document': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => '/functions/v1/analyze-document',
          headers: {
            'apikey': env.VITE_SUPABASE_ANON_KEY || '',
          },
        },
      },
      cors: {
        origin: ['http://localhost:5173', 'https://www.kpege.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'],
      }
    },
  };
}); 