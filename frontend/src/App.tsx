
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContentArea } from "@/components/layout/ContentArea";
import { ThemeProvider } from "@/components/theme";
import { SettingsShortcut } from "@/components/keyboard/SettingsShortcut";
import { logError } from "@/lib/api/errors";
import { queryConfig } from "@/lib/query/queryConfig";


// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const TableViewer = lazy(() => import("./pages/TableViewer"));
const FunctionViewer = lazy(() => import("./pages/FunctionViewer"));
const ViewViewer = lazy(() => import("./pages/ViewViewer"));
const IndexViewer = lazy(() => import("./pages/IndexViewer"));
const EnumViewer = lazy(() => import("./pages/EnumViewer"));
const ERDiagram = lazy(() => import("./pages/ERDiagram"));
const QueryBuilder = lazy(() => import("./pages/QueryBuilder"));
const IndexRecommendations = lazy(() => import("./pages/IndexRecommendations"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryConfig.retry.queries.attempts,
      retryDelay: queryConfig.retry.queries.delay,
      refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
      refetchOnReconnect: queryConfig.refetch.onReconnect,
      refetchOnMount: queryConfig.refetch.onMount,
      staleTime: queryConfig.staleTime.fresh,
      gcTime: queryConfig.cacheTime.medium, // Renamed from cacheTime in v5
    },
    mutations: {
      retry: queryConfig.retry.mutations.attempts,
    },
  },
});

// Loading fallback component with smooth transition
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px] animate-fade-in">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Wrapper component - no key prop to allow component reuse for smooth transitions
const TableRouteWrapper = () => {
  return <TableViewer />;
};

const App = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:60',message:'App component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  return (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:69',message:'ErrorBoundary caught error',data:{error:error.message,stack:error.stack,componentStack:errorInfo?.componentStack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      logError(error, 'ErrorBoundary');
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* #region agent log */}
      {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:76',message:'ThemeProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{}); return null; })()}
      {/* #endregion */}
      <QueryClientProvider client={queryClient}>
        {/* #region agent log */}
        {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:79',message:'QueryClientProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{}); return null; })()}
        {/* #endregion */}
        <ConnectionProvider>
          {/* #region agent log */}
          {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:84',message:'ConnectionProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{}); return null; })()}
          {/* #endregion */}
          <SettingsProvider>
            {/* #region agent log */}
            {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:89',message:'SettingsProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{}); return null; })()}
            {/* #endregion */}
            <TooltipProvider>
              {/* #region agent log */}
              {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:92',message:'TooltipProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{}); return null; })()}
              {/* #endregion */}
              <Toaster />
              <Sonner />
              {/* #region agent log */}
              {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:99',message:'About to render HashRouter',data:{href:window.location.href},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{}); return null; })()}
              {/* #endregion */}
              <HashRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              {/* #region agent log */}
              {(() => { fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:109',message:'HashRouter rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{}); return null; })()}
              {/* #endregion */}
              <SettingsShortcut />
            <AppLayout>
              <ContentArea>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Index />
                      </Suspense>
                    } 
                  />
                  <Route
                    path="/table/:tableId"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <TableRouteWrapper />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/function/:functionId"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <FunctionViewer />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/view/:viewId"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ViewViewer />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/index/:indexId"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <IndexViewer />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/enum/:enumId"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <EnumViewer />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/diagram"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ERDiagram />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/query"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <QueryBuilder />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/indexes"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <IndexRecommendations />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Settings />
                      </Suspense>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route 
                    path="*" 
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <NotFound />
                      </Suspense>
                    } 
                  />
                </Routes>
              </ContentArea>
            </AppLayout>
            </HashRouter>
          </TooltipProvider>
          </SettingsProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
};

export default App;
