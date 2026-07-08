const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Remove hook import
content = content.replace('import { useLowStockConsumables } from "@/hooks/useLowStockConsumables";\n', '');

// 2. Remove icon import (Package)
content = content.replace(', Package,', ',');

// 3. Remove hook call
content = content.replace('  const { lowStockItems, loading: consumablesLoading } = useLowStockConsumables();\n', '');

// 4. Remove the JSX section
const sectionStart = '        {/* SECTION 5: CONSUMABLE MATERIAL */}';
const sectionEnd = '        </section>\n\n      </div>';

const sIdx = content.indexOf(sectionStart);
if (sIdx !== -1) {
  content = content.substring(0, sIdx) + '      </div>';
}

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
