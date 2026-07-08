const fs = require('fs');
let content = fs.readFileSync('src/components/LimsCard.tsx', 'utf8');

const tStart = '                      <tbody className="divide-y divide-sky-100/50">';
const tEnd = '                      </tbody>';

const idxStart = content.indexOf(tStart);
const idxEnd = content.indexOf(tEnd, idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
  const newTbody = `                      <tbody className="divide-y divide-sky-50">
                        {validSamples.map(({ sampleIdOriginal, sampleName, processedProps }) => (
                          processedProps.map(({ propName, prop, limitValue, valueClass }: any, propIdx: number) => (
                            <tr key={\`\${sampleIdOriginal as string}-\${propName}\`} className={\`hover:bg-white transition-colors \${propIdx === 0 ? 'border-t border-sky-200/60 bg-sky-50/40' : 'bg-sky-50/10'}\`}>
                              {propIdx === 0 && (
                                <td rowSpan={processedProps.length} className="px-3 py-1.5 align-top border-r border-sky-100/50 bg-sky-50/60">
                                  <div className="font-bold text-sky-900 leading-tight">{sampleName as string}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{sampleIdOriginal as string}</div>
                                </td>
                              )}
                              <td className="px-3 py-1.5 font-semibold text-slate-700">{propName}</td>
                              <td className={\`px-3 py-1.5 font-bold \${valueClass}\`}>
                                {prop.value}
                                {prop.unit && <span className="ml-1 text-[10px] text-slate-400">{prop.unit}</span>}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-slate-500">
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
`;

  content = content.substring(0, idxStart) + newTbody + content.substring(idxEnd);
  fs.writeFileSync('src/components/LimsCard.tsx', content);
  console.log("Success");
} else {
  console.log("Failed to find bounds");
}
