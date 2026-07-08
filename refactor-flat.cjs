const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Replace the specific unit count gradient with solid text color
const oldGradientText = '<span className={`${color.background} bg-clip-text text-transparent`}>{count}</span>';
const newSolidText = '<span className={color.border.replace("border-", "text-")}>{count}</span>';
content = content.replace(oldGradientText, newSolidText);

// 2. Replace parameter badges (On Stream, Pit Stop, TA)
const oldOnStream = '<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">On Stream: {onStreamCount}</span>';
const newOnStream = '<span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">On Stream: {onStreamCount}</span>';
content = content.split(oldOnStream).join(newOnStream);

const oldPitStop = '<span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm">Pit Stop: {pitStopCount}</span>';
const newPitStop = '<span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Pit Stop: {pitStopCount}</span>';
content = content.split(oldPitStop).join(newPitStop);

const oldTA = '<span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 shadow-sm">TA: {turnAroundCount}</span>';
const newTA = '<span className="rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white">TA: {turnAroundCount}</span>';
content = content.split(oldTA).join(newTA);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
console.log("Success");
