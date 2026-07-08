const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

const target1 = '                const onStreamCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;';
const replace1 = `                const onStreamCount = unitItems.filter((i) => i.waktu_pelaksanaan?.toLowerCase() === "on stream").length;

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
                }`;
content = content.replace(target1, replace1);

const target2 = `                        );
                      })()}`;
const replace2 = `                        );
                      })()}

                      {unitAlerts.length > 0 && (
                        <div className="mt-2 w-full pt-2">
                          <div className="flex w-full flex-col gap-1.5 text-left">
                            {unitAlerts.map((alert) => (
                              <div key={alert.tank} className="flex w-full items-center justify-between gap-1 text-[10px] font-bold text-white bg-black/10 px-2 py-1.5 rounded-md border border-black/10 shadow-sm">
                                <span className="truncate text-left flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                                  <span>{alert.tank}</span>
                                </span>
                                <div className="flex flex-col items-end shrink-0">
                                  <span>{alert.text}</span>
                                  {alert.level !== null && alert.target !== null && (
                                    <span className="text-[8px] font-bold text-white/70 -mt-0.5">
                                      {new Intl.NumberFormat("id-ID").format(Math.round(alert.level))} {"->"} {new Intl.NumberFormat("id-ID").format(Math.round(alert.target))} {alert.unitStr || "mm"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}`;
content = content.replace(target2, replace2);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
