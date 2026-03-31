import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";

import Tasks from "@/pages/Tasks";
import Analytics from "@/pages/Analytics";
import Employees from "@/pages/Employees";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";
import Administration from "@/pages/admin/Administration";
import Login from "@/pages/Login";
import RouteGuard from "@/components/layout/RouteGuard";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ActivityLogProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGate>
            <AppLayout>
              {({ selectedSector }) => (
                <RouteGuard>
                  <Routes>
                    <Route path="/" element={<Analytics selectedSector={selectedSector} />} />
                    <Route path="/tasks" element={<Tasks selectedSector={selectedSector} />} />
                    <Route path="/analytics" element={<Analytics selectedSector={selectedSector} />} />
                    <Route path="/employees" element={<Employees selectedSector={selectedSector} />} />
                    <Route path="/reports" element={<Reports selectedSector={selectedSector} />} />
                    <Route path="/admin" element={<Administration />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </RouteGuard>
              )}
            </AppLayout>
          </AuthGate>
        </BrowserRouter>
      </ActivityLogProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
