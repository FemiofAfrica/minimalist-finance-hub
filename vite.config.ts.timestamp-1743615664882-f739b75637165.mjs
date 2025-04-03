// vite.config.ts
import { defineConfig } from "file:///Users/macbook/Documents/FinTrack/minimalist-finance-hub-1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/macbook/Documents/FinTrack/minimalist-finance-hub-1/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/Users/macbook/Documents/FinTrack/minimalist-finance-hub-1";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    open: false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
      clientPort: 8080,
      timeout: 3e4,
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
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild"
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9vay9Eb2N1bWVudHMvRmluVHJhY2svbWluaW1hbGlzdC1maW5hbmNlLWh1Yi0xXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWFjYm9vay9Eb2N1bWVudHMvRmluVHJhY2svbWluaW1hbGlzdC1maW5hbmNlLWh1Yi0xL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9tYWNib29rL0RvY3VtZW50cy9GaW5UcmFjay9taW5pbWFsaXN0LWZpbmFuY2UtaHViLTEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgb3BlbjogZmFsc2UsXG4gICAgaG1yOiB7XG4gICAgICBwcm90b2NvbDogJ3dzJyxcbiAgICAgIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICAgICAgcG9ydDogODA4MCxcbiAgICAgIGNsaWVudFBvcnQ6IDgwODAsXG4gICAgICB0aW1lb3V0OiAzMDAwMCxcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgICAgd2ViU29ja2V0U2VydmVyOiB7XG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBwZXJNZXNzYWdlRGVmbGF0ZTogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpXG4gICAgfVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogXCJkaXN0XCIsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIG1pbmlmeTogXCJlc2J1aWxkXCJcbiAgfVxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLG9CQUFvQjtBQUM3WCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLE1BQ1osU0FBUztBQUFBLE1BQ1QsU0FBUztBQUFBLE1BQ1QsaUJBQWlCO0FBQUEsUUFDZixTQUFTO0FBQUEsVUFDUCxtQkFBbUI7QUFBQSxRQUNyQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxFQUNWO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
