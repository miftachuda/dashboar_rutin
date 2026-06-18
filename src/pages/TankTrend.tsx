import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/MainLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { fetchPHDData, GetDataParams } from "../lib/phdfetch";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";

// === NEW: Imports for Date Picker ===
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { pb } from "@/lib/pocketbase";

// === END NEW ===

interface ChartDataPoint {
  timestamp: string;
  level: number;
  temperature: number;
}

interface TagOption {
  label: string;
  value: string;
  temp: string;
}

let lastDisplayedDay: string | null = null;

function normalizeTankKey(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/^(\d+T)(\d+)$/);

  if (!match) return normalized;

  const tankNumber = String(Number(match[2]));
  return `${match[1]}${tankNumber}`;
}

const tagOptions: TagOption[] = [
  { label: "41T-101", value: "41T101_P_LEVEL.pv", temp: "41T101_P_TEMP.PV" },
  { label: "41T-102", value: "41T102_P_LEVEL.pv", temp: "41T102_P_TEMP.PV" },
  { label: "41T-103", value: "41T103_P_LEVEL.pv", temp: "41T103_P_TEMP.PV" },
  { label: "41T-104", value: "41T104_P_LEVEL.pv", temp: "41T104_P_TEMP.PV" },
  { label: "41T-105", value: "41T105_P_LEVEL.pv", temp: "41T105_P_TEMP.PV" },
  { label: "41T-106", value: "41T106_P_LEVEL.pv", temp: "41T106_P_TEMP.PV" },
  { label: "41T-107", value: "41T107_P_LEVEL.pv", temp: "41T107_P_TEMP.PV" },
  { label: "41T-108", value: "41T108_P_LEVEL.pv", temp: "41T108_P_TEMP.PV" },
  { label: "41T-109", value: "41T109_P_LEVEL.pv", temp: "41T109_P_TEMP.PV" },
  { label: "41T-110", value: "41T110_P_LEVEL.pv", temp: "41T110_P_TEMP.PV" },
  { label: "41T-111", value: "41T111_P_LEVEL.pv", temp: "41T111_P_TEMP.PV" },
  { label: "41T-112", value: "41T112_P_LEVEL.pv", temp: "41T112_P_TEMP.PV" },
  { label: "41T-113", value: "41T113_P_LEVEL.pv", temp: "41T113_P_TEMP.PV" },
  { label: "41T-114", value: "41T114_P_LEVEL.pv", temp: "41T114_P_TEMP.PV" },
  { label: "41T-115", value: "41T115_P_LEVEL.pv", temp: "41T115_P_TEMP.PV" },
  { label: "41T-116", value: "41T116_P_LEVEL.pv", temp: "41T116_P_TEMP.PV" },
  { label: "41T-117", value: "41T117_P_LEVEL.pv", temp: "41T117_P_TEMP.PV" },
  { label: "41T-118", value: "41T118_P_LEVEL.pv", temp: "41T118_P_TEMP.PV" },
  { label: "41T-119", value: "41T119_P_LEVEL.pv", temp: "41T119_P_TEMP.PV" },
  { label: "41T-120", value: "41T120_P_LEVEL.pv", temp: "41T120_P_TEMP.PV" },
  { label: "41T-121", value: "41T121_P_LEVEL.pv", temp: "41T121_P_TEMP.PV" },
  { label: "41T-122", value: "41T122_P_LEVEL.pv", temp: "41T122_P_TEMP.PV" },
  { label: "41T-301", value: "41T-301_P_LEVEL.pv", temp: "41T-301_P_TEMP.PV" },
  { label: "41T-302", value: "41T-302_P_LEVEL.pv", temp: "41T-302_P_TEMP.PV" },
  { label: "41T-303", value: "41T-303_P_LEVEL.pv", temp: "41T-303_P_TEMP.PV" },
  { label: "41T-304", value: "41T-304_P_LEVEL.pv", temp: "41T-304_P_TEMP.PV" },
  { label: "41T-305", value: "41T-305_P_LEVEL.pv", temp: "41T-305_P_TEMP.PV" },
  { label: "41T-306", value: "41T-306_P_LEVEL.pv", temp: "41T-306_P_TEMP.PV" },
  { label: "41T-307", value: "41T-307_P_LEVEL.pv", temp: "41T-307_P_TEMP.PV" },
  { label: "41T-308", value: "41T-308_P_LEVEL.pv", temp: "41T-308_P_TEMP.PV" },
  { label: "41T-309", value: "41T-309_P_LEVEL.pv", temp: "41T-309_P_TEMP.PV" },
  { label: "41T-310", value: "41T-310_P_LEVEL.pv", temp: "41T-310_P_TEMP.PV" },
  { label: "41T-311", value: "41T-311_P_LEVEL.pv", temp: "41T-311_P_TEMP.PV" },
  { label: "41T-313", value: "41T-313_P_LEVEL.pv", temp: "41T-313_P_TEMP.PV" },
  { label: "41T-315", value: "41T-315_P_LEVEL.pv", temp: "41T-315_P_TEMP.PV" },
  { label: "41T-316", value: "41T-316_P_LEVEL.pv", temp: "41T-316_P_TEMP.PV" },
  { label: "41T-317", value: "41T-317_P_LEVEL.pv", temp: "41T-317_P_TEMP.PV" },
  { label: "43T-1", value: "43T1_P_LEVEL.pv", temp: "43T1_P_TEMP.PV" },
  { label: "35T-2", value: "35T2_P_LEVEL.pv", temp: "35T2_P_TEMP.PV" },
  { label: "35T-4", value: "35T4_P_LEVEL.pv", temp: "35T4_P_TEMP.PV" },
  { label: "41T-17", value: "41T17_P_LEVEL.pv", temp: "41T17_P_TEMP.PV" },
  { label: "41T-18", value: "41T18_P_LEVEL.pv", temp: "41T18_P_TEMP.PV" },
  { label: "41T-24", value: "41T24_P_LEVEL.pv", temp: "41T24_P_TEMP.PV" },
  { label: "41T-25", value: "41T25_P_LEVEL.pv", temp: "41T25_P_TEMP.PV" },
];

function getTagOptionFromParam(tank: string | null) {
  if (!tank) return tagOptions[0];

  return (
    tagOptions.find(
      (tag) => normalizeTankKey(tag.label) === normalizeTankKey(tank),
    ) ?? tagOptions[0]
  );
}

const TankTrend: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tankParam = searchParams.get("tank");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagOption>(() =>
    getTagOptionFromParam(tankParam),
  );
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState(
    dayjs().subtract(7, "day").toDate(),
  );
  const [endDate, setEndDate] = useState(new Date());
  const filteredOptions = tagOptions.filter((tag) =>
    tag.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setSelectedTag(getTagOptionFromParam(tankParam));
  }, [tankParam]);

  function smoothAnomalies(data: ChartDataPoint[]): ChartDataPoint[] {
    if (data.length === 0) return [];

    const result: ChartDataPoint[] = [data[0]]; // keep first point as is

    for (let i = 1; i < data.length; i++) {
      const prev = result[i - 1];
      const curr = { ...data[i] };

      // Detect anomaly if > 100% increase (i.e., > 2x previous value)

      if (curr.temperature > prev.temperature * 2) {
        curr.temperature = prev.temperature;
      }

      result.push(curr);
    }

    return result;
  }
  interface LevelRecord {
    timestamp: string; // e.g. "11/20/2025 00:40:34.496"
    level: number;
    temperature?: number;
  }

  interface RateResult {
    rate_mm_per_hour: number;
    from: LevelRecord;
    to: LevelRecord;
    hoursDiff: number;
    levelDiff: number;
  }

  function getRateFromLast15Min(data: LevelRecord[]): RateResult | null {
    if (!data || data.length < 2) return null;

    // Sort data by timestamp
    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const latest = sorted[sorted.length - 1];
    const latestTime = new Date(latest.timestamp).getTime();

    const targetTime = latestTime - 60 * 60 * 1000; // 15 minutes earlier

    // Find record closest to 15 minutes before latest
    let closest = sorted[0];

    for (const row of sorted) {
      const t = new Date(row.timestamp).getTime();
      if (t <= targetTime) {
        closest = row;
      } else {
        break;
      }
    }

    const t1 = new Date(closest.timestamp).getTime();
    const t2 = latestTime;

    const hoursDiff = (t2 - t1) / (1000 * 60 * 60);
    const levelDiff = latest.level - closest.level;

    const rate = levelDiff / hoursDiff; // mm per hour

    return {
      rate_mm_per_hour: rate,
      from: closest,
      to: latest,
      hoursDiff,
      levelDiff,
    };
  }
  const getData = async (tagName: string[], interval: number) => {
    const formattedStartTime = dayjs(startDate).format(
      "MM/DD/YYYY HH:mm:ss.SSS",
    );
    const formattedEndTime = dayjs(endDate).format("MM/DD/YYYY HH:mm:ss.SSS");
    const params: GetDataParams = {
      startTime: formattedStartTime, // Use formatted date from state
      endTime: formattedEndTime, // Use formatted date from state
      interval: interval * 1000,
      tagName: tagName,
    };
    try {
      setLoading(true);
      setError(null);
      const result = await fetchPHDData(params);
      const level = result[0];
      const temp = result[1];
      const timestamps: string[] = level.TimeStamp || [];
      const levelValues: any[] = level.Value || [];
      const tempValues: any[] = temp.Value || [];

      const chartData = timestamps
        .map((ts, idx) => {
          const levelValue = levelValues[idx];
          const tempValue = tempValues[idx];
          if (
            levelValue === null ||
            levelValue === undefined ||
            typeof levelValue !== "number"
          ) {
            return null;
          }
          if (
            tempValue === null ||
            tempValue === undefined ||
            typeof tempValue !== "number"
          ) {
            return null;
          }
          if (isNaN(levelValue)) {
            return null;
          }
          if (isNaN(tempValue)) {
            return null;
          }
          return {
            timestamp: ts,
            level: Number(levelValue.toFixed(1)),
            temperature: Number(tempValues[idx].toFixed(1)),
          };
        })
        .filter((entry): entry is ChartDataPoint => entry !== null);
      setData(smoothAnomalies(chartData));
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (startDate && endDate) {
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let intervalSec;

      if (diffDays <= 3) {
        intervalSec = 300; // 5 minutes
      } else if (diffDays <= 14) {
        intervalSec = 900; // 15 minutes
      } else if (diffDays <= 21) {
        intervalSec = 3600; // 1 hour
      } else {
        intervalSec = 28800; // 4 hours
      }

      getData([selectedTag.value, selectedTag.temp], intervalSec);
    }
  }, [selectedTag, startDate, endDate]); // Refetch when tag OR dates change
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

  const targetTicks = 60;
  const interval = Math.max(1, Math.floor(data.length / targetTicks));

  lastDisplayedDay = null;
  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload, index } = props;
    const { value } = payload;

    const date = dayjs(value);
    const currentDay = date.format("MM/DD");

    let displayText = "";
    let color = "#64748b"; // Default color for TIME (slate-500)
    if (index === 0) {
      displayText = date.format("HH:mm");
      lastDisplayedDay = currentDay; // Set the day tracker
    } else if (currentDay !== lastDisplayedDay) {
      lastDisplayedDay = currentDay;
      displayText = date.format("DD-MMM-YY");
      color = "#0284c7"; // Color for DATE
    } else {
      displayText = date.format("HH:mm");
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16} // Pushes text down from the axis line
          textAnchor="end"
          fill={color} // Apply the conditional color
          transform="rotate(-45)"
          fontSize={10}
        >
          {displayText}
        </text>
      </g>
    );
  };
  const myColor = "#03ff63ff";
  const myColor2 = "#ffd503ff";
  const customTicks = [
    0, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 22500,
  ];
  const customTicks2 = [
    0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180,
  ];
  interface TankRecord {
    id: string;
    tank_name: string;
    tank_dia: number;
    sg: number;
    min_level: number;
    max_level: number;
    low_target: number;
    high_target: number;
    created: string;
    updated: string;
  }

  const [tankData, setTankData] = useState<TankRecord[]>([]);

  useEffect(() => {
    const fetchTank = async () => {
      try {
        const records = await pb.collection("tank").getFullList<TankRecord>(); // ✅ Add generics here

        setTankData(records);
      } catch (err) {
        console.error("Error fetching tank:", err);
      }
    };

    fetchTank();
  }, []);
  const selected_tank_data = tankData.find(
    (tank) => tank.tank_name === selectedTag.label,
  );
  const result = getRateFromLast15Min(data);

  const rateValue = Number(result?.rate_mm_per_hour);
  const rate = `${isNaN(rateValue) ? 0 : rateValue.toFixed(1)} mm/hr`;
  const startlevel = data.length > 0 ? +data[0].level.toFixed(1) : 0;
  const endlevel =
    data.length > 0 ? +data[data.length - 1].level.toFixed(1) : 0;

  function calculateVolumeCubic(level_mm: number): string {
    if (!selected_tank_data) return "N/A";
    const level_m = level_mm / 1000; // convert mm to meters
    const radius_m = selected_tank_data.tank_dia / 2 / 1000;
    const volume_m3 = Math.PI * Math.pow(radius_m, 2) * level_m;
    return volume_m3.toFixed(2);
  }
  function calculateVolumeLitres(level_mm: number): string {
    const volume_m3 = calculateVolumeCubic(level_mm);
    if (volume_m3 === "N/A") return "N/A";
    const volume_m3_num = parseFloat(volume_m3); // convert to number
    const volume_liters = volume_m3_num * 1000; // convert m³ to liters
    return volume_liters.toFixed(2);
  }
  function calculateWeight(level_mm: number): string {
    const volume_m3 = calculateVolumeCubic(level_mm);
    if (volume_m3 === "N/A") return "N/A";
    const volume_m3_num = parseFloat(volume_m3); // convert to number
    const weight_kg =
      volume_m3_num * Number(selected_tank_data?.sg || 1) * 1000; // density of water approx 1000 kg/m³
    return weight_kg.toFixed(2);
  }
  const diffWeightTon =
    (Math.round(Number(calculateWeight(endlevel - startlevel)) / 1000) * 100) /
    100;
  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 text-slate-900 sm:p-3">
        {/* === NEW: Control Bar Wrapper === */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-3xl border border-sky-100 bg-white p-3 shadow-sm">
          {/* === Dropdown + Search (Existing) === */}
          <div className="relative w-52" ref={dropdownRef}>
            <div
              className="flex cursor-pointer select-none items-center justify-between rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-sm font-semibold text-sky-900 outline-none transition-all hover:bg-sky-100"
              onClick={() => setOpen((prev) => !prev)}
            >
              <span>{selectedTag.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>

            {open && (
              <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border-b border-sky-100 bg-sky-50/50 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => {
                        setSelectedTag(opt);
                        setSearch("");
                        setOpen(false);
                      }}
                      className={`cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-sky-50 ${
                        selectedTag.value === opt.value
                          ? "bg-sky-100 font-semibold text-sky-900"
                          : ""
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                  {filteredOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-400">
                      No results
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === NEW: Date Range Selectors === */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="startDate"
              className="text-xs font-semibold text-slate-600"
            >
              Start:
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date: Date) => setStartDate(date)}
              showTimeSelect
              dateFormat="dd-MMM-yyyy HH:mm"
              className="w-36 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-300"
              id="startDate"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="endDate"
              className="text-xs font-semibold text-slate-600"
            >
              End:
            </label>
            <DatePicker
              selected={endDate}
              onChange={(date: Date) => setEndDate(date)}
              showTimeSelect
              dateFormat="dd-MMM-yyyy HH:mm"
              className="w-36 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-300"
              id="endDate"
            />
          </div>
          <select
            className="rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-xs font-medium text-sky-900 outline-none hover:bg-sky-100 focus:ring-2 focus:ring-sky-300"
            defaultValue="1w"
            onChange={(e) => {
              const value = e.target.value;
              const now = new Date();

              let newStart: Date = new Date();
              let newEnd: Date = now;

              switch (value) {
                case "current":
                  newStart = dayjs().startOf("day").toDate(); // 00:00 today
                  newEnd = now; // now
                  break;

                case "previous":
                  newStart = dayjs().subtract(1, "day").startOf("day").toDate(); // yesterday 00:00
                  newEnd = dayjs().startOf("day").toDate(); // today 00:00
                  break;

                case "1d":
                  newStart = dayjs(now).subtract(1, "day").toDate();
                  break;

                case "3d":
                  newStart = dayjs(now).subtract(3, "day").toDate();
                  break;

                case "1w":
                  newStart = dayjs(now).subtract(7, "day").toDate();
                  break;

                case "2w":
                  newStart = dayjs(now).subtract(14, "day").toDate();
                  break;

                case "1m":
                  newStart = dayjs(now).subtract(1, "month").toDate();
                  break;

                default:
                  return;
              }

              setStartDate(newStart);
              setEndDate(newEnd);
            }}
          >
            <option value="current">Current Day</option>
            <option value="previous">Previous Day</option>
            <option value="1d">1 Day</option>
            <option value="3d">3 Days</option>
            <option value="1w">1 Week</option>
            <option value="2w">2 Weeks</option>
            <option value="1m">1 Month</option>
          </select>
          {/* === END NEW === */}

          <div className="ml-auto flex flex-wrap gap-1.5 rounded-2xl border border-sky-100 bg-sky-50/50 p-1.5 text-slate-700">
            <div className="flex flex-col items-center justify-center rounded-xl border border-sky-100 bg-white px-2.5 py-1.5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Start level
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {dayjs(startDate).format("DD-MMM-YYYY HH.mm")}
              </div>
              <div className="text-sm font-bold text-sky-800">{startlevel}</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-sky-100 bg-white px-2.5 py-1.5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                End level
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {dayjs(endDate).format("DD-MMM-YYYY HH.mm")}
              </div>
              <div className="text-sm font-bold text-sky-800">{endlevel}</div>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-sky-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <div className="text-sky-800">{rate}</div>
              <div>Diff {diffWeightTon} TON</div>
              <div className="text-slate-500">
                {selected_tank_data?.high_target}
              </div>
            </div>
          </div>
        </div>

        {/* === Chart === */}
        {/* This container handles the height and horizontal scrolling */}
        <div className="min-h-0 w-full flex-1 overflow-x-auto overflow-y-hidden rounded-3xl border border-sky-100 bg-white p-3 shadow-sm">
          {loading && (
            // Flex container to center the spinner
            <div className="flex h-full w-full items-center justify-center">
              {/* This is the Tailwind spinner */}
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-sm font-semibold text-red-600">
                Error: {error}
              </p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            // This div sets the minimum width to enable scrolling
            <div
              className="h-full min-h-[320px]"
              style={{ minWidth: "1600px" }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 20, left: 8, bottom: 30 }}
                >
                  {/* ... rest of your chart ... */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    tick={<CustomizedAxisTick />}
                    interval={interval}
                  />

                  {/* Y-Axis 1 (Left) */}
                  <YAxis
                    yAxisId="1" // ID for the first dataset
                    stroke="#64748b"
                    type="number"
                    domain={[0, 22500]}
                    allowDataOverflow={true}
                    ticks={customTicks}
                  />

                  {/* Y-Axis 2 (Right) - FOR THE SECOND DATASET */}
                  <YAxis
                    yAxisId="2" // ID for the second dataset
                    orientation="right" // Place it on the right
                    stroke="#64748b" // Style as needed
                    domain={[0, 130]}
                    allowDataOverflow={true}
                    ticks={customTicks2}
                    // domain={[min, max]} // Set domain if needed, or let it be auto
                    // type="number"
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #bae6fd",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "#0f172a" }}
                    labelFormatter={(label) =>
                      dayjs(label).format("DD-MMM-YY HH:mm")
                    }
                  />

                  <defs>
                    {/* Gradient for First Area */}
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={myColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={myColor} stopOpacity={0} />
                    </linearGradient>

                    {/* Gradient for Second Area */}
                    <linearGradient
                      id="colorValue2"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={myColor2}
                        stopOpacity={0.8}
                      />
                      <stop offset="95%" stopColor={myColor2} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  {/* --- First Dataset --- */}
                  <Area
                    yAxisId="1"
                    type="monotone"
                    dataKey="level" // Data key for first dataset
                    stroke={myColor}
                    fill="url(#colorValue)"
                    fillOpacity={1}
                  />
                  <Line
                    yAxisId="1"
                    type="monotone"
                    dataKey="level" // Data key for first dataset
                    stroke={myColor}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    yAxisId="2" // Connect to the second Y-axis
                    type="monotone"
                    dataKey="temperature" // Data key for second dataset
                    stroke={myColor2} // Use the second color
                    fill="url(#colorValue2)" // Use the second gradient
                    fillOpacity={1}
                  />
                  <Line
                    yAxisId="2" // Connect to the second Y-axis
                    type="monotone"
                    dataKey="temperature" // Data key for second dataset
                    stroke={myColor2} // Use the second color
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            // Centered "No data" message
            <div className="flex h-full w-full items-center justify-center">
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TankTrend;
