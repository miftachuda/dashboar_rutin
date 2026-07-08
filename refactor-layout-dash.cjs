const fs = require('fs');
let content = fs.readFileSync('src/pages/UnitDashboardPage.tsx', 'utf8');

// 1. Move LIMS out of the wrapper
const limsStart = '          {/* SECTION 4: LIMS */}';
const limsEnd = '          </section>';
const wrapperEnd = '        </div>\n\n        {/* SECTION 5: CONSUMABLE MATERIAL */}';

const lIdx = content.indexOf(limsStart);
const wEndIdx = content.indexOf(wrapperEnd);

if (lIdx !== -1 && wEndIdx !== -1) {
  // Extract LIMS content (including its closing tag)
  // We need to carefully extract up to `</section>`
  let limsSectionText = content.substring(lIdx, content.indexOf('</section>', lIdx) + '</section>'.length);
  
  // Remove LIMS from inside the wrapper
  content = content.replace(limsSectionText, '');
  
  // Clean up any double blank lines left inside wrapper
  content = content.replace('\n\n\n        </div>', '\n        </div>');

  // Insert LIMS right after the wrapper ends
  content = content.replace(wrapperEnd, `        </div>\n\n${limsSectionText}\n\n        {/* SECTION 5: CONSUMABLE MATERIAL */}`);
  
  // 2. Adjust widths of Chemical and Tanki
  content = content.replace('id="chemical" className="w-full xl:w-1/3 flex flex-col"', 'id="chemical" className="w-full xl:w-1/2 flex flex-col"');
  content = content.replace('id="tanki" className="w-full xl:w-1/3 flex flex-col"', 'id="tanki" className="w-full xl:w-1/2 flex flex-col"');
  content = content.replace('id="lims" className="w-full xl:w-1/3 flex flex-col"', 'id="lims" className="w-full flex flex-col"');

  fs.writeFileSync('src/pages/UnitDashboardPage.tsx', content);
  console.log("Dashboard layout updated");
} else {
  console.log("Could not find boundaries");
}
