const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// Block 1: unitAlerts logic
const block1Start = '                let unitAlerts: typeof globalCriticalTanks = [];';
const block1End = '                }';

let idx1 = content.indexOf(block1Start);
// Finding the second `}` after the block start, corresponding to `if (unit === "023") { ... }`
let idx2 = content.indexOf('                return (', idx1);

if (idx1 !== -1 && idx2 !== -1) {
  content = content.substring(0, idx1) + content.substring(idx2);
}

// Block 2: unitAlerts JSX
const block2Start = '                    {unitAlerts.length > 0 && (';
const block2End = '                    )}';

let idx3 = content.indexOf(block2Start);
// We need to find the correct `)}`
// We know what follows it is `{(onStreamCount > 0`
let idx4 = content.indexOf('                    {(onStreamCount > 0', idx3);

if (idx3 !== -1 && idx4 !== -1) {
  content = content.substring(0, idx3) + content.substring(idx4);
}

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
