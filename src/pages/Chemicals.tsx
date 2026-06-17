import React, { useEffect, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { Calculator, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/MainLayout";
import DashboardPerformance from "@/components/chemical_usage/chart";
import CardList from "@/components/chemical_usage/cardList";
import {
  FILTER_OPTIONS,
  FilterRange,
} from "@/components/chemical_usage/option";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pb } from "@/lib/pocketbase";
import { sendNotif } from "@/lib/sendnotif";
import { ChemicalUsage, PropaneTank } from "@/types/ChemicalUsage";

type Tank = PropaneTank;

type VesselLevelResponse = {
  TagName: string;
  TimeStamp?: string[];
  Value?: number[];
  Confidence?: number[];
};

type VesselLevelConfig = {
  tagName: string;
  label: string;
  subtitle: string;
  chemical: "FUR" | "MEK" | "TOL" | "PROP";
  visual: "vertical" | "horizontal";
  gradient: string;
  tonPerPercent?: number;
  tank?: Tank;
};

type VolumePoint = {
  level: number;
  "022V-103": number;
  "024V-112": number;
};

const volumeTable: VolumePoint[] = [
  { level: 0, "022V-103": 0, "024V-112": 0 },
  { level: 15, "022V-103": 12.0, "024V-112": 6.5 },
  { level: 20, "022V-103": 16.0, "024V-112": 8.0 },
  { level: 25, "022V-103": 20.0, "024V-112": 10.5 },
  { level: 30, "022V-103": 24.0, "024V-112": 13.0 },
  { level: 35, "022V-103": 28.0, "024V-112": 15.5 },
  { level: 40, "022V-103": 32.5, "024V-112": 18.0 },
  { level: 45, "022V-103": 37.0, "024V-112": 21.0 },
  { level: 50, "022V-103": 42.5, "024V-112": 23.5 },
  { level: 55, "022V-103": 46.5, "024V-112": 26.0 },
  { level: 60, "022V-103": 51.0, "024V-112": 28.5 },
  { level: 65, "022V-103": 56.0, "024V-112": 31.0 },
  { level: 70, "022V-103": 60.5, "024V-112": 33.5 },
];

const chemicalData = [
  { name: "Furfural", units: ["% Vessel", "m³", "kg"] },
  { name: "MEK", units: ["% Vessel", "m³"] },
  { name: "Toluene", units: ["% Vessel", "m³"] },
  // { name: "Sobi", units: ["kg", "Sack"] },
  // { name: "Antifoam", units: ["Liter", "kg"] },
  { name: "Propane", units: ["m³", "% Vessel"] },
];

const propaneTanks: Tank[] = ["022V-103", "024V-112"];

const vesselLevelEndpoint = "https://phd.miftachuda.my.id/GetData";

const vesselLevelRequestBody = [
  {
    SampleInterval: 900000,
    GetEnum: false,
    ResampleMethod: "Around",
    MinimumConfidence: 0,
    MaxRows: 100,
    TimeFormat: 6,
    ReductionData: "snapshot",
    TagName: [
      "023LI_019.PV",
      "024LI_026.PV",
      "024LI_023.PV",
      "024LI_052.PV",
      "022LI_021.PV",
    ],
    StartTime: "NOW",
    EndTime: "NOW",
    OutputTimeFormat: 6,
    EventSequence: 0,
  },
];

const vesselLevelConfigs: VesselLevelConfig[] = [
  {
    tagName: "023LI_019.PV",
    label: "FUR",
    subtitle: "Furfural",
    chemical: "FUR",
    visual: "vertical",
    gradient: "from-amber-400 to-orange-500",
    tonPerPercent: 2.11,
  },
  {
    tagName: "024LI_023.PV", //024LI_022.PV
    label: "MEK",
    subtitle: "MEK",
    chemical: "MEK",
    visual: "vertical",
    gradient: "from-violet-400 to-fuchsia-500",
    tonPerPercent: 0.8279,
  },
  {
    tagName: "024LI_026.PV", //024LI_025.PV
    label: "TOL",
    subtitle: "Toluene",
    chemical: "TOL",
    visual: "vertical",
    gradient: "from-emerald-400 to-green-500",
    tonPerPercent: 0.8279,
  },
  {
    tagName: "022LI_021.PV",
    label: "PROP",
    subtitle: "022V-103",
    chemical: "PROP",
    visual: "horizontal",
    gradient: "from-red-400 to-orange-500",
    tank: "022V-103",
  },
  {
    tagName: "024LI_052.PV",
    label: "PROP",
    subtitle: "024V-112",
    chemical: "PROP",
    visual: "horizontal",
    gradient: "from-red-400 to-orange-500",
    tank: "024V-112",
  },
];

const monthFilterMap: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

const toDateTimeLocalValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

function getVendorVolume(levelPercent: number, tank: Tank): number | null {
  const exact = volumeTable.find((point) => point.level === levelPercent);
  if (exact) return exact[tank];
  if (levelPercent < 0 || levelPercent > 70) return null;

  const lower = [...volumeTable]
    .reverse()
    .find((point) => point.level <= levelPercent);
  const upper = volumeTable.find((point) => point.level >= levelPercent);
  if (!lower || !upper) return null;

  const ratio = (levelPercent - lower.level) / (upper.level - lower.level);
  return lower[tank] + ratio * (upper[tank] - lower[tank]);
}

function getVolumeDifference(
  levelStart: number,
  levelEnd: number,
  tank: Tank,
): number | null {
  const volStart = getVendorVolume(levelStart, tank);
  const volEnd = getVendorVolume(levelEnd, tank);

  if (volStart == null || volEnd == null) return null;
  return volEnd - volStart;
}

function sumAmounts(arr: Array<ChemicalUsage | undefined>) {
  return arr.reduce((total, item) => {
    if (!item) return total;
    const value = Number(item.amount);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function formatChemicalNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getFilterRange(filter: FilterRange) {
  const now = new Date();

  if (filter === "minggu") {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }
  if (filter === "bulan") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  if (filter === "tahun") {
    return { start: startOfYear(now), end: endOfYear(now) };
  }
  if (filter === "semuaWaktu") {
    return { start: new Date(0), end: now };
  }

  const month = monthFilterMap[filter];
  const monthDate = new Date(now.getFullYear(), month, 1);
  return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
}

const ChemicalPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChemicalUsage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chemicalUsage, setChemicalUsage] = useState<ChemicalUsage[]>([]);
  const [filteredChemicalUsage, setFilteredChemicalUsage] = useState<
    ChemicalUsage[]
  >([]);
  const [vesselLevels, setVesselLevels] = useState<
    Record<string, VesselLevelResponse>
  >({});
  const [vesselLoading, setVesselLoading] = useState(false);
  const [vesselError, setVesselError] = useState("");
  const [filter, setFilter] = useState<FilterRange>("tahun");
  const [start, setStart] = useState(40);
  const [end, setEnd] = useState(50);
  const [tank, setTank] = useState<Tank>("022V-103");
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [selectedChemical, setSelectedChemical] = useState("Furfural");
  const [form, setForm] = useState({
    chemicalName: "",
    amount: "",
    unit: "",
    propaneTank: "022V-103" as Tank,
    propaneStartLevel: "",
    propaneEndLevel: "",
    description: "",
    time: toDateTimeLocalValue(new Date()),
  });

  const result = getVolumeDifference(start, end, tank);

  const applyFilter = (records: ChemicalUsage[], nextFilter: FilterRange) => {
    const { start: startDate, end: endDate } = getFilterRange(nextFilter);
    const filteredRecords = records.filter((item) => {
      const recordDate = new Date(item.time * 1000);
      return recordDate >= startDate && recordDate <= endDate;
    });

    setFilteredChemicalUsage(filteredRecords);
  };

  const fetchChemicalUsage = async () => {
    try {
      const records = await pb
        .collection("chemical_usage")
        .getFullList<ChemicalUsage>({
          sort: "time",
          filter: "isDeleted != true",
        });
      const activeRecords = records.filter((item) => !item.isDeleted);
      setChemicalUsage(activeRecords);
      applyFilter(activeRecords, filter);
    } catch (error) {
      console.error("Error fetching chemical usage:", error);
    }
  };

  const fetchVesselLevels = async () => {
    try {
      setVesselLoading(true);
      setVesselError("");
      const response = await fetch(vesselLevelEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vesselLevelRequestBody),
      });

      if (!response.ok) {
        throw new Error(`Vessel level request failed: ${response.status}`);
      }

      const data = (await response.json()) as VesselLevelResponse[];
      const nextLevels = data.reduce<Record<string, VesselLevelResponse>>(
        (levels, item) => ({
          ...levels,
          [item.TagName]: item,
        }),
        {},
      );

      setVesselLevels(nextLevels);
    } catch (error) {
      console.error("Error fetching vessel levels:", error);
      setVesselError("Failed to load vessel level data.");
    } finally {
      setVesselLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicalUsage();
    fetchVesselLevels();
  }, []);

  useEffect(() => {
    applyFilter(chemicalUsage, filter);
  }, [chemicalUsage, filter]);

  const grouped = filteredChemicalUsage.reduce(
    (acc, item) => {
      acc[item.chemical_name] ??= [];
      acc[item.chemical_name].push(item);
      return acc;
    },
    {} as Record<string, ChemicalUsage[]>,
  );

  const fpersentonmcubic = 1.82;
  const fpersentoton = 2.11;
  const ftontomcubic = fpersentonmcubic / fpersentoton;
  const mtpersentonmcubic = 0.95;
  const mtpersentoton = 0.8279;
  const mttontomcubic = mtpersentonmcubic / mtpersentoton;

  const furfural = (grouped.Furfural || [])
    .map((item) => {
      if (item.unit === "% Vessel") {
        return {
          ...item,
          amount: Number(item.amount) * fpersentonmcubic,
          unit: "m³",
        };
      }
      if (item.unit === "kg") {
        return {
          ...item,
          amount: (Number(item.amount) * ftontomcubic) / 1000,
          unit: "m³",
        };
      }
      return item;
    })
    .filter(Boolean);
  const mek = (grouped.MEK || [])
    .map((item) => {
      if (item.unit === "% Vessel") {
        return {
          ...item,
          amount: Number(item.amount) * mtpersentonmcubic,
          unit: "m³",
        };
      }
      if (item.unit === "kg") {
        return {
          ...item,
          amount: (Number(item.amount) * mttontomcubic) / 1000,
          unit: "m³",
        };
      }
      return item;
    })
    .filter(Boolean);
  const toluene = (grouped.Toluene || [])
    .map((item) => {
      if (item.unit === "% Vessel") {
        return {
          ...item,
          amount: Number(item.amount) * mtpersentonmcubic,
          unit: "m³",
        };
      }
      if (item.unit === "kg") {
        return {
          ...item,
          amount: (Number(item.amount) * mttontomcubic) / 1000,
          unit: "m³",
        };
      }
      return item;
    })
    .filter(Boolean);
  const propane = grouped.Propane || [];
  const propaneForMetrics = propane.map((item) => {
    if (item.unit !== "% Vessel") return item;

    const storedVolumeM3 = Number(item.propane_volume_m3);
    const startLevel = Number(item.propane_start_level);
    const endLevel = Number(item.propane_end_level);
    const calculatedVolumeM3 =
      item.propane_tank && Number.isFinite(startLevel) && Number.isFinite(endLevel)
        ? getVolumeDifference(startLevel, endLevel, item.propane_tank)
        : null;

    return {
      ...item,
      amount: Number.isFinite(storedVolumeM3)
        ? storedVolumeM3
        : calculatedVolumeM3 ?? 0,
      unit: "m³",
    };
  });
  const allChemicalUsage = [furfural, mek, toluene, propaneForMetrics];
  const chemicals = {
    Furfural: furfural,
    MEK: mek,
    Toluene: toluene,
    Propane: propane,
  };

  const handleChemicalChange = (chemicalName: string) => {
    const selected = chemicalData.find(
      (chemical) => chemical.name === chemicalName,
    );
    const units = selected ? selected.units : [];
    setAvailableUnits(units);
    setForm((current) => ({
      ...current,
      chemicalName,
      unit: units[0] || "",
      propaneTank: "022V-103",
      propaneStartLevel: "",
      propaneEndLevel: "",
    }));
  };

  const getChemicalExportAmounts = (item: ChemicalUsage) => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) {
      return { percentAmount: null, m3Amount: null };
    }

    if (item.chemical_name === "Furfural") {
      if (item.unit === "% Vessel") {
        return { percentAmount: amount, m3Amount: amount * fpersentonmcubic };
      }
      if (item.unit === "m³") {
        return { percentAmount: amount / fpersentonmcubic, m3Amount: amount };
      }
      if (item.unit === "kg") {
        const m3Amount = (amount * ftontomcubic) / 1000;
        return { percentAmount: m3Amount / fpersentonmcubic, m3Amount };
      }
    }

    if (item.chemical_name === "MEK" || item.chemical_name === "Toluene") {
      if (item.unit === "% Vessel") {
        return { percentAmount: amount, m3Amount: amount * mtpersentonmcubic };
      }
      if (item.unit === "m³") {
        return { percentAmount: amount / mtpersentonmcubic, m3Amount: amount };
      }
      if (item.unit === "kg") {
        const m3Amount = (amount * mttontomcubic) / 1000;
        return { percentAmount: m3Amount / mtpersentonmcubic, m3Amount };
      }
    }

    if (item.chemical_name === "Propane") {
      const storedVolumeM3 = Number(item.propane_volume_m3);
      const hasStoredVolume = Number.isFinite(storedVolumeM3);

      if (item.unit === "m³") {
        return {
          percentAmount: null,
          m3Amount: hasStoredVolume ? storedVolumeM3 : amount,
        };
      }
      if (item.unit === "% Vessel") {
        const tankName = item.propane_tank;
        const startLevel = Number(item.propane_start_level);
        const endLevel = Number(item.propane_end_level);
        const calculatedVolumeM3 =
          tankName && Number.isFinite(startLevel) && Number.isFinite(endLevel)
            ? getVolumeDifference(startLevel, endLevel, tankName)
            : null;
        const m3Amount = hasStoredVolume ? storedVolumeM3 : calculatedVolumeM3;
        return { percentAmount: amount, m3Amount };
      }
    }

    return { percentAmount: null, m3Amount: null };
  };

  const handleExportExcel = async () => {
    if (filteredChemicalUsage.length === 0) {
      toast.error("No chemical usage data to export");
      return;
    }

    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    chemicalData.forEach((chemical) => {
      const rows = filteredChemicalUsage
        .filter((item) => item.chemical_name === chemical.name)
        .sort((a, b) => b.time - a.time)
        .map((item, index) => {
          const { percentAmount, m3Amount } = getChemicalExportAmounts(item);
          return {
            No: index + 1,
            Date: format(new Date(item.time * 1000), "dd MMM yyyy, HH:mm"),
            Chemical: item.chemical_name,
            Vessel: item.chemical_name === "Propane" ? item.propane_tank || "" : "",
            "Start Level (%)": item.propane_start_level ?? "",
            "End Level (%)": item.propane_end_level ?? "",
            "Delta Level (%)":
              item.chemical_name === "Propane" && item.unit === "% Vessel"
                ? Number(item.amount)
                : "",
            Description: item.description || "",
            "Amount (% Vessel)": percentAmount ?? "",
            "Amount (m³)": m3Amount ?? "",
            "Original Amount": Number(item.amount),
            "Original Unit": item.unit,
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [
          "No",
          "Date",
          "Chemical",
          "Vessel",
          "Start Level (%)",
          "End Level (%)",
          "Delta Level (%)",
          "Description",
          "Amount (% Vessel)",
          "Amount (m³)",
          "Original Amount",
          "Original Unit",
        ],
      });
      XLSX.utils.book_append_sheet(workbook, worksheet, chemical.name);
    });

    XLSX.writeFile(
      workbook,
      `chemical-usage-export-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`,
    );
  };

  const handleSave = async () => {
    const isPropane = form.chemicalName === "Propane";
    const isPropanePercent = isPropane && form.unit === "% Vessel";

    if (!form.chemicalName || !form.unit || (!isPropanePercent && !form.amount)) {
      alert("Please fill all required fields");
      return;
    }

    if (isPropane && !form.propaneTank) {
      alert("Please select propane vessel");
      return;
    }

    const propaneStartLevel = Number(form.propaneStartLevel);
    const propaneEndLevel = Number(form.propaneEndLevel);
    const propaneVolumeM3 = isPropanePercent
      ? getVolumeDifference(propaneStartLevel, propaneEndLevel, form.propaneTank)
      : null;

    if (
      isPropanePercent &&
      (!form.propaneStartLevel ||
        !form.propaneEndLevel ||
        !Number.isFinite(propaneStartLevel) ||
        !Number.isFinite(propaneEndLevel))
    ) {
      alert("Please fill valid propane start and end levels");
      return;
    }

    if (isPropanePercent && propaneEndLevel > 70) {
      alert("End level cannot be more than 70%");
      return;
    }

    if (isPropanePercent && propaneVolumeM3 == null) {
      alert("Propane level must be between 0% and 70%");
      return;
    }

    const savedAmount = isPropanePercent
      ? propaneEndLevel - propaneStartLevel
      : Number(form.amount);

    const payload: Record<string, string | number | boolean> = {
      chemical_name: form.chemicalName,
      amount: savedAmount,
      unit: form.unit,
      time: Math.floor(new Date(form.time).getTime() / 1000),
      description: form.description,
      isDeleted: false,
    };

    if (isPropane) {
      payload.propane_tank = form.propaneTank;
      if (isPropanePercent) {
        payload.propane_start_level = propaneStartLevel;
        payload.propane_end_level = propaneEndLevel;
        payload.propane_volume_m3 = propaneVolumeM3 ?? 0;
      } else {
        payload.propane_volume_m3 = Number(form.amount);
      }
    }

    try {
      setLoading(true);
      const createdRecord = await pb.collection("chemical_usage").create(payload);
      await fetchChemicalUsage();
      setOpen(false);
      setForm({
        chemicalName: "",
        amount: "",
        unit: "",
        propaneTank: "022V-103",
        propaneStartLevel: "",
        propaneEndLevel: "",
        description: "",
        time: toDateTimeLocalValue(new Date()),
      });
      await sendNotif({
        title: "[Chemical Usage] Recorded",
        page: "chemical",
        message: `A new record for ${form.chemicalName} has been added.`,
        action: "create",
        collection: "chemical_usage",
        record_id: createdRecord.id,
      });
      toast.success("Chemical usage record saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save chemical usage");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChemicalUsage = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget.id);
      await pb.collection("chemical_usage").update(deleteTarget.id, {
        isDeleted: true,
      });

      await sendNotif({
        title: "[Chemical Usage] Deleted",
        page: "chemical",
        message: `${deleteTarget.chemical_name} usage record was deleted.`,
        action: "soft_delete",
        collection: "chemical_usage",
        record_id: deleteTarget.id,
      });

      setChemicalUsage((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setFilteredChemicalUsage((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success("Chemical usage deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete chemical usage");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedChemicalData =
    chemicals[selectedChemical as keyof typeof chemicals] ?? [];
  const isPropaneForm = form.chemicalName === "Propane";
  const isPropanePercentForm = isPropaneForm && form.unit === "% Vessel";
  const formPropaneStartLevel = Number(form.propaneStartLevel);
  const formPropaneEndLevel = Number(form.propaneEndLevel);
  const formPropaneDeltaLevel = formPropaneEndLevel - formPropaneStartLevel;
  const isPropaneEndLevelOverLimit =
    isPropanePercentForm && Number.isFinite(formPropaneEndLevel) && formPropaneEndLevel > 70;
  const formPropaneVolumeM3 =
    isPropanePercentForm && form.propaneStartLevel && form.propaneEndLevel
      ? getVolumeDifference(
          formPropaneStartLevel,
          formPropaneEndLevel,
          form.propaneTank,
        )
      : null;

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sky-950 sm:text-2xl">
                Chemical Usage
              </h1>
              <p className="text-sm text-sky-700">
                Track chemical consumption, conversion, and make-up records.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-600 hover:to-cyan-600 sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Add Chemical Usage
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportExcel}
                disabled={filteredChemicalUsage.length === 0}
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as FilterRange)
                }
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/60 px-3 text-sm font-medium text-sky-900 outline-none focus:ring-2 focus:ring-sky-300 sm:w-auto"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCalc(true)}
                className="w-full border-sky-200 text-sky-700 hover:bg-sky-50 sm:w-auto"
              >
                <Calculator className="h-4 w-4" /> Propane Calculator
              </Button>
            </div>
          </div>
        </div>

        <DashboardPerformance
          title="Chart of Chemical Usage"
          chartData={allChemicalUsage as any}
          chartColor="#0ea5e9"
          metrics={[
            {
              title: "Furfural Used",
              value: sumAmounts(furfural),
              icon: <div className="font-extrabold">FUR</div>,
              gradient: "linear-gradient(135deg,#f59e0b,#f97316)",
            },
            {
              title: "MEK Used",
              value: sumAmounts(mek),
              icon: <div className="font-extrabold">MEK</div>,
              gradient: "linear-gradient(135deg,#8b5cf6,#a855f7)",
            },
            {
              title: "Toluene Used",
              value: sumAmounts(toluene),
              icon: <div className="font-extrabold">TOL</div>,
              gradient: "linear-gradient(135deg,#10b981,#22c55e)",
            },
            {
              title: "Propane Used",
              value: sumAmounts(propaneForMetrics),
              icon: <div className="font-extrabold">PROP</div>,
              gradient: "linear-gradient(135deg,#ef4444,#f97316)",
            },
          ]}
          onChemicalChange={setSelectedChemical}
        />

        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-sky-950">
                Vessel Level Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Live vessel level from PHD with inventory conversion.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={fetchVesselLevels}
              disabled={vesselLoading}
              className="border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              {vesselLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Refresh Level
            </Button>
          </div>

          {vesselError ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {vesselError}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {vesselLevelConfigs.map((config) => {
                const record = vesselLevels[config.tagName];
                const rawLevel = Number(record?.Value?.[0] ?? 0);
                const confidence = Number(record?.Confidence?.[0] ?? 0);
                const hasSignal = Boolean(record) && confidence > 0;
                const levelPercent = clampPercent(rawLevel);
                const volumeM3 =
                  hasSignal && config.tank
                    ? getVendorVolume(levelPercent, config.tank)
                    : null;
                const convertedValue = hasSignal
                  ? config.tonPerPercent
                    ? levelPercent * config.tonPerPercent
                    : volumeM3
                  : null;
                const convertedUnit = config.tonPerPercent ? "TON" : "m³";
                const fillClass = hasSignal
                  ? `bg-gradient-to-t ${config.gradient}`
                  : "bg-slate-200";

                return (
                  <div
                    key={config.tagName}
                    className="rounded-3xl border border-sky-100 bg-sky-50/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-extrabold text-sky-950">
                          {config.label}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {config.subtitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          hasSignal
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {hasSignal ? "LIVE" : "NO SIGNAL"}
                      </span>
                    </div>

                    <div className="mt-4 flex min-h-[150px] items-center justify-center">
                      {config.visual === "vertical" ? (
                        <div className="relative h-36 w-20 overflow-hidden rounded-b-3xl rounded-t-xl border-2 border-sky-100 bg-white shadow-inner">
                          <div
                            className={`absolute bottom-0 left-0 w-full transition-all ${fillClass}`}
                            style={{
                              height: `${hasSignal ? levelPercent : 0}%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
                            <span className="rounded-full bg-white/80 px-2 py-1 text-sm font-extrabold text-sky-950 shadow-sm">
                              {hasSignal
                                ? `${formatChemicalNumber(levelPercent)}%`
                                : "-"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-20 w-full overflow-hidden rounded-full border-2 border-sky-100 bg-white shadow-inner">
                          <div
                            className={`absolute bottom-0 left-0 w-full transition-all ${fillClass}`}
                            style={{
                              height: `${hasSignal ? levelPercent : 0}%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
                            <span className="rounded-full bg-white/80 px-2 py-1 text-sm font-extrabold text-sky-950 shadow-sm">
                              {hasSignal
                                ? `${formatChemicalNumber(levelPercent)}%`
                                : "-"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Inventory
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-sky-950">
                        {hasSignal && convertedValue != null
                          ? `${formatChemicalNumber(convertedValue)} ${convertedUnit}`
                          : "-"}
                      </p>
                      <p className="mt-1 text-[10px] italic text-slate-400">
                        {record?.TimeStamp?.[0] || "No timestamp"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <CardList
          data={selectedChemicalData}
          deletingId={deletingId}
          onDeleteClick={setDeleteTarget}
        />

        <Dialog open={calc} onOpenChange={setCalc}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border-sky-100 bg-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sky-950">
                Propane Calculator
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-3xl border border-sky-100 bg-sky-50/40 p-5">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Select Vessel
                  </label>
                  <select
                    value={tank}
                    onChange={(event) => setTank(event.target.value as Tank)}
                    className="h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="022V-103">022V-103</option>
                    <option value="024V-112">024V-112</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Level Awal (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={70}
                      value={start}
                      onChange={(event) => setStart(Number(event.target.value))}
                      className="rounded-xl border-sky-200 bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Level Akhir (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={70}
                      value={end}
                      onChange={(event) => setEnd(Number(event.target.value))}
                      className="rounded-xl border-sky-200 bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-white p-4 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    Selisih Volume
                  </p>
                  <p
                    className={`text-2xl font-bold ${result !== null ? "text-sky-700" : "text-red-500"}`}
                  >
                    {result !== null ? `${result.toFixed(2)} m³` : "No Result"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCalc(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border-sky-100 bg-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-sky-950">
                Add Chemical Usage
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label
                  htmlFor="chemicalName"
                  className="text-slate-600 sm:text-right"
                >
                  Chemical
                </Label>
                <Select
                  onValueChange={handleChemicalChange}
                  value={form.chemicalName}
                >
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue placeholder="Select a chemical" />
                  </SelectTrigger>
                  <SelectContent>
                    {chemicalData.map((chemical) => (
                      <SelectItem key={chemical.name} value={chemical.name}>
                        {chemical.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isPropanePercentForm && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                  <Label
                    htmlFor="amount"
                    className="text-slate-600 sm:text-right"
                  >
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.1"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    className="sm:col-span-3"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="unit" className="text-slate-600 sm:text-right">
                  Unit
                </Label>
                <Select
                  onValueChange={(value) => setForm({ ...form, unit: value })}
                  value={form.unit}
                  disabled={!form.chemicalName}
                >
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isPropaneForm && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                  <Label
                    htmlFor="propaneTank"
                    className="text-slate-600 sm:text-right"
                  >
                    Vessel
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setForm({ ...form, propaneTank: value as Tank })
                    }
                    value={form.propaneTank}
                  >
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue placeholder="Select propane vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {propaneTanks.map((propaneTank) => (
                        <SelectItem key={propaneTank} value={propaneTank}>
                          {propaneTank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isPropanePercentForm && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                  <Label className="text-slate-600 sm:pt-2 sm:text-right">
                    Level Delta
                  </Label>
                  <div className="grid gap-3 sm:col-span-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor="propaneStartLevel"
                          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          Start Level (%)
                        </Label>
                        <Input
                          id="propaneStartLevel"
                          type="number"
                          min={0}
                          max={70}
                          step="0.1"
                          value={form.propaneStartLevel}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              propaneStartLevel: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="propaneEndLevel"
                          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          End Level (%)
                        </Label>
                        <Input
                          id="propaneEndLevel"
                          type="number"
                          min={0}
                          max={70}
                          step="0.1"
                          value={form.propaneEndLevel}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              propaneEndLevel: event.target.value,
                            })
                          }
                        />
                        {isPropaneEndLevelOverLimit && (
                          <p className="mt-1 text-xs font-semibold text-red-600">
                            End level cannot be more than 70%.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                      <p className="font-semibold">
                        Delta Level: {Number.isFinite(formPropaneDeltaLevel) ? formPropaneDeltaLevel.toFixed(2) : "-"}%
                      </p>
                      <p className="mt-1 font-bold">
                        Calculated Volume: {formPropaneVolumeM3 != null ? `${formPropaneVolumeM3.toFixed(2)} m³` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="time" className="text-slate-600 sm:text-right">
                  Time
                </Label>
                <Input
                  id="time"
                  type="datetime-local"
                  value={form.time}
                  onChange={(event) =>
                    setForm({ ...form, time: event.target.value })
                  }
                  className="sm:col-span-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label
                  htmlFor="description"
                  className="text-slate-600 sm:text-right"
                >
                  Description
                </Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="sm:col-span-3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(isOpen) => {
            if (!isOpen && !deletingId) setDeleteTarget(null);
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] rounded-3xl border-red-100 bg-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                Delete this chemical usage?
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-start gap-4 rounded-2xl bg-red-50/60 p-4">
              <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <p className="text-sm leading-6 text-slate-600">
                  This will delete the selected chemical usage record from the
                  list.
                </p>
                {deleteTarget && (
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {deleteTarget.chemical_name} -{" "}
                    {Number(deleteTarget.amount).toFixed(2)} {deleteTarget.unit}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteChemicalUsage}
                disabled={Boolean(deletingId)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleteTarget && deletingId === deleteTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleteTarget && deletingId === deleteTarget.id
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ChemicalPage;
