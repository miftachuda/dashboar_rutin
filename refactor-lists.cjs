const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Chemical Section Update
const chemStart = `<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                  {lowChemicals.map((chem) => {
                    return (`;
const chemEnd = `                    );
                  })}
                </div>`;

const newChemList = `<div className="flex w-full flex-col gap-1.5 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                  {lowChemicals.map((chem) => {
                    return (
                      <div key={chem.tagName} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">
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
                    );
                  })}
                </div>`;

let idx1 = content.indexOf(chemStart);
let idx2 = content.indexOf(chemEnd, idx1);
if (idx1 !== -1 && idx2 !== -1) {
  content = content.substring(0, idx1) + newChemList + content.substring(idx2 + chemEnd.length);
}

// 2. Tank Section Update
const tankStart = `<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                {globalCriticalTanks.map((ct) => (`;
const tankEnd = `                ))}
              </div>`;

const newTankList = `<div className="flex w-full flex-col gap-1.5 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">
                {globalCriticalTanks.map((ct) => (
                  <div key={ct.tank} className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white bg-orange-500 border border-orange-600 px-3 py-2 rounded-xl shadow-sm hover:border-orange-400 transition-colors">
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
                  </div>
                ))}
              </div>`;

let idx3 = content.indexOf(tankStart);
let idx4 = content.indexOf(tankEnd, idx3);
if (idx3 !== -1 && idx4 !== -1) {
  content = content.substring(0, idx3) + newTankList + content.substring(idx4 + tankEnd.length);
}

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
