// CLEAN ADDRESSES ON GITHUB PAGES (16 Nov'26: bcx.market/insights, not bcx.market/#/insights — src/website/route.js).
// GitHub Pages has no rewrites: for /insights/supply to open the site, a file must answer there. After `vite build`
// this writes a copy of the page for every address the site names — dist/<address>/index.html, and
// dist/<address>.html beside it — and dist/404.html for everything else, so an address that cannot be listed in
// advance (a company's plants: /insights/stocks/<company>) still opens the site (with GitHub's 404 status).
// The page itself reads the address and draws the right module; every asset it loads is an absolute /assets/… path,
// so a copy works at any depth. A NEW PAGE OR MODULE ON THE SITE = A NEW LINE HERE.
//
// THE PAGE SAYS WHAT IT MAY LOAD (16 Nov'26 — "add some simple cybersecurity things so that no one can easily attack
// it"; the monorepo's ADR-0051). GitHub Pages sends no headers of ours, so the Content-Security-Policy rides in the
// page as a <meta>, written here into the built page before it is copied: scripts only from this site — the one
// inline script (the dark-theme painter) allowed by its own SHA-256, worked out from the built page, so editing it
// can never leave a stale hash — data only from this site and the API (VITE_API_BASE), no plugins, no <base>
// rewrites, forms only to this site. Images may come from any https address (a news story's picture); styles may be
// inline (React's and the map's style attributes). HTTPS itself is GitHub's (301 from http, HSTS).
import crypto from 'node:crypto'
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
let page = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// the API's origin: the CI's override, else .env.production — the same value the build itself used
const envFile = fs.existsSync('.env.production') ? fs.readFileSync('.env.production', 'utf8') : ''
const apiBase = process.env.VITE_API_BASE || (envFile.match(/^VITE_API_BASE=(.+)$/m) || [])[1]?.trim() || ''
const api = apiBase ? new URL(apiBase).origin : ''
const hashes = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${api}`.trim(),
  `frame-src 'self' ${api}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
if (!page.includes('http-equiv="Content-Security-Policy"')) {
  page = page.replace(/(<meta charset="UTF-8"\s*\/?>)/i,
    `$1\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`)
  if (!page.includes('Content-Security-Policy')) throw new Error('routes.mjs: no <meta charset> to put the CSP after')
  fs.writeFileSync(path.join(dist, 'index.html'), page)
}
console.log(`✓ content security policy: ${hashes.length} inline script(s) by hash, data from ${api || 'this site only'}`)
for (const r of ROUTES) {
  fs.mkdirSync(path.join(dist, r), { recursive: true })
  fs.writeFileSync(path.join(dist, r, 'index.html'), page)
  fs.writeFileSync(path.join(dist, `${r}.html`), page)
}
fs.writeFileSync(path.join(dist, '404.html'), page)
console.log(`✓ clean addresses: ${ROUTES.length} pages written (+ 404.html for the rest)`)
