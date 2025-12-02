import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: './', // Use relative paths for assets (needed for Electron)
    server: {
      host: "::",
      port: Number(env.VITE_PORT) || 8080,
    },
    preview: {
      host: "::",
      port: Number(env.VITE_PREVIEW_PORT) || Number(env.VITE_PORT) || 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Ensure proper chunk loading order
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // Strategy: Bundle all React-related code together to avoid dependency issues
            // Only split out very large, clearly non-React libraries
            
            // React and all React-dependent libraries go into react-vendor
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@tanstack/react') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform') ||
              id.includes('node_modules/react-day-picker') ||
              id.includes('node_modules/next-themes') ||
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/react-resizable-panels') ||
              id.includes('node_modules/embla-carousel-react') ||
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/vaul') ||
              id.includes('node_modules/input-otp') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/reactflow') ||
              id.includes('node_modules/@xyflow')
            ) {
              return 'react-vendor';
            }
            
            // ELK.js - exclude from manual chunking (loaded dynamically)
            if (id.includes('node_modules/elkjs')) {
              return undefined;
            }
            
            // Only split out the very largest, clearly standalone libraries
            // Put everything else with React to avoid any dependency issues
            if (id.includes('node_modules/html-to-image')) {
              return 'html-to-image-vendor';
            }
            
            if (id.includes('node_modules/d3-') || id.includes('node_modules/dagre')) {
              return 'd3-vendor';
            }
            
            // Put everything else (including date-fns, zod, clsx, etc.) with React
            // This ensures no cross-chunk dependency issues
            // The react-vendor chunk will be larger, but it's safer
            if (id.includes('node_modules')) {
              return 'react-vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
