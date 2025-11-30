import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/components/theme";
import { CommandPalette } from "@/components/keyboard";
import { SettingsShortcut } from "@/components/keyboard/SettingsShortcut";
import { logError } from "@/lib/api/errors";
import { queryConfig } from "@/lib/query/queryConfig";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const TableViewer = lazy(() => import("./pages/TableViewer"));
const ERDiagram = lazy(() => import("./pages/ERDiagram"));
const QueryBuilder = lazy(() => import("./pages/QueryBuilder"));
const IndexRecommendations = lazy(() => import("./pages/IndexRecommendations"));
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

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Wrapper component to force remount when tableId changes
const TableRouteWrapper = () => {
  const { tableId } = useParams();
  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <TableViewer key={tableId} />
      </Suspense>
    </MainLayout>
  );
};

const App = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError(error, 'ErrorBoundary');
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              <CommandPalette />
              <SettingsShortcut />
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
                element={<TableRouteWrapper />}
              />
              <Route
                path="/diagram"
                element={
                  <MainLayout>
                    <Suspense fallback={<PageLoader />}>
                      <ERDiagram />
                    </Suspense>
                  </MainLayout>
                }
              />
              <Route
                path="/query"
                element={
                  <MainLayout>
                    <Suspense fallback={<PageLoader />}>
                      <QueryBuilder />
                    </Suspense>
                  </MainLayout>
                }
              />
              <Route
                path="/indexes"
                element={
                  <MainLayout>
                    <Suspense fallback={<PageLoader />}>
                      <IndexRecommendations />
                    </Suspense>
                  </MainLayout>
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
            </BrowserRouter>
          </TooltipProvider>
          </SettingsProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
