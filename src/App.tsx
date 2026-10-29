import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
import Landing from "./pages/Landing.tsx";
const Team = lazy(() => import("./pages/Team.tsx"));
const Research = lazy(() => import("./pages/Research.tsx"));
const Benchmark = lazy(() => import("./pages/Benchmark.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Moderator = lazy(() => import("./pages/Moderator.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
import RequireAuth from "./components/site/RequireAuth";
import { PageMeta } from "./components/site/PageMeta";

const Private = ({ title, path }: { title: string; path: string }) => (
  <PageMeta noindex title={`${title} — Chemtraceit`} description="Private Chemtraceit client area. Sign in with the account provided by your Chemtraceit contact." path={path} />
);

const PageFallback = () => <div className="min-h-screen bg-background" aria-busy="true" />;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<><Private title="Synthesis tool" path="/app" /><RequireAuth><Index /></RequireAuth></>} />
          <Route path="/team" element={<Team />} />
          <Route path="/research" element={<><Private title="Ask a chemistry question" path="/research" /><RequireAuth><Research /></RequireAuth></>} />
          <Route path="/welcome" element={<><Private title="Account setup" path="/welcome" /><Welcome /></>} />
          <Route path="/benchmark" element={<><Private title="Accuracy benchmark" path="/benchmark" /><Benchmark /></>} />
          <Route path="/admin" element={<><Private title="Admin control panel" path="/admin" /><Admin /></>} />
          <Route path="/admin/benchmark" element={<><Private title="Accuracy benchmark" path="/admin/benchmark" /><Benchmark /></>} />
          <Route path="/moderator" element={<><Private title="Moderator review desk" path="/moderator" /><Moderator /></>} />
          <Route path="/auth" element={<><Private title="Client sign in" path="/auth" /><Auth /></>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<><Private title="Page not found" path="/404" /><NotFound /></>} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
