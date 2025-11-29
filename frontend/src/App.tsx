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
import Index from "./pages/Index";
import TableViewer from "./pages/TableViewer";
import ERDiagram from "./pages/ERDiagram";
import QueryBuilder from "./pages/QueryBuilder";
import ApiTest from "./pages/ApiTest";
import StateManagementTest from "./pages/StateManagementTest";
import UIUXTest from "./pages/UIUXTest";
import NotFound from "./pages/NotFound";
import { logError } from "@/lib/api/errors";
import { queryConfig } from "@/lib/query/queryConfig";

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

// Wrapper component to force remount when tableId changes
const TableRouteWrapper = () => {
  const { tableId } = useParams();
  return (
    <MainLayout>
      <TableViewer key={tableId} />
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
              <Route path="/" element={<Index />} />
              <Route
                path="/table/:tableId"
                element={<TableRouteWrapper />}
              />
              <Route
                path="/diagram"
                element={
                  <MainLayout>
                    <ERDiagram />
                  </MainLayout>
                }
              />
              <Route
                path="/query"
                element={
                  <MainLayout>
                    <QueryBuilder />
                  </MainLayout>
                }
              />
              <Route path="/api-test" element={<ApiTest />} />
              <Route path="/state-test" element={<StateManagementTest />} />
              <Route path="/ui-ux-test" element={<UIUXTest />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
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
