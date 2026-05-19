import {
  Image,
  Home,
  RefreshCw,
  Filter,
  CalendarDays,
  ClipboardPlus,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const menus = [
    { name: "Main", path: "/", icon: Home },
    { name: "Consumable Materials", path: "/material", icon: ClipboardPlus },
    { name: "Chemical", path: "/chemical", icon: CalendarDays },
  ];

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } transition-all duration-300 border-r bg-card flex flex-col sticky top-0 h-screen z-20`}
    >
      {/* Header / Toggle */}
      <div className="h-16 flex items-center justify-between px-3 border-b">
        {!collapsed && <span className="font-bold">Lube Oil Complex II</span>}
        <button onClick={() => setCollapsed(!collapsed)}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <img src="/logo.png" className="w-7 h-7" alt="Wrench" />
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {menus.map((m) => {
          const Icon = m.icon;

          return (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                location.pathname === m.path
                  ? "bg-primary text-white"
                  : "hover:bg-muted"
              }`}
            >
              <Icon size={18} />

              {!collapsed && <span>{m.name}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
