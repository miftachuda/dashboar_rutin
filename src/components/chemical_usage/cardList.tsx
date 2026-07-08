import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, Trash2 } from "lucide-react";
import { ChemicalUsage } from "@/types/ChemicalUsage";

const CardList = ({
  data,
  deletingId,
  onDeleteClick,
}: {
  data: ChemicalUsage[];
  deletingId?: string | null;
  onDeleteClick: (item: ChemicalUsage) => void;
}) => {
  const sortedData = [...(data ?? [])].sort(
    (a, b) => new Date(b.time * 1000).getTime() - new Date(a.time * 1000).getTime(),
  );

  return (
    <div className="mt-3 flex w-full flex-col gap-3">
      {sortedData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm font-medium text-slate-500">
          No chemical usage data.
        </div>
      ) : (
        sortedData.map((item, index) => {
          const itemDate = new Date(item.time * 1000);
          const isNew = Date.now() - itemDate.getTime() <= 24 * 60 * 60 * 1000;
          const isPropanePercent =
            item.chemical_name === "Propane" && item.unit === "% Vessel";
          const propaneVolumeM3 = Number(item.propane_volume_m3);
          const amountLabel =
            isPropanePercent && Number.isFinite(propaneVolumeM3)
              ? `${propaneVolumeM3.toFixed(2)} m³`
              : `${Number(item.amount).toFixed(2)} ${item.unit}`;

          return (
            <div
              key={item.id ?? index}
              className={`w-full rounded-3xl border p-4 shadow-sm transition-all ${
                isNew
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
                  : "border-sky-100 bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-sky-950">Make Up</p>

                    {isNew && (
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-sky-700">
                    {item.chemical_name}
                  </p>
                  {item.chemical_name === "Propane" && item.propane_tank && (
                    <span className="mt-2 inline-flex rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-950">
                      Vessel: {item.propane_tank}
                    </span>
                  )}
                  {isPropanePercent && (
                    <p className="mt-2 text-xs font-bold text-yellow-600">
                      Level: {item.propane_start_level ?? "-"}% - {item.propane_end_level ?? "-"}%
                      {Number.isFinite(propaneVolumeM3)
                        ? ` (${Number(item.amount).toFixed(2)}%, ${propaneVolumeM3.toFixed(2)} m³)`
                        : ""}
                    </p>
                  )}
                  <p className="mt-2 break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {item.description || "-"}
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <button
                    type="button"
                    onClick={() => onDeleteClick(item)}
                    disabled={deletingId === item.id}
                    className="mb-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${item.chemical_name} usage`}
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                  <p className="text-sm font-semibold text-slate-500">Amount</p>
                  <p className="break-words text-xl font-bold text-sky-700 sm:text-2xl">
                    {amountLabel}
                  </p>
                  <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-slate-500">
                    {format(itemDate, "EEEE, dd-MMMM-yyyy HH.mm", { locale: id })} -{" "}
                    {formatDistanceToNow(itemDate, { addSuffix: true, locale: id })}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default CardList;
