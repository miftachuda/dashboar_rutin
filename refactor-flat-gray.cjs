const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Counts
content = content.replace(
  '<span className="text-sky-500">{listdata.length}</span>',
  '<span className="text-slate-500">{listdata.length}</span>'
);
content = content.replace(
  '<span className={color.border.replace("border-", "text-")}>{count}</span>',
  '<span className="text-slate-500">{count}</span>'
);

// 2. Tags
content = content.split('bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white').join('bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white');
content = content.split('bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white').join('bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white');
content = content.split('bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white').join('bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white');

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
