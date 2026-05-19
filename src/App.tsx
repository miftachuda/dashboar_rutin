import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import MaterialPage from "./pages/Materials.tsx";
import ChemicalPage from "./pages/Chemicals.tsx";
import ListKerusakanPage from "./pages/ListKerusakanPage.tsx";
import SettingPage from "./pages/SettingPage.tsx";
import AccountPage from "./pages/AccountPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<ListKerusakanPage />} />
          <Route path="/material" element={<MaterialPage />} />
          <Route path="/chemical" element={<ChemicalPage />} />
          <Route path="/accounts" element={<AccountPage />} />
          <Route path="/settings" element={<SettingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
