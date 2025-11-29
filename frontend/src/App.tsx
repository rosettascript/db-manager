import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import TableViewer from "./pages/TableViewer";
import ERDiagram from "./pages/ERDiagram";
import QueryBuilder from "./pages/QueryBuilder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/table/:tableId"
            element={
              <MainLayout>
                <TableViewer />
              </MainLayout>
            }
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
