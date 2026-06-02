import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { CountUp } from "./countUp";
import { ChemicalUsage } from "@/types/ChemicalUsage";

interface MetricCard {
  title: string;
  value: number;
  icon?: React.ReactNode;
  gradient?: string; // gradient color string
}

interface DashboardPerformanceProps {
  title?: string;
  chartData: (
    | ChemicalUsage
    | {
        amount: string;
        unit: string;
        id: string;
        chemical_name: string;
        time: number;
        created: string;
        updated: string;
      }
  )[][];
  chartColor?: string;
  yLabel?: string;
  metrics: MetricCard[];
  chartType?: "line" | "area";
  onChemicalChange?: (chemical: string) => void; // callback for dropdown change
}
function getLineDataByChemical(groupedArray, chemicalName: string) {
  const group = groupedArray.find(
    (g) => g.length > 0 && g[0].chemical_name === chemicalName
  );
  return group
    ? group.map((item) => ({
        name: new Date(item.time * 1000).toLocaleDateString("en-GB"),
        value: parseFloat(item.amount),
      }))
    : [];
}
const DashboardPerformance: React.FC<DashboardPerformanceProps> = ({
  title = "Performance",
  chartData,
  chartColor = "#ff66cc",
  yLabel = "Total Engagements",
  metrics,
  chartType = "bar",
  onChemicalChange,
}) => {
  const [selectedChemical, setSelectedChemical] = useState("Furfural");
  const [selectedChemicalData, setSelectedChemicalData] = useState<any>();

  const handleChemicalChange = (value: string) => {
    setSelectedChemical(value);
    const lineData = getLineDataByChemical(chartData, value);
    setSelectedChemicalData(lineData);
    if (onChemicalChange) onChemicalChange(value);
  };
  useEffect(() => {
    const lineData = getLineDataByChemical(chartData, selectedChemical);
    setSelectedChemicalData(lineData);
  }, [chartData]);
  const selectedChemicalDataWithTime = (selectedChemicalData ?? []).map(
    (item) => ({
      ...item,
      time: new Date(item.name.split("/").reverse().join("-")).getTime(),
    }),
  );
  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-4 text-slate-900 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-sky-950 sm:text-xl">{title}</h2>
        <div className="relative z-50 flex items-center space-x-2">
          <div className="relative w-full sm:w-auto">
            <Select
              value={selectedChemical}
              onValueChange={handleChemicalChange}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-sky-200 bg-sky-50/60 text-sky-900 focus:ring-sky-300 sm:w-44">
                <SelectValue placeholder="Select Chemical" />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="min-w-[11rem] rounded-xl border-sky-100 bg-white text-slate-700 shadow-lg"
              >
                {["Furfural", "MEK", "Toluene", "Propane"].map((chemical) => (
                  <SelectItem
                    key={chemical}
                    value={chemical}
                    className="rounded-lg text-sm focus:bg-sky-50 focus:text-sky-900"
                  >
                    {chemical}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-6 h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={selectedChemicalDataWithTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />

            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["auto", "auto"]}
              tickFormatter={(time) =>
                new Date(time).toLocaleDateString("id-ID")
              }
              stroke="#64748b"
              padding={{ left: 25, right: 25 }}
              angle={-45} // rotate 45 degrees
              textAnchor="end" // align nicely after rotation
              height={60} // give space so text isn't clipped
              tick={{ fontSize: 10 }} // smaller font
            />

            <YAxis stroke="#64748b" />

            <Tooltip
              labelFormatter={(time) =>
                new Date(time).toLocaleDateString("id-ID")
              }
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #bae6fd",
                borderRadius: "12px",
              }}
              labelStyle={{ color: "#0f172a" }}
              cursor={false}
            />

            <Bar
              dataKey="value"
              fill={chartColor}
              radius={[6, 6, 0, 0]}
              barSize={7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-4">
        {metrics.map((metric, i) => (
          <div
            key={i}
             className="flex flex-col items-center justify-center rounded-2xl border border-sky-100 bg-sky-50/40 p-3 text-center sm:p-4"
          >
            <div
              className="w-12 h-12 flex items-center justify-center rounded-full mb-2"
              style={{
                background:
                  metric.gradient || "linear-gradient(135deg,#ff66cc,#6b73ff)",
              }}
            >
              <div className="text-white">{metric.icon}</div>
            </div>
            <div className="text-base font-bold text-sky-950 sm:text-lg">
              <>
                <CountUp value={metric.value} decimals={2} /> m³
              </>
            </div>
            <div className="text-sm font-medium text-slate-500">{metric.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPerformance;
