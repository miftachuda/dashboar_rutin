const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

const tStart = `                        );
                      })()}

                      {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                        <div className="mt-auto w-full pt-4">
                          <div className="flex w-full flex-col gap-1.5 border-t border-white/20 pt-3 text-left">
                            <div className="flex flex-wrap gap-1.5">
                              {onStreamCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">On Stream: {onStreamCount}</span>}
                              {pitStopCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">Pit Stop: {pitStopCount}</span>}`;

const newCode = `                        );
                      })()}

                      {typeof unitAlerts !== 'undefined' && unitAlerts.length > 0 && (
                        <div className="mt-1.5 flex w-full flex-col gap-1.5 text-left">
                          {unitAlerts.map((alert) => (
                            <div key={alert.tank} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-white bg-black/10 px-2 py-1.5 rounded-md border border-black/10 shadow-sm">
                              <span className="truncate text-left flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                                <span className="truncate">{alert.tank}</span>
                              </span>
                              <span className="shrink-0 rounded bg-black/20 px-1.5 py-0.5 text-[9px] tracking-wide text-white shadow-sm whitespace-nowrap">
                                {alert.text} {alert.level !== null && alert.target !== null ? \`(\${new Intl.NumberFormat("id-ID").format(Math.round(alert.level))} -> \${new Intl.NumberFormat("id-ID").format(Math.round(alert.target))}\${alert.unitStr || "mm"})\` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(onStreamCount > 0 || pitStopCount > 0 || turnAroundCount > 0) && (
                        <div className="mt-auto w-full pt-4">
                          <div className="flex w-full flex-col gap-1.5 border-t border-white/20 pt-3 text-left">
                            <div className="flex flex-wrap gap-1.5">
                              {onStreamCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">On Stream: {onStreamCount}</span>}
                              {pitStopCount > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">Pit Stop: {pitStopCount}</span>}`;

// Replace the LAST occurrence (which corresponds to Specific Units)
const lastIdx = content.lastIndexOf(tStart);
if (lastIdx !== -1) {
  content = content.substring(0, lastIdx) + newCode + content.substring(lastIdx + tStart.length);
  fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
}
