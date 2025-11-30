import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: Number(env.VITE_PORT) || 8080,
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
          manualChunks: (id) => {
            // React and React DOM
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            
            // React Router
            if (id.includes('node_modules/react-router')) {
              return 'router-vendor';
            }
            
            // React Query
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'query-vendor';
            }
            
            // ReactFlow (large library)
            if (id.includes('node_modules/reactflow') || id.includes('node_modules/@xyflow')) {
              return 'reactflow-vendor';
            }
            
            // ELK.js - exclude from manual chunking to allow dynamic import code splitting
            // It will be loaded on-demand when hierarchical layout is used
            if (id.includes('node_modules/elkjs')) {
              return undefined; // Let Vite handle dynamic import splitting
            }
            
            // Recharts (charting library)
            if (id.includes('node_modules/recharts')) {
              return 'recharts-vendor';
            }
            
            // Radix UI components (split into one chunk)
            if (id.includes('node_modules/@radix-ui')) {
              return 'radix-vendor';
            }
            
            // Other large UI libraries
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            
            if (id.includes('node_modules/html-to-image')) {
              return 'html-to-image-vendor';
            }
            
            // Form libraries
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
              return 'forms-vendor';
            }
            
            // Date libraries
            if (id.includes('node_modules/date-fns') || id.includes('node_modules/react-day-picker')) {
              return 'date-vendor';
            }
            
            // Virtual scrolling
            if (id.includes('node_modules/@tanstack/react-virtual')) {
              return 'virtual-vendor';
            }
            
            // Split other large libraries that might be in vendor chunk
            // ReactFlow dependencies
            if (id.includes('node_modules/d3-') || id.includes('node_modules/dagre')) {
              return 'd3-vendor';
            }
            
            // Zod (validation library - used in many places but can be split)
            if (id.includes('node_modules/zod')) {
              return 'zod-vendor';
            }
            
            // Sonner (toast notifications)
            if (id.includes('node_modules/sonner')) {
              return 'sonner-vendor';
            }
            
            // Other node_modules (but exclude ELK.js which is handled by dynamic import)
            if (id.includes('node_modules') && !id.includes('node_modules/elkjs')) {
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Increase limit to 1MB since we're splitting chunks
    },
  };
});
