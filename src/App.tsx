import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import MaterialPage from "./pages/Materials.tsx";
import ChemicalPage from "./pages/Chemicals.tsx";
import ListKerusakanPage from "./pages/ListKerusakanPage.tsx";
import UnitDashboardPage from "./pages/UnitDashboardPage.tsx";
import SettingPage from "./pages/SettingPage.tsx";
import AccountPage from "./pages/AccountPage.tsx";
import TankTrend from "./pages/TankTrend.tsx";
import Lims from "./pages/Lims.tsx";
import LiveTankLevel from "./pages/LiveTankLevel.tsx";
import Pitstop2026 from "./pages/Pitstop2026.tsx";
import Pitstop2027 from "./pages/pitstop2027/Pitstop2027.tsx";
import TurnAround2028 from "./pages/turnaround2028/TurnAround2028.tsx";
import IsolationList from "./pages/IsolationList.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<UnitDashboardPage />} />
          <Route path="/joblist" element={<ListKerusakanPage />} />
          <Route path="/material" element={<MaterialPage />} />
          <Route path="/chemical" element={<ChemicalPage />} />
          <Route path="/lims" element={<Lims />} />
          <Route path="/tank-trend" element={<TankTrend />} />
          <Route path="/live-tank-level" element={<LiveTankLevel />} />
          <Route path="/pitstop-2026" element={<Pitstop2026 />} />
          <Route path="/pitstop-2027" element={<Pitstop2027 />} />
          <Route path="/turn-around-2028" element={<TurnAround2028 />} />
          <Route path="/isolation-list" element={<IsolationList />} />
          <Route path="/accounts" element={<AccountPage />} />
          <Route path="/settings" element={<SettingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
