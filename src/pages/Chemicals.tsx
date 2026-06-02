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
import { Calculator, Plus } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/MainLayout";
import DashboardPerformance from "@/components/chemical_usage/chart";
import CardList from "@/components/chemical_usage/cardList";
import { FILTER_OPTIONS, FilterRange } from "@/components/chemical_usage/option";
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
import { ChemicalUsage } from "@/types/ChemicalUsage";

type Tank = "022V-103" | "024V-112";

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
  { name: "Sobi", units: ["kg", "Sack"] },
  { name: "Antifoam", units: ["Liter", "kg"] },
  { name: "Propane", units: ["m³", "% Vessel"] },
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
  const [chemicalUsage, setChemicalUsage] = useState<ChemicalUsage[]>([]);
  const [filteredChemicalUsage, setFilteredChemicalUsage] = useState<
    ChemicalUsage[]
  >([]);
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
        });
      setChemicalUsage(records);
      applyFilter(records, filter);
    } catch (error) {
      console.error("Error fetching chemical usage:", error);
    }
  };

  useEffect(() => {
    fetchChemicalUsage();
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
        return { ...item, amount: Number(item.amount) * fpersentonmcubic, unit: "m³" };
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
        return { ...item, amount: Number(item.amount) * mtpersentonmcubic, unit: "m³" };
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
        return { ...item, amount: Number(item.amount) * mtpersentonmcubic, unit: "m³" };
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
  const allChemicalUsage = [furfural, mek, toluene, propane];
  const chemicals = { Furfural: furfural, MEK: mek, Toluene: toluene, Propane: propane };

  const handleChemicalChange = (chemicalName: string) => {
    const selected = chemicalData.find((chemical) => chemical.name === chemicalName);
    const units = selected ? selected.units : [];
    setAvailableUnits(units);
    setForm((current) => ({
      ...current,
      chemicalName,
      unit: units[0] || "",
    }));
  };

  const handleSave = async () => {
    if (!form.chemicalName || !form.amount || !form.unit) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      await pb.collection("chemical_usage").create({
        chemical_name: form.chemicalName,
        amount: Number(form.amount),
        unit: form.unit,
        time: Math.floor(new Date(form.time).getTime() / 1000),
        description: form.description,
      });
      await fetchChemicalUsage();
      setOpen(false);
      setForm({
        chemicalName: "",
        amount: "",
        unit: "",
        description: "",
        time: toDateTimeLocalValue(new Date()),
      });
      await sendNotif({
        title: "[Chemical Usage] Recorded",
        page: "chemical",
        message: `A new record for ${form.chemicalName} has been added.`,
      });
      toast.success("Chemical usage record saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save chemical usage");
    } finally {
      setLoading(false);
    }
  };

  const selectedChemicalData =
    chemicals[selectedChemical as keyof typeof chemicals] ?? [];

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sky-950 sm:text-2xl">Chemical Usage</h1>
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
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterRange)}
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
              value: sumAmounts(propane),
              icon: <div className="font-extrabold">PROP</div>,
              gradient: "linear-gradient(135deg,#ef4444,#f97316)",
            },
          ]}
          onChemicalChange={setSelectedChemical}
        />

        <CardList data={selectedChemicalData} />

        <Dialog open={calc} onOpenChange={setCalc}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border-sky-100 bg-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sky-950">Propane Calculator</DialogTitle>
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
                  <p className="text-sm font-semibold text-slate-500">Selisih Volume</p>
                  <p className={`text-2xl font-bold ${result !== null ? "text-sky-700" : "text-red-500"}`}>
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
              <DialogTitle className="text-sky-950">Add Chemical Usage</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="chemicalName" className="text-slate-600 sm:text-right">
                  Chemical
                </Label>
                <Select onValueChange={handleChemicalChange} value={form.chemicalName}>
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

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="amount" className="text-slate-600 sm:text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.1"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  className="sm:col-span-3"
                />
              </div>

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

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="time" className="text-slate-600 sm:text-right">
                  Time
                </Label>
                <Input
                  id="time"
                  type="datetime-local"
                  value={form.time}
                  onChange={(event) => setForm({ ...form, time: event.target.value })}
                  className="sm:col-span-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center">
                <Label htmlFor="description" className="text-slate-600 sm:text-right">
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
      </div>
    </DashboardLayout>
  );
};

export default ChemicalPage;
