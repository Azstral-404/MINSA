import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index";
import Pengaturan from "./pages/Pengaturan";
import DaftarSurat from "./pages/DaftarSurat";
import TambahSurat from "./pages/TambahSurat";
import PreviewSurat from "./pages/PreviewSurat";
import Fitur from "./pages/Fitur";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { data } = useApp();
  const isOnboarded = data.settings.onboarded;

  return (
    <Routes>
      <Route path="/onboarding" element={isOnboarded ? <Navigate to="/" replace /> : <Onboarding />} />
      <Route element={isOnboarded ? <Layout /> : <Navigate to="/onboarding" replace />}>
        <Route path="/" element={<Index />} />
        <Route path="/pengaturan" element={<Pengaturan />} />
        <Route path="/surat/:jenisSlug" element={<DaftarSurat />} />
        <Route path="/surat/:jenisSlug/tambah" element={<TambahSurat />} />
        <Route path="/surat/:jenisSlug/:id/edit" element={<TambahSurat />} />
        <Route path="/surat/:jenisSlug/:id/preview" element={<PreviewSurat />} />
        <Route path="/fitur" element={<Fitur />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <ThemeProvider>
            <Toaster />
            <Sonner />
            {!splashDone ? (
              <SplashScreen onFinish={() => setSplashDone(true)} />
            ) : (
              <HashRouter>
                <AppRoutes />
              </HashRouter>
            )}
          </ThemeProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;