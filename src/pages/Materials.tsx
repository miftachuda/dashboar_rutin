import { useEffect, useState } from "react";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  subDays,
} from "date-fns";
import { Loader2, Trash2, Triangle } from "lucide-react";
import DashboardLayout from "@/components/MainLayout";
import { pb } from "@/lib/pocketbase";
import {
  ConsumableMaterial,
  ConsumableMaterialSection,
  consumableMaterialSections,
} from "@/types/ConsumableMaterial";

type StockMode = "add" | "opname";
type ConsumptionRatePeriod = "day" | "week" | "month" | "year";

const CONSUMPTION_RATE_DAYS = 30;
const consumptionRatePeriods: ConsumptionRatePeriod[] = [
  "day",
  "week",
  "month",
  "year",
];

interface ConsumableMaterialStockLog {
  id: string;
  created: string;
  updated: string;
  material_id: string;
  material_name: string;
  section: string;
  type: string;
  action: "add_stock" | "stock_opname" | string;
  previous_stock: number;
  quantity: number;
  opname_stock: number;
  consumption: number;
  next_stock: number;
  unit: string;
  notes?: string;
  isDeleted?: boolean;
}

const formatNumber = (value: number | undefined) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(numberValue);
};

const parseDateValue = (value?: string) => {
  if (!value) return null;

  const isoLikeValue = value.trim().replace(" ", "T");
  const utcValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(isoLikeValue)
    ? isoLikeValue
    : `${isoLikeValue}Z`;
  const localValue = isoLikeValue.replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, "");
  const candidates = [new Date(utcValue), new Date(localValue)].filter(
    (candidate) => !Number.isNaN(candidate.getTime()),
  );
  if (candidates.length === 0) return null;

  return candidates.sort(
    (left, right) =>
      Math.abs(left.getTime() - Date.now()) -
      Math.abs(right.getTime() - Date.now()),
  )[0];
};

const formatTimeAgo = (value?: string) => {
  const date = parseDateValue(value);
  if (!date) return "-";
  if (Number.isNaN(date.getTime())) return "-";

  return formatDistanceToNow(date, { addSuffix: true });
};

const formatDateTime = (value?: string) => {
  const date = parseDateValue(value);
  if (!date) return "-";

  return format(date, "dd MMM yyyy, HH:mm");
};

const parseStockInput = (value: string) => {
  const numberValue = Number(value);
  return value.trim() !== "" && Number.isFinite(numberValue)
    ? numberValue
    : null;
};

const getConsumptionRatePeriod = (
  item: ConsumableMaterial,
): ConsumptionRatePeriod => {
  const candidate = String(
    item.consumption_period || item.consumption_unit || "day",
  ).toLowerCase();

  return consumptionRatePeriods.includes(candidate as ConsumptionRatePeriod)
    ? (candidate as ConsumptionRatePeriod)
    : "day";
};

const getConsumptionRateMultiplier = (period: ConsumptionRatePeriod) => {
  if (period === "week") return 7;
  if (period === "month") return 30;
  if (period === "year") return 365;

  return 1;
};

const MaterialPage = () => {
  const [materials, setMaterials] = useState<ConsumableMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] =
    useState<ConsumableMaterialSection>(consumableMaterialSections[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );
  const [stockMode, setStockMode] = useState<StockMode>("add");
  const [stockAddDraft, setStockAddDraft] = useState("");
  const [stockOpnameDraft, setStockOpnameDraft] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [editingMinimumStock, setEditingMinimumStock] = useState(false);
  const [minimumStockDraft, setMinimumStockDraft] = useState("");
  const [savingMinimumStock, setSavingMinimumStock] = useState(false);
  const [savingStockTransaction, setSavingStockTransaction] = useState(false);
  const [stockLogs, setStockLogs] = useState<ConsumableMaterialStockLog[]>([]);
  const [loadingStockLogs, setLoadingStockLogs] = useState(false);
  const [stockLogsError, setStockLogsError] = useState("");
  const [materialConsumptionRates, setMaterialConsumptionRates] = useState<
    Record<string, number>
  >({});
  const [latestStockLogs, setLatestStockLogs] = useState<
    Record<string, ConsumableMaterialStockLog>
  >({});
  const [deleteStockLogTarget, setDeleteStockLogTarget] =
    useState<ConsumableMaterialStockLog | null>(null);
  const [deletingStockLogId, setDeletingStockLogId] = useState<string | null>(
    null,
  );

  const sectionMaterials = materials.filter(
    (item) => item.section === activeSection,
  );
  const visibleMaterials = sectionMaterials;
  const lowStockCount = sectionMaterials.filter((item) => {
    const minimumStock = Number(item.minimum_stock ?? 0);
    return minimumStock > 0 && Number(item.stock ?? 0) <= minimumStock;
  }).length;
  const selectedMaterial = selectedMaterialId
    ? materials.find((item) => item.id === selectedMaterialId) ?? null
    : null;
  const selectedStock = Number(selectedMaterial?.stock ?? 0);
  const addQuantity = parseStockInput(stockAddDraft);
  const opnameStock = parseStockInput(stockOpnameDraft);
  const previewNextStock =
    stockMode === "add"
      ? selectedStock + (addQuantity ?? 0)
      : opnameStock ?? selectedStock;
  const previewConsumption =
    stockMode === "opname" ? selectedStock - (opnameStock ?? selectedStock) : 0;

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError("");
      const records = await pb
        .collection("consumable_material")
        .getFullList<ConsumableMaterial>({
          sort: "section,type,material_name",
        });

      setMaterials(records);
    } catch (fetchError) {
      console.error("Error fetching consumable material:", fetchError);
      setError("Failed to load consumable material data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumptionRates = async () => {
    try {
      const windowStart = subDays(new Date(), CONSUMPTION_RATE_DAYS - 1);
      const records = await pb
        .collection("consumable_material_stock_log")
        .getFullList<ConsumableMaterialStockLog>({
          filter: 'action = "stock_opname" && isDeleted != true',
          sort: "created",
        });

      const logsByMaterial = records.reduce<
        Record<string, ConsumableMaterialStockLog[]>
      >((groups, log) => {
        const createdDate = parseDateValue(log.created || log.updated);
        if (!createdDate || createdDate < windowStart) return groups;

        return {
          ...groups,
          [log.material_id]: [...(groups[log.material_id] ?? []), log],
        };
      }, {});

      const rates = Object.entries(logsByMaterial).reduce<Record<string, number>>(
        (currentRates, [materialId, logs]) => {
          const datedLogs = logs
            .map((log) => ({
              log,
              createdDate: parseDateValue(log.created || log.updated),
            }))
            .filter(
              (entry): entry is { log: ConsumableMaterialStockLog; createdDate: Date } =>
                Boolean(entry.createdDate),
            );

          if (datedLogs.length === 0) return currentRates;

          const totalConsumption = datedLogs.reduce(
            (sum, entry) => sum + Number(entry.log.consumption ?? 0),
            0,
          );
          const oldestDate = datedLogs[0].createdDate;
          const daySpan = Math.min(
            CONSUMPTION_RATE_DAYS,
            Math.max(1, differenceInCalendarDays(new Date(), oldestDate) + 1),
          );

          return {
            ...currentRates,
            [materialId]: totalConsumption / daySpan,
          };
        },
        {},
      );

      setMaterialConsumptionRates(rates);
    } catch (fetchError) {
      console.error("Error fetching consumption rates:", fetchError);
      setMaterialConsumptionRates({});
    }
  };

  const fetchLatestStockLogs = async () => {
    try {
      const records = await pb
        .collection("consumable_material_stock_log")
        .getFullList<ConsumableMaterialStockLog>({
          filter: "isDeleted != true",
          sort: "-created",
        });

      const latestByMaterial = records.reduce<
        Record<string, ConsumableMaterialStockLog>
      >((latest, log) => {
        if (latest[log.material_id]) return latest;

        return {
          ...latest,
          [log.material_id]: log,
        };
      }, {});

      setLatestStockLogs(latestByMaterial);
    } catch (fetchError) {
      console.error("Error fetching latest stock logs:", fetchError);
      setLatestStockLogs({});
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchConsumptionRates();
    fetchLatestStockLogs();
  }, []);

  const fetchStockLogs = async (materialId: string) => {
    try {
      setLoadingStockLogs(true);
      setStockLogsError("");
      const records = await pb
        .collection("consumable_material_stock_log")
        .getFullList<ConsumableMaterialStockLog>({
          filter: `material_id = "${materialId}" && isDeleted != true`,
          sort: "-created",
        });

      setStockLogs(records);
    } catch (fetchError) {
      console.error("Error fetching stock transaction logs:", fetchError);
      setStockLogs([]);
      setStockLogsError("Failed to load transaction list.");
    } finally {
      setLoadingStockLogs(false);
    }
  };

  const openStockPopup = (item: ConsumableMaterial) => {
    setSelectedMaterialId(item.id);
    setStockMode("add");
    setStockAddDraft("");
    setStockOpnameDraft("");
    setStockNotes("");
    setEditingMinimumStock(false);
    setMinimumStockDraft(String(item.minimum_stock ?? 0));
    setStockLogs([]);
    void fetchStockLogs(item.id);
  };

  const closeStockPopup = () => {
    if (savingStockTransaction || savingMinimumStock || deletingStockLogId) return;

    setSelectedMaterialId(null);
    setDeleteStockLogTarget(null);
    setStockMode("add");
    setStockAddDraft("");
    setStockOpnameDraft("");
    setStockNotes("");
    setEditingMinimumStock(false);
    setMinimumStockDraft("");
    setStockLogs([]);
    setStockLogsError("");
  };

  const startMinimumStockEdit = () => {
    if (!selectedMaterial) return;

    setMinimumStockDraft(String(selectedMaterial.minimum_stock ?? 0));
    setEditingMinimumStock(true);
  };

  const cancelMinimumStockEdit = () => {
    if (savingMinimumStock) return;

    setEditingMinimumStock(false);
    setMinimumStockDraft("");
  };

  const handleMinimumStockSave = async () => {
    if (!selectedMaterial) return;

    const nextMinimumStock = parseStockInput(minimumStockDraft);

    if (nextMinimumStock === null || nextMinimumStock < 0) {
      alert("Minimum stock must be a valid positive number");
      return;
    }

    try {
      setSavingMinimumStock(true);
      const updatedItem = await pb
        .collection("consumable_material")
        .update(selectedMaterial.id, {
          minimum_stock: nextMinimumStock,
        });

      setMaterials((current) =>
        current.map((material) =>
          material.id === selectedMaterial.id
            ? {
                ...material,
                minimum_stock:
                  updatedItem.minimum_stock ?? nextMinimumStock,
                updated: updatedItem.updated ?? material.updated,
              }
            : material,
        ),
      );
      setEditingMinimumStock(false);
      setMinimumStockDraft("");
    } catch (updateError) {
      console.error("Error updating minimum stock:", updateError);
      alert("Failed to update minimum stock");
    } finally {
      setSavingMinimumStock(false);
    }
  };

  const handleStockTransactionSave = async () => {
    if (!selectedMaterial) return;

    const previousStock = Number(selectedMaterial.stock ?? 0);
    let quantity = 0;
    let opname_stock = 0;
    let consumption = 0;
    let nextStock = previousStock;

    if (stockMode === "add") {
      if (addQuantity === null || addQuantity <= 0) {
        alert("Tambah stock must be greater than 0");
        return;
      }

      quantity = addQuantity;
      nextStock = previousStock + quantity;
    } else {
      if (opnameStock === null || opnameStock < 0) {
        alert("Stock opname must be a valid positive number");
        return;
      }

      opname_stock = opnameStock;
      consumption = previousStock - opname_stock;
      nextStock = opname_stock;
    }

    try {
      setSavingStockTransaction(true);
      const updatedItem = await pb
        .collection("consumable_material")
        .update(selectedMaterial.id, {
          stock: nextStock,
        });

      const createdLog = await pb
        .collection("consumable_material_stock_log")
        .create<ConsumableMaterialStockLog>({
          material_id: selectedMaterial.id,
          material_name: selectedMaterial.material_name,
          section: selectedMaterial.section,
          type: selectedMaterial.type,
          action: stockMode === "add" ? "add_stock" : "stock_opname",
          previous_stock: previousStock,
          quantity,
          opname_stock,
          consumption,
          next_stock: nextStock,
          unit: selectedMaterial.unit,
          notes: stockNotes.trim(),
          isDeleted: false,
        });

      setMaterials((current) =>
        current.map((material) =>
          material.id === selectedMaterial.id
            ? {
                ...material,
                stock: updatedItem.stock ?? nextStock,
                updated: updatedItem.updated ?? material.updated,
              }
            : material,
        ),
      );
      setStockLogs((current) => [createdLog, ...current]);
      setLatestStockLogs((current) => ({
        ...current,
        [selectedMaterial.id]: createdLog,
      }));
      if (stockMode === "opname") {
        fetchConsumptionRates();
      }
      setStockAddDraft("");
      setStockOpnameDraft("");
      setStockNotes("");
    } catch (updateError) {
      console.error("Error saving stock transaction:", updateError);
      alert("Failed to save stock transaction");
    } finally {
      setSavingStockTransaction(false);
    }
  };

  const handleDeleteStockLog = async () => {
    if (!selectedMaterial || !deleteStockLogTarget) return;

    if (stockLogs[0]?.id !== deleteStockLogTarget.id) {
      alert("Only the latest transaction can be deleted.");
      return;
    }

    const currentStock = Number(selectedMaterial.stock ?? 0);
    const nextStock =
      deleteStockLogTarget.action === "add_stock"
        ? currentStock - Number(deleteStockLogTarget.quantity ?? 0)
        : Number(deleteStockLogTarget.previous_stock ?? currentStock);

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      alert("Cannot delete this transaction because stock would become negative.");
      return;
    }

    try {
      setDeletingStockLogId(deleteStockLogTarget.id);
      const updatedItem = await pb
        .collection("consumable_material")
        .update(selectedMaterial.id, {
          stock: nextStock,
        });

      await pb
        .collection("consumable_material_stock_log")
        .update(deleteStockLogTarget.id, {
          isDeleted: true,
        });

      setMaterials((current) =>
        current.map((material) =>
          material.id === selectedMaterial.id
            ? {
                ...material,
                stock: updatedItem.stock ?? nextStock,
                updated: updatedItem.updated ?? material.updated,
              }
            : material,
        ),
      );
      setStockLogs((current) =>
        current.filter((log) => log.id !== deleteStockLogTarget.id),
      );
      setDeleteStockLogTarget(null);
      fetchConsumptionRates();
      fetchLatestStockLogs();
    } catch (deleteError) {
      console.error("Error deleting stock transaction:", deleteError);
      alert("Failed to delete stock transaction");
    } finally {
      setDeletingStockLogId(null);
    }
  };

  const handleExportExcel = async () => {
    if (materials.length === 0) return;

    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    consumableMaterialSections.forEach((section) => {
      const rows = materials
        .filter((item) => item.section === section)
        .map((item, index) => ({
          No: index + 1,
          "Material Name": item.material_name || "-",
          "Actual Stock": Number(item.stock ?? 0),
          Unit: item.unit || "-",
          "Last Updated Date": formatDateTime(item.updated),
        }));

      const worksheet = XLSX.utils.json_to_sheet(
        rows.length > 0
          ? rows
          : [
              {
                No: "",
                "Material Name": "",
                "Actual Stock": "",
                Unit: "",
                "Last Updated Date": "",
              },
            ],
      );

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 42 },
        { wch: 16 },
        { wch: 12 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, section);
    });

    XLSX.writeFile(
      workbook,
      `consumable-material-stock-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`,
    );
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sky-950 sm:text-2xl">
                Consumable Material
              </h1>
              <p className="mt-1 text-sm text-sky-700">
                Track consumable stock, minimum stock, and consumption rate by
                section.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={loading || materials.length === 0}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  fetchMaterials();
                  fetchConsumptionRates();
                  fetchLatestStockLogs();
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-sky-100 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {consumableMaterialSections.map((section) => {
              const active = activeSection === section;
              const count = materials.filter(
                (item) => item.section === section,
              ).length;

              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                    active
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-sky-50 text-sky-800 hover:bg-sky-100"
                  }`}
                >
                  <span>{section}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                      active ? "bg-white/20" : "bg-white text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-sky-950">
                {activeSection}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {sectionMaterials.length} material records, {lowStockCount} low
                stock items.
              </p>
            </div>

          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sky-600">
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : visibleMaterials.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm font-medium text-slate-500">
              No {activeSection} material data yet.
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {visibleMaterials.map((item) => {
                const minimumStock = Number(item.minimum_stock ?? 0);
                const isLowStock =
                  minimumStock > 0 && Number(item.stock ?? 0) <= minimumStock;
                const dailyConsumption = materialConsumptionRates[item.id];
                const consumptionPeriod = getConsumptionRatePeriod(item);
                const periodConsumption =
                  dailyConsumption === undefined
                    ? undefined
                    : dailyConsumption *
                      getConsumptionRateMultiplier(consumptionPeriod);
                const consumptionText =
                  periodConsumption === undefined
                    ? "-"
                    : `${formatNumber(periodConsumption)} ${item.unit} / ${consumptionPeriod}`;
                const latestStockLog = latestStockLogs[item.id];
                const isStockIncrement = latestStockLog?.action === "add_stock";
                const stockMovementValue = latestStockLog
                  ? isStockIncrement
                    ? Number(latestStockLog.quantity ?? 0)
                    : Math.abs(Number(latestStockLog.consumption ?? 0))
                  : 0;
                const hasStockMovement = stockMovementValue !== 0;

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openStockPopup(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStockPopup(item);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border px-3 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                      isLowStock
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-sky-100 bg-sky-50/30"
                    }`}
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-sky-950">
                            {item.material_name || "-"}
                          </h3>
                          {isLowStock && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-sky-700">
                          {item.section}
                          {item.type ? ` / ${item.type}` : ""}
                        </p>
                        <p className="mt-1 text-[10px] italic text-slate-400">
                          updated {formatTimeAgo(item.updated)}
                        </p>
                      </div>

                      <div className="grid shrink-0 grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
                        <div className="rounded-xl bg-white/70 px-3 py-2 lg:min-w-[140px] lg:text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Stock
                          </p>
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <p className="text-base font-bold text-sky-800">
                              {formatNumber(item.stock)} {item.unit}
                            </p>
                            {latestStockLog && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold lowercase ${
                                  !hasStockMovement
                                    ? "text-slate-400"
                                    : isStockIncrement
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {hasStockMovement && (
                                  <Triangle
                                    size={10}
                                    className={`fill-current ${
                                      isStockIncrement ? "" : "rotate-180"
                                    }`}
                                  />
                                )}
                                {hasStockMovement
                                  ? isStockIncrement
                                    ? "+"
                                    : "-"
                                  : ""}
                                {formatNumber(stockMovementValue)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/70 px-3 py-2 lg:min-w-[130px]">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Minimum
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-700">
                            {minimumStock > 0
                              ? `${formatNumber(minimumStock)} ${item.unit}`
                              : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/70 px-3 py-2 lg:min-w-[145px]">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Consumption/{consumptionPeriod}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-700">
                            {consumptionText}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          aria-label="Stock transaction popup"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-sky-100 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                  Stock Transaction
                </p>
                <h3 className="mt-1 break-words text-xl font-bold text-sky-950">
                  {selectedMaterial.material_name || "-"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-sky-700">
                  {selectedMaterial.section}
                  {selectedMaterial.type ? ` / ${selectedMaterial.type}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] italic text-slate-400">
                  updated {formatTimeAgo(selectedMaterial.updated)}
                </span>
                <button
                  type="button"
                  onClick={closeStockPopup}
                  disabled={savingStockTransaction}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close stock transaction popup"
                >
                  x
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-500">
                  Current Stock
                </p>
                <p className="mt-1 text-lg font-bold text-sky-900">
                  {formatNumber(selectedMaterial.stock)} {selectedMaterial.unit}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Minimum Stock
                </p>
                {editingMinimumStock ? (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={minimumStockDraft}
                        onChange={(event) =>
                          setMinimumStockDraft(event.target.value)
                        }
                        disabled={savingMinimumStock}
                        className="h-9 w-24 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label="Edit minimum stock"
                      />
                      <span className="text-sm font-semibold text-slate-500">
                        {selectedMaterial.unit}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleMinimumStockSave}
                        disabled={savingMinimumStock}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-sky-600 px-3 text-xs font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingMinimumStock && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelMinimumStockEdit}
                        disabled={savingMinimumStock}
                        className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-slate-800">
                      {Number(selectedMaterial.minimum_stock ?? 0) > 0
                        ? `${formatNumber(selectedMaterial.minimum_stock)} ${selectedMaterial.unit}`
                        : "-"}
                    </p>
                    <button
                      type="button"
                      onClick={startMinimumStockEdit}
                      disabled={savingStockTransaction || savingMinimumStock}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStockMode("add")}
                disabled={savingStockTransaction}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  stockMode === "add"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Tambah Stock
              </button>
              <button
                type="button"
                onClick={() => setStockMode("opname")}
                disabled={savingStockTransaction}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  stockMode === "opname"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Stock Opname
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
              {stockMode === "add" ? (
                <div>
                  <label
                    htmlFor="stock-add-input"
                    className="text-xs font-semibold uppercase tracking-wide text-sky-700"
                  >
                    Jumlah Stock Masuk
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id="stock-add-input"
                      type="number"
                      min={0}
                      step="1"
                      value={stockAddDraft}
                      onChange={(event) => setStockAddDraft(event.target.value)}
                      disabled={savingStockTransaction}
                      className="h-11 w-36 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                      placeholder="0"
                    />
                    <span className="text-sm font-semibold text-slate-500">
                      {selectedMaterial.unit}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="stock-opname-input"
                    className="text-xs font-semibold uppercase tracking-wide text-sky-700"
                  >
                    Stock Fisik Opname
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id="stock-opname-input"
                      type="number"
                      min={0}
                      step="1"
                      value={stockOpnameDraft}
                      onChange={(event) =>
                        setStockOpnameDraft(event.target.value)
                      }
                      disabled={savingStockTransaction}
                      className="h-11 w-36 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                      placeholder="0"
                    />
                    <span className="text-sm font-semibold text-slate-500">
                      {selectedMaterial.unit}
                    </span>
                  </div>
                </div>
              )}

              <label
                htmlFor="stock-notes-input"
                className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Notes
              </label>
              <textarea
                id="stock-notes-input"
                value={stockNotes}
                onChange={(event) => setStockNotes(event.target.value)}
                disabled={savingStockTransaction}
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Optional notes"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Calculation Preview
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Current Stock
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {formatNumber(selectedStock)} {selectedMaterial.unit}
                  </p>
                </div>
                {stockMode === "add" ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Tambah Stock
                    </p>
                    <p className="mt-1 font-bold text-slate-800">
                      {formatNumber(addQuantity ?? 0)} {selectedMaterial.unit}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Stock Opname
                      </p>
                      <p className="mt-1 font-bold text-slate-800">
                        {formatNumber(opnameStock ?? 0)} {selectedMaterial.unit}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                        Consumption
                      </p>
                      <p className="mt-1 font-bold text-amber-700">
                        {formatNumber(previewConsumption)} {selectedMaterial.unit}
                      </p>
                    </div>
                  </>
                )}
                <div className="rounded-xl bg-sky-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-500">
                    Final Stock
                  </p>
                  <p className="mt-1 font-bold text-sky-900">
                    {formatNumber(previewNextStock)} {selectedMaterial.unit}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeStockPopup}
                disabled={savingStockTransaction}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStockTransactionSave}
                disabled={savingStockTransaction}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStockTransaction && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Save Transaction
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction List
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Riwayat tambah stock dan stock opname material ini.
                  </p>
                </div>
                {loadingStockLogs && (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600">
                    <Loader2 size={14} className="animate-spin" />
                    Loading
                  </div>
                )}
              </div>

              {stockLogsError ? (
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  {stockLogsError}
                </div>
              ) : loadingStockLogs ? (
                <div className="mt-3 rounded-xl border border-dashed border-sky-100 bg-sky-50/50 px-3 py-6 text-center text-sm font-semibold text-sky-600">
                  Loading transaction list...
                </div>
              ) : stockLogs.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-medium text-slate-500">
                  No stock transaction recorded yet.
                </div>
              ) : (
                <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                  {stockLogs.map((log) => {
                    const isAddStock = log.action === "add_stock";
                    const actionLabel = isAddStock
                      ? "Tambah Stock"
                      : "Stock Opname";
                    const canDelete = stockLogs[0]?.id === log.id;

                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                                  isAddStock ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              >
                                {actionLabel}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {formatTimeAgo(log.created || log.updated)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {formatDateTime(log.created || log.updated)}
                            </p>
                            <p className="mt-2 text-sm font-bold text-slate-800">
                              {formatNumber(log.previous_stock)} {log.unit}
                              {" -> "}
                              {formatNumber(log.next_stock)} {log.unit}
                            </p>
                            {log.notes && (
                              <p className="mt-1 break-words text-xs text-slate-500">
                                Notes: {log.notes}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteStockLogTarget(log)}
                              disabled={!canDelete || Boolean(deletingStockLogId)}
                              className={`mt-2 inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                canDelete
                                  ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                  : "border-slate-200 bg-white text-slate-400"
                              }`}
                              title={
                                canDelete
                                  ? "Delete transaction"
                                  : "Only latest transaction can be deleted"
                              }
                            >
                              <Trash2 size={12} />
                              {canDelete ? "Delete" : "Latest only"}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[260px]">
                            <div className="rounded-xl bg-white px-2 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Quantity
                              </p>
                              <p className="font-bold text-slate-700">
                                {isAddStock
                                  ? `${formatNumber(log.quantity)} ${log.unit}`
                                  : "-"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-2 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Opname
                              </p>
                              <p className="font-bold text-slate-700">
                                {isAddStock
                                  ? "-"
                                  : `${formatNumber(log.opname_stock)} ${log.unit}`}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-2 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Consumption
                              </p>
                              <p className="font-bold text-slate-700">
                                {formatNumber(log.consumption)} {log.unit}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-2 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Final
                              </p>
                              <p className="font-bold text-sky-700">
                                {formatNumber(log.next_stock)} {log.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteStockLogTarget && selectedMaterial && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete stock transaction"
        >
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Delete transaction?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  This will mark the transaction as deleted and recalculate the
                  current stock for {selectedMaterial.material_name || "this material"}.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">
              <p className="font-bold text-slate-800">
                {deleteStockLogTarget.action === "add_stock"
                  ? "Tambah Stock"
                  : "Stock Opname"}
              </p>
              <p className="mt-1 text-slate-600">
                {formatNumber(deleteStockLogTarget.previous_stock)} {deleteStockLogTarget.unit}
                {" -> "}
                {formatNumber(deleteStockLogTarget.next_stock)} {deleteStockLogTarget.unit}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatDateTime(deleteStockLogTarget.created || deleteStockLogTarget.updated)}
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteStockLogTarget(null)}
                disabled={Boolean(deletingStockLogId)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStockLog}
                disabled={Boolean(deletingStockLogId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingStockLogId && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MaterialPage;
