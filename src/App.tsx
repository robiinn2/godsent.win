import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Forum from "./pages/Forum";
import AdminPanel from "./pages/AdminPanel";
import Support from "./pages/Support";
import Invite from "./pages/Invite";
import Profile from "./pages/Profile";
import UnbanAppeal from "./pages/UnbanAppeal";
import Wheel from "./pages/Wheel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="skeet-top-line" />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/support" element={<Support />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/unban-appeal" element={<UnbanAppeal />} />
            <Route path="/wheel" element={<Wheel />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
