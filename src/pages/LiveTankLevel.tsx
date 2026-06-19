import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Radio, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import DashboardLayout from "@/components/MainLayout";
import { pb } from "@/lib/pocketbase";
import { sendNotif } from "@/lib/sendnotif";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

type TankHistoryResponse = {
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

type TankRow = {
  tank: string;
  name: string;
  level?: number;
  temp?: number | string;
  timestamp?: number;
  rateMmPerHour?: number;
  receivedAt?: number;
};

type TankDefinition = {
  tank: string;
  name: string;
};

type TankHistoryPoint = {
  receivedAt: number;
  level: number;
};

type TankRecord = {
  id: string;
  tank_name: string;
  tank_dia: number;
  sg: number;
  low_target: number;
  high_target: number;
  tank_height: number;
};

type SortKey = "tank" | "name" | "level" | "temp" | "rate";
type SortDirection = "asc" | "desc";
type RateUnit = "mm/h" | "m3/h" | "T/D";

const wsUrl = "wss://tank.loc-2.com/ws";
const historyUrl = "https://tank.loc-2.com/history";
const trendWindowMs = 12 * 60 * 1000;

const predefinedTankList: TankDefinition[] = [
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

function compareTankNames(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeTankKey(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/^(\d+T)(\d+)$/);

  if (!match) return normalized;

  const tankNumber = String(Number(match[2]));
  return `${match[1]}${tankNumber}`;
}

function toSortableNumber(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compareNumberValues(
  a: number | undefined,
  b: number | undefined,
  direction: SortDirection,
) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function compareStringValues(
  a: string,
  b: string,
  direction: SortDirection,
  numeric = false,
) {
  const result = a.localeCompare(b, undefined, {
    numeric,
    sensitivity: "base",
  });
  return direction === "asc" ? result : -result;
}

function compareTankRows(
  a: TankRow,
  b: TankRow,
  sortKey: SortKey,
  direction: SortDirection,
  rateUnit: RateUnit,
  tankDataByKey: Record<string, TankRecord>,
) {
  if (sortKey === "tank") {
    return compareStringValues(a.tank, b.tank, direction, true);
  }
  if (sortKey === "name") {
    return compareStringValues(a.name, b.name, direction);
  }
  if (sortKey === "level") {
    return compareNumberValues(a.level, b.level, direction);
  }
  if (sortKey === "temp") {
    return compareNumberValues(
      toSortableNumber(a.temp),
      toSortableNumber(b.temp),
      direction,
    );
  }

  const aRate = getConvertedRateValue(
    a.rateMmPerHour,
    tankDataByKey[normalizeTankKey(a.tank)],
    rateUnit,
  );
  const bRate = getConvertedRateValue(
    b.rateMmPerHour,
    tankDataByKey[normalizeTankKey(b.tank)],
    rateUnit,
  );

  return compareNumberValues(
    aRate == null ? undefined : aRate,
    bRate == null ? undefined : bRate,
    direction,
  );
}

function hasValidTankMetadata(tank?: TankRecord) {
  const tankDiameter = Number(tank?.tank_dia);
  const specificGravity = Number(tank?.sg || 1);
  return (
    Boolean(tank) &&
    Number.isFinite(tankDiameter) &&
    tankDiameter > 0 &&
    Number.isFinite(specificGravity)
  );
}

function getConvertedRateValue(
  rateMmPerHour: number | undefined,
  tank: TankRecord | undefined,
  unit: RateUnit,
) {
  if (rateMmPerHour == null) return undefined;
  if (unit === "mm/h") return rateMmPerHour;
  if (!hasValidTankMetadata(tank)) return null;

  const tankDiameter = Number(tank?.tank_dia);
  const specificGravity = Number(tank?.sg || 1);
  const radiusM = tankDiameter / 2 / 1000;
  const areaM2 = Math.PI * Math.pow(radiusM, 2);
  const rateM3PerHour = areaM2 * (rateMmPerHour / 1000);

  if (unit === "m3/h") return rateM3PerHour;
  return rateM3PerHour * specificGravity * 24;
}

function formatRate(
  rateMmPerHour: number | undefined,
  tank: TankRecord | undefined,
  unit: RateUnit,
) {
  const convertedRate = getConvertedRateValue(rateMmPerHour, tank, unit);

  if (convertedRate === undefined) return "-";
  if (convertedRate === null) return "N/A";
  if (unit === "m3/h") return `${formatNumber(convertedRate, 1)} m³/h`;
  if (unit === "T/D") return `${formatNumber(convertedRate, 1)} T/D`;
  return `${formatNumber(convertedRate, 1)} mm/h`;
}

function calculateWeightTon(levelMm: number | undefined, tank?: TankRecord) {
  if (levelMm == null) return "-";
  if (!tank) return "N/A";

  const tankDiameter = Number(tank.tank_dia);
  const specificGravity = Number(tank.sg || 1);
  if (!Number.isFinite(tankDiameter) || tankDiameter <= 0) return "N/A";

  const levelM = levelMm / 1000;
  const radiusM = tankDiameter / 2 / 1000;
  const volumeM3 = Math.PI * Math.pow(radiusM, 2) * levelM;
  const weightTon = volumeM3 * specificGravity;

  return `${formatNumber(weightTon, 0)} TON`;
}

function formatEta(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return "-";

  const totalMinutes = Math.ceil(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const hoursPart = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hoursPart}h`;
  if (hoursPart > 0) return `${hoursPart}h ${minutes}m`;
  return `${minutes}m`;
}

function getTargetEta(row: TankRow, tank?: TankRecord) {
  if (
    row.level == null ||
    row.rateMmPerHour == null ||
    row.rateMmPerHour === 0
  ) {
    return { text: "-", className: "text-slate-400" };
  }

  if (!tank) return { text: "N/A", className: "text-slate-400" };

  const lowTarget = Number(tank.low_target);
  const highTarget = Number(tank.high_target);

  if (row.rateMmPerHour > 0) {
    if (!Number.isFinite(highTarget)) {
      return { text: "-", className: "text-slate-400" };
    }
    if (row.level >= highTarget) {
      return { text: "High reached", className: "text-red-600" };
    }

    const eta = formatEta((highTarget - row.level) / row.rateMmPerHour);
    return {
      text: eta === "-" ? "-" : `High in ${eta}`,
      className: "text-emerald-600",
    };
  }

  if (!Number.isFinite(lowTarget)) {
    return { text: "-", className: "text-slate-400" };
  }
  if (row.level <= lowTarget) {
    return { text: "Low reached", className: "text-red-600" };
  }

  const eta = formatEta((row.level - lowTarget) / Math.abs(row.rateMmPerHour));
  return {
    text: eta === "-" ? "-" : `Low in ${eta}`,
    className: "text-orange-600",
  };
}

function RowTrend({ data }: { data: TankHistoryPoint[] }) {
  if (data.length < 2) {
    return <span className="text-xs font-semibold text-slate-400">-</span>;
  }

  return (
    <div className="h-8 w-24 rounded-lg border border-sky-100 bg-sky-50/40 px-1.5 py-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 3, right: 2, bottom: 3, left: 2 }}
        >
          <YAxis dataKey="level" domain={["dataMin", "dataMax"]} hide />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const LiveTankLevel: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [rowsByTank, setRowsByTank] = useState<Record<string, TankRow>>({});
  const [tankHistoryByKey, setTankHistoryByKey] = useState<
    Record<string, TankHistoryPoint[]>
  >({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [tankData, setTankData] = useState<TankRecord[]>([]);
  const [rateUnit, setRateUnit] = useState<RateUnit>("mm/h");
  const [sortKey, setSortKey] = useState<SortKey>("tank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [targetDialogTank, setTargetDialogTank] = useState<TankRow | null>(
    null,
  );
  const [targetDraft, setTargetDraft] = useState({ low: "", high: "" });
  const [savingTarget, setSavingTarget] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const renderSortableHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="inline-flex items-center gap-1 font-bold uppercase tracking-wide text-sky-700 transition-colors hover:text-sky-950"
    >
      {label}
      <span className="text-[10px] text-sky-500">
        {sortKey === key ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );

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

          for (const [tankKey, tankInfo] of Object.entries(sample.tanks ?? {})) {
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

  const targetDialogMetadata = targetDialogTank
    ? tankDataByKey[normalizeTankKey(targetDialogTank.tank)]
    : undefined;

  const openTargetDialog = (row: TankRow, tankMetadata?: TankRecord) => {
    if (!tankMetadata) return;

    setTargetDialogTank(row);
    setTargetDraft({
      low: String(tankMetadata.low_target ?? ""),
      high: String(tankMetadata.high_target ?? ""),
    });
  };

  const closeTargetDialog = () => {
    if (savingTarget) return;

    setTargetDialogTank(null);
    setTargetDraft({ low: "", high: "" });
  };

  const handleSaveTarget = async () => {
    if (!targetDialogTank || !targetDialogMetadata) return;

    const lowTarget = Number(targetDraft.low);
    const highTarget = Number(targetDraft.high);
    const tankHeight = Number(targetDialogMetadata.tank_height);

    if (!Number.isFinite(lowTarget) || !Number.isFinite(highTarget)) {
      alert("Low target and high target must be valid numbers.");
      return;
    }
    if (lowTarget < 0 || highTarget < 0) {
      alert("Targets cannot be negative.");
      return;
    }
    if (lowTarget >= highTarget) {
      alert("Low target must be lower than high target.");
      return;
    }
    if (
      Number.isFinite(tankHeight) &&
      tankHeight > 0 &&
      highTarget > tankHeight
    ) {
      alert("High target cannot be greater than tank height.");
      return;
    }

    try {
      setSavingTarget(true);
      const updatedTank = await pb
        .collection("tank")
        .update<TankRecord>(targetDialogMetadata.id, {
          low_target: lowTarget,
          high_target: highTarget,
        });

      setTankData((current) =>
        current.map((tank) =>
          tank.id === targetDialogMetadata.id
            ? {
                ...tank,
                low_target: updatedTank.low_target ?? lowTarget,
                high_target: updatedTank.high_target ?? highTarget,
              }
            : tank,
        ),
      );

      await sendNotif({
        title: "[Tank Target] Updated",
        page: "live-tank-level",
        message: `Target updated for ${targetDialogMetadata.tank_name}.`,
        action: "update",
        collection: "tank",
        record_id: targetDialogMetadata.id,
      });

      closeTargetDialog();
    } catch (error) {
      console.error("Error updating tank target:", error);
      alert("Failed to update tank target.");
    } finally {
      setSavingTarget(false);
    }
  };

  const rows = useMemo(
    () =>
      predefinedTankList
        .map((definition) => ({
          ...definition,
          ...rowsByTank[normalizeTankKey(definition.tank)],
        }))
        .sort((a, b) =>
          compareTankRows(
            a,
            b,
            sortKey,
            sortDirection,
            rateUnit,
            tankDataByKey,
          ),
        ),
    [rateUnit, rowsByTank, sortDirection, sortKey, tankDataByKey],
  );
  const liveTankCount = rows.filter((row) => row.receivedAt).length;

  return (
    <DashboardLayout>
      <div className="flex min-h-screen w-full flex-col gap-4 bg-sky-50/40 p-3 sm:p-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sky-950 sm:text-2xl">
                Live Tank Level
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide ${statusConfig[status]}`}
              >
                <Radio className="h-4 w-4" /> {status}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-sky-700">
                Total Tanks: {rows.length}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Live: {liveTankCount}
              </span>
              <label className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-700">
                Rate Unit
                <select
                  value={rateUnit}
                  onChange={(event) =>
                    setRateUnit(event.target.value as RateUnit)
                  }
                  className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800 outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="mm/h">mm/h</option>
                  <option value="m3/h">m³/h</option>
                  <option value="T/D">T/D</option>
                </select>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-100 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-bold text-sky-950">Tank Level Table</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-sky-100 text-left text-xs whitespace-nowrap">
              <thead className="bg-sky-50/80 text-xs uppercase tracking-wide text-sky-700">
                <tr>
                  <th className="px-2 py-2 font-bold">No</th>
                  <th className="px-2 py-2 font-bold">
                    {renderSortableHeader("Tank", "tank")}
                  </th>
                  <th className="px-2 py-2 font-bold">
                    {renderSortableHeader("Service", "name")}
                  </th>
                  <th className="px-2 py-2 font-bold">
                    {renderSortableHeader("Level", "level")}
                  </th>
                  <th className="px-2 py-2 font-bold">Weight</th>
                  <th className="px-2 py-2 font-bold">
                    {renderSortableHeader("Tempe", "temp")}
                  </th>
                  <th className="px-2 py-2 font-bold">
                    {renderSortableHeader("Rate", "rate")}
                  </th>
                  <th className="px-2 py-2 font-bold">ETA</th>
                  <th className="px-2 py-2 font-bold">Trend</th>
                  <th className="px-2 py-2 font-bold">Sta</th>
                  <th className="px-2 py-2 font-bold">Set</th>
                  <th className="px-2 py-2 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Waiting for tank data...
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const hasData = Boolean(row.receivedAt);
                    const ageMs = hasData
                      ? now - (row.receivedAt ?? 0)
                      : Infinity;
                    const isFresh = hasData && ageMs < 5000;
                    const isStale10s = hasData && ageMs >= 10000;
                    const tankMetadata =
                      tankDataByKey[normalizeTankKey(row.tank)];
                    const targetEta = getTargetEta(row, tankMetadata);
                    const tankHistory =
                      tankHistoryByKey[normalizeTankKey(row.tank)] ?? [];

                    return (
                      <tr
                        key={row.tank}
                        className={`transition-colors ${
                          isStale10s
                            ? "bg-slate-100 opacity-50 grayscale hover:bg-slate-100"
                            : "hover:bg-sky-50/50"
                        }`}
                      >
                        <td className="px-2 py-2 font-semibold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 font-extrabold text-sky-950">
                          {row.tank}
                        </td>
                        <td className="px-2 py-2 font-semibold text-slate-700">
                          {row.name}
                        </td>
                        <td className="px-2 py-2 font-bold text-sky-700">
                          {row.level == null
                            ? "-"
                            : `${formatNumber(row.level, 0)} mm`}
                        </td>
                        <td className="px-2 py-2 font-bold text-indigo-700">
                          {calculateWeightTon(row.level, tankMetadata)}
                        </td>
                        <td className="px-2 py-2 font-semibold text-slate-700">
                          {row.temp == null ? "-" : `${row.temp} °C`}
                        </td>
                        <td
                          className={`px-2 py-2 font-bold ${getRateClass(row.rateMmPerHour)}`}
                        >
                          {row.rateMmPerHour == null ? (
                            "-"
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {formatRate(
                                row.rateMmPerHour,
                                tankMetadata,
                                rateUnit,
                              )}
                              {row.rateMmPerHour > 0 && (
                                <span className="animate-rate-blink">▲</span>
                              )}
                              {row.rateMmPerHour < 0 && (
                                <span className="animate-rate-blink">▼</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-2 py-2 font-bold ${targetEta.className}`}
                        >
                          {targetEta.text}
                        </td>
                        <td className="px-2 py-2">
                          <RowTrend data={tankHistory} />
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span
                              className={`h-3 w-3 rounded-full animate-pulse ${
                                !hasData
                                  ? "bg-slate-300"
                                  : isFresh
                                    ? "bg-emerald-500"
                                    : "bg-orange-500"
                              }`}
                            />
                            {!hasData ? "No data" : ""}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {tankMetadata ? (
                            <button
                              type="button"
                              onClick={() =>
                                openTargetDialog(row, tankMetadata)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
                              aria-label={`Set target for ${row.tank}`}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              No metadata
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/tank-trend?tank=${encodeURIComponent(row.tank)}`,
                              )
                            }
                            className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 transition-colors hover:bg-sky-100"
                          >
                            Trend
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog
          open={Boolean(targetDialogTank)}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeTargetDialog();
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] rounded-3xl border-sky-100 bg-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sky-950">
                Tank Target Setting
              </DialogTitle>
            </DialogHeader>

            {targetDialogTank && targetDialogMetadata && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Tank
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-sky-950">
                        {targetDialogTank.tank}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Tank Name
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-sky-950">
                        {targetDialogTank.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Tank Height Reference
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {Number.isFinite(
                          Number(targetDialogMetadata.tank_height),
                        )
                          ? `${formatNumber(Number(targetDialogMetadata.tank_height), 0)} mm`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Current Level
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {targetDialogTank.level == null
                          ? "-"
                          : `${formatNumber(targetDialogTank.level, 0)} mm`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Low Target (mm)
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={targetDraft.low}
                      onChange={(event) =>
                        setTargetDraft((current) => ({
                          ...current,
                          low: event.target.value,
                        }))
                      }
                      className="mt-1 rounded-xl border-sky-200 bg-sky-50/60 focus-visible:ring-sky-300"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-600">
                    High Target (mm)
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={targetDraft.high}
                      onChange={(event) =>
                        setTargetDraft((current) => ({
                          ...current,
                          high: event.target.value,
                        }))
                      }
                      className="mt-1 rounded-xl border-sky-200 bg-sky-50/60 focus-visible:ring-sky-300"
                    />
                  </label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeTargetDialog}
                disabled={savingTarget}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveTarget}
                disabled={savingTarget || !targetDialogMetadata}
                className="bg-sky-600 text-white hover:bg-sky-700"
              >
                {savingTarget && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingTarget ? "Saving..." : "Save Target"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LiveTankLevel;
