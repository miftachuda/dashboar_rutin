import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";

type NotificationRecord = {
  id: string;
  title: string;
  page: string;
  message: string;
  action?: string;
  collection?: string;
  record_id?: string;
  created: string;
};

function isToday(value: string) {
  const date = parsePocketBaseDate(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function parsePocketBaseDate(value: string) {
  return new Date(value.replace(" ", "T").replace("Z", ""));
}

function formatTimeAgo(value: string) {
  const date = parsePocketBaseDate(value);
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Header() {
  const { pathname } = useLocation();
  let headerTitle = "Dashboard Tracking Lube Oil Complex II";

  if (pathname.includes("/pitstop-2027")) {
    headerTitle = "Dashboard Pit Stop LOC II 2027";
  } else if (pathname.includes("/pitstop-2026")) {
    headerTitle = "Dashboard Pit Stop LOC II 2026";
  } else if (pathname.includes("/turn-around-2028")) {
    headerTitle = "Dashboard Turn Around LOC II 2028";
  }

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasTodayNotification = notifications.some((item) =>
    isToday(item.created),
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const records = await pb
        .collection("notifications")
        .getFullList<NotificationRecord>({
          sort: "-created",
          perPage: 20,
        });
      setNotifications(records);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="max-w-8xl mx-auto flex min-h-14 items-center gap-3 px-3 py-2 sm:h-16 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold leading-tight text-foreground sm:text-lg">
              {headerTitle}
            </h1>
            <p className="font-mono text-[10px] text-muted-foreground sm:text-xs">
            Beyond Lubrication
          </p>
        </div>

        <div ref={dropdownRef} className="relative ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-sm transition-all hover:bg-sky-50"
            aria-label="Open notifications"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {hasTodayNotification && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-[min(90vw,380px)] overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50/70 px-4 py-3">
                <div>
                  <p className="text-sm font-extrabold text-sky-950">
                    Notifications
                  </p>
                  <p className="text-xs text-slate-500">Latest Activity</p>
                </div>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50"
                >
                  Refresh
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-sky-100 bg-sky-50/40 px-4 py-8 text-center text-sm text-slate-500">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((item) => {
                      const createdToday = isToday(item.created);

                      return (
                        <div
                          key={item.id}
                          className="relative rounded-2xl border border-sky-100 bg-white p-3 shadow-sm"
                        >
                          {createdToday && (
                            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500" />
                          )}
                          <div className="pr-5">
                            <p className="text-sm font-bold text-sky-950">
                              {item.title || "Notification"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {item.message || "-"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 pr-16 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {item.page && <span>{item.page}</span>}
                              {item.action && <span>{item.action}</span>}
                            </div>
                            <span className="absolute bottom-3 right-3 text-[10px] italic text-slate-400">
                              {formatTimeAgo(item.created)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
