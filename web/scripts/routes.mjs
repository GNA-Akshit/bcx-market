// CLEAN ADDRESSES ON GITHUB PAGES (16 Nov'26: bcx.market/insights, not bcx.market/#/insights — src/website/route.js).
// GitHub Pages has no rewrites: for /insights/supply to open the site, a file must answer there. After `vite build`
// this writes a copy of the page for every address the site names — dist/<address>/index.html, and
// dist/<address>.html beside it — and dist/404.html for everything else, so an address that cannot be listed in
// advance (a company's plants: /insights/stocks/<company>) still opens the site (with GitHub's 404 status).
// The page itself reads the address and draws the right module; every asset it loads is an absolute /assets/… path,
// so a copy works at any depth. A NEW PAGE OR MODULE ON THE SITE = A NEW LINE HERE.
import fs from 'node:fs'
import path from 'node:path'

const ROUTES = [
  // the home page's sections (the header's links scroll to them; each has its own address)
  'about', 'coverage', 'vision', 'principles', 'careers', 'industry', 'chain', 'contact',
  // the pages
  'news', 'legal', 'legal/regulations',
  // Market Insights, module by module, and Plant stocks by status (the Overview's ring links there)
  'insights', 'insights/overview', 'insights/supply', 'insights/map', 'insights/mines', 'insights/stocks',
  'insights/power', 'insights/auction', 'insights/sources',
  'insights/stocks/critical', 'insights/stocks/low', 'insights/stocks/moderate', 'insights/stocks/comfortable',
  // old addresses the site still answers (each opens the page that replaced it)
  'resources', 'exchange', 'newsletter', 'research', 'explorer',
]

const dist = 'dist'
const page = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
for (const r of ROUTES) {
  fs.mkdirSync(path.join(dist, r), { recursive: true })
  fs.writeFileSync(path.join(dist, r, 'index.html'), page)
  fs.writeFileSync(path.join(dist, `${r}.html`), page)
}
fs.writeFileSync(path.join(dist, '404.html'), page)
console.log(`✓ clean addresses: ${ROUTES.length} pages written (+ 404.html for the rest)`)
