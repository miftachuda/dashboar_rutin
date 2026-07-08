const fs = require('fs');

const content = `import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/MainLayout";
import { ListData } from "@/types/listdata";
import { pb } from "@/lib/pocketbase";
import { getUnitColorPalette } from "@/components/phill";
import { useNavigate } from "react-router-dom";
import { useLiveTanks, getTargetEta, normalizeTankKey, predefinedTankList, ConnectionStatus } from "@/hooks/useLiveTanks";
import { useLiveChemicals } from "@/hooks/useLiveChemicals";
import { useLowStockConsumables } from "@/hooks/useLowStockConsumables";
import { useLimsData } from "@/hooks/useLimsData";
import SampleGroups from "@/components/LimsCard";
import { Radio, AlertTriangle, CheckCircle2, ChevronRight, Droplets, Package, Wrench, FlaskConical } from "lucide-react";

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
  const { lowStockItems, loading: consumablesLoading } = useLowStockConsumables();
  const { data: limsData, limit: limsLimit, loading: limsLoading, error: limsError } = useLimsData();

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
    navigate(\`/joblist?unit=\${unit}\`);
  };

  // Pre-calculate Global Critical Tanks
  const globalCriticalTanks: Array<{tank: string, text: string, level: number | null, target: number | null, unitStr?: string}> = [];
  predefinedTankList.forEach(def => {
    const key = normalizeTankKey(def.tank);
    const row = rowsByTank[key];
    if (row) {
      const meta = tankDataByKey[key];
      const targetEta = getTargetEta(row, meta);
      if (targetEta.hours !== null && targetEta.hours < 12) {
        const isRising = (row.rateMmPerHour ?? 0) > 0;
        const target = isRising ? Number(meta?.high_target) : Number(meta?.low_target);
        globalCriticalTanks.push({ 
          tank: def.tank, 
          text: targetEta.text,
          level: row.level ?? null,
          target: Number.isFinite(target) ? target : null
        });
      }
    }
  });

  const liveTankCount = Object.values(rowsByTank).filter((row) => row.receivedAt).length;

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col items-start justify-start gap-8 p-3 sm:p-6 pb-20">
        <h1 className="text-3xl font-extrabold text-sky-950 mb-2">Control Center</h1>

        {/* SECTION 1: KERUSAKAN */}
        <section id="kerusakan" className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <Wrench size={20} />
            </div>
            <h2 className="text-xl font-bold text-sky-950">Kerusakan & Maintenance</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20 w-full">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* ALL UNITS CARD */}
              {(() => {
                const hasAnyRedundanN0 = listdata.some((item) => item.redundan === "n+0");
                let glowClass = "bg-emerald-500 border-emerald-600 text-white shadow-none";
                if (hasAnyRedundanN0) {
                  glowClass = "bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = listdata.filter((i) => (i.progress ?? 0) === 100).length;
                const pitStopCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop").length;
                const turnAroundCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around").length;
                const onStreamCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;

                return (
                  <button
                    type="button"
                    onClick={() => handleUnitClick("")}
                    className={\`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-5 transition-all hover:-translate-y-1 \${glowClass} min-h-[180px]\`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-black/20 text-white shadow-sm">
                        All Units
                      </p>
                      <div className="flex items-baseline gap-1.5 text-5xl font-bold leading-none">
                        <span className="text-white/70">{doneCount}</span>
                        <span className="text-3xl text-white/50">/</span>
                        <span className="text-white">{listdata.length}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0ItemsAll = listdata.filter((item) => item.redundan === "n+0");
                      if (n0ItemsAll.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0ItemsAll.map((item, index) => (
                            <div key={item.id} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-white bg-black/10 px-2 py-1.5 rounded-md border border-black/10 shadow-sm">
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                                <span>{index + 1}. {item.tag_name || "-"}</span>
                              </span>
                              <span className="shrink-0 rounded bg-black/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-white/20 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">On Stream: {onStreamCount}</span>}
                            {pitStopCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">Pit Stop: {pitStopCount}</span>}
                            {turnAroundCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">TA: {turnAroundCount}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-white/20 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />
                  </button>
                );
              })()}

              {/* SPECIFIC UNITS */}
              {unitFilterOptions.map((unit) => {
                const unitItems = listdata.filter((item) => item.unit === unit);
                const count = unitItems.length;
                const hasRedundanN0 = unitItems.some((item) => item.redundan === "n+0");

                let glowClass = "bg-emerald-500 border-emerald-600 text-white shadow-none";
                if (hasRedundanN0) {
                  glowClass = "bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = unitItems.filter((i) => (i.progress ?? 0) === 100).length;
                const pitStopCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop").length;
                const turnAroundCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around").length;
                const onStreamCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;

                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleUnitClick(unit)}
                    className={\`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-5 transition-all hover:-translate-y-1 \${glowClass} min-h-[180px]\`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-black/20 text-white shadow-sm">
                        Unit {unit}
                      </p>
                      <div className="flex items-baseline gap-1.5 text-5xl font-bold leading-none">
                        <span className="text-white/70">{doneCount}</span>
                        <span className="text-3xl text-white/50">/</span>
                        <span className="text-white">{count}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0Items = unitItems.filter((item) => item.redundan === "n+0");
                      if (n0Items.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0Items.map((item, index) => (
                            <div key={item.id} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-white bg-black/10 px-2 py-1.5 rounded-md border border-black/10 shadow-sm">
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                                <span>{index + 1}. {item.tag_name || "-"}</span>
                              </span>
                              <span className="shrink-0 rounded bg-black/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-white/20 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">On Stream: {onStreamCount}</span>}
                            {pitStopCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">Pit Stop: {pitStopCount}</span>}
                            {turnAroundCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">TA: {turnAroundCount}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-white/20 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-col xl:flex-row w-full gap-6">
          {/* SECTION 2: CHEMICAL STOCK */}
          <section id="chemical" className="w-full xl:w-1/2 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Droplets size={20} />
              </div>
              <h2 className="text-xl font-bold text-sky-950">Live Chemical Stock</h2>
            </div>
            
            {(() => {
              const lowChemicals = chemicals.filter((chem) => chem.level !== null && chem.level < 30);
              
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
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center gap-2 h-full">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="font-bold text-emerald-800">Chemicals Healthy</p>
                    <p className="text-xs text-emerald-600">All monitored chemical vessels are above 30%.</p>
                  </div>
                );
              }

              return (
                <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
                  {lowChemicals.map((chem) => {
                    return (
                      <div key={chem.tagName} className="rounded-3xl border p-4 shadow-sm flex flex-col gap-2 bg-orange-500 border-orange-600 text-white relative overflow-hidden group hover:border-orange-500 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-extrabold text-white">{chem.label}</h3>
                            <p className="text-xs font-semibold text-white/80">{chem.subtitle}</p>
                          </div>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-black/20 text-white shadow-sm">
                            Unit {chem.unit}
                          </span>
                        </div>
                        <div className="mt-1 flex items-end justify-between">
                          <span className="text-3xl font-bold text-white">
                            {Math.round(chem.level!)}<span className="text-sm ml-1">%</span>
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded-md">
                            <AlertTriangle size={12} />
                            Low Stock
                          </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Droplets size={20} />
                </div>
                <h2 className="text-xl font-bold text-sky-950">Critical Tank</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={\`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide \${statusConfig[status]}\`}>
                  <Radio className="h-3 w-3" /> {status}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  Live: {liveTankCount} / {Object.keys(rowsByTank).length || predefinedTankList.length}
                </span>
              </div>
            </div>

            {globalCriticalTanks.length === 0 ? (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center gap-2 h-full">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="font-bold text-emerald-800">All Tanks Stable</p>
                <p className="text-xs text-emerald-600">No tanks are projected to hit High/Low targets within the next 12 hours.</p>
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
                {globalCriticalTanks.map((ct) => (
                  <div key={ct.tank} className="flex flex-col gap-2 p-4 rounded-2xl bg-orange-500 border border-orange-600 text-white shadow-sm relative overflow-hidden group hover:border-orange-500 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                        <span className="font-bold text-white">{ct.tank}</span>
                      </div>
                      <span className="text-[11px] font-bold text-white bg-black/20 px-2 py-0.5 rounded-md">
                        {ct.text}
                      </span>
                    </div>
                    
                    {ct.level !== null && ct.target !== null && (
                      <div className="flex items-center justify-between text-xs font-semibold text-white/90 mt-1">
                        <span>Level: {new Intl.NumberFormat("id-ID").format(Math.round(ct.level))} mm</span>
                        <ChevronRight size={14} className="text-white/60 mx-1" />
                        <span>Target: {new Intl.NumberFormat("id-ID").format(Math.round(ct.target))} mm</span>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded-md w-fit">
                      <AlertTriangle size={12} />
                      Critical Tank
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SECTION 4: LIMS */}
        <section id="lims" className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <FlaskConical size={20} />
            </div>
            <h2 className="text-xl font-bold text-sky-950">LIMS Out of Spec Alerts</h2>
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
            />
          )}
        </section>

        {/* SECTION 5: CONSUMABLE MATERIAL */}
        <section id="material" className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Package size={20} />
            </div>
            <h2 className="text-xl font-bold text-sky-950">Consumable Material Alerts</h2>
          </div>

          {consumablesLoading ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              Checking stock levels...
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-bold text-emerald-800">All Stocks Healthy</p>
              <p className="text-xs text-emerald-600">No consumable materials are below their minimum threshold.</p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-red-500 border border-red-600 text-white shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{item.material_name}</span>
                    <span className="text-[10px] font-semibold text-white/80">{item.section}</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-sm font-bold text-white">{item.stock} {item.unit}</span>
                    <span className="text-[10px] font-bold text-white/70">Min: {item.minimum_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
`;

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
