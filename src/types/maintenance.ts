export type StepStatus = "not yet" | "in-progress" | "completed";
export type Priority = "low" | "medium" | "high" | "critical";
export type EquipmentType =
  | "Heat Exchanger"
  | "Piping"
  | "Furnace"
  | "Column"
  | "Vessel"
  | "Pump"
  | "Compressor"
  | "Jet Ejector"
  | "Strainer"
  | "Instrument"
  | "Electrical"
  | "Other";

export const equipmentTypes: EquipmentType[] = [
  "Heat Exchanger",
  "Piping",
  "Furnace",
  "Column",
  "Vessel",
  "Pump",
  "Compressor",
  "Jet Ejector",
  "Strainer",
  "Instrument",
  "Electrical",
  "Other",
];

export const typeLabels: Record<EquipmentType, string> = {
  "Heat Exchanger": "Heat Exchanger",
  Piping: "Piping",
  Furnace: "Furnace",
  Column: "Column",
  Vessel: "Vessel",
  Pump: "Pump",
  Compressor: "Compressor",
  "Jet Ejector": "Jet Ejector",
  Strainer: "Strainer",
  Instrument: "Instrument",
  Electrical: "Electrical",
  Other: "Other",
};

export const typeClasses: Record<EquipmentType, string> = {
  "Heat Exchanger": "bg-blue-100 text-blue-800",
  Piping: "bg-emerald-100 text-emerald-800",
  Furnace: "bg-orange-100 text-orange-800",
  Column: "bg-amber-200 text-amber-900",
  Vessel: "bg-purple-100 text-purple-800",
  Pump: "bg-rose-100 text-rose-800",
  Compressor: "bg-fuchsia-100 text-fuchsia-800",
  "Jet Ejector": "bg-teal-100 text-teal-800",
  Strainer: "bg-gray-200 text-gray-800",
  Instrument: "bg-sky-100 text-sky-800",
  Electrical: "bg-indigo-100 text-indigo-800",
  Other: "bg-zinc-200 text-zinc-800",
};

export const typeColors: Record<EquipmentType, string> = {
  "Heat Exchanger": "#3b82f6",
  Piping: "#10b981",
  Furnace: "#ef4444",
  Column: "#f59e0b",
  Vessel: "#8b5cf6",
  Pump: "#06b6d4",
  Compressor: "#ec4899",
  "Jet Ejector": "#84cc16",
  Strainer: "#f97316",
  Instrument: "#14b8a6",
  Electrical: "#0ea5e9",
  Other: "#6b7280",
};

export interface MaintenanceStep {
  id: string;
  steptitle: string;
  description: string;
  progress: number;
  startdate?: number;
  enddate?: number;
  status: StepStatus;
}

export interface StepGroup {
  id: string;
  stepname: string;
  steplist: MaintenanceStep[];
}

export interface StepTask {
  id: string;
  title: string;
  equipment: string;
  type: EquipmentType;
  dicipline: string;
  unit?: string;
  priority: Priority;
  assignee: string;
  lastmodified: number;
  steps: StepGroup[];
  photos?: string[];
}
