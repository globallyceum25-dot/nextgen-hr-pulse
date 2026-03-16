import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Analytics from "@/pages/Analytics";
import Employees from "@/pages/Employees";
import NotFound from "@/pages/NotFound";
import Administration from "@/pages/admin/Administration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          {({ selectedSector }) => (
            <Routes>
              <Route path="/" element={<Dashboard selectedSector={selectedSector} />} />
              <Route path="/tasks" element={<Tasks selectedSector={selectedSector} />} />
              <Route path="/analytics" element={<Analytics selectedSector={selectedSector} />} />
              <Route path="/employees" element={<Employees selectedSector={selectedSector} />} />
              <Route path="/admin" element={<Administration />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
