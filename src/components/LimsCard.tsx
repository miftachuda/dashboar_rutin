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
}> = ({ data, loading = false, limit }) => {
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
      <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-sky-100 bg-white text-slate-500 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 text-slate-700">
      <h1 className="mb-3 text-center text-xl font-semibold text-sky-950">
        Shift <span className="text-sky-600">{data.shift}</span>
      </h1>

      <div className="space-y-4">
        {Object.entries(grouped).map(([prefix, groupSamples], idx) => (
          <div
            key={prefix}
            className={`rounded-3xl border bg-white p-4 shadow-md ${
              groupColors[idx % groupColors.length]
            }`}
          >
            <h2 className="mb-3 text-center text-lg font-bold text-sky-950">
              Unit {prefix}
              {prefix === "023"
                ? ` ${feed023}`
                : prefix === "024"
                  ? ` ${feed024}`
                  : ""}
            </h2>

            <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              {Object.entries(groupSamples).map(
                ([sampleId, sampleData]: any) => {
                  const { sampleName, ...properties } = sampleData;

                  return (
                    <div
                      key={sampleId}
                      className="rounded-2xl border border-sky-100 bg-sky-50/50 text-xs shadow-sm"
                    >
                      <div className="p-4 pb-1">
                        <div className="flex flex-col font-semibold leading-none tracking-tight">
                          <span className="truncate text-sky-800">
                            {sampleName}
                          </span>
                          <span className="text-[15px] text-slate-500">
                            {sampleId}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 pt-1">
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(properties).map(
                            ([propName, prop]: any) => {
                              if (mode023 && sampleId.startsWith("023")) {
                                if (
                                  feed023 === "MMO" &&
                                  !sampleId.endsWith("M")
                                ) {
                                  sampleId += "M";
                                } else if (
                                  feed023 === "DAO" &&
                                  !sampleId.endsWith("D")
                                ) {
                                  sampleId += "D";
                                }
                              }
                              if (mode024 && sampleId.startsWith("024")) {
                                if (
                                  feed024 === "MMO" &&
                                  !sampleId.endsWith("M")
                                ) {
                                  sampleId += "M";
                                } else if (
                                  feed024 === "DAO" &&
                                  !sampleId.endsWith("D")
                                ) {
                                  sampleId += "D";
                                }
                              }
                              const limitValue = getLimitBySampleAndParam(
                                limit,
                                sampleId,
                                propName,
                              );

                              let valueClass = "text-slate-800";

                              if (limitValue?.isNumber) {
                                const value = Number(prop.value);
                                const low = parseLimit(limitValue?.low_limit);
                                const high = parseLimit(limitValue?.high_limit);
                                const out =
                                  (!isNaN(low) && value < low) ||
                                  (!isNaN(high) && value > high);

                                valueClass = out
                                  ? "text-red-600"
                                  : "text-emerald-600";
                              } else if (propName === "Color") {
                                const isPass = isASTMWithinMax(
                                  prop.value,
                                  limitValue?.high_limit,
                                );

                                valueClass = isPass
                                  ? "text-emerald-600"
                                  : "text-red-600";
                              } else if (propName === "App") {
                                const isPass =
                                  String(prop.value).toLowerCase() ===
                                  String(limitValue?.low_limit).toLowerCase();

                                valueClass = isPass
                                  ? "text-emerald-600"
                                  : "text-red-600";
                              }

                              return (
                                <div
                                  key={propName}
                                  className="rounded-xl border border-white bg-white p-2 shadow-sm"
                                >
                                  <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {propName}
                                  </div>
                                  <div
                                    className={`font-semibold text-[12px] ${valueClass}`}
                                  >
                                    {prop.value}
                                    {prop.unit && (
                                      <span className="ml-1 text-[11px] text-slate-400">
                                        {prop.unit}
                                      </span>
                                    )}
                                  </div>
                                  {limitValue && (
                                    <div className="flex flex-col text-[11px] text-slate-500">
                                      <span className="font-semibold text-sky-600">
                                        Spec:
                                      </span>

                                      {!limitValue?.low_limit &&
                                      !limitValue?.high_limit ? (
                                        "N/A"
                                      ) : limitValue?.low_limit &&
                                        limitValue?.high_limit ? (
                                        <>
                                          {limitValue.low_limit}
                                          {" <> "}
                                          {limitValue.high_limit}
                                        </>
                                      ) : limitValue?.low_limit ? (
                                        limitValue?.isNumber ? (
                                          <span>
                                            Min: {limitValue.low_limit}
                                          </span>
                                        ) : (
                                          limitValue.low_limit
                                        )
                                      ) : limitValue?.isNumber ? (
                                        <span>
                                          Max: {limitValue.high_limit}
                                        </span>
                                      ) : (
                                        limitValue.high_limit
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SampleGroups;
