import {
  LayoutDashboard,
  Inbox,
  Users,
  CalendarDays,
  MessageCircle,
  BarChart3,
  Folder,
  Settings,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

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
    {
      section: "MAIN MENU",
      items: [
        {
          name: "Tracking",
          path: "/",
          icon: LayoutDashboard,
          badge: null,
        },
        {
          name: "Chemical",
          path: "/chemical",
          icon: Inbox,
          badge: null,
        },
        {
          name: "Consumable material",
          path: "/material",
          icon: Folder,
          badge: null,
        },
        {
          name: "Tank Trend",
          path: "/tank-trend",
          icon: BarChart3,
          badge: null,
        },
      ],
    },
    {
      section: "EXTERNAL LINK",
      items: [
        {
          name: "PITSTOP",
          url: "https://pitstop.miftachuda.my.id",
          icon: ExternalLink,
          badge: null,
        },
      ],
    },
    // {
    //   section: "Workspace",
    //   items: [
    //     {
    //       name: "Accounts",
    //       path: "/accounts",
    //       icon: Users,
    //     },
    //   ],
    // },
    // {
    //   section: "General",
    //   items: [
    //     {
    //       name: "Settings",
    //       path: "/settings",
    //       icon: Settings,
    //     },
    //   ],
    // },
  ];

  return (
    <aside
      className={`
        w-full
        ${collapsed ? "md:w-[90px]" : "md:w-[260px]"}
        bg-sky-100
        text-sky-950
        sticky
        top-0
        h-auto
        md:h-screen
        shrink-0
        z-30
        transition-all
        duration-300
        flex
        flex-col
        border-r
        border-sky-200
        overflow-visible
      `}
    >
      {/* Toggle */}
      <div className="relative overflow-visible">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
      hidden
      md:flex
      absolute
      -right-4
      top-6
      w-8
      h-8
      rounded-full
      bg-white
      border
      border-sky-200
      shadow-md
      flex
      items-center
      justify-center
      text-sky-600
      z-40    "
        >
          <ChevronRight
            size={16}
            className={`transition ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:pb-8 md:pt-6">
        <div
          className="
            w-10
            h-10
            rounded-xl
            bg-sky-500
            flex
            items-center
            justify-center
            shrink-0
            shadow-md
          "
        >
          <img src="/logo.png" alt="logo" className="w-6 h-6" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-none text-sky-900">
              Lube Oil Complex II
            </h1>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-x-auto px-3 pb-3 md:overflow-y-auto md:pb-0">
        {menus.map((group) => (
          <div key={group.section} className="mb-0 md:mb-7">
            {!collapsed && (
              <p className="text-[11px] uppercase text-sky-500 mb-3 px-3 font-semibold tracking-wide">
                {group.section}
              </p>
            )}

            <div className="flex gap-2 md:block md:space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExternal = "url" in item;
                const active = !isExternal && location.pathname === item.path;
                return (
                  <button
                    key={isExternal ? item.url : item.path}
                    onClick={() => {
                      if (isExternal) {
                        window.open(item.url, "_blank", "noopener,noreferrer");
                        return;
                      }

                      navigate(item.path);
                    }}
                    className={`
                      w-auto
                      min-w-fit
                      md:w-full
                      flex
                      items-center
                      ${collapsed ? "justify-center" : "justify-between"}
                      px-3
                      py-3
                      rounded-xl
                      transition-all
                      duration-200
                      group
                      ${
                        active
                          ? "bg-sky-500 text-white shadow-md"
                          : "text-sky-800 hover:bg-sky-200/70"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />

                      {!collapsed && (
                        <span className="text-sm font-medium leading-tight">
                          {item.name}
                        </span>
                      )}
                    </div>

                    {!collapsed && item.badge && (
                      <div
                        className="
                          min-w-[20px]
                          h-5
                          px-1.5
                          rounded-md
                          bg-rose-500
                          text-white
                          text-[11px]
                          flex
                          items-center
                          justify-center
                          font-semibold
                        "
                      >
                        {item.badge}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
