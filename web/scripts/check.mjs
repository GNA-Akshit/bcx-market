// THE SITE'S STANDING RULES, CHECKED BEFORE EVERY BUILD (npm run build runs this first; so does the deploy).
// Each was a rule of the coal platform's repository, where this site was built (its tests/website/*), and this
// repository is PUBLIC and deploys the company's live site — so a slip here is published at once.
//   1. THE NEWSLETTER IS LOCAL ONLY until the words "deploy newsletter": on the dev server, in no build that ships.
//   2. THE SITE READS ITS OWN API ONLY: /api/website/* — never the studio's, ULIP's or the fleet's (ULIP's data
//      may be shown only behind a login, and this site has none).
//   3. NOTHING SECRET IS COMMITTED: no keys, tokens or private keys anywhere in the sources.
//   4. bcx.market IS INDEXED: the production build must not tell crawlers to stay away, and robots.txt allows them.
//   5. THE DOMAIN: public/CNAME is bcx.market.
import fs from 'node:fs'
import path from 'node:path'

const fail = []
const read = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name)
  return e.isDirectory() ? walk(p) : [p]
})

// 1. the newsletter
const flag = read('src/website/flags.js').split('\n').find(l => l.startsWith('export const NEWSLETTER')) || ''
if (!flag.includes('import.meta.env.DEV')) fail.push(`the newsletter must be gated on the dev server: ${flag.trim()}`)
if (/=\s*true\b/.test(flag)) fail.push(`the newsletter is local only — never "= true": ${flag.trim()}`)
for (const f of ['.env', '.env.production', '.env.local', '.env.production.local']) {
  if (/^\s*VITE_NEWSLETTER\s*=\s*['"]?1/m.test(read(f))) fail.push(`${f} turns the newsletter on — only on "deploy newsletter"`)
}

// 2. the API it reads, and nothing of ULIP
const src = walk('src').filter(f => /\.(jsx?|css)$/.test(f))
for (const f of src) {
  const t = read(f)
  for (const m of t.matchAll(/['"`](\/api\/[^'"`$]*)/g)) {
    if (!m[1].startsWith('/api/website/')) fail.push(`${f} calls ${m[1]} — the site reads /api/website/* only`)
  }
  if (/\/api\/(fleet|ulip|exchange|mines)\b|\/ulip\//i.test(t)) fail.push(`${f} reaches ULIP / fleet / exchange code`)
}

// 3. secrets
const SECRET = /AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|aws_secret_access_key/i
for (const f of [...src, ...walk('public').filter(f => /\.(txt|json|html|svg|js)$/.test(f)), 'index.html', '.env', '.env.production', 'vite.config.js']) {
  if (SECRET.test(read(f))) fail.push(`${f} holds what looks like a secret`)
}

// 4. indexing
const robots = (read('.env.production').match(/^\s*VITE_ROBOTS\s*=\s*(.*)$/m) || [])[1] || ''
if (/noindex/i.test(robots) || !robots) fail.push(`.env.production VITE_ROBOTS must index the live site, not "${robots}"`)
if (!read('index.html').includes('%VITE_ROBOTS%')) fail.push('index.html must take its robots tag from VITE_ROBOTS')
if (/^\s*Disallow:\s*\/\s*$/m.test(read('public/robots.txt'))) fail.push('public/robots.txt disallows the whole site')

// 5. the domain
if (read('public/CNAME').trim() !== 'bcx.market') fail.push('public/CNAME must be bcx.market')

// 6. clean addresses (bcx.market/insights, not /#/insights — src/website/route.js + scripts/routes.mjs)
if (!/^\s*VITE_ROUTES\s*=\s*path\s*$/m.test(read('.env.production'))) fail.push('.env.production must set VITE_ROUTES=path (clean addresses)')
if (!read('src/website/route.js').includes('export function cleanLinks')) fail.push('src/website/route.js is missing — the address bar would show #/…')

if (fail.length) {
  console.error(`\n✗ ${fail.length} rule${fail.length > 1 ? 's' : ''} broken (scripts/check.mjs):\n  - ${fail.join('\n  - ')}\n`)
  process.exit(1)
}
console.log('✓ site rules: newsletter local only · /api/website only · no secrets · indexable · bcx.market')
