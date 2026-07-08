import React, { useEffect, useMemo, useState } from "react";
import { SampleLimit } from "@/types/SampleLimit";

const groupColors = [
  "border-emerald-200 shadow-emerald-100/80",
  "border-blue-200 shadow-blue-100/80",
  "border-pink-200 shadow-pink-100/80",
  "border-orange-200 shadow-orange-100/80",
  "border-purple-200 shadow-purple-100/80",
  "border-cyan-200 shadow-cyan-100/80",
];

// Configuration for highlighting specific LIMS parameters per unit.
// Use lowercase for matching. It will match if the parameter name CONTAINS the string.
export const LIMS_HIGHLIGHT_CONFIG: Record<string, { include?: string[], exclude?: string[] }> = {
  "021": { include: ["visco"] }, // Matches any param containing "visco"
  "022": { include: ["visco"] },
  "023": { include: ["ri", "visco"] },
  "024": { exclude: ["sg", "ri"] }       // Highlights everything EXCEPT "sg" and "ri"
};

// Helper function to check if a property should be highlighted
const isHighlighted = (unitPrefix: string, propName: string): boolean => {
  const config = LIMS_HIGHLIGHT_CONFIG[unitPrefix];
  if (!config) return false;
  
  const lowerProp = propName.toLowerCase();
  
  if (config.include) {
    return config.include.some(p => lowerProp.includes(p));
  }
  if (config.exclude) {
    return !config.exclude.some(p => lowerProp.includes(p));
  }
  
  return false;
};

type TagData = {
  TagName: string;
  Value: number[];
};

interface PHDRequest {
  SampleInterval: number;
  GetEnum: boolean;
  ResampleMethod: string;
  MinimumConfidence: number;
  MaxRows: number;
  TimeFormat: number;
  ReductionData: string;
  TagName: string[];
  StartTime: string;
  EndTime: string;
  OutputTimeFormat: number;
  EventSequence: number;
}

const payload023: PHDRequest[] = [
  {
    SampleInterval: 900000,
    GetEnum: false,
    ResampleMethod: "Around",
    MinimumConfidence: 0,
    MaxRows: 100,
    TimeFormat: 6,
    ReductionData: "snapshot",
    TagName: [
      "023FQI_004DA.PV",
      "023FQI_004DB.PV",
      "023FQI_004MA.PV",
      "023FQI_004MB.PV",
      "023FQI_004LA.PV",
      "023FQI_004LB.PV",
    ],
    StartTime: "NOW",
    EndTime: "NOW",
    OutputTimeFormat: 6,
    EventSequence: 0,
  },
];

const payload024: PHDRequest[] = [
  {
    SampleInterval: 900000,
    GetEnum: false,
    ResampleMethod: "Around",
    MinimumConfidence: 0,
    MaxRows: 100,
    TimeFormat: 6,
    ReductionData: "snapshot",
    TagName: [
      "024FQI_001DA.PV",
      "024FQI_001DB.PV",
      "024FQI_001MA.PV",
      "024FQI_001MB.PV",
      "024FQI_001LA.PV",
      "024FQI_001LB.PV",
    ],
    StartTime: "NOW",
    EndTime: "NOW",
    OutputTimeFormat: 6,
    EventSequence: 0,
  },
];

async function fetchPHDData(payload: PHDRequest[]) {
  const response = await fetch("https://apiv2.miftachuda.my.id/GetData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function detectModeStrict(datafeed: TagData[]): string | null {
  const has = (key: string) =>
    datafeed.some((d) => d.TagName.includes(key) && d.Value?.[0] !== 0);

  if (has("LA") || has("LB")) return "LMO";
  if (has("MA") || has("MB")) return "MMO";
  if (has("DA") || has("DB")) return "DAO";
  return null;
}

function parseLimit(val: unknown): number {
  if (val === null || val === undefined || val === "") return NaN;
  return Number(val);
}
function astmToNumber(value: string | number): number | null {
  if (value === null || value === undefined) return null;

  const clean = String(value).trim().toUpperCase();

  // Convert: L2.5 → 2.5 , D3.0 → 3.0 , 3.0 → 3.0
  const num = parseFloat(clean.replace(/^[LD]/, ""));

  return isNaN(num) ? null : num;
}

/**
 * PASS if value is BELOW OR EQUAL to max ASTM limit
 */
function isASTMWithinMax(
  value: string | number,
  maxLimit: string | number,
): boolean {
  const v = astmToNumber(value);
  const max = astmToNumber(maxLimit);

  if (v === null || max === null) return false;

  return v <= max; // ✅ equality accepted
}

function getLimitBySampleAndParam(
  data: SampleLimit[],
  sampleCode: string,
  paramName: string,
) {
  return (
    data.find(
      (i) => i.sample_code === sampleCode && i.param_name === paramName,
    ) || null
  );
}

const SampleGroups: React.FC<{
  data: any;
  loading?: boolean;
  limit: SampleLimit[];
  onlyOOS?: boolean;
  format?: "card" | "table";
  enableHighlight?: boolean;
}> = ({ data, loading = false, limit, onlyOOS = false, format = "card", enableHighlight = false }) => {
  // ✅ ALL HOOKS MUST ALWAYS RUN
  const [mode023, setMode023] = useState<TagData[] | null>(null);
  const [mode024, setMode024] = useState<TagData[] | null>(null);

  useEffect(() => {
    fetchPHDData(payload023).then(setMode023).catch(console.error);
    fetchPHDData(payload024).then(setMode024).catch(console.error);
  }, []);

  const grouped = useMemo(() => {
    if (!data?.samples) return {};
    return Object.entries(data.samples).reduce(
      (acc: any, [id, sample]: any) => {
        const prefix = id.substring(0, 3);
        acc[prefix] ??= {};
        acc[prefix][id] = sample;
        return acc;
      },
      {},
    );
  }, [data?.samples]);

  const feed023 = mode023 ? detectModeStrict(mode023) : null;
  const feed024 = mode024 ? detectModeStrict(mode024) : null;

  // ✅ SAFE CONDITIONAL RENDER AFTER HOOKS
  if (loading || !data?.samples) {
    return (
      <div className={`flex items-center justify-center rounded-3xl border border-sky-100 bg-white text-slate-500 shadow-sm ${onlyOOS ? 'min-h-[120px]' : 'min-h-[50vh]'}`}>
        <div className="flex flex-col items-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-700 w-full h-full">
      <div className="flex flex-row w-full gap-3">
        {(() => {
          let renderedGroups = 0;
          const elements = Object.entries(grouped).map(([prefix, groupSamples], idx) => {
            const validSamples = [];

            for (const [sampleIdOriginal, sampleData] of Object.entries(groupSamples as any)) {
              const { sampleName, ...properties } = sampleData as any;
              
              let effectiveSampleId = sampleIdOriginal;
              if (mode023 && effectiveSampleId.startsWith("023")) {
                if (feed023 === "MMO" && !effectiveSampleId.endsWith("M")) effectiveSampleId += "M";
                else if (feed023 === "DAO" && !effectiveSampleId.endsWith("D")) effectiveSampleId += "D";
              }
              if (mode024 && effectiveSampleId.startsWith("024")) {
                if (feed024 === "MMO" && !effectiveSampleId.endsWith("M")) effectiveSampleId += "M";
                else if (feed024 === "DAO" && !effectiveSampleId.endsWith("D")) effectiveSampleId += "D";
              }

              const processedProps = [];
              let hasOOS = false;

              for (const [propName, prop] of Object.entries(properties)) {
                const limitValue = getLimitBySampleAndParam(limit, effectiveSampleId, propName);
                let valueClass = "text-slate-800";

                if (limitValue?.isNumber) {
                  const value = Number((prop as any).value);
                  const low = parseLimit(limitValue?.low_limit);
                  const high = parseLimit(limitValue?.high_limit);
                  const out = (!isNaN(low) && value < low) || (!isNaN(high) && value > high);
                  valueClass = out ? "text-red-600" : "text-emerald-600";
                } else if (propName === "Color") {
                  const isPass = isASTMWithinMax((prop as any).value, limitValue?.high_limit as string);
                  valueClass = isPass ? "text-emerald-600" : "text-red-600";
                } else if (propName === "App") {
                  const isPass = String((prop as any).value).toLowerCase() === String(limitValue?.low_limit).toLowerCase();
                  valueClass = isPass ? "text-emerald-600" : "text-red-600";
                }

                const isOOS = valueClass === "text-red-600";
                if (isOOS) hasOOS = true;

                const highlighted = enableHighlight ? isHighlighted(prefix, propName) : false;

                if (!onlyOOS || isOOS) {
                  processedProps.push({ propName, prop, limitValue, valueClass, highlighted });
                }
              }

              if (!onlyOOS || hasOOS) {
                validSamples.push({ sampleIdOriginal, sampleName, processedProps });
              }
            }

            if (validSamples.length === 0) return null;
            renderedGroups++;

              return (
                <div
                  key={prefix}
                  className={`rounded-2xl border bg-white p-2 shadow-md flex-1 min-w-0 ${groupColors[idx % groupColors.length]}`}
                >
                  <h2 className="mb-2 text-center text-sm font-bold text-sky-950">
                  Unit {prefix}
                  {prefix === "023" ? ` ${feed023 || ""}` : prefix === "024" ? ` ${feed024 || ""}` : ""}
                </h2>

                
                {format === "table" ? (
                  <div className="rounded-2xl border border-sky-100 bg-white/50 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-sky-100/70 text-sky-900 border-b border-sky-200">
                        <tr>
                          <th className="px-2 py-1 font-bold">Sample</th>
                          <th className="px-2 py-1 font-bold">Parameter</th>
                          <th className="px-2 py-1 font-bold">Value</th>
                          <th className="px-2 py-1 font-bold">Spec Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-50">
                        {validSamples.map(({ sampleIdOriginal, sampleName, processedProps }) => (
                          processedProps.map(({ propName, prop, limitValue, valueClass, highlighted }: any, propIdx: number) => (
                            <tr key={`${sampleIdOriginal as string}-${propName}`} className={`hover:bg-white transition-colors ${propIdx === 0 ? 'border-t border-sky-200/60 bg-sky-50/40' : 'bg-sky-50/10'}`}>
                              {propIdx === 0 && (
                              <td rowSpan={processedProps.length} className="px-2 py-1 align-top border-r border-sky-100/50 bg-sky-50/60">
                                  <div className="font-bold text-sky-900 leading-tight">{sampleName as string}</div>
                                  <div className="text-[10px] text-slate-500">{sampleIdOriginal as string}</div>
                                </td>
                              )}
                              <td className="px-2 py-1 font-semibold text-slate-700">{propName}</td>
                              <td className="px-2 py-1 align-middle">
                                <span className={`inline-flex items-baseline font-bold ${valueClass} ${highlighted ? "bg-amber-100 ring-1 ring-amber-300 px-1.5 rounded" : ""}`}>
                                  {prop.value}
                                  {prop.unit && <span className="ml-1 text-[10px] text-slate-400">{prop.unit}</span>}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-[11px] text-slate-500">
                                {!limitValue?.low_limit && !limitValue?.high_limit ? (
                                  "N/A"
                                ) : limitValue?.low_limit && limitValue?.high_limit ? (
                                  <span className="font-semibold text-sky-700">{limitValue.low_limit} {" <> "} {limitValue.high_limit}</span>
                                ) : limitValue?.low_limit ? (
                                  limitValue?.isNumber ? <span><span className="font-semibold text-sky-700">Min:</span> {limitValue.low_limit}</span> : <span className="font-semibold text-sky-700">{limitValue.low_limit}</span>
                                ) : limitValue?.isNumber ? (
                                  <span><span className="font-semibold text-sky-700">Max:</span> {limitValue.high_limit}</span>
                                ) : (
                                  <span className="font-semibold text-sky-700">{limitValue.high_limit}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                    {validSamples.map(({ sampleIdOriginal, sampleName, processedProps }) => (
                      <div key={sampleIdOriginal as string} className="rounded-2xl border border-sky-100 bg-sky-50/50 text-xs shadow-sm">
                        <div className="p-4 pb-1">
                          <div className="flex flex-col font-semibold leading-none tracking-tight">
                            <span className="truncate text-sky-800">{sampleName as string}</span>
                            <span className="text-[15px] text-slate-500">{sampleIdOriginal as string}</span>
                          </div>
                        </div>

                        <div className="p-4 pt-1">
                          <div className="grid grid-cols-2 gap-1">
                            {processedProps.map(({ propName, prop, limitValue, valueClass, highlighted }: any) => (
                              <div key={propName} className={`rounded-xl border p-2 shadow-sm ${highlighted ? "bg-amber-50 border-amber-300" : "bg-white border-white"}`}>
                                <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {propName}
                                </div>
                                <div className={`font-semibold text-[12px] ${valueClass}`}>
                                  {prop.value}
                                  {prop.unit && <span className="ml-1 text-[11px] text-slate-400">{prop.unit}</span>}
                                </div>
                                {limitValue && (
                                  <div className="flex flex-col text-[11px] text-slate-500">
                                    <span className="font-semibold text-sky-600">Spec:</span>
                                    {!limitValue?.low_limit && !limitValue?.high_limit ? (
                                      "N/A"
                                    ) : limitValue?.low_limit && limitValue?.high_limit ? (
                                      <>
                                        {limitValue.low_limit} {" <> "} {limitValue.high_limit}
                                      </>
                                    ) : limitValue?.low_limit ? (
                                      limitValue?.isNumber ? <span>Min: {limitValue.low_limit}</span> : limitValue.low_limit
                                    ) : limitValue?.isNumber ? (
                                      <span>Max: {limitValue.high_limit}</span>
                                    ) : (
                                      limitValue.high_limit
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          });

          if (onlyOOS && renderedGroups === 0) {
            return (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center gap-2 w-full h-full">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 text-xl font-bold">✓</div>
                <p className="font-bold text-emerald-800">All Samples In-Spec</p>
                <p className="text-xs text-emerald-600">No out-of-spec samples detected in the current shift.</p>
              </div>
            );
          }

          return elements;
        })()}
        </div>
      </div>
    );
  };

export default SampleGroups;
