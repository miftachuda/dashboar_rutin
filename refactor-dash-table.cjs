const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

content = content.replace(
  '<SampleGroups data={limsData} loading={limsLoading} limit={limsLimit} onlyOOS={true} />',
  '<SampleGroups data={limsData} loading={limsLoading} limit={limsLimit} onlyOOS={true} format="table" />'
);

// Format safely handles line breaks if prettier formatted it:
content = content.replace(
  'onlyOOS={true}\n              />',
  'onlyOOS={true}\n                format="table"\n              />'
);
content = content.replace(
  'onlyOOS={true}\r\n              />',
  'onlyOOS={true}\r\n                format="table"\r\n              />'
);

fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
