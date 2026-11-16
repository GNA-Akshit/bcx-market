// Small shared pieces of the website: the section header, a count-up number, the
// scroll-progress line, the back-to-top button, the hero parallax, and the data
// centre's atoms (change chip, range bar, segmented switch).
//
// Motion is decoration, so every piece here does nothing under prefers-reduced-motion
// and lands on the exact final figure — a count-up never shows a number the data does
// not hold once it stops.
import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownRight, ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronRight, Minus, X } from 'lucide-react'
import { dir, num, pct } from './format.js'
import { BAND } from './flags.js'
import { Credit, Photo } from './media.jsx'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Was this page load a RELOAD (F5, the refresh button)? A section in the address is put
 *  there by the nav as the reader moves about (#/about); a refresh should not read it back
 *  as a deep link and drop them mid-page — it starts at the top. A link someone followed or
 *  typed still lands on its section. */
export const isReload = () => {
  try { return performance.getEntriesByType('navigation')[0]?.type === 'reload' } catch { return false }
}

/** Does a media query match — kept live as the window changes. For the few places where the
 *  PHONE needs different MARKUP, not just different CSS (no issue iframes, a sheet instead of a
 *  long list, a bottom dock): everything else stays a CSS rule, so the desktop cannot change. */
export function useMediaQuery(q) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return undefined
    const f = () => setOn(m.matches)
    f()
    m.addEventListener?.('change', f)
    return () => m.removeEventListener?.('change', f)
  }, [q])
  return on
}
/** The phone: the width at which the site's phone layout (website.css "v34 phone") applies. */
export const PHONE = '(max-width: 600px)'
export const usePhone = () => useMediaQuery(PHONE)

/** Title on the left, a short lede and an optional action on the right, on the grid. */
export function SecHead({ eyebrow, title, lede, action, center = false }) {
  return (
    <div className={`bx-shead bx-reveal${center ? ' center' : ''}`}>
      <div className="t">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="h-sec">{title}</h2>
      </div>
      {(lede || action) && <div className="a">{lede && <p className="lede">{lede}</p>}{action}</div>}
    </div>
  )
}

/** A number that counts up once, the first time it is seen. */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(reduced() ? value : 0)
  useEffect(() => {
    if (value == null || reduced() || !ref.current) { setShown(value); return undefined }
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now(), dur = 1100
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur)
        const ease = 1 - Math.pow(1 - k, 3)
        setShown(k < 1 ? value * ease : value)
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value])
  return <span ref={ref}>{prefix}{value == null ? '—' : num(shown, decimals)}{suffix}</span>
}

/** Run `fn(scrollY)` once a frame while the page scrolls (and on resize).
 *
 *  SCROLL IS NEVER REACT STATE AT THE TOP OF THE SITE. It used to be: one scrollY in
 *  Website re-rendered the whole tree every frame, so scrolling the data centre redrew
 *  every chart, sparkline and table row sixty times a second (144ms of script for a short
 *  scroll, measured by scratch/dev/_probe_scroll.py). An effect that follows the scroll
 *  writes to its own element here, or keeps a boolean that flips only at a threshold. */
/** ON A PHONE A TABLE BECOMES CARDS, AND NOTHING SCROLLS SIDEWAYS (23 Oct'26).
 *
 *  Every body cell of a `.bx-table` gets its column's header as `data-label` — the header read
 *  as a grid, so a grouped header ("Production" over "MT · Of target · Change") gives
 *  "Production · Of target" — and website.css (≤600px) lays each row out as a card: its first
 *  cell the title, every other cell a label over its value. A header cell marked
 *  `data-m="hide"` drops its columns on a phone (the coal map's coal-by-source split). One
 *  place does it for every table on the site, and re-labels when a table's rows change (a
 *  period switch remounts them, a state opens its plants). Labelled tables carry `.stk`. */
export function labelTable(t) {
  if (t.dataset.stack === 'no') { t.classList.remove('stk'); return }     // a narrow table stays a table
  const head = t.tHead ? [...t.tHead.rows] : []
  if (!head.length) return
  const grid = head.map(() => [])
  head.forEach((tr, r) => {
    let c = 0
    for (const th of tr.cells) {
      while (grid[r][c]) c++
      for (let i = 0; i < th.rowSpan; i++) for (let j = 0; j < th.colSpan; j++) if (grid[r + i]) grid[r + i][c + j] = th
      c += th.colSpan
    }
  })
  const n = Math.max(...grid.map(g => g.length))
  const label = [], hide = []
  for (let c = 0; c < n; c++) {
    const ths = [...new Set(grid.map(g => g[c]).filter(Boolean))]
    // data-short: a phone's shorter name for the column; data-m="nolabel": a group header that
    // adds nothing to its columns' names ("The month")
    label[c] = ths.filter(th => th.dataset.m !== 'nolabel').map(th => (th.dataset.short ?? th.textContent).trim()).filter(Boolean).join(' · ')
    hide[c] = ths.some(th => th.dataset.m === 'hide')
  }
  for (const body of t.tBodies) {
    for (const tr of body.rows) {
      let c = 0
      for (const td of tr.cells) {
        if (td.colSpan >= n - 1 && n > 2) td.dataset.full = '1'
        else {
          if (label[c] && td.dataset.label !== label[c]) td.dataset.label = label[c]
          if (hide[c]) td.dataset.mhide = '1'
        }
        c += td.colSpan
      }
    }
  }
  t.classList.add('stk')
}

export function useStackedTables() {
  useEffect(() => {
    let raf = 0
    const run = () => { raf = 0; document.querySelectorAll('table.bx-table').forEach(labelTable) }
    run()
    // only a mutation that adds rows or tables re-labels (never the coal map's SVG churn)
    const mo = new MutationObserver(ms => {
      if (raf) return
      if (ms.some(m => [...m.addedNodes].some(x => x.nodeType === 1 && (x.tagName === 'TR' || x.tagName === 'TBODY' || x.tagName === 'TABLE'
        || (!x.closest?.('.leaflet-container') && x.getElementsByTagName('table').length))))) raf = requestAnimationFrame(run)
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { mo.disconnect(); cancelAnimationFrame(raf) }
  }, [])
}

/** A PAGE'S OPENING BAND (5 Nov'26, flags.BANDS): the page's own photograph under a wash that follows
 *  the THEME (flags.BAND 'light': white with black words on the light site, charcoal with light words
 *  on the dark theme — no blue in either), the page's title large and centred, and the page itself
 *  rising over the band's foot as a sheet with rounded top corners (`sheet` = the colour of what
 *  follows, so the lip and the page are one surface). One band for Market Insights, News, Regulations
 *  and the Newsletter: the title says which page it is, nothing else competes with it. */
export function PageBand({ crumb, title, sub, sheet = 'var(--bg)', photo, children }) {   // --bg: the page's own ground (white; the dark theme's near-black)
  // flags.BAND: 'light' (the default) lays the page's own photograph under a white wash, 'photo' under a
  // navy one (its credit on it, as the licence asks); 'navy' and 'slate' draw the band without one
  const pic = (BAND === 'light' || BAND === 'photo') && photo
  return (
    <section className={`bx-band is-${BAND}`} style={{ '--sheet': sheet }}>
      {pic && <div className="bx-band-bg" aria-hidden="true"><Photo p={photo} eager sizes="100vw" /></div>}
      <div className="wrap bx-band-in">
        {crumb && <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><span>{crumb}</span></nav>}
        <h1>{title}</h1>
        {sub && <div className="bx-band-sub">{sub}</div>}
        {children}
      </div>
      {pic && <Credit p={photo} className="bx-band-credit" />}
    </section>
  )
}

/** Words that fill in, one after another, as their block crosses the screen (the vision statement,
 *  5 Nov'26). The progress is ONE custom property on the block, written straight to the DOM on the
 *  scroll frame — never React state, which would re-render the page every frame (useOnScroll). */
export function FillText({ text, as: Tag = 'blockquote', className = '' }) {
  const ref = useRef(null)
  const words = text.split(/\s+/)
  useOnScroll(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.setProperty('--p', words.length + 1); return }
    const r = el.getBoundingClientRect(), vh = window.innerHeight
    // starts as the block's top passes 85% of the screen, complete as its foot reaches 45%
    const t = (vh * 0.85 - r.top) / Math.max(1, r.height + vh * 0.4)
    el.style.setProperty('--p', (Math.min(1, Math.max(0, t)) * (words.length + 2)).toFixed(2))
  })
  return (
    <Tag ref={ref} className={`bx-fill ${className}`.trim()}>
      {words.map((w, i) => <span key={i} style={{ '--i': i }}>{w} </span>)}
    </Tag>
  )
}

export function useOnScroll(fn) {
  const cb = useRef(fn)
  cb.current = fn
  useEffect(() => {
    let raf = 0
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; cb.current(window.scrollY) }) }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
}

/** True once the page is scrolled past `px`; re-renders only when that flips. */
export function useScrolledPast(px) {
  const [past, setPast] = useState(() => typeof window !== 'undefined' && window.scrollY > px)
  useOnScroll(y => setPast(y > px))
  return past
}

/** The reading line across the top — shown only where the header's nav is folded away
 *  (a phone or a tablet). On a desktop it ran the full width of the header, so its tip
 *  slid under "Market insights" and "Data centre" while the reader was still on the home
 *  page, and read as "you are there now". The desktop home page has `SectionRail` instead.
 *
 *  Two tones: BCX's coral up to the element `split` (the industry band), industry blue
 *  after it — so crossing into the industry part is visible in the line itself. `tone`
 *  colours a whole page: 'industry' for the industry-data pages, 'bcx' for the rest. */
export function ScrollProgress({ split = null, tone = 'bcx' }) {
  const bar = useRef(null)
  useOnScroll(y => {
    const el = bar.current
    if (!el) return
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    let b = tone === 'industry' ? 0 : 100
    const s = split && document.getElementById(split)
    if (s) b = Math.max(0, Math.min(100, ((s.getBoundingClientRect().top + y) / max) * 100))
    el.style.setProperty('--b', `${b}%`)
    el.style.clipPath = `inset(0 ${100 - Math.min(1, y / max) * 100}% 0 0)`
  })
  return <div className="bx-progress" ref={bar} aria-hidden="true" />
}

/** The desktop home page's progress: a rail under its OWN sections' nav items. The fill
 *  runs across each item while that section is read, so its tip always sits under the
 *  section on screen and never under a link to another page. `ids` are the sections in
 *  page order, one per `button[data-sec]` in `group`; `end` is where the last one stops. */
export function SectionRail({ group, ids, end }) {
  const fill = useRef(null)
  // WHERE THINGS ARE is measured only when something changes size, never per frame (2 Nov'26):
  // reading every section's box on every scroll frame forced a layout of the whole home page
  // whenever another scroll effect (the coal chain's line) had just written to the DOM, and the
  // industry band stuttered. Per frame there is now only arithmetic on scrollY.
  const geo = useRef(null)
  const key = ids.join('|')
  const paint = useCallback(y => {
    const f = fill.current, G = geo.current
    if (!f || !G) return
    const probe = y + window.innerHeight * 0.35          // the line the scroll spy reads at
    let x = 0
    G.tops.slice(0, -1).forEach((t, i) => {
      const t0 = t - probe
      if (!(t0 <= 0)) return                             // not reached yet (or not on the page)
      const t1 = G.tops[i + 1] - probe                    // the next section, or `end`
      const frac = Number.isFinite(t1) ? Math.min(1, -t0 / Math.max(1, t1 - t0)) : 1
      x = G.btns[i][0] + frac * G.btns[i][1]
    })
    f.style.setProperty('--b', `${(G.btns[G.btns.length - 1][0] / G.w) * 100}%`)
    f.style.clipPath = `inset(0 ${100 - (x / G.w) * 100}% 0 0)`
  }, [])
  useEffect(() => {
    const list = key.split('|')
    const measure = () => {
      const g = group.current
      const btns = g ? [...g.querySelectorAll('button[data-sec]')] : []
      const gr = g?.getBoundingClientRect()
      if (!gr?.width || btns.length !== list.length) { geo.current = null; return }
      const y = window.scrollY
      const abs = id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + y : NaN }
      geo.current = { w: gr.width, tops: [...list, end].map(abs),
        btns: btns.map(b => { const r = b.getBoundingClientRect(); return [r.left - gr.left, r.width] }) }
      paint(y)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    if (group.current) ro.observe(group.current)
    return () => ro.disconnect()
  }, [group, key, end, paint])
  useOnScroll(paint)
  return <span className="rail" aria-hidden="true"><i ref={fill} /></span>
}

/** A PHONE'S SWIPE ROW (2 Nov'26, the user's call — "page faltu me overflow full nahi hoga"): the items sit
 *  side by side and snap one at a time; the next one peeks in from the edge and the dots under the row say
 *  how many there are and which is in view, so it is plain that the row moves sideways. The one deliberate
 *  exception to "nothing scrolls sideways on a phone" (scratch/dev/_audit_mobile.py skips `.bx-hrail`).
 *  `bleed`: the row runs to the screen's edges (a page section); without it, it stays inside its card. */
export function HRail({ children, className = '', label, bleed = false }) {
  const track = useRef(null)
  const [at, setAt] = useState(0)
  const items = Children.toArray(children).filter(Boolean)
  const n = items.length
  useEffect(() => {
    const el = track.current
    if (!el) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const items = [...el.children]
      if (!items.length) return
      const max = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= max - 2) { setAt(items.length - 1); return }
      const x0 = items[0].offsetLeft
      let best = 0, d = Infinity
      items.forEach((it, i) => { const dd = Math.abs(it.offsetLeft - x0 - el.scrollLeft); if (dd < d) { d = dd; best = i } })
      setAt(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    el.addEventListener('scroll', on, { passive: true })
    return () => { el.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])
  const go = i => {
    const el = track.current, it = el?.children[i]
    if (!el || !it) return
    el.scrollTo({ left: it.offsetLeft - el.children[0].offsetLeft, behavior: reduced() ? 'auto' : 'smooth' })
  }
  return (
    <div className={`bx-hrail-wrap${bleed ? ' bleed' : ''} ${className}`}>
      {/* each item in a wrapper of its own: equal heights, one snap point each, and the items' own
          sibling rules (a timeline's nth-child dots, a list's borders) cannot reach across the row */}
      <div className="bx-hrail" ref={track} role="list" aria-label={label}>
        {items.map((c, i) => <div key={c.key ?? i} className="bx-hrail-item" role="listitem">{c}</div>)}
      </div>
      {n > 1 && (
        <div className="bx-hrail-dots">
          {Array.from({ length: n }, (_, i) => (
            <button key={i} type="button" className={i === at ? 'on' : ''} onClick={() => go(i)} aria-label={`Show ${i + 1} of ${n}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export function BackToTop() {
  const show = useScrolledPast(900)
  return (
    <button className={`bx-top${show ? ' show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' })}
      aria-label="Back to top" tabIndex={show ? 0 : -1}><ArrowUp /></button>
  )
}

/** A gentle parallax offset for the hero photograph; none under reduced motion. */
export const parallax = (y, k = 0.12) => (reduced() ? 0 : Math.min(160, y * k))

/** A change chip. The figure arrives computed; this only draws it. */
export function Chg({ v, title }) {
  const I = v == null || Math.abs(v) < 0.05 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight
  return <span className={`chg ${dir(v)}`} title={title}><I />{pct(v)}</span>
}

/** Where today sits between a period's low and high — placement, not a comparison. */
export function RangeBar({ lo, hi, v, fmt = String }) {
  if (lo == null || hi == null || v == null) return <span className="bx-range na">—</span>
  const at = hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5
  return (
    <span className="bx-range" title={`low ${fmt(lo)} · high ${fmt(hi)}`}>
      <span className="track"><i style={{ left: `${at * 100}%` }} /></span>
      <span className="ends"><span>{fmt(lo)}</span><span>{fmt(hi)}</span></span>
    </span>
  )
}

/** Tabs whose switching changes what is inside the body and nothing else — no control on
 *  the page moves when one is pressed. tabs: [[key, label, count?]]; pane(key) renders a tab.
 *
 *  EVERY PANE IS LAID IN THE SAME GRID CELL, the inactive ones hidden, so the body is as
 *  tall as its tallest pane and never scrolls. It used to be a fixed-height box that
 *  scrolled inside — a scroll trap: with the pointer over the tables, forty turns of the
 *  wheel moved the page 0px (the box swallowed them, overscroll-behavior: contain). A
 *  pane that is far taller than its siblings belongs outside the panel. */
export function TabPanel({ tabs, value, onChange, label, pane }) {
  return (
    <div className="bx-tabpanel">
      <div className="bx-tabs2" role="tablist" aria-label={label}>
        {tabs.map(([k, l, c]) => (
          <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
            {l}{c != null && <span>{c}</span>}
          </button>
        ))}
      </div>
      <div className="bx-tabpanel-bd">
        {tabs.map(([k]) => (
          <div key={k} role="tabpanel" className={`bx-pane${k === value ? ' on' : ''}`} aria-hidden={k !== value}>{pane(k)}</div>
        ))}
      </div>
    </div>
  )
}

/** A segmented switch. options: [[key, label]]. A switch that does not apply right now is
 *  DISABLED, never removed — a control that vanishes moves everything beside it. */
// THE CHOICE SLIDES (16 Nov'26, the user: "when we click the toggles … the transition needs to be better, so that
// something changed is reflected better"): one indicator, measured from the chosen button and moved there (transform,
// so nothing reflows), instead of each button painting its own background. Placed without a slide the first time
// (`.ready` is added after it), so a page never opens with its switches sliding in.
export function Seg({ value, onChange, options, label, small = false, disabled = false, title }) {
  const box = useRef(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return undefined
    const place = () => {
      const ind = el.firstElementChild, on = el.querySelector('button.on')
      if (!ind || !ind.classList.contains('bx-seg-ind')) return
      if (!on) { ind.style.opacity = '0'; return }
      ind.style.opacity = ''
      ind.style.width = `${on.offsetWidth}px`
      ind.style.height = `${on.offsetHeight}px`
      ind.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`
    }
    place()
    const raf = requestAnimationFrame(() => el.classList.add('ready'))
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    ro?.observe(el)
    return () => { cancelAnimationFrame(raf); ro?.disconnect() }
  }, [value, disabled, options.length])
  return (
    <div ref={box} className={`bx-seg has-ind${small ? ' sm' : ''}${disabled ? ' off' : ''}`} role="tablist" aria-label={label} title={title}>
      <i className="bx-seg-ind" aria-hidden="true" />
      {options.map(([k, l]) => (
        <button key={k} className={value === k && !disabled ? 'on' : ''} onClick={() => onChange(k)} role="tab" aria-selected={value === k} disabled={disabled}>{l}</button>
      ))}
    </div>
  )
}

/** A dropdown that looks like the site, not the browser: a button showing the choice (and its
 *  count), and a list that opens under it — the choice ticked, counts right-aligned, arrow
 *  keys / Enter / Esc, a click outside closes it. options: [[value, label, count?]]. The button
 *  keeps one width whatever is chosen (a control never moves). */
export function Dropdown({ value, onChange, options, label, className = '' }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const root = useRef(null)
  const cur = options.find(o => o[0] === value) || options[0]
  useEffect(() => {
    if (!open) return undefined
    const off = e => { if (!root.current?.contains(e.target)) setOpen(false) }
    const key = e => { if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('.bx-dd-btn')?.focus() } }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', key) }
  }, [open])
  const pick = v => { onChange(v); setOpen(false) }
  const onKey = e => {
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); setHi(Math.max(0, options.findIndex(o => o[0] === value))) }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(options.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi][0]) }
    else if (e.key === 'Tab') setOpen(false)
  }
  return (
    <div className={`bx-dd${open ? ' open' : ''}${className ? ` ${className}` : ''}`} ref={root}>
      <button type="button" className="bx-dd-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => { setOpen(o => !o); setHi(Math.max(0, options.findIndex(o => o[0] === value))) }} onKeyDown={onKey}>
        <span className="cur">{cur[1]}</span>{cur[2] != null && <span className="n">{cur[2]}</span>}<ChevronDown className="chev" aria-hidden="true" />
      </button>
      <ul className="bx-dd-list" role="listbox" aria-label={label}>
        {options.map(([v, l, n], i) => (
          <li key={v} role="option" aria-selected={v === value} className={`${v === value ? 'on' : ''}${i === hi ? ' hi' : ''}`.trim() || undefined}
            onMouseEnter={() => setHi(i)} onClick={() => pick(v)}>
            <Check className="ck" aria-hidden="true" /><span className="l">{l}</span>{n != null && <span className="n">{n}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A Market insights module's title band: white, edge to edge, directly under the module bar,
 *  so the bar, the module's name and its controls read as ONE header — then the figures on the
 *  soft ground. (The title used to float on the grey between the bar and the figures.) */
export function ModuleHead({ title, meta, aside, className = '' }) {
  return (
    <header className={`bx-in-h ${className}`}>
      {/* the title sits on a CARD inside the page column (23 Oct'26, v28): an accent rule beside
          the title, the module's controls on the right — and when the module's figures follow,
          the card runs on round them (website.css v28) */}
      <div className="wrap">
        <div className="bx-in-card">
          <div className="tx"><h2>{title}</h2>{meta && <p>{meta}</p>}</div>
          {aside && <div className="aside">{aside}</div>}
        </div>
      </div>
    </header>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A panel that slides in over the page — from the right, or up from the bottom on a
 *  phone — so the reader can look closer without leaving where they are.
 *
 *  It is a history entry of its own, so Back closes it (a phone's Back button most of
 *  all); Esc, the close button and a click on the dimmed page close it too, and all of
 *  them go through history.back() so the entry never lingers. While open it locks the
 *  page's scroll, keeps keyboard focus inside, and gives focus back on close.
 *  children may be a function: children(close). wide: a large reading panel that rises
 *  from the bottom (the daily letter), instead of a side panel. */
export function Sheet({ open, onClose, label, children, wide = false }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const requestClose = useCallback(() => {
    if (window.history.state?.bxSheet) window.history.back()
    else closeRef.current()
  }, [])

  // mount, then slide in a frame later; slide out, then unmount
  useEffect(() => {
    if (open) {
      setMounted(true)
      let r2 = 0
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)) })
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), reduced() ? 0 : 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const back = document.activeElement
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = 'hidden'
    window.history.pushState({ bxSheet: true }, '')
    const onPop = () => closeRef.current()
    const onKey = (e) => {
      // a menu open inside the panel claims Esc first (it listens in the capture phase)
      if (e.key === 'Escape') { if (!e.defaultPrevented) { e.preventDefault(); requestClose() } return }
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!f.length) return
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
    }
    window.addEventListener('popstate', onPop)
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => panel.current?.querySelector('[data-autofocus]')?.focus({ preventScroll: true }), 60)
    return () => {
      clearTimeout(t)
      html.style.overflow = overflow
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('keydown', onKey)
      if (back && document.contains(back)) back.focus({ preventScroll: true })
    }
  }, [open, requestClose])

  // SWIPE TO DISMISS (2 Nov'26), on a phone, where the panel is a bottom sheet: the grab bar follows
  // the finger; let go past 110px, or flick down, and it closes — through requestClose, so Back and
  // history stay right — otherwise it settles back. Interruptible: the stylesheet's transition takes
  // over from wherever the finger left the panel, never from the top.
  // THE TALL SHEETS TOO (5 Nov'26 — the map's report could only be closed by its cross): the grab bar,
  // and a PULL DOWN from anywhere once the sheet is scrolled to its top, as a native sheet does. A wide
  // panel is centred with translateX(-50%), so its drag keeps that.
  const drag = useRef(null)
  const slide = (p, y) => { p.style.transform = y == null ? '' : wide ? `translate(-50%, ${y})` : `translateY(${y})` }
  const settle = (d, p) => {
    const speed = d.dy / Math.max(1, performance.now() - d.t0)        // px per ms
    p.style.transition = ''
    if (d.dy > 110 || (speed > 0.6 && d.dy > 30)) { slide(p, '105%'); requestClose() }
    else slide(p, null)
  }
  const grabDown = e => {
    const p = panel.current
    if (!p || !window.matchMedia('(max-width: 640px)').matches) return
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 }
    p.style.transition = 'none'
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const grabMove = e => {
    const d = drag.current, p = panel.current
    if (!d || !p) return
    d.dy = Math.max(0, e.clientY - d.y0)
    slide(p, `${d.dy}px`)
  }
  const grabUp = () => {
    const d = drag.current, p = panel.current
    drag.current = null
    if (d && p) settle(d, p)
  }
  // the pull from the content: only at the sheet's top, only a downward, mostly-vertical drag — anything
  // else is the sheet's own scroll (or a swipe row's) and is left alone
  useEffect(() => {
    const p = panel.current
    if (!open || !mounted || !p || !window.matchMedia('(max-width: 640px)').matches) return undefined
    let st = null
    const start = e => {
      if (e.touches.length !== 1 || e.target.closest?.('.bx-sheet-grab, .bx-hrail')) { st = null; return }
      st = { x: e.touches[0].clientX, y0: e.touches[0].clientY, t0: performance.now(), dy: 0, on: false, top: p.scrollTop <= 0 }
    }
    // DECIDED ON THE FIRST FEW PIXELS (5 Nov'26 — "exactly ussi point pe tap karke slide karna padta hai"):
    // a phone commits a touch to scrolling on its first moves, after which preventDefault is ignored, so
    // waiting for 8px lost the pull to the page's own bounce. At the top, a move that is downward and at
    // least as vertical as it is wide takes the sheet at once; anything else is left to scroll.
    const move = e => {
      if (!st || !st.top) return
      const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y0
      if (!st.on) {
        if (dy > 1 && dy >= Math.abs(dx) && p.scrollTop <= 0 && e.cancelable) { st.on = true; st.t0 = performance.now(); p.style.transition = 'none' }
        else { if (dy < 0 || Math.abs(dx) > Math.abs(dy) + 2 || !e.cancelable) st = null; return }
      }
      e.preventDefault()
      st.dy = Math.max(0, e.touches[0].clientY - st.y0)
      slide(p, `${st.dy}px`)
    }
    const end = () => { const d = st; st = null; if (d?.on) settle(d, p) }
    p.addEventListener('touchstart', start, { passive: true })
    p.addEventListener('touchmove', move, { passive: false })
    p.addEventListener('touchend', end)
    p.addEventListener('touchcancel', end)
    return () => {
      p.removeEventListener('touchstart', start); p.removeEventListener('touchmove', move)
      p.removeEventListener('touchend', end); p.removeEventListener('touchcancel', end)
    }
  }, [open, mounted, wide]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null
  return createPortal(
    <div className={`bx-sheet${wide ? ' wide' : ''}${shown ? ' in' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="bx-sheet-bg" onClick={requestClose} />
      <div className="bx-sheet-panel" ref={panel}>
        <div className="bx-sheet-grab" aria-hidden="true" onPointerDown={grabDown} onPointerMove={grabMove}
          onPointerUp={grabUp} onPointerCancel={grabUp} />
        <button className="bx-sheet-x" onClick={requestClose} aria-label="Close" data-autofocus><X /></button>
        {typeof children === 'function' ? children(requestClose) : children}
        {/* a tall sheet on a phone: Close at the foot, where the thumb is (website.css shows it ≤640px) */}
        {wide && <div className="bx-sheet-foot"><button className="bx-btn secondary sm" onClick={requestClose}>Close</button></div>}
      </div>
    </div>,
    document.querySelector('.bx') || document.body,
  )
}
