// THE DARK THEME'S GENERATED LAYER (5 Nov'26) — re-run whenever website.css or website-bands.css changes:
//   node scripts/gen_dark_css.mjs   (from the repo root; writes src/website-dark.gen.css) — or: npm run dark-css
//
// The site writes ~1,300 colours through tokens (redefined by hand in website-dark.css) and ~470 as
// literals (#fff cards, pale borders, ink text, navy fills). This file re-emits EVERY colour-carrying
// declaration of both stylesheets under `.dk` (the class the dark theme puts on the site's root `.bx`):
//   * a literal colour is MAPPED by the ROLE its property gives it — a background becomes a dark surface,
//     a border a faint white line, ink text a light grey, a shadow a deeper black — and navy (which does
//     not sit on black) becomes a light neutral;
//   * a token-based or colourless value (var(--x), none, 0) is re-emitted VERBATIM.
// Re-emitting everything — not only the literals — keeps the cascade exactly the light theme's: every
// selector gains exactly ONE class (`.bx X` → `.bx.dk X`, `X` → `.dk X`), so the order of specificity
// between any two rules is unchanged. (Emitting only the literals let a literal in a weak rule beat a
// token in a strong one.) Shorthands (`background`, `border`) reset their longhands, so every
// background-* / border-* / outline-* declaration is re-emitted too.
// Rules already drawn for a dark ground (the photo bands, the navy vision band) are left alone.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('package.json'))
const postcss = require('postcss')

const SRC = ['src/website.css', 'src/website-bands.css']
const OUT = 'src/website-dark.gen.css'

// ------------------------------------------------------------------ colour arithmetic
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const r2 = x => Math.round(x * 1000) / 1000
function parse(s) {
  s = s.trim().toLowerCase()
  if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 }
  if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 }
  let m = s.match(/^#([0-9a-f]{3,8})$/)
  if (m) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }
  }
  m = s.match(/^rgba?\(([^)]*)\)$/)
  if (m) {
    const p = m[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean)
    if (p.length < 3) return null
    const n = (v, max) => (v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v))
    return { r: n(p[0], 255), g: n(p[1], 255), b: n(p[2], 255), a: p[3] != null ? n(p[3], 1) : 1 }
  }
  return null
}
const hex = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')
function fmt({ r, g, b, a }) {
  if (a >= 0.999) return `#${hex(r)}${hex(g)}${hex(b)}`
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${r2(clamp(a, 0, 1))})`
}
const lum = c => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
const chroma = c => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return { h: 0, s: 0, l }
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}
function fromHsl({ h, s, l }, a = 1) {
  const k = n => (n + h / 30) % 12, q = s * Math.min(l, 1 - l)
  const f = n => l - q * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a }
}
const mix = (x, y, t) => ({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t, a: 1 })
function kind(c) {
  if (chroma(c) < 0.16) return 'neutral'
  const { h } = toHsl(c)
  if (h >= 195 && h <= 240) return 'navy'
  return 'hue'
}
// a hue at its full strength, for translucent washes of it
const pure = c => { const { h } = toHsl(c); return (h >= 8 && h <= 35) ? { r: 241, g: 136, b: 91, a: 1 } : fromHsl({ h, s: 0.68, l: 0.56 }) }

// CHARCOAL (v3, 5 Nov'26). v1 was Linear's near-black (#08090a) — "black bhot zyada dominant"; v2 tinted it
// all navy — "blue utna achha nahi lag raha … dark mode me light ke contrast se". So: a LIFTED charcoal,
// neutral, the greys doing the balancing, and navy — wherever the light site uses it — turned to LIGHT
// contrast (a light grey), never a blue
const PANEL = parse('#171a1f'), RAISED = parse('#21252b'), GROUND = parse('#0f1114')
const NAVY_FG = parse('#dfe3e8'), NAVY_FILL = parse('#c9ced6'), NAVY_GROUND = parse('#1c1f25')
const W = a => ({ r: 255, g: 255, b: 255, a })           // a line: white at a few per cent

const ROLE = {
  // a surface: white cards become Linear's panels, light greys a step above, glass stays glass
  surface(c) {
    const k = kind(c), L = lum(c)
    if (k === 'neutral') {
      if (L >= 0.82) {
        if (c.a < 0.999) return { ...GROUND, a: c.a }
        return mix(PANEL, RAISED, clamp((1 - L) / 0.18, 0, 1))
      }
      if (L > 0.35) { const v = (0.14 + (0.82 - L) * 0.45) * 255; return { r: v, g: v + 1, b: v + 4, a: c.a } }
      return { ...parse('#20232a'), a: c.a }
    }
    if (k === 'navy') return L >= 0.8 ? W(0.06 * c.a) : { ...NAVY_GROUND, a: c.a }
    if (L >= 0.85) return { ...pure(c), a: clamp(0.1 + (0.97 - L) * 0.8, 0.08, 0.24) * c.a }
    return c
  },
  // text: ink becomes Linear's light greys; light text (already on a dark or coloured ground) stays
  text(c) {
    const k = kind(c), L = lum(c)
    if (k === 'neutral') {
      if (L >= 0.6) return c
      const v = (0.97 - (L / 0.6) * 0.55) * 255
      return { r: v - 2, g: v, b: v + 3, a: c.a }
    }
    if (k === 'navy') return { ...NAVY_FG, a: c.a }
    const hs = toHsl(c)
    return hs.l < 0.62 ? fromHsl({ h: hs.h, s: Math.min(hs.s, 0.85), l: 0.7 }, c.a) : c
  },
  // a line: pale borders become faint white, the way Linear draws every edge
  border(c) {
    const k = kind(c), L = lum(c)
    if (k === 'neutral') return L >= 0.6 ? W(clamp(0.07 + (1 - L) * 0.45, 0.07, 0.2) * c.a) : W(0.3 * c.a)
    if (k === 'navy') return W(0.3 * c.a)
    if (L >= 0.8) return { ...pure(c), a: 0.38 * c.a }
    return c
  },
  // a shadow: deeper and blacker; a white highlight inside one becomes a faint white edge; a solid
  // white ring (a dot's separator from its card) becomes the card's colour
  shadow(c) {
    const k = kind(c), L = lum(c)
    if (k === 'neutral') {
      if (L < 0.5) return { r: 0, g: 0, b: 0, a: clamp(c.a * 1.9, 0, 0.8) }
      return c.a >= 0.95 ? PANEL : W(c.a * 0.08)
    }
    if (k === 'navy') return { r: 0, g: 0, b: 0, a: clamp(c.a * 1.5, 0, 0.75) }
    return { ...c, a: c.a * 0.55 }
  },
  // svg shapes: light fills are surfaces (rings, discs' grounds), dark ones are ink
  fill(c) { const L = lum(c), k = kind(c); return k === 'neutral' ? (L >= 0.6 ? ROLE.surface(c) : ROLE.text(c)) : k === 'navy' ? { ...NAVY_FILL, a: c.a } : c },
}
function roleOf(prop) {
  const p = prop.toLowerCase()
  if (p.startsWith('--')) {
    if (/shadow/.test(p)) return 'shadow'
    if (/line|border|rule|edge/.test(p)) return 'border'
    if (/ink|text|fg|color-text/.test(p)) return 'text'
    return 'custom'
  }
  if (p === 'color' || p === '-webkit-text-fill-color' || p === 'caret-color' || p === 'accent-color') return 'text'
  if (p.startsWith('background')) return 'surface'
  if (p.startsWith('border') || p.startsWith('outline') || p.startsWith('column-rule') || p.startsWith('text-decoration')) return 'border'
  if (p === 'box-shadow' || p === 'text-shadow' || p === 'filter') return 'shadow'
  if (p === 'fill' || p === 'stop-color' || p === 'flood-color') return 'fill'
  if (p === 'stroke') return 'fill'
  if (p === 'scrollbar-color') return 'surface'
  return null
}
// which properties are re-emitted (all colour carriers, and every longhand a re-emitted shorthand resets)
const EMIT = p => {
  p = p.toLowerCase()
  if (p.startsWith('--')) return true
  if (p === 'border-radius' || p.startsWith('border-top-left-radius') || /radius$/.test(p) || p === 'border-collapse' || p === 'border-spacing') return false
  return roleOf(p) != null
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|\b(?:white|black)\b/g
function mapValue(prop, value) {
  const role = roleOf(prop)
  // never touch what sits inside url(…) — the grain is an SVG data URI full of '#'
  return value.split(/(url\((?:[^()]|\([^()]*\))*\))/).map((part, i) => i % 2 ? part : part.replace(COLOR_RE, m => {
    const c = parse(m)
    if (!c) return m
    let out
    if (role === 'custom') out = kind(c) === 'neutral' && lum(c) < 0.6 ? ROLE.text(c) : kind(c) === 'navy' ? ROLE.text(c) : ROLE.surface(c)
    else out = ROLE[role](c)
    return fmt(out)
  })).join('')
}

// ------------------------------------------------------------------ selectors
// rules already drawn for a dark ground keep their light-on-dark colours
// (.light / .white / .on-dark mark a piece drawn for a dark ground; the Market Snapshot band is dark already)
const DARK_GROUND = /\.is-photo|\.is-navy|\.bx-sec\.navy|\.bx-band-bg|:is\(\.is-photo|\.light\b|\.white\b|\.on-dark\b|\.bx-industry\b/
function darkSelector(sel) {
  sel = sel.trim()
  if (/^(html|body|:root)\b/.test(sel)) return null
  if (/^\.bx(?![\w-])/.test(sel)) return '.bx.dk' + sel.slice(3)
  return '.dk ' + sel
}

// ------------------------------------------------------------------ build
let kept = 0, mapped = 0, rules = 0
const out = postcss.root()
out.append(postcss.comment({ text: ` GENERATED by scripts/gen_dark_css.mjs from ${SRC.join(' + ')} — do not edit; re-run the script ` }))
for (const file of SRC) {
  const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file }).clone()
  root.walkAtRules(at => { if (/keyframes$/.test(at.name) || at.name === 'font-face' || (at.name === 'media' && /\bprint\b/.test(at.params))) at.remove() })
  root.walkComments(c => c.remove())
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
    const sels = rule.selectors.filter(s => !DARK_GROUND.test(s)).map(darkSelector).filter(Boolean)
    // the root token blocks are written by hand (website-dark.css)
    const isRootTokens = rule.selectors.every(s => /^\.bx(\.nb)?$/.test(s.trim()))
    rule.walkDecls(d => {
      if (!EMIT(d.prop) || (isRootTokens && d.prop.startsWith('--'))) { d.remove(); return }
      const v = mapValue(d.prop, d.value)
      if (v !== d.value) mapped++; else kept++
      d.value = v
    })
    if (!sels.length || !rule.nodes.length) { rule.remove(); return }
    rule.selectors = sels
    rules++
  })
  // drop at-rules left empty
  let again = true
  while (again) { again = false; root.walkAtRules(at => { if (!at.nodes || at.nodes.length === 0) { at.remove(); again = true } }) }
  out.append(postcss.comment({ text: ` ---- from ${file} ` }))
  out.append(root.nodes)
}
fs.writeFileSync(OUT, out.toString() + '\n')
console.log(`${OUT}: ${rules} rules, ${mapped} declarations re-coloured, ${kept} re-emitted as they were (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
