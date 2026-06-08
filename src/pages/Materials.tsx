import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, Pencil } from "lucide-react";
import DashboardLayout from "@/components/MainLayout";
import { pb } from "@/lib/pocketbase";
import {
  ConsumableMaterial,
  ConsumableMaterialSection,
  ConsumableMaterialType,
  consumableMaterialSections,
  consumableMaterialTypeOptions,
} from "@/types/ConsumableMaterial";

type MaterialTypeFilter = "all" | ConsumableMaterialType;

const formatNumber = (value: number | undefined) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(numberValue);
};

const formatTimeAgo = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return formatDistanceToNow(date, { addSuffix: true });
};

const MaterialPage = () => {
  const [materials, setMaterials] = useState<ConsumableMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] =
    useState<ConsumableMaterialSection>(consumableMaterialSections[0]);
  const [activeType, setActiveType] = useState<MaterialTypeFilter>("all");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  const typeOptions = consumableMaterialTypeOptions[activeSection];
  const sectionMaterials = materials.filter(
    (item) => item.section === activeSection,
  );
  const visibleMaterials =
    activeType === "all"
      ? sectionMaterials
      : sectionMaterials.filter((item) => item.type === activeType);
  const lowStockCount = sectionMaterials.filter((item) => {
    const minimumStock = Number(item.minimum_stock ?? 0);
    return minimumStock > 0 && Number(item.stock ?? 0) <= minimumStock;
  }).length;

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

  useEffect(() => {
    fetchMaterials();
  }, []);

  const startStockEdit = (item: ConsumableMaterial) => {
    setEditingStockId(item.id);
    setStockDraft(String(item.stock ?? 0));
  };

  const cancelStockEdit = () => {
    setEditingStockId(null);
    setStockDraft("");
  };

  const handleStockSave = async (item: ConsumableMaterial) => {
    const nextStock = Number(stockDraft);

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      alert("Stock must be a valid positive number");
      return;
    }

    if (nextStock === Number(item.stock ?? 0)) {
      cancelStockEdit();
      return;
    }

    try {
      setUpdatingStockId(item.id);
      const updatedItem = await pb
        .collection("consumable_material")
        .update(item.id, {
          stock: nextStock,
        });

      setMaterials((current) =>
        current.map((material) =>
          material.id === item.id
            ? {
                ...material,
                stock: updatedItem.stock ?? nextStock,
                updated: updatedItem.updated ?? material.updated,
              }
            : material,
        ),
      );
      cancelStockEdit();
    } catch (updateError) {
      console.error("Error updating consumable material stock:", updateError);
      alert("Failed to update stock");
    } finally {
      setUpdatingStockId(null);
    }
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

            <button
              type="button"
              onClick={fetchMaterials}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Refresh
            </button>
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
                  onClick={() => {
                    setActiveSection(section);
                    setActiveType("all");
                  }}
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

            {typeOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveType("all")}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    activeType === "all"
                      ? "border-sky-500 bg-sky-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Type
                </button>
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveType(type)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      activeType === type
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
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
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
              {visibleMaterials.map((item) => {
                const minimumStock = Number(item.minimum_stock ?? 0);
                const isLowStock =
                  minimumStock > 0 && Number(item.stock ?? 0) <= minimumStock;
                const consumptionText = item.consumption_rate
                  ? `${formatNumber(item.consumption_rate)} ${
                      item.consumption_unit || item.unit
                    } / ${item.consumption_period || "period"}`
                  : "-";

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl border p-4 shadow-sm ${
                      isLowStock
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-sky-100 bg-sky-50/30"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-lg font-bold text-sky-950">
                            {item.material_name || "-"}
                          </h3>
                          {isLowStock && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-sky-700">
                          {item.section} / {item.type}
                        </p>
                        <p className="mt-2 break-words rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-600">
                          {item.description || "No description."}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        {editingStockId === item.id ? (
                          <div className="rounded-2xl border border-sky-200 bg-white/80 p-3 text-left shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
                              Editing stock
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={stockDraft}
                                onChange={(event) =>
                                  setStockDraft(event.target.value)
                                }
                                disabled={updatingStockId === item.id}
                                className="h-10 w-28 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                                aria-label={`Edit stock for ${item.material_name}`}
                              />
                              <span className="text-sm font-semibold text-slate-500">
                                {item.unit}
                              </span>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockSave(item)}
                                disabled={updatingStockId === item.id}
                                className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updatingStockId === item.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelStockEdit}
                                disabled={updatingStockId === item.id}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Stock
                            </p>
                            <div className="flex items-center gap-2 sm:justify-end">
                              <p className="text-2xl font-bold text-sky-800">
                                {formatNumber(item.stock)} {item.unit}
                              </p>
                              <button
                                type="button"
                                onClick={() => startStockEdit(item)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-600 shadow-sm transition-all hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                                aria-label={`Edit stock for ${item.material_name}`}
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Minimum Stock
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {minimumStock > 0
                            ? `${formatNumber(minimumStock)} ${item.unit}`
                            : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Consumption Rate
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {consumptionText}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Last Updated
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {formatTimeAgo(item.updated)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MaterialPage;
