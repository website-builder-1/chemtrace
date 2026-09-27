import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Landing from "./pages/Landing.tsx";
import Team from "./pages/Team.tsx";
import Research from "./pages/Research.tsx";
import Benchmark from "./pages/Benchmark.tsx";
import Admin from "./pages/Admin.tsx";
import Moderator from "./pages/Moderator.tsx";
import NotFound from "./pages/NotFound.tsx";
import Welcome from "./pages/Welcome.tsx";
import RequireAuth from "./components/site/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<RequireAuth><Index /></RequireAuth>} />
          <Route path="/team" element={<Team />} />
          <Route path="/research" element={<RequireAuth><Research /></RequireAuth>} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/benchmark" element={<Benchmark />} />
          <Route path="/moderator" element={<Moderator />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
