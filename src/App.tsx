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
import TankTrend from "./pages/TankTrend.tsx";
import Lims from "./pages/Lims.tsx";
import LiveTankLevel from "./pages/LiveTankLevel.tsx";
import Pitstop2026 from "./pages/Pitstop2026.tsx";
import Pitstop2027 from "./pages/Pitstop2027.tsx";
import TurnAround2028 from "./pages/TurnAround2028.tsx";

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
          <Route path="/lims" element={<Lims />} />
          <Route path="/tank-trend" element={<TankTrend />} />
          <Route path="/live-tank-level" element={<LiveTankLevel />} />
          <Route path="/pitstop-2026" element={<Pitstop2026 />} />
          <Route path="/pitstop-2027" element={<Pitstop2027 />} />
          <Route path="/turn-around-2028" element={<TurnAround2028 />} />
          <Route path="/accounts" element={<AccountPage />} />
          <Route path="/settings" element={<SettingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
