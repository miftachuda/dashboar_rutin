const fs = require('fs');
let content = fs.readFileSync('src/components/LimsCard.tsx', 'utf8');

// 1. Update Props
content = content.replace('onlyOOS?: boolean;', 'onlyOOS?: boolean;\n  format?: "card" | "table";');
content = content.replace('onlyOOS = false }) => {', 'onlyOOS = false, format = "card" }) => {');

// 2. Insert the table logic
const oldGridStart = '<div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">';
const oldGridEnd = '                  ))}';
// we need to find the specific block. The easiest way is to split and join or use indexOf.

const renderBlockStart = '<div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">';
const renderBlockEnd = '</div>\n              </div>\n            );';

let startIdx = content.indexOf(renderBlockStart);
let endIdx = content.indexOf(renderBlockEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  let oldRenderBlock = content.substring(startIdx, endIdx + '</div>'.length);

  const newRenderBlock = `
                {format === "table" ? (
                  <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white/50 shadow-sm">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-sky-100/50 text-sky-800">
                        <tr>
                          <th className="px-4 py-3 font-bold">Sample</th>
                          <th className="px-4 py-3 font-bold">Parameter</th>
                          <th className="px-4 py-3 font-bold">Value</th>
                          <th className="px-4 py-3 font-bold">Spec Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100/50">
                        {validSamples.map(({ sampleIdOriginal, sampleName, processedProps }) => (
                          processedProps.map(({ propName, prop, limitValue, valueClass }: any, propIdx: number) => (
                            <tr key={\`\${sampleIdOriginal as string}-\${propName}\`} className="hover:bg-white transition-colors bg-sky-50/20">
                              <td className="px-4 py-3">
                                <div className="font-bold text-sky-900">{sampleName as string}</div>
                                <div className="text-[10px] text-slate-500">{sampleIdOriginal as string}</div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700">{propName}</td>
                              <td className={\`px-4 py-3 font-bold \${valueClass}\`}>
                                {prop.value}
                                {prop.unit && <span className="ml-1 text-[10px] text-slate-400">{prop.unit}</span>}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-500">
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
                            {processedProps.map(({ propName, prop, limitValue, valueClass }: any) => (
                              <div key={propName} className="rounded-xl border border-white bg-white p-2 shadow-sm">
                                <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {propName}
                                </div>
                                <div className={\`font-semibold text-[12px] \${valueClass}\`}>
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
                )}`;

  content = content.replace(oldRenderBlock, newRenderBlock);
  fs.writeFileSync('src/components/LimsCard.tsx', content);
  console.log('Success');
} else {
  console.log('Failed to find bounds:', startIdx, endIdx);
}
