import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, Gauge, Radio } from "lucide-react";
import DashboardLayout from "@/components/MainLayout";

type ConnectionStatus = "connecting" | "live" | "disconnected" | "error";

type TankUpdateMessage = {
  type?: string;
  tank?: string;
  data?: {
    level?: number | string;
    temp?: number | string;
    rate?: number | string;
    timestamp?: number | string;
  };
};

type TankRow = {
  tank: string;
  level: number;
  temp: number | string;
  timestamp: number;
  rateMmPerHour?: number;
  receivedAt: number;
};

const wsUrl = "wss://tank.loc-2.com/ws";

const statusConfig: Record<ConnectionStatus, string> = {
  connecting: "border-amber-200 bg-amber-50 text-amber-700",
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disconnected: "border-slate-200 bg-slate-50 text-slate-600",
  error: "border-red-200 bg-red-50 text-red-600",
};

function formatDateTime(value: number | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function getRateClass(rate?: number) {
  if (rate == null) return "text-slate-400";
  if (rate > 0) return "text-emerald-600";
  if (rate < 0) return "text-orange-600";
  return "text-slate-600";
}

function formatRate(rate?: number) {
  if (rate == null) return "-";
  return `${formatNumber(rate, 1)} mm/hour`;
}

function compareTankNames(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

const LiveTankLevel: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [rowsByTank, setRowsByTank] = useState<Record<string, TankRow>>({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    shouldReconnect.current = true;

    const processMessage = (message: TankUpdateMessage) => {
      if (message.type !== "tank_update" || !message.tank || !message.data) {
        return;
      }

      const tank = message.tank.trim();
      const level = Number(message.data.level);
      const rate = Number(message.data.rate);
      const timestamp = Number(message.data.timestamp);

      if (!tank || !Number.isFinite(level) || !Number.isFinite(timestamp)) {
        return;
      }

      const receivedAt = Date.now();
      setLastMessageAt(receivedAt);
      setRowsByTank((current) => {
        return {
          ...current,
          [tank]: {
            tank,
            level,
            temp: message.data?.temp ?? "-",
            timestamp,
            rateMmPerHour: Number.isFinite(rate) ? rate : undefined,
            receivedAt,
          },
        };
      });
    };

    const connect = () => {
      setStatus("connecting");
      setErrorMessage("");

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("live");
        setErrorMessage("");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as TankUpdateMessage | TankUpdateMessage[];
          if (Array.isArray(parsed)) {
            parsed.forEach(processMessage);
          } else {
            processMessage(parsed);
          }
        } catch (error) {
          console.error("Failed to parse tank level message:", error);
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setErrorMessage("WebSocket connection error.");
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!shouldReconnect.current) return;

        setStatus("disconnected");
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, []);

  const rows = useMemo(
    () =>
      Object.values(rowsByTank).sort((a, b) =>
        compareTankNames(a.tank, b.tank),
      ),
    [rowsByTank],
  );

  return (
    <DashboardLayout>
      <div className="flex min-h-screen w-full flex-col gap-4 bg-sky-50/40 p-3 sm:p-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sky-950 sm:text-2xl">
                Live Tank Level
              </h1>
              <p className="mt-1 text-sm text-sky-700">
                Realtime tank level from WebSocket with rate in mm/hour when available.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide ${statusConfig[status]}`}
              >
                <Radio className="h-4 w-4" /> {status}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total Tanks
                </p>
                <p className="mt-1 text-2xl font-extrabold text-sky-950">
                  {rows.length}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last Message
                </p>
                <p className="mt-1 text-sm font-bold text-sky-950">
                  {formatDateTime(lastMessageAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Source
                </p>
                <p className="mt-1 truncate text-sm font-bold text-sky-950">
                  {wsUrl}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-100 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-bold text-sky-950">Tank Level Table</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest row is retained per tank. Rate is shown when provided by the realtime source.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-sky-100 text-left text-sm">
              <thead className="bg-sky-50/80 text-xs uppercase tracking-wide text-sky-700">
                <tr>
                  <th className="px-4 py-3 font-bold">No</th>
                  <th className="px-4 py-3 font-bold">Tank</th>
                  <th className="px-4 py-3 font-bold">Level</th>
                  <th className="px-4 py-3 font-bold">Temperature</th>
                  <th className="px-4 py-3 font-bold">Rate</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Waiting for tank data...
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const isFresh = now - row.receivedAt < 5000;

                    return (
                      <tr key={row.tank} className="transition-colors hover:bg-sky-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-sky-950">
                          {row.tank}
                        </td>
                        <td className="px-4 py-3 font-bold text-sky-700">
                          {formatNumber(row.level, 0)} mm
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {row.temp} °C
                        </td>
                        <td className={`px-4 py-3 font-bold ${getRateClass(row.rateMmPerHour)}`}>
                          {row.rateMmPerHour == null ? (
                            "-"
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {row.rateMmPerHour > 0 && <span>▲</span>}
                              {row.rateMmPerHour < 0 && <span>▼</span>}
                              {formatRate(row.rateMmPerHour)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span
                              className={`h-3 w-3 rounded-full animate-pulse ${
                                isFresh ? "bg-emerald-500" : "bg-orange-500"
                              }`}
                            />
                            {isFresh ? "<5 sec" : ">5 sec"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveTankLevel;
