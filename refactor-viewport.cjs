const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Remove title and adjust main wrapper
content = content.replace(
  '<div className="flex w-full flex-col items-start justify-start gap-8 p-3 sm:p-6 pb-20">\n        <h1 className="text-3xl font-extrabold text-sky-950 mb-2">Control Center</h1>',
  '<div className="flex w-full flex-col h-[calc(100vh-20px)] overflow-hidden gap-3 p-2 sm:p-4">'
);
content = content.replace(
  '<div className="flex w-full flex-col items-start justify-start gap-8 p-3 sm:p-6 pb-20">\r\n        <h1 className="text-3xl font-extrabold text-sky-950 mb-2">Control Center</h1>',
  '<div className="flex w-full flex-col h-[calc(100vh-20px)] overflow-hidden gap-3 p-2 sm:p-4">'
);

// 2. Adjust Kerusakan Section
content = content.replace('<section id="kerusakan" className="w-full">', '<section id="kerusakan" className="w-full shrink-0">');
content = content.replace('<div className="flex items-center gap-2 mb-4">', '<div className="flex items-center gap-2 mb-2">');
content = content.replace('<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">', '<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">');

// Adjust padding and height for ALL cards (use global regex for min-h-[180px] and p-5)
content = content.replace(/min-h-\[180px\]/g, 'min-h-[130px]');
content = content.replace(/rounded-3xl border p-5/g, 'rounded-3xl border p-3');

// 3. Middle Wrapper (Chemical + Tanki)
content = content.replace(
  '<div className="flex flex-col xl:flex-row w-full gap-6">',
  '<div className="flex flex-col xl:flex-row w-full gap-4 flex-1 min-h-0 overflow-hidden">'
);

// 4. Chemical Section
content = content.replace(
  '<section id="chemical" className="w-full xl:w-1/2 flex flex-col">',
  '<section id="chemical" className="w-full xl:w-1/2 flex flex-col h-full overflow-hidden">'
);
content = content.replace(
  '<div className="p-2 bg-purple-100 text-purple-600 rounded-lg">\n                <Droplets size={20} />\n              </div>\n              <h2 className="text-xl font-bold text-sky-950">Live Chemical Stock</h2>\n            </div>',
  '<div className="p-2 bg-purple-100 text-purple-600 rounded-lg">\n                <Droplets size={20} />\n              </div>\n              <h2 className="text-xl font-bold text-sky-950">Live Chemical Stock</h2>\n            </div>'
); // Keep headers same just in case, but change mb-4 to mb-2
content = content.replace(
  '<div className="flex items-center gap-2 mb-4">\n              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">',
  '<div className="flex items-center gap-2 mb-2 shrink-0">\n              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">'
);
content = content.replace(
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">',
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">'
);

// 5. Tanki Section
content = content.replace(
  '<section id="tanki" className="w-full xl:w-1/2 flex flex-col">',
  '<section id="tanki" className="w-full xl:w-1/2 flex flex-col h-full overflow-hidden">'
);
content = content.replace(
  '<div className="flex items-center justify-between mb-4">',
  '<div className="flex items-center justify-between mb-2 shrink-0">'
);
content = content.replace(
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">\r\n                {globalCriticalTanks.map((ct)',
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">\r\n                {globalCriticalTanks.map((ct)'
);
content = content.replace(
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">\n                {globalCriticalTanks.map((ct)',
  '<div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1 pb-1 custom-scrollbar">\n                {globalCriticalTanks.map((ct)'
);

// 6. LIMS Section
content = content.replace(
  '<section id="lims" className="w-full">',
  '<section id="lims" className="w-full shrink-0">'
);
content = content.replace(
  '<div className="flex items-center gap-2 mb-4">\n            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">\n              <FlaskConical size={20} />\n            </div>\n            <h2 className="text-xl font-bold text-sky-950">LIMS Out of Spec Alerts</h2>\n          </div>',
  '<div className="flex items-center gap-2 mb-2">\n            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">\n              <FlaskConical size={20} />\n            </div>\n            <h2 className="text-xl font-bold text-sky-950">LIMS Out of Spec Alerts</h2>\n          </div>'
);
content = content.replace(
  '<div className="flex items-center gap-2 mb-4">\r\n            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">\r\n              <FlaskConical size={20} />\r\n            </div>\r\n            <h2 className="text-xl font-bold text-sky-950">LIMS Out of Spec Alerts</h2>\r\n          </div>',
  '<div className="flex items-center gap-2 mb-2">\r\n            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">\r\n              <FlaskConical size={20} />\r\n            </div>\r\n            <h2 className="text-xl font-bold text-sky-950">LIMS Out of Spec Alerts</h2>\r\n          </div>'
);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
