import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/MainLayout";
import { ListData } from "@/types/listdata";
import { pb } from "@/lib/pocketbase";
import { getUnitColorPalette } from "@/components/phill";
import { useNavigate } from "react-router-dom";
import {
  useLiveTanks,
  getTargetEta,
  normalizeTankKey,
  predefinedTankList,
  ConnectionStatus,
} from "@/hooks/useLiveTanks";
import { useLiveChemicals } from "@/hooks/useLiveChemicals";
import { useLimsData } from "@/hooks/useLimsData";
import SampleGroups from "@/components/LimsCard";
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Wrench,
  FlaskConical,
} from "lucide-react";

const unitFilterOptions = ["002", "021", "022", "023", "024", "025", "041"];

const statusConfig: Record<ConnectionStatus, string> = {
  connecting: "border-amber-200 bg-amber-50 text-amber-700",
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disconnected: "border-slate-200 bg-slate-50 text-slate-600",
  error: "border-red-200 bg-red-50 text-red-600",
};

export default function UnitDashboardPage() {
  const [listdata, setlistData] = useState<ListData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Hooks
  const { status, rowsByTank, tankDataByKey } = useLiveTanks();
  const { chemicals, loading: chemicalsLoading } = useLiveChemicals();
  const {
    data: limsData,
    limit: limsLimit,
    loading: limsLoading,
    error: limsError,
  } = useLimsData();

  async function loadTasks() {
    try {
      const records = await pb.collection("db_maintenance").getFullList({
        filter: "isDeleted != true",
      });
      setlistData(records as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const handleUnitClick = (unit: string) => {
    navigate(`/joblist?unit=${unit}`);
  };

  // Pre-calculate Global Critical Tanks
  const globalCriticalTanks: Array<{
    tank: string;
    text: string;
    level: number | null;
    target: number | null;
    unitStr?: string;
  }> = [];
  predefinedTankList.forEach((def) => {
    const key = normalizeTankKey(def.tank);
    const row = rowsByTank[key];
    if (row) {
      const meta = tankDataByKey[key];
      const targetEta = getTargetEta(row, meta);
      if (targetEta.hours !== null && targetEta.hours < 12) {
        const isRising = (row.rateMmPerHour ?? 0) > 0;
        const target = isRising
          ? Number(meta?.high_target)
          : Number(meta?.low_target);
        globalCriticalTanks.push({
          tank: def.tank,
          text: targetEta.text,
          level: row.level ?? null,
          target: Number.isFinite(target) ? target : null,
        });
      }
    }
  });

  const liveTankCount = Object.values(rowsByTank).filter(
    (row) => row.receivedAt,
  ).length;

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col h-[calc(100vh-20px)] overflow-hidden gap-3 p-2 sm:p-4">
        {/* SECTION 1: KERUSAKAN */}
        <section id="kerusakan" className="w-full shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <Wrench size={20} />
            </div>
            <h2 className="text-xl font-bold text-sky-950">
              Kerusakan & Maintenance
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 w-full">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-row overflow-x-auto w-full gap-2 pt-2 pb-4 px-1 -mx-1 custom-scrollbar snap-x">
              {/* ALL UNITS CARD */}
              {(() => {
                const hasAnyRedundanN0 = listdata.some(
                  (item) => item.redundan === "n+0",
                );
                let glowClass =
                  "bg-emerald-500 border-2 border-emerald-600 text-white shadow-none hover:shadow-md";
                if (hasAnyRedundanN0) {
                  glowClass =
                    "bg-red-500 border-2 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = listdata.filter(
                  (i) => (i.progress ?? 0) === 100,
                ).length;
                const pitStopCount = listdata.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop",
                ).length;
                const turnAroundCount = listdata.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around",
                ).length;
                const onStreamCount = listdata.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream",
                ).length;

                return (
                  <button
                    type="button"
                    onClick={() => handleUnitClick("")}
                    className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl p-4 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px] shrink-0 min-w-[260px] flex-[1.5] snap-start`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-slate-500 text-white shadow-sm">
                        All
                      </p>
                      <div className="flex items-baseline gap-1.5 text-5xl font-bold leading-none">
                        <span className="text-white">{doneCount}</span>
                        <span className="text-3xl text-white/70">/</span>
                        <span className="text-white">{listdata.length}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0ItemsAll = listdata.filter(
                        (item) => item.redundan === "n+0",
                      );
                      if (n0ItemsAll.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0ItemsAll.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-red-900 bg-red-100/80 px-2 py-1.5 rounded-md border border-red-200 shadow-sm"
                            >
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                <span>
                                  {index + 1}. {item.tag_name || "-"}
                                </span>
                              </span>
                              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(onStreamCount > 0 ||
                      pitStopCount > 0 ||
                      turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-slate-200/60 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                On Stream: {onStreamCount}
                              </span>
                            )}
                            {pitStopCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Pit Stop: {pitStopCount}
                              </span>
                            )}
                            {turnAroundCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                TA: {turnAroundCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-sky-500 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />
                  </button>
                );
              })()}

              {/* SPECIFIC UNITS */}
              {unitFilterOptions.map((unit) => {
                const unitItems = listdata.filter((item) => item.unit === unit);
                const count = unitItems.length;
                const hasRedundanN0 = unitItems.some(
                  (item) => item.redundan === "n+0",
                );
                const color = getUnitColorPalette(unit);

                let glowClass =
                  "bg-emerald-500 border-2 border-emerald-600 text-white shadow-none hover:shadow-md";
                if (hasRedundanN0) {
                  glowClass =
                    "bg-red-500 border-2 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = unitItems.filter(
                  (i) => (i.progress ?? 0) === 100,
                ).length;
                const pitStopCount = unitItems.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop",
                ).length;
                const turnAroundCount = unitItems.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around",
                ).length;
                const onStreamCount = unitItems.filter(
                  (i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream",
                ).length;

                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleUnitClick(unit)}
                    className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px] shrink-0 min-w-[150px] flex-1 snap-start`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-all bg-slate-500 text-white shadow-sm">
                        {unit}
                      </p>
                      <div className="flex items-baseline gap-1 text-3xl font-bold leading-none">
                        <span className="text-white">{doneCount}</span>
                        <span className="text-xl text-white/70">/</span>
                        <span className="text-white">{count}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0Items = unitItems.filter(
                        (item) => item.redundan === "n+0",
                      );
                      if (n0Items.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0Items.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-red-900 bg-red-100/80 px-2 py-1.5 rounded-md border border-red-200 shadow-sm"
                            >
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                <span>
                                  {index + 1}. {item.tag_name || "-"}
                                </span>
                              </span>
                              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(onStreamCount > 0 ||
                      pitStopCount > 0 ||
                      turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-slate-200/60 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                On Stream: {onStreamCount}
                              </span>
                            )}
                            {pitStopCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Pit Stop: {pitStopCount}
                              </span>
                            )}
                            {turnAroundCount > 0 && (
                              <span className="rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                TA: {turnAroundCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className={`absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 ${color.background} opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-col w-full gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col xl:flex-row w-full gap-4">
            {/* SECTION 2: CHEMICAL STOCK */}
            <section id="chemical" className="w-full xl:w-1/2 flex flex-col">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Droplets size={20} />
                </div>
                <h2 className="text-xl font-bold text-sky-950">
                  Live Chemical Stock
                </h2>
              </div>

              {(() => {
                const lowChemicals = chemicals.filter(
                  (chem) => chem.level !== null && chem.level < 30,
                );

                if (chemicalsLoading) {
                  return (
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                      <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                      Checking chemical levels...
                    </div>
                  );
                }

                if (lowChemicals.length === 0) {
                  return (
                    <div className="flex w-full items-center justify-between gap-2 text-xs font-bold text-emerald-950 bg-emerald-50 border-2 border-emerald-500 px-3 py-2 rounded-xl shadow-sm">
                      <span className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />
                        <span>Chemicals Healthy</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        All vessels above 30%
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex w-full flex-col gap-1.5 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                    {lowChemicals.map((chem) => {
                      return (
                        <div
                          key={chem.tagName}
                          className="flex w-full items-center justify-between gap-2 text-xs font-bold text-yellow-950 bg-yellow-400 border-2 border-yellow-500 px-3 py-2 rounded-xl shadow-sm transition-colors"
                        >
                          <span className="truncate text-left flex items-center gap-2">
                            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-yellow-900 shadow-sm shrink-0">
                              {chem.unit}
                            </span>
                            <AlertTriangle
                              size={14}
                              className="shrink-0 text-yellow-900"
                            />
                            <span>{chem.label}</span>
                            <span className="text-[10px] font-semibold text-yellow-900/80 hidden sm:inline">
                              ({chem.subtitle})
                            </span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-extrabold tracking-wide text-yellow-900">
                              {Math.round(chem.level!)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

            {/* SECTION 3: LEVEL TANKI */}
            <section id="tanki" className="w-full xl:w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Droplets size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-sky-950">
                    Critical Tank
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusConfig[status]}`}
                  >
                    <Radio className="h-3 w-3" /> {status}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                    Live: {liveTankCount} /{" "}
                    {Object.keys(rowsByTank).length ||
                      predefinedTankList.length}
                  </span>
                </div>
              </div>

              {globalCriticalTanks.length === 0 ? (
                <div className="flex w-full items-center justify-between gap-2 text-xs font-bold text-emerald-950 bg-emerald-50 border-2 border-emerald-500 px-3 py-2 rounded-xl shadow-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2
                      size={14}
                      className="shrink-0 text-emerald-600"
                    />
                    <span>All Tanks Stable</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    No tanks critical within 12h
                  </span>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-1.5 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                  {globalCriticalTanks.map((ct) => (
                    <div
                      key={ct.tank}
                      className="flex w-full items-center justify-between gap-2 text-xs font-bold text-yellow-950 bg-yellow-400 border-2 border-yellow-500 px-3 py-2 rounded-xl shadow-sm transition-colors"
                    >
                      <span className="truncate text-left flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-100 animate-pulse shrink-0"></span>
                        <span>{ct.tank}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-yellow-900 whitespace-nowrap">
                          {ct.text}{" "}
                          {ct.level !== null && ct.target !== null
                            ? `(${new Intl.NumberFormat("id-ID").format(Math.round(ct.level))} -> ${new Intl.NumberFormat("id-ID").format(Math.round(ct.target))} mm)`
                            : ""}
                        </span>
                        <span className="rounded bg-yellow-500 text-yellow-950 px-1.5 py-0.5 text-[9px] uppercase tracking-wide shadow-sm flex items-center gap-1 border border-yellow-600">
                          <AlertTriangle size={10} />
                          Critical
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SECTION 4: LIMS */}
          <section id="lims" className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                <FlaskConical size={20} />
              </div>
              <h2 className="text-xl font-bold text-sky-950">
                LIMS Spec Alerts
              </h2>
            </div>

            {limsError ? (
              <p className="rounded-2xl border border-red-100 bg-red-50 py-4 text-center text-sm font-semibold text-red-600">
                Error loading LIMS: {limsError}
              </p>
            ) : (
              <SampleGroups
                data={limsData}
                loading={limsLoading}
                limit={limsLimit}
                onlyOOS={true}
                format="table"
                enableHighlight={true}
              />
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
