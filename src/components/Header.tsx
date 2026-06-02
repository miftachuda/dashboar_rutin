import { useEffect, useState } from "react";

export default function Header() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem("autoRefresh");
    return saved === "true"; // default false if null
  });
  useEffect(() => {
    localStorage.setItem("autoRefresh", autoRefresh.toString());
  }, [autoRefresh]);

  // function to refresh data
  const refreshData = async () => {
    try {
      console.log("refreshing data...");

      window.location.reload(); // reload page
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    }
  };
  // auto refresh every 3 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(
      () => {
        refreshData();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // update "time ago" every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const getTimeAgo = () => {
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };
  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="max-w-8xl mx-auto flex min-h-14 items-center gap-3 px-3 py-2 sm:h-16 sm:px-6 lg:px-8">
        {/* LEFT: Title */}
        <div className="min-w-0">
          <h1 className="font-display text-sm font-bold leading-tight text-foreground sm:text-lg">
            Dashboard Tracking Kerusakan & Perbaikan Peralatan
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground sm:text-xs">
            Beyond Lubrication
          </p>
        </div>

        {/* RIGHT: Toggle + last refresh */}
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
          {/* Toggle Switch */}
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
              autoRefresh ? "bg-green-500" : "bg-gray-400"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                autoRefresh ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>

          {/* Label */}
          <span className="hidden text-[10px] font-mono text-muted-foreground min-[420px]:inline">
            Auto Refresh: {autoRefresh ? "ON" : "OFF"}
          </span>

          {/* Last Refresh */}
          <p className="text-[10px] text-muted-foreground font-mono">
            Last refresh: {getTimeAgo()}
          </p>
        </div>
      </div>
    </header>
  );
}
