/**
 * API Configuration
 * 
 * Base URL for the backend API. Can be configured via environment variable.
 * In Electron, the backend port is dynamically provided by the main process.
 */

// Extend window interface for TypeScript
declare global {
  interface Window {
    electronAPI?: {
      getBackendPort: () => Promise<number>;
      isElectron: boolean;
    };
  }
}

// Get the backend URL (async for Electron, sync otherwise)
let cachedBaseURL: string | null = null;

async function getBackendURL(): Promise<string> {
  if (cachedBaseURL) {
    return cachedBaseURL;
  }

  // Check if running in Electron
  if (window.electronAPI?.isElectron) {
    try {
      const port = await window.electronAPI.getBackendPort();
      cachedBaseURL = `http://localhost:${port}/api`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config.ts:33',message:'Electron backend URL resolved',data:{port,baseURL:cachedBaseURL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return cachedBaseURL;
    } catch (error) {
      console.error('Failed to get backend port from Electron:', error);
    }
  }

  // Fallback to environment variable or default
  cachedBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config.ts:44',message:'Non-Electron backend URL',data:{baseURL:cachedBaseURL,VITE_API_URL:import.meta.env.VITE_API_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  return cachedBaseURL;
}

// Initialize the backend URL on module load (for Electron)
if (window.electronAPI?.isElectron) {
  getBackendURL().then(() => {
    console.log('Backend URL initialized:', cachedBaseURL);
  });
}

export const API_CONFIG = {
  get baseURL(): string {
    // Return cached value synchronously if available
    return cachedBaseURL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  },
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Get full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const baseUrl = API_CONFIG.baseURL.endsWith('/') 
    ? API_CONFIG.baseURL.slice(0, -1) 
    : API_CONFIG.baseURL;
  
  return `${baseUrl}/${cleanEndpoint}`;
}

