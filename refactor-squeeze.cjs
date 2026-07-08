const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Change wrapper
content = content.replace(
  '<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">',
  '<div className="flex flex-row overflow-x-auto w-full gap-2 pb-2 custom-scrollbar snap-x">'
);

// 2. Change "All Units" card classes
const allUnitsClassOld = 'className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px]`';
const allUnitsClassNew = 'className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-4 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px] shrink-0 min-w-[260px] flex-[1.5] snap-start`';
content = content.replace(allUnitsClassOld, allUnitsClassNew);

// Keep All units text sizes same.

// 3. Change Specific Units card classes
const specificUnitsClassOld = 'className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px]`';
const specificUnitsClassNew = 'className={`group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px] shrink-0 min-w-[150px] flex-1 snap-start`';
// We need to only replace the second occurrence.
const firstIdx = content.indexOf('group relative overflow-hidden flex flex-col');
const secondIdx = content.indexOf('group relative overflow-hidden flex flex-col', firstIdx + 1);
if (secondIdx !== -1) {
  content = content.substring(0, secondIdx) + content.substring(secondIdx).replace('group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px]', 'group relative overflow-hidden flex flex-col items-start justify-start gap-0 rounded-3xl border p-3 transition-all hover:-translate-y-1 ${glowClass} min-h-[130px] shrink-0 min-w-[150px] flex-1 snap-start');
}

// 4. Reduce Specific Units text sizes
const specificBadgeOld = '<p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-black/20 text-white shadow-sm">';
const specificBadgeNew = '<p className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-all bg-black/20 text-white shadow-sm">';
// Find the occurrence inside specific units loop
let bIdx = content.indexOf('Unit {unit}');
let pIdx = content.lastIndexOf('<p className', bIdx);
content = content.substring(0, pIdx) + content.substring(pIdx).replace('<p className="rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all bg-black/20 text-white shadow-sm">', specificBadgeNew);

const specificCountOld = '<div className="flex items-baseline gap-1.5 text-5xl font-bold leading-none">';
const specificCountNew = '<div className="flex items-baseline gap-1 text-3xl font-bold leading-none">';
let cIdx = content.indexOf('{count}');
let divIdx = content.lastIndexOf('<div className="flex items-baseline', cIdx);
content = content.substring(0, divIdx) + content.substring(divIdx).replace(specificCountOld, specificCountNew);

const specificSlashOld = '<span className="text-3xl text-white/50">/</span>';
const specificSlashNew = '<span className="text-xl text-white/50">/</span>';
content = content.substring(0, divIdx) + content.substring(divIdx).replace(specificSlashOld, specificSlashNew);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
