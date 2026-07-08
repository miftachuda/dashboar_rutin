const fs = require('fs');

let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. ALL UNITS CARD LOGIC & JSX
const oldAllUnitsStart = `                let glowClass = "bg-emerald-500 border-emerald-600 text-white shadow-none";`;
const oldAllUnitsEnd = `                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-white/20 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />\n                  </button>\n                );`;

const newAllUnitsBlock = `                let glowClass = "bg-emerald-50/50 border-2 border-emerald-500 text-slate-800 shadow-none hover:shadow-md";
                if (hasAnyRedundanN0) {
                  glowClass = "bg-red-50 border-2 border-red-500 text-slate-800 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = listdata.filter((i) => (i.progress ?? 0) === 100).length;
                const pitStopCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop").length;
                const turnAroundCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around").length;
                const onStreamCount = listdata.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;

                return (
                  <button
                    type="button"
                    onClick={() => handleUnitClick("")}
                    className={\`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl p-4 transition-all hover:-translate-y-1 \${glowClass} min-h-[130px] shrink-0 min-w-[260px] flex-[1.5] snap-start\`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-slate-500 text-white shadow-sm">
                        All Units
                      </p>
                      <div className="flex items-baseline gap-1.5 text-5xl font-bold leading-none">
                        <span className="text-slate-500">{doneCount}</span>
                        <span className="text-3xl text-slate-300">/</span>
                        <span className="text-sky-500">{listdata.length}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0ItemsAll = listdata.filter((item) => item.redundan === "n+0");
                      if (n0ItemsAll.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0ItemsAll.map((item, index) => (
                            <div key={item.id} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-red-900 bg-red-100/80 px-2 py-1.5 rounded-md border border-red-200 shadow-sm">
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                <span>{index + 1}. {item.tag_name || "-"}</span>
                              </span>
                              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-slate-200/60 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">On Stream: {onStreamCount}</span>}
                            {pitStopCount > 0 && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm">Pit Stop: {pitStopCount}</span>}
                            {turnAroundCount > 0 && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 shadow-sm">TA: {turnAroundCount}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-sky-500 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />
                  </button>
                );`;

let idx1 = content.indexOf(oldAllUnitsStart);
let idx2 = content.indexOf(oldAllUnitsEnd, idx1);
if (idx1 !== -1 && idx2 !== -1) {
  content = content.substring(0, idx1) + newAllUnitsBlock + content.substring(idx2 + oldAllUnitsEnd.length);
}

// 2. SPECIFIC UNITS CARD LOGIC & JSX
const oldSpecUnitsStart = `                let glowClass = "bg-emerald-500 border-emerald-600 text-white shadow-none";`;
const oldSpecUnitsEnd = `                    <div className="absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 bg-white/20 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0" />\n                  </button>\n                );`;

const newSpecUnitsBlock = `                let glowClass = "bg-emerald-50/50 border-2 border-emerald-500 text-slate-800 shadow-none hover:shadow-md";
                if (hasRedundanN0) {
                  glowClass = "bg-red-50 border-2 border-red-500 text-slate-800 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]";
                }

                const doneCount = unitItems.filter((i) => (i.progress ?? 0) === 100).length;
                const pitStopCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "pit stop").length;
                const turnAroundCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "turn around").length;
                const onStreamCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;

                let unitAlerts: typeof globalCriticalTanks = [];
                if (unit === "041") {
                  unitAlerts = globalCriticalTanks.filter(ct => ct.tank.startsWith("41"));
                }
                if (unit === "023") {
                  const furfuralData = chemicals.find(c => c.tagName === "023LI_019.PV");
                  if (furfuralData && furfuralData.level !== null && furfuralData.level < 30) {
                    unitAlerts.push({
                      tank: "Furfural",
                      text: "Low Level",
                      level: furfuralData.level,
                      target: 30,
                      unitStr: "%"
                    });
                  }
                }

                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleUnitClick(unit)}
                    className={\`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl p-3 transition-all hover:-translate-y-1 \${glowClass} min-h-[130px] shrink-0 min-w-[150px] flex-1 snap-start\`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-all bg-slate-500 text-white shadow-sm">
                        Unit {unit}
                      </p>
                      <div className="flex items-baseline gap-1 text-3xl font-bold leading-none">
                        <span className="text-slate-500">{doneCount}</span>
                        <span className="text-xl text-slate-300">/</span>
                        <span className={\`\${color.background} bg-clip-text text-transparent\`}>{count}</span>
                      </div>
                    </div>

                    {(() => {
                      const n0Items = unitItems.filter((item) => item.redundan === "n+0");
                      if (n0Items.length === 0) return null;
                      return (
                        <div className="mt-4 flex w-full max-h-24 flex-col items-start gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {n0Items.map((item, index) => (
                            <div key={item.id} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-red-900 bg-red-100/80 px-2 py-1.5 rounded-md border border-red-200 shadow-sm">
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                <span>{index + 1}. {item.tag_name || "-"}</span>
                              </span>
                              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white shadow-sm">
                                n+0
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {unitAlerts.length > 0 && (
                      <div className="mt-1.5 flex w-full flex-col gap-1.5 text-left">
                        {unitAlerts.map((alert) => (
                          <div key={alert.tank} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-orange-900 bg-orange-100/80 px-2 py-1.5 rounded-md border border-orange-200 shadow-sm">
                            <span className="truncate text-left flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
                              <span>{alert.tank}</span>
                            </span>
                            <span className="shrink-0 rounded bg-orange-200/50 text-orange-700 px-1.5 py-0.5 text-[9px] tracking-wide shadow-sm whitespace-nowrap">
                              {alert.text} {alert.level !== null && alert.target !== null ? \`(\${new Intl.NumberFormat("id-ID").format(Math.round(alert.level))} -> \${new Intl.NumberFormat("id-ID").format(Math.round(alert.target))} \${alert.unitStr || "mm"})\` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                      <div className="mt-auto w-full pt-4">
                        <div className="flex w-full flex-col gap-1.5 border-t border-slate-200/60 pt-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {onStreamCount > 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">On Stream: {onStreamCount}</span>}
                            {pitStopCount > 0 && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm">Pit Stop: {pitStopCount}</span>}
                            {turnAroundCount > 0 && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 shadow-sm">TA: {turnAroundCount}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={\`absolute bottom-0 left-0 h-1.5 w-full transition-all duration-300 \${color.background} opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0\`} />
                  </button>
                );`;

let idx3 = content.indexOf(oldSpecUnitsStart, idx1 !== -1 ? idx1 + 10 : 0);
let idx4 = content.indexOf(oldSpecUnitsEnd, idx3);
if (idx3 !== -1 && idx4 !== -1) {
  content = content.substring(0, idx3) + newSpecUnitsBlock + content.substring(idx4 + oldSpecUnitsEnd.length);
}

// 3. CHEMICAL ALERTS LOGIC & JSX
const oldChemStart = `                      <div key={chem.tagName} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">`;
const oldChemEnd = `                      </div>\n                    );`;

const newChemBlock = `                      <div key={chem.tagName} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-orange-950 bg-orange-50 border-2 border-orange-500 px-3 py-2 rounded-xl shadow-sm transition-colors">
                        <span className="truncate text-left flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0 text-orange-600" />
                          <span>{chem.label}</span>
                          <span className="text-[10px] font-semibold text-orange-700/80 hidden sm:inline">({chem.subtitle})</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-extrabold tracking-wide text-orange-600">{Math.round(chem.level!)}%</span>
                          <span className={\`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide shadow-sm \${unitColor.background} text-white\`}>
                            Unit {chem.unit}
                          </span>
                        </div>
                      </div>
                    );`;

// We have to loop and replace all oldChemStart just in case, but it's only inside the map. We'll use split.join.
content = content.split(`                      <div key={chem.tagName} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">
                        <span className="truncate text-left flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{chem.label}</span>
                          <span className="text-[10px] font-semibold text-white/80 hidden sm:inline">({chem.subtitle})</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-extrabold tracking-wide">{Math.round(chem.level!)}%</span>
                          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide shadow-sm">
                            Unit {chem.unit}
                          </span>
                        </div>
                      </div>
                    );`).join(newChemBlock);


// 4. CRITICAL TANK LOGIC & JSX
const oldTankStart = `                  <div key={ct.tank} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">`;

const oldTankBlock = `                  <div key={ct.tank} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">
                    <span className="truncate text-left flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                      <span>{ct.tank}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-white/90 whitespace-nowrap">
                        {ct.text} {ct.level !== null && ct.target !== null ? \`(\${new Intl.NumberFormat("id-ID").format(Math.round(ct.level))} -> \${new Intl.NumberFormat("id-ID").format(Math.round(ct.target))} mm)\` : ""}
                      </span>
                      <span className="rounded bg-black/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide shadow-sm flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Critical
                      </span>
                    </div>
                  </div>`;

const newTankBlock = `                  <div key={ct.tank} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-orange-950 bg-orange-50 border-2 border-orange-500 px-3 py-2 rounded-xl shadow-sm transition-colors">
                    <span className="truncate text-left flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
                      <span>{ct.tank}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-orange-800 whitespace-nowrap">
                        {ct.text} {ct.level !== null && ct.target !== null ? \`(\${new Intl.NumberFormat("id-ID").format(Math.round(ct.level))} -> \${new Intl.NumberFormat("id-ID").format(Math.round(ct.target))} mm)\` : ""}
                      </span>
                      <span className="rounded bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wide shadow-sm flex items-center gap-1 border border-orange-200">
                        <AlertTriangle size={10} />
                        Critical
                      </span>
                    </div>
                  </div>`;

content = content.split(oldTankBlock).join(newTankBlock);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
