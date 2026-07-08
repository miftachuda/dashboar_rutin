import { useEffect, useMemo, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";

export type ConnectionStatus = "connecting" | "live" | "disconnected" | "error";

export type TankUpdateMessage = {
  type?: string;
  tank?: string;
  data?: {
    level?: number | string;
    temp?: number | string;
    rate?: number | string;
    timestamp?: number | string;
  };
};

export type TankHistoryResponse = {
  type?: string;
  duration_seconds?: number;
  interval_seconds?: number;
  count?: number;
  data?: Array<{
    timestamp?: number | string;
    tanks?: Record<
      string,
      {
        level?: number | string;
        temp?: number | string;
        timestamp?: number | string;
        rate?: number | string;
      }
    >;
  }>;
};

export type TankRow = {
  tank: string;
  name: string;
  level?: number;
  temp?: number | string;
  timestamp?: number;
  rateMmPerHour?: number;
  receivedAt?: number;
};

export type TankDefinition = {
  tank: string;
  name: string;
};

export type TankHistoryPoint = {
  receivedAt: number;
  level: number;
};

export type TankRecord = {
  id: string;
  tank_name: string;
  tank_dia: number;
  sg: number;
  low_target: number;
  high_target: number;
  tank_height: number;
};

export type SortKey = "tank" | "name" | "level" | "temp" | "rate";
export type SortDirection = "asc" | "desc";
export type RateUnit = "mm/h" | "m3/h" | "T/D";

const wsUrl = "wss://tank.loc-2.com/ws";
const historyUrl = "https://tank.loc-2.com/history";
const trendWindowMs = 12 * 60 * 1000;

export const predefinedTankList: TankDefinition[] = [
  { tank: "41T-101", name: "HVI-95" },
  { tank: "41T-102", name: "HVI-95" },
  { tank: "41T-103", name: "HVI-160S" },
  { tank: "41T-104", name: "HVI-95" },
  { tank: "41T-105", name: "HVI-650" },
  { tank: "41T-106", name: "HVI-650" },
  { tank: "41T-107", name: "HVI-160S" },
  { tank: "41T-108", name: "HVI-160S" },
  { tank: "41T-109", name: "HVI-650" },
  { tank: "41T-110", name: "HVI-650" },
  { tank: "41T-111", name: "LMO Raffinate" },
  { tank: "41T-112", name: "LMO Raffinate" },
  { tank: "41T-113", name: "MMO Raffinate" },
  { tank: "41T-114", name: "DAO Raffinate" },
  { tank: "41T-115", name: "SPO Distillate" },
  { tank: "41T-116", name: "LMO Distillate" },
  { tank: "41T-117", name: "MMO Distillate" },
  { tank: "41T-118", name: "DAO" },
  { tank: "41T-119", name: "Minarex H" },
  { tank: "41T-120", name: "Slops" },
  { tank: "41T-121", name: "Short Residue" },
  { tank: "41T-122", name: "RFO" },
  { tank: "41T-301", name: "LMO Distillate" },
  { tank: "41T-302", name: "MMO Distillate" },
  { tank: "41T-303", name: "DAO" },
  { tank: "41T-304", name: "LMO HDT" },
  { tank: "41T-305", name: "LMO HDT" },
  { tank: "41T-306", name: "MMO HDT" },
  { tank: "41T-307", name: "MMO HDT" },
  { tank: "41T-308", name: "DAO HDT" },
  { tank: "41T-309", name: "DAO HDT" },
  { tank: "41T-310", name: "Short Residue" },
  { tank: "41T-311", name: "Short Residue" },
  { tank: "41T-313", name: "Short Residue" },
  { tank: "41T-315", name: "MMO Raffinate" },
  { tank: "41T-316", name: "DAO Raffinate" },
  { tank: "41T-317", name: "Slops" },
  { tank: "43T-1", name: "Long Residue" },
  { tank: "35T-2", name: "Long Residue" },
  { tank: "35T-4", name: "RFO" },
  { tank: "41T-17", name: "EXDO 4" },
  { tank: "41T-18", name: "EXDO 4" },
  { tank: "41T-24", name: "DAO Slack Wax" },
  { tank: "41T-25", name: "LMO Slack Wax" },
];

export function normalizeTankKey(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/^(\d+T)(\d+)$/);

  if (!match) return normalized;

  const tankNumber = String(Number(match[2]));
  return `${match[1]}${tankNumber}`;
}

export function formatEta(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return "-";

  const totalMinutes = Math.ceil(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const hoursPart = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hoursPart}h`;
  if (hoursPart > 0) return `${hoursPart}h ${minutes}m`;
  return `${minutes}m`;
}

export function getTargetEta(row: TankRow, tank?: TankRecord) {
  if (
    row.level == null ||
    row.rateMmPerHour == null ||
    row.rateMmPerHour === 0
  ) {
    return { text: "-", className: "text-slate-400", hours: null };
  }

  if (!tank) return { text: "N/A", className: "text-slate-400", hours: null };

  const lowTarget = Number(tank.low_target);
  const highTarget = Number(tank.high_target);

  if (row.rateMmPerHour > 0) {
    if (!Number.isFinite(highTarget)) {
      return { text: "-", className: "text-slate-400", hours: null };
    }
    if (row.level >= highTarget) {
      return { text: "High reached", className: "text-red-600", hours: 0 };
    }

    const hours = (highTarget - row.level) / row.rateMmPerHour;
    const eta = formatEta(hours);
    return {
      text: eta === "-" ? "-" : `High in ${eta}`,
      className: "text-emerald-600",
      hours,
    };
  }

  if (!Number.isFinite(lowTarget)) {
    return { text: "-", className: "text-slate-400", hours: null };
  }
  if (row.level <= lowTarget) {
    return { text: "Low reached", className: "text-red-600", hours: 0 };
  }

  const hours = (row.level - lowTarget) / Math.abs(row.rateMmPerHour);
  const eta = formatEta(hours);
  return {
    text: eta === "-" ? "-" : `Low in ${eta}`,
    className: "text-yellow-600",
    hours,
  };
}

export function useLiveTanks() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [rowsByTank, setRowsByTank] = useState<Record<string, TankRow>>({});
  const [tankHistoryByKey, setTankHistoryByKey] = useState<
    Record<string, TankHistoryPoint[]>
  >({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [tankData, setTankData] = useState<TankRecord[]>([]);
  const [now, setNow] = useState(Date.now());
  
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTankData = async () => {
      try {
        const records = await pb.collection("tank").getFullList<TankRecord>();
        setTankData(records);
      } catch (error) {
        console.error("Error fetching tank metadata:", error);
      }
    };

    fetchTankData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const res = await fetch(historyUrl);
        if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
        const json: TankHistoryResponse = await res.json();
        if (cancelled || !json.data?.length) return;

        const points: Array<{
          tankKey: string;
          receivedAt: number;
          level: number;
          temp: number | string;
          rate: number | undefined;
          timestamp: number;
        }> = [];

        for (const sample of json.data) {
          const ts = Number(sample.timestamp) * 1000;
          if (!Number.isFinite(ts)) continue;

          for (const [tankKey, tankInfo] of Object.entries(
            sample.tanks ?? {},
          )) {
            const nKey = normalizeTankKey(tankKey);
            const level = Number(tankInfo.level);
            if (!Number.isFinite(level)) continue;

            points.push({
              tankKey: nKey,
              receivedAt: ts,
              level,
              temp: tankInfo.temp ?? "-",
              rate: Number.isFinite(Number(tankInfo.rate))
                ? Number(tankInfo.rate)
                : undefined,
              timestamp: Number(sample.timestamp),
            });
          }
        }

        if (cancelled) return;

        const initialHistory: Record<string, TankHistoryPoint[]> = {};
        const initialRows: Record<string, TankRow> = {};
        const latestByTank: Record<
          string,
          {
            receivedAt: number;
            level: number;
            temp: number | string;
            rate: number | undefined;
            timestamp: number;
          }
        > = {};

        for (const p of points) {
          if (!initialHistory[p.tankKey]) {
            initialHistory[p.tankKey] = [];
          }
          initialHistory[p.tankKey].push({
            receivedAt: p.receivedAt,
            level: p.level,
          });

          if (
            !latestByTank[p.tankKey] ||
            p.timestamp > latestByTank[p.tankKey].timestamp
          ) {
            latestByTank[p.tankKey] = {
              receivedAt: p.receivedAt,
              level: p.level,
              temp: p.temp,
              rate: p.rate,
              timestamp: p.timestamp,
            };
          }
        }

        if (cancelled) return;

        for (const [tk, info] of Object.entries(latestByTank)) {
          const def = predefinedTankList.find(
            (d) => normalizeTankKey(d.tank) === tk,
          );
          initialRows[tk] = {
            tank: def?.tank ?? tk,
            name: def?.name ?? tk,
            level: info.level,
            temp: info.temp,
            timestamp: info.timestamp,
            rateMmPerHour: info.rate,
            receivedAt: info.receivedAt,
          };
        }

        if (cancelled) return;

        setTankHistoryByKey((current) => {
          const merged: Record<string, TankHistoryPoint[]> = { ...current };
          for (const [tk, hist] of Object.entries(initialHistory)) {
            merged[tk] = [...(merged[tk] ?? []), ...hist].sort(
              (a, b) => a.receivedAt - b.receivedAt,
            );
          }
          return merged;
        });

        setRowsByTank((current) => {
          const merged = { ...current };
          for (const [tk, row] of Object.entries(initialRows)) {
            if (!merged[tk] || !merged[tk]!.receivedAt) {
              merged[tk] = row;
            }
          }
          return merged;
        });
      } catch (err) {
        console.error("Error loading tank history:", err);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    shouldReconnect.current = true;

    const processMessage = (message: TankUpdateMessage) => {
      if (message.type !== "tank_update" || !message.tank || !message.data) {
        return;
      }

      const tank = message.tank.trim();
      const tankKey = normalizeTankKey(tank);
      const level = Number(message.data.level);
      const rate = Number(message.data.rate);
      const timestamp = Number(message.data.timestamp);

      if (!tankKey || !Number.isFinite(level) || !Number.isFinite(timestamp)) {
        return;
      }

      const receivedAt = Date.now();
      setLastMessageAt(receivedAt);
      setTankHistoryByKey((current) => {
        const nextHistory = [
          ...(current[tankKey] ?? []),
          { receivedAt, level },
        ].filter((point) => point.receivedAt >= receivedAt - trendWindowMs);

        return {
          ...current,
          [tankKey]: nextHistory,
        };
      });
      setRowsByTank((current) => {
        const tankDefinition = predefinedTankList.find(
          (item) => normalizeTankKey(item.tank) === tankKey,
        );

        return {
          ...current,
          [tankKey]: {
            tank: tankDefinition?.tank ?? tank,
            name: tankDefinition?.name ?? tank,
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
          const parsed = JSON.parse(event.data) as
            | TankUpdateMessage
            | TankUpdateMessage[];
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

  const tankDataByKey = useMemo(
    () =>
      tankData.reduce<Record<string, TankRecord>>((acc, tank) => {
        acc[normalizeTankKey(tank.tank_name)] = tank;
        return acc;
      }, {}),
    [tankData],
  );

  return {
    status,
    errorMessage,
    rowsByTank,
    tankHistoryByKey,
    lastMessageAt,
    now,
    tankData,
    tankDataByKey,
    setTankData
  };
}
