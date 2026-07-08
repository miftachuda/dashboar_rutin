const fs = require('fs');
let content = fs.readFileSync('src/components/LimsCard.tsx', 'utf8');

const oldThead = `<thead className="bg-sky-100/50 text-sky-800">
                        <tr>
                          <th className="px-4 py-3 font-bold">Sample</th>
                          <th className="px-4 py-3 font-bold">Parameter</th>
                          <th className="px-4 py-3 font-bold">Value</th>
                          <th className="px-4 py-3 font-bold">Spec Limit</th>
                        </tr>
                      </thead>`;

const newThead = `<thead className="bg-sky-100/70 text-sky-900 border-b border-sky-200">
                        <tr>
                          <th className="px-3 py-2 font-bold">Sample</th>
                          <th className="px-3 py-2 font-bold">Parameter</th>
                          <th className="px-3 py-2 font-bold">Value</th>
                          <th className="px-3 py-2 font-bold">Spec Limit</th>
                        </tr>
                      </thead>`;

content = content.replace(oldThead, newThead);
fs.writeFileSync('src/components/LimsCard.tsx', content);
