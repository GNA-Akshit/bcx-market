// MARKET INSIGHTS → COAL MAP (#/insights/map; #/insights/mines opens here). ADR-0047.
//
// India's coal on one map, at the grain each source publishes it:
//   * THERMAL PLANTS — CEA's monthly statement (each plant's receipts by source, consumption
//     and closing stock, April onward) and its daily stock report (each plant's stock, the
//     critical flag, the day's receipt and consumption);
//   * COAL MINES — the CMPDI register, and Coal India's flagship mines' production vs target;
//   * COAL COMPANIES — each Coal India subsidiary and SCCL: the day's and the year's
//     production and offtake, as the dashboard prints them.
// A STATE's figure is the SUM of the plant rows CEA prints for it, and says so; India's
// monthly figures are CEA's own printed totals. No percentage of our own: the only one shown
// for a plant is CEA's "stock as % of normative"; for a mine or company, Coal India's own.
//
// THE LAYOUT. The module's frame is every module's: the title band (with the search), then
// the page column. The map is not in a box: it lies on the soft ground, its texture fading out
// at the edges, pinned while the rail card beside it — India, a state, a plant — reads on with
// the page. A state is clicked on the map, in the rail, or in the monthly plant report under
// the map; all three select the same thing. The bar is pinned only while the map is on
// screen. Controls never move: every switch keeps its place and width whatever is chosen.
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ChevronRight, Download, LocateFixed, Maximize2, Minimize2, Minus, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import Engine from './coalmap/Engine.jsx'
import { band } from './mines/cluster.js'
import { pretty } from './coalmap/names.js'
import { MINE_PORTAL } from './Sources.jsx'
import { INDIA_FEATURES, STATE_NAMES, featuresOf, nearestState, silhouette, stateOf } from './coalmap/geo.js'
import { apiUrl, useCoalmap } from './api.js'
import { day, dayShort, num } from './format.js'
import { Dropdown, ModuleHead, Sheet, usePhone } from './ui.jsx'
import { useTheme } from './theme.js'
import { PHONE_COMPACT } from './flags.js'

// ------------------------------------------------------------------ vocabulary
const SUB_NAME = {
  BCCL: 'Bharat Coking Coal', CCL: 'Central Coalfields', ECL: 'Eastern Coalfields', MCL: 'Mahanadi Coalfields',
  NCL: 'Northern Coalfields', SECL: 'South Eastern Coalfields', WCL: 'Western Coalfields', NEC: 'North Eastern Coalfields',
  SCCL: 'Singareni Collieries', CIL: 'Coal India',
}
const COMPANIES = ['MCL', 'SECL', 'NCL', 'CCL', 'WCL', 'ECL', 'BCCL', 'SCCL']
// E-AUCTION COAL IS SHOWN INSIDE "OTHERS" (29 Oct'26, the manager's call). CEA prints a plant's receipts
// as CIL | SCCL | Captive | E-Auction | Import | Others: its e-auction column is coal the plant BOUGHT at
// Coal India's and Singareni's auctions rather than under a linkage, so it is not a source of its own —
// and CEA does not say how much of it was CIL's and how much SCCL's, so it cannot be added to either.
// It joins Others. Each source names the columns of CEA's row (libs/website/coalmap MONTH_FIELDS) it adds up.
const SOURCES = [['cil', 'CIL', [0]], ['sccl', 'SCCL', [1]], ['captive', 'Captive', [2]], ['import', 'Imported', [4]], ['others', 'Others', [5, 3]]]
const srcVal = (v, idx) => {
  const xs = idx.map(i => v?.[i]).filter(x => x != null)
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null
}
/** CEA's nine-figure row as the report shows it: the five sources, then received, consumed, closing stock. */
const shownRow = v => [...SOURCES.map(([, , idx]) => srcVal(v, idx)), v?.[6] ?? null, v?.[7] ?? null, v?.[8] ?? null]
const MEASURES = {
  month: [['receipt', 'Coal received', 6], ['consumption', 'Coal consumed', 7], ['closing', 'Closing stock', 8],
    ['import', 'Imported coal received', 4], ['captive', 'Captive coal received', 2]],
  fytd: [['receipt', 'Coal received'], ['consumption', 'Coal consumed'], ['closing', 'Closing stock'],
    ['import', 'Imported coal received'], ['captive', 'Captive coal received']],
  week: [['receipt', 'Coal received in the 7 days'], ['consumption', 'Coal consumed in the 7 days'], ['stock', 'Stock on the last day']],
  day: [['stock', 'Coal stock'], ['receipt', 'Coal received that day'], ['consumption', 'Coal consumed that day']],
}
// with the plants switched off the states are shaded by their MINES — the register's count,
// or the flagship mines' published production summed — so the map always describes the layer
// that is on, never a layer that is off
// "on the register" read as jargon (pass 79): the CMPDI list is "all mines", the flagship mines are Coal India's
// Super 75 — the name its own report uses — and their production follows the period chosen
const MINE_MEASURES = [['operating', 'Operating mines'], ['all', 'All mines'], ['flagship', 'Super 75 production']]
// THE MINES HAVE A PERIOD TOO (pass 79, the user: "i cannot do daily or mtd or fytd filters in the coal mines
// section"). Coal India publishes each major mine's FYTD daily, and each company's day, month and year: the day
// and the month of a MINE are differences of two of its published FYTD readings (atlas.flagship_periods)
const MINE_PERIODS = [['day', 'Daily'], ['mtd', 'MTD'], ['fytd', 'FYTD']]
/** a flagship mine's production for the period — MT, or null where the report gives no figure */
const flagVal = (p, per) => (!p?.flagship ? null : per === 'day' ? p.flagship.day_mt : per === 'mtd' ? p.flagship.mtd_mt : p.flagship.ytd_actual_mt)
/** production for the period, as it reads best: a day in thousand tonnes, a month or a year in MT */
const prodFmt = (v, per) => (v == null ? '—' : per === 'day' ? `${num(v * 1000, 0)} thousand t` : `${num(v, 2)} MT`)
/** a window of dates, named: "11 Nov'26", "1–11 Nov'26", "30 Oct–11 Nov'26" */
const span = (from, to) => {
  if (!to) return '—'
  if (!from || from === to) return day(to)
  const a = from.split('-'), b = to.split('-')
  return a[0] === b[0] && a[1] === b[1] ? `${Number(a[2])}–${day(to)}` : `${dayShort(from)}–${day(to)}`
}
/** the window a mine figure covers — the major-mines report's own dates */
const mineWin = (asOf, per) => (!asOf ? '—' : per === 'day' ? (asOf.flagship_day ? day(asOf.flagship_day) : '—')
  : per === 'mtd' ? span(asOf.flagship_mtd_from, asOf.flagship) : span(`${fyStart(asOf.flagship)}`, asOf.flagship))
/** the window a company figure covers — the company report prints its day, its month from the 1st, its year from April */
const coWin = (d, per) => (!d ? '—' : per === 'day' ? day(d) : per === 'mtd' ? span(`${d.slice(0, 8)}01`, d) : span(fyStart(d), d))
const fyStart = iso => { const [y, mo] = iso.split('-').map(Number); return `${mo >= 4 ? y : y - 1}-04-01` }
// the mine sets a reader can pick out: Coal India's daily major-mines report names 35 "Super 35" mines
// (its 37 at times — the set changes), all of them inside the 75 "Super 75"
const MINE_SETS = [['all', 'Every mine on CMPDI’s list'], ['super35', 'Coal India’s Super 35 mines'], ['super75', 'Coal India’s Super 75 mines']]
const SET_SHORT = [['all', 'All mines'], ['super35', 'Super 35'], ['super75', 'Super 75']]
// FYTD (27 Oct'26): April to the chosen month — coalmap.fytd adds up the months CEA published
const PERIODS = [['month', 'Monthly'], ['fytd', 'FYTD'], ['week', 'Weekly'], ['day', 'Daily']]
const MONTHLY = per => per === 'month' || per === 'fytd'      // a period read from the monthly statement
const LAYERS = [['plants', 'Thermal plants'], ['mines', 'Coal mines'], ['companies', 'Coal companies']]
const LAYER_SHORT = { plants: 'Plants', mines: 'Mines', companies: 'Companies' }   // a phone's three equal segments
// THE PLANTS ARE NOT DRAWN AS DOTS for now (22 Oct'26, the user's call: 185 circles crowded the
// map). The thermal-plant layer still shades each state by its plants' figures, and the rail
// and the report still open every plant; a plant chosen takes the map to its state.
const SHOW_PLANT_DOTS = false
const LAYER_NOUN = { plants: "thermal plants in CEA's reports", mines: 'mines on CMPDI’s list', companies: 'coal companies' }
// the choropleth: one hue, BCX's coral, light to dark (a lightness ramp, read by eye and by
// the legend; "no plants reported" is a hatch, never the palest step)
// on the DARK theme the ramp runs the other way in lightness — a little coal is a dim ember, a lot a bright
// orange — because on a near-black map the brightest state must be the most. Both are kept and the map
// picks one LIVE (website/theme.js), so a theme switch recolours the states without a reload.
const RAMP_LIGHT = ['#f4ddce', '#ecbfa6', '#e0a07f', '#d0805d', '#ba6544', '#994d33']
// the dark ramp's first steps were near-black (#2a221e): a state with little coal read as one with none, and as
// the ground under it (pass 79) — they start as a lit ember now, clear of the grey "no data" land
const RAMP_DARK = ['#4a3226', '#6b3b27', '#91472b', '#ba5731', '#df6e3c', '#f8955f']
const rampOf = dark => (dark ? RAMP_DARK : RAMP_LIGHT)

const mt = v => (v == null ? '—' : num(v / 1000, v >= 100000 ? 1 : 2))          // '000 t -> MT
const kt = v => (v == null ? '—' : num(v, v >= 100 ? 0 : 1))
// the ramp is blended in OKLab, where equal steps LOOK equal — an sRGB blend went muddy
// between the coral steps and made two close values look further apart than they are
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const toSrgb = c => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))
function oklab(h) {
  const [r, g, b] = [1, 3, 5].map(i => toLin(parseInt(h.slice(i, i + 2), 16)))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return `rgb(${toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)}, ${toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)}, ${toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`
}
const RAMP_LAB = { light: RAMP_LIGHT.map(oklab), dark: RAMP_DARK.map(oklab) }
function rampAt(t, dark = false) {
  const lab = RAMP_LAB[dark ? 'dark' : 'light']
  const x = Math.max(0, Math.min(0.999, t)) * (lab.length - 1), i = Math.floor(x), f = x - i
  const [a, b] = [lab[i], lab[i + 1]]
  return fromOklab(a.map((v, k) => v + (b[k] - v) * f))
}
const lastIdx = arr => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i]) return i; return -1 }
const shortDay = iso => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—')
// a month's name is worked out once and kept (v88): toLocaleString builds a date formatter on every call, and the two
// month selects called it for every month on every render — 25–40 ms of each tap on a phone (CPU 4x)
const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const monthNames = new Map()
const monthName = id => {
  if (!id) return '—'
  if (!monthNames.has(id)) monthNames.set(id, MONTH_FMT.format(new Date(`${id}-01T00:00:00`)))
  return monthNames.get(id)
}
// a monthly period's name: the month, or April to it
const spanName = (per, id) => {
  if (!id) return '—'
  if (per !== 'fytd' || id.slice(5) === '04') return monthName(id)
  return `Apr–${new Date(`${id}-01T00:00:00`).toLocaleString('en-GB', { month: 'short' })} ${id.slice(0, 4)}`
}
// a monthly row of an entity (state / plant: .m or .f) for the period
const mrow = (o, per, id) => (per === 'fytd' ? o?.f : o?.m)?.[id]

/** a plant's figure for the period and measure, in '000 t (or null) */
function plantVal(p, period, month, measure) {
  if (MONTHLY(period)) {
    const idx = MEASURES.month.find(m => m[0] === measure)?.[2]
    return mrow(p, period, month)?.[idx] ?? null
  }
  const d = p.d || []
  if (period === 'day') {
    const v = d[d.length - 1]
    if (!v) return null
    return measure === 'stock' ? v[0] : measure === 'receipt' ? v[3] : v[4]
  }
  const have = d.filter(Boolean)
  if (!have.length) return null
  if (measure === 'stock') return d[lastIdx(d)][0]
  return have.reduce((s, v) => s + ((measure === 'receipt' ? v[3] : v[4]) || 0), 0)
}

/** a state's (or India's daily) figure for the period and measure, in '000 t */
function stateVal(s, period, month, measure) {
  if (!s) return null
  if (MONTHLY(period)) {
    const idx = MEASURES.month.find(m => m[0] === measure)?.[2]
    return mrow(s, period, month)?.[idx] ?? null
  }
  if (period === 'week') return s.w ? s.w[measure] : null
  const v = s.d?.[s.d.length - 1]
  if (!v || !v[4]) return null
  return measure === 'stock' ? v[0] : measure === 'receipt' ? v[2] : v[3]
}

// ------------------------------------------------------------------ small pieces
/** A report row's nine figures — six sources, then received · consumed · closing stock. A
 *  printed zero stays a zero (it is what CEA prints) but is set back in grey, so the figures
 *  that are there stand out from a row of "0.0". */
function KtCells({ v = [] }) {
  const s = shownRow(v)
  const T = SOURCES.length                     // the "received" column, after the sources
  return s.map((x, i) => (
    <td key={i} className={`${x === 0 ? 'z' : ''}${i === T ? ' t' : ''}`.trim() || undefined}>
      {i === T ? <b>{x === 0 ? '0' : kt(x)}</b> : x === 0 ? '0' : kt(x)}
    </td>
  ))
}

function Num({ v, dec = 1 }) {
  const [shown, setShown] = useState(v)
  useEffect(() => {
    if (v == null || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(v); return undefined }
    let raf = 0
    const from = typeof shown === 'number' ? shown : 0
    const t0 = performance.now()
    const tick = t => {
      const k = Math.min(1, (t - t0) / 650)
      setShown(from + (v - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{shown == null ? '—' : num(shown, dec)}</>
}

function Ring({ pct, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct || 0))
  return (
    <span className={`cm-ring b-${band(pct).key}`} style={{ width: size, height: size }} title={band(pct).label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="tr" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="pv" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ '--dash': c }} />
      </svg>
    </span>
  )
}

/** A DATA TABLE (pass 80 — the user, of pass 79's ranked list: "the previous was way better, at least it had
 *  symmetry"; of the mine lists: "written texts rather than structured data"). One header row, then every row the
 *  SAME columns, aligned: the name (a state with the colour it wears on the map), the figure as a bar with its
 *  number at the bar's end, then any further columns as plain right-aligned numbers. No second line of words under
 *  a name — what was said there is a column now. A row naming a state (`light`) lights it on the map under a mouse.
 *  cols: [name, figure, ...more]; rows: [{key, label, sw?, v, color?, more?: [value | {v, color}], title?, onClick?, light?}] */
function DataTable({ cols, rows, fmt, onLight }) {
  const max = Math.max(1e-9, ...rows.map(r => Math.abs(r.v || 0)))
  const more = cols.length - 2
  return (
    <div className={`cm-dt m${more}`} role="table">
      <div className="hd" role="row">{cols.map((c, i) => <span key={i} role="columnheader">{c}</span>)}</div>
      {rows.map(r => {
        const inner = (
          <>
            <span className="nm" role="cell">{r.sw !== undefined && <i className="sw" style={r.sw ? { background: r.sw } : undefined} />}<b>{r.label}</b></span>
            <span className="fg" role="cell">
              <span className="tr" aria-hidden="true"><i style={{ width: `${(Math.abs(r.v || 0) / max) * 100}%`, background: r.color || undefined }} /></span>
              <b>{r.v == null ? '—' : fmt(r.v)}</b>
            </span>
            {(r.more || []).map((x, i) => <span key={i} className="mo" role="cell" style={x?.color ? { color: x.color } : undefined}>{x?.v !== undefined ? x.v : x}</span>)}
          </>
        )
        const hover = onLight && r.light ? { onPointerEnter: e => { if (e.pointerType === 'mouse') onLight(r.light) }, onPointerLeave: () => onLight(null) } : {}
        return r.onClick
          ? <button key={r.key} className="rw" role="row" title={r.title} onClick={r.onClick} {...hover}>{inner}</button>
          : <div key={r.key} className="rw" role="row" title={r.title} {...hover}>{inner}</div>
      })}
    </div>
  )
}
// the short name of a measure, for a table's head
const SHORT = { receipt: 'Received', consumption: 'Consumed', closing: 'Closing', import: 'Imported', captive: 'Captive', stock: 'Stock' }

/** CMPDI'S MINE LIST, WHOLE (pass 79 — the user: "are the flagships and closing included in the 520 or not"). One
 *  bar split by the list's own stages, every mine once, so the parts add up to the list; Coal India's Super 75 is
 *  named INSIDE the operating part, because that is where they are. */
// pass 80: three FIGURE TILES (each its stage's colour along its top), not lines of words — "structured data"
const STAGES = [['operating', 'Operating'], ['closing', 'In closure'], ['closed', 'Closed']]
function MineList({ stages, flag }) {
  const tot = STAGES.reduce((s, [k]) => s + (stages[k] || 0), 0)
  return (
    <div className="cm-mlist">
      <div className="bar" role="img" aria-label={STAGES.map(([k, l]) => `${l} ${stages[k] || 0}`).join(', ')}>
        {STAGES.map(([k]) => <i key={k} className={k} style={{ flexGrow: stages[k] || 0 }} />)}
      </div>
      <div className="tiles">
        {STAGES.map(([k, l]) => (
          <div key={k} className={`t ${k}`}>
            <span className="l">{l}</span>
            <b>{num(stages[k] || 0, 0)}</b>
            <span className="s">{k === 'operating' ? (flag ? `${flag} Super 75` : '') : k === 'closing' ? 'Final phase' : 'Before 2009'}</span>
          </div>
        ))}
      </div>
      <div className="sum"><span>Mines on CMPDI&rsquo;s list</span><b>{num(tot, 0)}</b></div>
    </div>
  )
}

/** paired columns over time — receipts and consumption — with a two-swatch legend */
function Pairs({ cols, a, b, fmt }) {
  const max = Math.max(1, ...cols.flatMap(c => [c.a || 0, c.b || 0]))
  return (
    <div className="cm-pairs">
      <div className="lg"><span><i className="sa" />{a}</span><span><i className="sb" />{b}</span></div>
      <div className="cols" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map(c => (
          <div key={c.key} className={`col${c.on ? ' on' : ''}`} title={`${c.label}: ${a} ${fmt(c.a)} · ${b} ${fmt(c.b)}`}>
            <div className="bx2">
              <i className="sa" style={{ height: `${((c.a || 0) / max) * 100}%` }} />
              <i className="sb" style={{ height: `${((c.b || 0) / max) * 100}%` }} />
            </div>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** a line over days: stock (and, for a plant, its normative stock as a dashed line) */
function Line({ pts, norm, fmt, h = 92 }) {
  const w = 340
  const vals = pts.map(p => p.v).filter(v => v != null)
  if (vals.length < 2) return <p className="cm-note">Too few published days to draw.</p>
  const nv = (norm || []).filter(v => v != null)
  const hi = Math.max(...vals, ...nv) * 1.08, lo = Math.min(0, ...vals)
  const x = i => 4 + (i / (pts.length - 1)) * (w - 8)
  const y = v => h - 16 - ((v - lo) / (hi - lo || 1)) * (h - 26)
  const path = pts.map((p, i) => (p.v == null ? null : `${x(i)},${y(p.v)}`)).filter(Boolean)
  const npath = norm ? norm.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean) : []
  const lastI = lastIdx(pts.map(p => p.v != null))
  return (
    <svg className="cm-line" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Stock over the published days">
      <polygon className="ar" points={`${path[0].split(',')[0]},${h - 16} ${path.join(' ')} ${path[path.length - 1].split(',')[0]},${h - 16}`} />
      {npath.length > 1 && <polyline className="nm" points={npath.join(' ')} />}
      <polyline className="ln" points={path.join(' ')} />
      {lastI >= 0 && <circle className="dt" cx={x(lastI)} cy={y(pts[lastI].v)} r="3.5" />}
      <text x="4" y={h - 3}>{shortDay(pts[0].d)}</text>
      <text x={w - 4} y={h - 3} textAnchor="end">{shortDay(pts[pts.length - 1].d)}</text>
      {lastI >= 0 && <text className="vt" x={Math.min(x(lastI), w - 4)} y={Math.max(10, y(pts[lastI].v) - 8)} textAnchor="end">{fmt(pts[lastI].v)}</text>}
    </svg>
  )
}

/** WHERE THE COAL CAME FROM, AS A MIX (27 Oct'26 — the plain bars read as a list of numbers): one
 *  bar split by source, each part as wide as its tonnage, then each source with its colour and its
 *  figure. No share is printed: the widths carry the proportion, the figures are CEA's. */
const MIX_COLORS = { cil: '#1b3a63', sccl: '#2a78d6', captive: '#1baf7a', import: '#F1885B', others: '#a3adbb' }
/** WHERE THE COAL CAME FROM, AS A RING (27 Oct'26, the user's call): the ring on the left, each
 *  part as long as its tonnage; on the right each source with its colour and its figure. No share
 *  is printed — the ring carries the proportion, the figures are CEA's. */
function SourceMix({ v, fmt, unit }) {
  const rows = SOURCES.map(([k, l, idx]) => ({ k, l, x: srcVal(v, idx) })).filter(r => r.x != null)
  const tot = rows.reduce((a, r) => a + Math.max(0, r.x), 0) || 1
  const r = 46, w = 16, c = 2 * Math.PI * r
  let at = 0
  return (
    <div className="cm-mix">
      <svg viewBox="0 0 120 120" role="img" aria-label={rows.map(x => `${x.l} ${fmt(x.x)}${unit}`).join(', ')}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line-2)" strokeWidth={w} />
        {rows.filter(x => x.x > 0).map(x => {
          const len = (x.x / tot) * c
          const seg = <circle key={x.k} cx="60" cy="60" r={r} fill="none" stroke={MIX_COLORS[x.k]} strokeWidth={w}
            strokeDasharray={`${Math.max(0, len - 1.2)} ${c}`} strokeDashoffset={-at} transform="rotate(-90 60 60)"><title>{`${x.l}: ${fmt(x.x)}${unit}`}</title></circle>
          at += len
          return seg
        })}
      </svg>
      <ul>
        {rows.map(x => (
          // the swatch carries its colour in data-c, so the dark theme repaints it as it repaints the ring — CIL's
          // navy is light there, and the legend said blue beside a white part of the ring (pass 79)
          <li key={x.k} className={x.x ? undefined : 'zero'}><i style={{ background: MIX_COLORS[x.k] }} data-c={MIX_COLORS[x.k]} /><span>{x.l}</span><b>{fmt(x.x)}<small>{unit}</small></b></li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------------ the rail's panes
// Every pane opens with the SAME header: the outline of what is chosen — a state in the
// colour it wears on the map, India for all of India, a dot for a plant or a mine — its name,
// the period, and the way back. So the rail visibly IS the thing clicked on the map. Then ONE
// headline figure (the one the map is shaded by), a strip of the others, and sections that
// each say what they cover.
function RailHead({ shape, fill, dots = [], kicker, title, sub, back, onIndia }) {
  const sil = useMemo(() => (shape?.length ? silhouette(shape, 78) : null), [shape])
  return (
    <header className="cm-rh">
      <div className="top">
        {sil && (
          <svg className="sil" viewBox={`0 0 ${sil.w} ${sil.h}`} width={sil.w} height={sil.h} aria-hidden="true">
            <path d={sil.d} style={fill ? { fill } : undefined} />
            {dots.map(([la, lo], i) => { const [x, y] = sil.at(la, lo); return <circle key={i} cx={x} cy={y} r={dots.length > 1 ? 1.5 : 3.4} /> })}
          </svg>
        )}
        <div className="tx">
          <span className="cm-kicker">{kicker}</span>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {(back || onIndia) && (
        <div className="nav">
          {back && <button className="cm-back" onClick={back.go}><ArrowLeft />{back.label}</button>}
          {onIndia && <button className="cm-allin" onClick={onIndia}><X />All India</button>}
        </div>
      )}
    </header>
  )
}

function Hero({ label, value, unit, note, dec = 2 }) {
  return (
    <div className="cm-hero">
      <span className="l">{label}</span>
      <span className="v"><b>{value == null || Number.isNaN(value) ? '—' : <Num v={value} dec={dec} />}</b>{unit && <small>{unit}</small>}</span>
      {note && <span className="n">{note}</span>}
    </div>
  )
}

function Strip({ items }) {
  return (
    <div className="cm-strip">
      {items.map(it => (
        <div key={it.label}><span className="l">{it.label}</span><b>{it.value == null || Number.isNaN(it.value) ? '—' : <Num v={it.value} dec={it.dec ?? 2} />}<small>{it.unit}</small></b>{it.note && <span className="n">{it.note}</span>}</div>
      ))}
    </div>
  )
}

// a unit sits BESIDE its heading, in brackets — "Month by month (MT)" — not on a line of its own (pass 79)
function Sec({ title, unit, scope, children }) {
  return (
    <section className="cm-sec">
      <h4><span>{title}{unit && <em className="u"> ({unit})</em>}</span>{scope && <small>{scope}</small>}</h4>
      {children}
    </section>
  )
}

const MAIN = [['receipt', 'Received', 6], ['consumption', 'Consumed', 7], ['closing', 'Closing stock', 8], ['import', 'Imported', 4]]
const monthFigs = (row, measure) => {
  const hero = MEASURES.month.find(m => m[0] === measure)
  return { hero: { label: `${hero[1]}`, value: row[hero[2]] / 1000 }, rest: MAIN.filter(m => m[0] !== measure).slice(0, 3).map(([, l, i]) => ({ label: l, value: row[i] / 1000, unit: 'MT' })) }
}
const mineVal = (o, k, per = 'fytd') => (!o ? null : k === 'operating' ? o.operating : k === 'all' ? o.all : (o.flag && o.has[per] ? o.prod[per] : null))
const mineFmt = (v, k, per = 'fytd') => (v == null ? '—' : k === 'flagship' ? prodFmt(v, per) : num(v, 0))
const mineUnit = (k, per) => (k !== 'flagship' ? null : per === 'day' ? 'thousand t' : 'MT')
const mineLabel = (k, per, asOf) => (k === 'flagship' ? `Super 75 production, ${mineWin(asOf, per)}` : MINE_MEASURES.find(m => m[0] === k)[1])

/** a company's figure for the period, as Coal India's dashboard prints it — a % of target where IT prints one
 *  (FYTD; MTD for its subsidiaries), the tonnes where it does not (the day; Singareni's month) */
function coFig(data, code, measure, per) {
  const c = data.companies.companies[code]
  const row = c?.[measure]?.[lastIdx(c?.[measure] || [])]
  if (per === 'day') return { v: row?.day_kt, unit: 'thousand t', dec: 0 }
  if (per === 'mtd') {
    const pct = data.mines.subsidiaries?.[code]?.[measure]?.mtd_achieved_pct
    return pct != null ? { pct, v: row?.mtd_mt, unit: 'MT' } : { v: row?.mtd_mt, unit: 'MT', dec: 2 }
  }
  return { pct: row?.ytd_pct, v: row?.ytd_mt, unit: 'MT' }
}

function CoList({ data, per, onCompany }) {
  const cos = data.companies.companies
  const cell = (code, measure, word) => {
    const f = coFig(data, code, measure, per)
    if (f.pct === undefined) return <span className="pc v"><em>{f.v == null ? '—' : num(f.v, f.dec)}</em><small>{word}, {f.unit === 'MT' ? 'MT' : 'kt'}</small></span>
    return <span className="pc"><Ring pct={f.pct} size={22} stroke={3} /><em>{f.pct == null ? '—' : `${num(f.pct, 1)}%`}</em><small>{word}</small></span>
  }
  return (
    <ol className="cm-colist">
      {COMPANIES.filter(c => cos[c]).map(c => (
        <li key={c}><button onClick={() => onCompany(c)}>
          <span className="nm"><b>{c}</b><small>{SUB_NAME[c]}</small></span>
          {cell(c, 'production', 'production')}
          {cell(c, 'offtake', 'offtake')}
        </button></li>
      ))}
    </ol>
  )
}

// THE RAIL LISTS THE TOP STATES, THE REPORT LISTS THEM ALL (27 Oct'26): the rail's every-state
// list ran it to 2,260px beside a 677px map and repeated the plant report under the map, so it
// stops at RAIL_STATES and its last line opens the report
const RAIL_STATES = 8

function MoreStates({ n, onReport }) {
  if (!onReport || n <= RAIL_STATES) return null
  return <button className="cm-more" onClick={onReport}>All {n} states, in the monthly plant report <ArrowDown aria-hidden="true" /></button>
}

/** COAL INDIA'S MAJOR MINES, LISTED (10 Nov'26): the chosen set (Super 35 / Super 75) by FYTD production, each
 *  with its target and its share of it — the daily report's own figures, as of its date. */
/** the colour a published % of target earns — the same three bands as the map's rings */
const pctColor = pct => (pct == null ? undefined : pct >= 100 ? '#12875e' : pct >= 90 ? '#c98a1b' : '#cf3f33')

/** Coal India's major mines as a table (pass 80): Mine | production for the period | its company | Coal India's
 *  % of target (FYTD only — the one period it publishes one for), the bar in the colour that % earns */
function MineTable({ mines, per, onMine, company = false, limit }) {
  const day1 = per === 'day'
  const rows = (limit ? mines.slice(0, limit) : mines)
  return (
    <DataTable cols={['Mine', 'Production', ...(company ? ['Co.'] : []), ...(per === 'fytd' ? ['Target'] : [])]}
      rows={rows.map(p => ({ key: p.id, label: p.label, title: [p.label, p.subsidiary, p.area].filter(Boolean).join(' · '),
        v: flagVal(p, per) == null ? null : day1 ? flagVal(p, per) * 1000 : flagVal(p, per),
        color: per === 'fytd' ? pctColor(p.flagship.achieved_pct) : undefined,
        more: [...(company ? [p.subsidiary] : []), ...(per === 'fytd' ? [{ v: p.flagship.achieved_pct == null ? '—' : `${num(p.flagship.achieved_pct, 0)}%`, color: pctColor(p.flagship.achieved_pct) }] : [])],
        onClick: () => onMine(p.id) }))}
      fmt={v => num(v, day1 ? 0 : 2)} />
  )
}

// A PHONE LISTS THE TEN LARGEST, THE REST IN A SHEET (16 Nov'26, the user on a phone: "the space when we click super 35,
// super 75" — the list under the map was every mine, 35 or 75 rows, so the page grew and shrank by up to 1,800 px with
// each tap): ten rows and "All 75 mines" opening the whole table over the page, so Super 35 and Super 75 take the same
// room. A desktop's panel scrolls itself and keeps the whole list.
const PHONE_MINES = 10
function MajorMines({ mines, set, per, asOf, onMine }) {
  const phone = usePhone()
  const [all, setAll] = useState(false)
  const rows = mines.filter(p => p.flagship && (set === 'super75' || p.flagship.sets.includes('Super 35')))
    .sort((a, b) => (flagVal(b, per) || 0) - (flagVal(a, per) || 0))
  const prod = rows.reduce((s, p) => s + (flagVal(p, per) || 0), 0)
  const target = rows.reduce((s, p) => s + (p.flagship.ytd_target_mt || 0), 0)
  const label = MINE_SETS.find(s => s[0] === set)[1]
  const day1 = per === 'day'
  return (
    <>
      <Hero label={`Production, ${mineWin(asOf, per)}`} value={day1 ? prod * 1000 : prod} unit={day1 ? 'thousand t' : 'MT'} dec={day1 ? 0 : 2}
        note={per === 'fytd' ? `${rows.length} mines · ${num(target, 2)} MT target` : `${rows.length} mines`} />
      {per === 'fytd' && <Strip items={[{ label: 'Mines', value: rows.length, unit: '', dec: 0 }, { label: 'At or above target', value: rows.filter(p => (p.flagship.achieved_pct || 0) >= 100).length, unit: '', dec: 0 },
        { label: 'Below 90% of target', value: rows.filter(p => (p.flagship.achieved_pct ?? 100) < 90).length, unit: '', dec: 0 }]} />}
      <Sec title={label} unit={day1 ? 'thousand t' : 'MT'}>
        <MineTable mines={rows} per={per} onMine={onMine} company limit={phone ? PHONE_MINES : undefined} />
        {phone && rows.length > PHONE_MINES && (
          <button type="button" className="cm-more-btn" onClick={() => setAll(true)} aria-haspopup="dialog">
            All {rows.length} mines <ArrowRight aria-hidden="true" />
          </button>
        )}
      </Sec>
      {phone && (
        <Sheet open={all} onClose={() => setAll(false)} label={label}>
          <div className="cm-mines-sheet">
            <h3>{label}</h3>
            <p className="sub">{`Production, ${mineWin(asOf, per)} · ${day1 ? 'thousand t' : 'MT'}`}</p>
            <MineTable mines={rows} per={per} onMine={id => { setAll(false); onMine(id) }} company />
          </div>
        </Sheet>
      )}
    </>
  )
}

function IndiaPane({ data, mode, period, month, measure, mineMeasure, minePer = 'fytd', mineSet = 'all', mineAll = [], stateMines, onState, onPlant, onMine, onCompany, onReport, onLight, fills }) {
  const days = data.days
  const ranked = Object.entries(data.states).map(([name, s]) => ({ name, s, v: stateVal(s, period, month, measure) })).sort((a, b) => (b.v || 0) - (a.v || 0))
  const hint = null      // "Select a state on the map…" — off (27 Oct'26): the map says it by being a map
  if (mode !== 'plants') {
    const c = data.mines.counts || {}
    const asOf = data.mines.as_of
    const day1 = minePer === 'day'
    const rows = Object.entries(stateMines).map(([name, o]) => ({ name, o, v: mineVal(o, mineMeasure, minePer) })).filter(r => r.v).sort((a, b) => b.v - a.v)
    const coDay = data.companies.days?.[data.companies.days.length - 1]
    // a mine SET chosen (the Super 35 / Super 75): the pane is those mines, listed
    if (mode === 'mines' && mineSet !== 'all') {
      return (
        <div className="cm-pane" key={`india-${mode}-${mineSet}`}>
          <RailHead shape={INDIA_FEATURES} kicker={`All India · ${MINE_SETS.find(s => s[0] === mineSet)[1]}`} title="India"
            sub={`Coal India’s major-mines report of ${day(asOf?.flagship)}`} />
          <MajorMines mines={mineAll} set={mineSet} per={minePer} asOf={asOf} onMine={onMine} />
        </div>
      )
    }
    // THE MINES' PANEL, SAID PLAINLY (pass 79). The headline is the list's own figure — no "placed on the map,
    // from the register" under it; the list's stages are one bar that adds up (the old strip set "on the
    // register 660" — drawn points, not mines — beside "closing 63" and "flagship 70" and asked the reader to
    // work out which sat inside which); the companies and the states follow the period chosen
    const st = c.stages || {}
    const flagTot = rows.reduce((s, r) => s + r.v, 0)
    return (
      <div className="cm-pane" key={`india-${mode}`}>
        <RailHead shape={INDIA_FEATURES} kicker={mode === 'companies' ? 'All India · coal companies' : 'All India · coal mines'} title="India"
          sub={<a href={MINE_PORTAL} target="_blank" rel="noreferrer">CMPDI mine list</a>} />
        {hint}
        {mineMeasure === 'flagship'
          ? <Hero label={`Super 75 production, ${mineWin(asOf, minePer)}`} value={day1 ? flagTot * 1000 : flagTot} unit={day1 ? 'thousand t' : 'MT'} dec={day1 ? 0 : 2}
              note={`${c.flagship_placed} Coal India mines · its major-mines report of ${day(asOf?.flagship)}`} />
          : <Hero label={mineMeasure === 'all' ? 'Mines on CMPDI’s list' : 'Operating mines'} value={mineMeasure === 'all' ? (st.operating || 0) + (st.closing || 0) + (st.closed || 0) : st.operating} unit="mines" dec={0} />}
        <Sec title="CMPDI’s mine list">
          <MineList stages={st} flag={c.flagship_placed} />
        </Sec>
        <Sec title="The coal companies" scope={minePer === 'day' ? `Thousand tonnes, ${coWin(coDay, 'day')}` : `% of target, ${coWin(coDay, minePer)}`}>
          <CoList data={data} per={minePer} onCompany={onCompany} />
        </Sec>
        <Sec title={`${mineMeasure === 'flagship' ? 'Super 75 production' : MINE_MEASURES.find(m => m[0] === mineMeasure)[1]}, by state`} unit={mineUnit(mineMeasure, minePer)}>
          {/* State | the shading's figure (a bar in the state's map colour) | the list's other counts, as columns */}
          <DataTable cols={['State', mineMeasure === 'flagship' ? 'Production' : mineMeasure === 'all' ? 'All mines' : 'Operating',
            ...(mineMeasure === 'all' ? ['Operating'] : mineMeasure === 'operating' ? ['All'] : []), 'Super 75']}
            rows={rows.map(r => ({ key: r.name, label: r.name, sw: fills.get(r.name) || null, light: r.name,
              v: mineMeasure === 'flagship' && day1 ? r.v * 1000 : r.v, color: fills.get(r.name) || undefined,
              more: [...(mineMeasure === 'all' ? [r.o.operating] : mineMeasure === 'operating' ? [r.o.all] : []), r.o.flag],
              onClick: () => onState(r.name) }))}
            fmt={v => num(v, mineMeasure === 'flagship' && !day1 ? 2 : 0)} onLight={onLight} />
        </Sec>
      </div>
    )
  }
  if (MONTHLY(period)) {
    const im = data.india.m[month] || {}
    const row = (period === 'fytd' ? data.india.f?.[month] : im.row) || []
    const sm = im.summary || {}
    const { hero, rest } = monthFigs(row, measure)
    const lyKey = { receipt: 'receipt', consumption: 'consumption', import: 'imported' }[measure]
    // a year earlier, as CEA prints it: the same month, or April to it
    const ly = lyKey && sm[lyKey]?.[period === 'fytd' ? 'fytd_ly' : 'month_ly']
    return (
      <div className="cm-pane" key={`india-${period}-${month}`}>
        <RailHead shape={INDIA_FEATURES} kicker="All India · thermal power plants" title="India" sub={spanName(period, month)} />
        {hint}
        <Hero label={`${hero.label}, ${spanName(period, month)}`} value={hero.value} unit="MT" note={ly ? `${spanName(period, `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`)}: ${num(ly.mt, 2)} MT` : null} />
        <Strip items={rest} />
        {/* India's "April to date" cells are gone (27 Oct'26): FYTD is a period of its own now, the
            same for India and for every state */}
        <Sec title="Where the coal came from">
          <SourceMix v={row} fmt={mt} unit=" MT" />
        </Sec>
        <Sec title="Month by month" unit="MT">
          <Pairs a="Received" b="Consumed" fmt={v => `${mt(v)} MT`}
            cols={data.months.map(m => ({ key: m.id, label: m.label.slice(0, 3), on: m.id === month, a: data.india.m[m.id]?.row?.[6], b: data.india.m[m.id]?.row?.[7] }))} />
        </Sec>
        <Sec title={`${hero.label}, by state`} unit="MT">
          <DataTable cols={['State', SHORT[measure] || 'MT', 'Plants']}
            rows={ranked.slice(0, RAIL_STATES).map(r => ({ key: r.name, label: r.name, sw: fills.get(r.name) || null, light: r.name,
              v: r.v == null ? null : r.v / 1000, color: fills.get(r.name) || undefined, more: [r.s.plants], onClick: () => onState(r.name) }))}
            fmt={v => num(v, 2)} onLight={onLight} />
          <MoreStates n={ranked.length} onReport={onReport} />
        </Sec>
        <Sec title={`${hero.label}, by region`} unit="MT">
          <DataTable cols={['Region', SHORT[measure] || 'MT']} rows={((period === 'fytd' ? im.regions_f : im.regions) || []).map(r => ({ key: r.region, label: r.region,
            v: (r.v?.[MEASURES.month.find(x => x[0] === measure)[2]] ?? null) == null ? null : r.v[MEASURES.month.find(x => x[0] === measure)[2]] / 1000 }))
            .sort((a, b) => (b.v || 0) - (a.v || 0))} fmt={v => num(v, 2)} />
        </Sec>
      </div>
    )
  }
  const li = lastIdx(data.india.d.map(v => v && v[4]))
  const today = data.india.d[li] || []
  const w = data.india.w || {}
  const crit = data.plants.filter(p => p.d?.[li]?.[2]).sort((a, b) => (a.d[li][1] ?? 999) - (b.d[li][1] ?? 999))
  const heroV = measure === 'stock' ? today[0] : period === 'day' ? (measure === 'receipt' ? today[2] : today[3]) : w[measure]
  return (
    <div className="cm-pane" key={`india-${period}`}>
      <RailHead shape={INDIA_FEATURES} kicker="All India · thermal power plants" title="India"
        sub={period === 'day' ? day(days[li]) : `${shortDay(days[0])} – ${day(days[li])}`} />
      {hint}
      <Hero label={MEASURES[period].find(m => m[0] === measure)[1]} value={heroV / 1000} unit="MT" note={`The sum of ${today[4]} plants`} />
      <Strip items={[
        { label: 'Stock', value: today[0] / 1000, unit: 'MT' },
        { label: 'Critical plants', value: today[1], unit: ` of ${today[4]}`, dec: 0, note: 'stock under ¼ of normative' },
        { label: period === 'day' ? 'Received that day' : 'Received, 7 days', value: (period === 'day' ? today[2] : w.receipt) / 1000, unit: 'MT' },
      ]} />
      <Sec title="Stock, each published day" unit="MT">
        <Line pts={days.map((d, i) => ({ d, v: data.india.d[i]?.[4] ? data.india.d[i][0] / 1000 : null }))} fmt={v => `${num(v, 2)} MT`} />
      </Sec>
      <Sec title="Received and consumed, each day" unit="MT">
        <Pairs a="Received" b="Consumed" fmt={v => `${mt(v)} MT`}
          cols={days.map((d, i) => ({ key: d, label: shortDay(d).split(' ')[0], on: i === li, a: data.india.d[i]?.[2], b: data.india.d[i]?.[3] }))} />
      </Sec>
      <Sec title="Lowest stock against normative" scope={`${crit.length} critical plants · CEA’s % of normative stock`}>
        <DataTable cols={['Plant', 'Of normative']} rows={crit.slice(0, 8).map(p => ({ key: p.id, label: pretty(p.name), title: `${pretty(p.name)} · ${p.state}`,
          v: p.d[li][1], color: '#cf3f33', onClick: () => onPlant(p.id) }))} fmt={v => `${num(v, 0)}%`} />
      </Sec>
      <Sec title={`${MEASURES[period].find(m => m[0] === measure)[1]}, by state`} unit="MT">
        <DataTable cols={['State', SHORT[measure] || 'MT', 'Plants']}
          rows={ranked.slice(0, RAIL_STATES).map(r => ({ key: r.name, label: r.name, sw: fills.get(r.name) || null, light: r.name,
            v: r.v == null ? null : r.v / 1000, color: fills.get(r.name) || undefined, more: [r.s.plants], onClick: () => onState(r.name) }))}
          fmt={v => num(v, 2)} onLight={onLight} />
        <MoreStates n={ranked.length} onReport={onReport} />
      </Sec>
    </div>
  )
}

function MinesSection({ name, o, mines, mineMeasure, per = 'fytd', asOf, onMine, onCompany, lead }) {
  if (!o) return <Sec title="Coal mines"><p className="cm-note">No mine on CMPDI&rsquo;s list is drawn in {name}.</p></Sec>
  const day1 = per === 'day'
  const flag = mines.filter(p => p.flagship).sort((a, b) => (flagVal(b, per) || 0) - (flagVal(a, per) || 0))
  const cos = Object.entries(o.cos).sort((a, b) => b[1] - a[1])
  const v = mineVal(o, mineMeasure, per)
  return (
    <>
      {lead && <Hero label={mineLabel(mineMeasure, per, asOf)} value={mineMeasure === 'flagship' && day1 && v != null ? v * 1000 : v}
        unit={mineMeasure === 'flagship' ? mineUnit(mineMeasure, per) : 'mines'} dec={mineMeasure === 'flagship' ? (day1 ? 0 : 2) : 0}
        note={mineMeasure === 'flagship' ? `${o.flag} Super 75 ${o.flag === 1 ? 'mine' : 'mines'}${per === 'fytd' ? ` · of ${num(o.target, 2)} MT target` : ''}` : null} />}
      {lead && <Strip items={[{ label: 'Operating', value: o.operating, unit: '', dec: 0 }, { label: 'In closure or closed', value: o.closing + o.closed, unit: '', dec: 0 }, { label: 'Super 75', value: o.flag, unit: '', dec: 0 }]} />}
      {!lead && <Sec title="Coal mines here"><Strip items={[{ label: 'Mines', value: o.all, unit: '', dec: 0 }, { label: 'Operating', value: o.operating, unit: '', dec: 0 }, { label: 'Super 75', value: o.flag, unit: '', dec: 0 }]} /></Sec>}
      {cos.length > 0 && (
        <Sec title="The companies mining here">
          <div className="cm-chips">{cos.map(([c, n]) => <button key={c} onClick={() => COMPANIES.includes(c) && onCompany(c)} disabled={!COMPANIES.includes(c)}><b>{c}</b>{n} mine{n === 1 ? '' : 's'}</button>)}</div>
        </Sec>
      )}
      {o.unseen?.length > 0 && (
        <Sec title={`${o.unseen.length} more on the mine list`} scope="not on the map">
          <ul className="cm-unseen">{o.unseen.map(m => <li key={m.name}><b>{pretty(m.name)}</b><small>{[m.subsidiary || m.owner, m.district, m.mine_type].filter(Boolean).join(' · ')}</small></li>)}</ul>
        </Sec>
      )}
      {flag.length > 0 && (
        <Sec title="Super 75 mines" unit={day1 ? 'thousand t' : 'MT'} scope={per === 'fytd' ? null : mineWin(asOf, per)}>
          <MineTable mines={flag} per={per} onMine={onMine} company limit={12} />
        </Sec>
      )}
    </>
  )
}

function StatePane({ name, data, mode, layers, period, month, measure, mineMeasure, minePer, stateMines, minesIn, fills, onPlant, onMine, onCompany, onIndia }) {
  const s = data.states[name]
  const o = stateMines[name]
  const plants = data.plants.filter(p => p.state === name)
  const days = data.days
  const asOf = data.mines.as_of
  const head = (kicker, sub) => <RailHead shape={featuresOf(name)} fill={fills.get(name)} kicker={kicker} title={name} sub={sub} onIndia={onIndia} />
  if (mode !== 'plants') {
    return (
      <div className="cm-pane" key={`st-${name}-${mode}`}>
        {head(`State · ${o ? `${o.all} ${o.all === 1 ? 'mine' : 'mines'}` : 'no mines'}`, null)}
        <MinesSection name={name} o={o} mines={minesIn} mineMeasure={mineMeasure} per={minePer} asOf={asOf} onMine={onMine} onCompany={onCompany} lead />
        {s && <p className="cm-foot">{s.plants} thermal plants · switch on <b>Thermal plants</b></p>}
      </div>
    )
  }
  if (!s) {
    return (
      <div className="cm-pane" key={`st-${name}`}>
        {head('State', null)}
        <p className="cm-note">No thermal plant in {name}.</p>
        {layers.mines && <MinesSection name={name} o={o} mines={minesIn} mineMeasure={mineMeasure} per={minePer} asOf={asOf} onMine={onMine} onCompany={onCompany} />}
      </div>
    )
  }
  const li = lastIdx(s.d.map(v => v && v[4]))
  const v = mrow(s, period, month) || []
  const sorted = [...plants].sort((a, b) => (plantVal(b, period, month, measure) || 0) - (plantVal(a, period, month, measure) || 0))
  const kicker = `State · ${s.plants} thermal plants · ${num(s.capacity, 0)} MW`
  const label = MEASURES[period].find(m => m[0] === measure)?.[1]
  return (
    <div className="cm-pane" key={`st-${name}-${period}`}>
      {MONTHLY(period) ? (
        <>
          {head(kicker, spanName(period, month))}
          {(() => { const { hero, rest } = monthFigs(v, measure); return (<>
            <Hero label={`${hero.label}, ${spanName(period, month)}`} value={hero.value} unit="MT" />
            <Strip items={rest} />
          </>) })()}
          <Sec title="Where the coal came from">
            <SourceMix v={v} fmt={mt} unit=" MT" />
          </Sec>
          <Sec title="Month by month" unit="MT">
            <Pairs a="Received" b="Consumed" fmt={x => `${mt(x)} MT`}
              cols={data.months.map(m => ({ key: m.id, label: m.label.slice(0, 3), on: m.id === month, a: s.m[m.id]?.[6], b: s.m[m.id]?.[7] }))} />
          </Sec>
        </>
      ) : (
        <>
          {head(kicker, period === 'day' ? day(days[li]) : `${shortDay(days[0])} – ${day(days[li])}`)}
          <Hero label={label} value={stateVal(s, period, month, measure) / 1000} unit="MT" />
          <Strip items={[
            { label: 'Stock', value: s.d[li]?.[0] / 1000, unit: 'MT' },
            { label: 'Critical plants', value: s.d[li]?.[1], unit: ` of ${s.d[li]?.[4] ?? s.plants}`, dec: 0 },
            { label: period === 'day' ? 'Received that day' : 'Received, 7 days', value: (period === 'day' ? s.d[li]?.[2] : s.w?.receipt) / 1000, unit: 'MT' },
          ]} />
          <Sec title="Stock, each published day" unit="MT">
            <Line pts={days.map((d, i) => ({ d, v: s.d[i]?.[4] ? s.d[i][0] / 1000 : null }))} fmt={x => `${num(x, 2)} MT`} />
          </Sec>
        </>
      )}
      <Sec title={`The ${plants.length} plants`} unit="’000 t" scope={MONTHLY(period) ? null : 'Red: critical stock'}>
        <table className="cm-tbl">
          <thead>
            {MONTHLY(period)
              ? <tr><th>Plant</th><th>Received</th><th>Consumed</th><th>Closing</th></tr>
              : <tr><th>Plant</th><th>Stock</th><th>Of normative</th><th>{period === 'day' ? 'Received' : 'Received, 7 d'}</th></tr>}
          </thead>
          <tbody>
            {sorted.map(p => {
              const m = mrow(p, period, month) || []
              const d = p.d?.[lastIdx(p.d || [])] || []
              return (
                <tr key={p.id} tabIndex={0} onClick={() => onPlant(p.id)} onKeyDown={e => { if (e.key === 'Enter') onPlant(p.id) }}>
                  <td><b>{pretty(p.name)}</b><small>{[p.genco, p.capacity && `${num(p.capacity, 0)} MW`].filter(Boolean).join(' · ')}</small></td>
                  {MONTHLY(period)
                    ? <><td>{kt(m[6])}</td><td>{kt(m[7])}</td><td>{kt(m[8])}</td></>
                    : <><td>{kt(d[0])}</td><td><span className={d[2] ? 'cm-crit' : ''}>{d[1] == null ? '—' : `${num(d[1], 0)}%`}</span></td><td>{kt(plantVal(p, period, month, 'receipt'))}</td></>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Sec>
      {layers.mines && <MinesSection name={name} o={o} mines={minesIn} mineMeasure={mineMeasure} per={minePer} asOf={asOf} onMine={onMine} onCompany={onCompany} />}
    </div>
  )
}

function PlantPane({ p, data, month, fills, onIndia, onState }) {
  const [hist, setHist] = useState(null)
  useEffect(() => {
    let off = false
    setHist(null)
    fetch(apiUrl(`/api/website/coalmap/plant/${p.id}`)).then(r => (r.ok ? r.json() : null)).then(j => { if (!off) setHist(j) }).catch(() => {})
    return () => { off = true }
  }, [p.id])
  const li = lastIdx(p.d || [])
  const d = p.d?.[li] || []
  const m = p.m?.[month] || []
  return (
    <div className="cm-pane" key={`pl-${p.id}`}>
      <RailHead shape={p.state ? featuresOf(p.state) : INDIA_FEATURES} fill={p.state ? fills.get(p.state) : undefined} dots={p.lat != null ? [[p.lat, p.lon]] : []}
        kicker={`Thermal plant · ${[p.genco, p.mode && p.mode.toLowerCase().replace(/^\w/, c => c.toUpperCase())].filter(Boolean).join(' · ')}`}
        title={pretty(p.name)} sub={[p.capacity && `${num(p.capacity, 0)} MW`, p.state, p.region && `${p.region} region`].filter(Boolean).join(' · ')}
        back={p.state ? { label: p.state, go: () => onState(p.state) } : null} onIndia={onIndia} />
      {li >= 0 && (
        <>
          <div className={`cm-stock${d[2] ? ' crit' : ''}`}>
            <div className="tx">
              <span className="l">Coal stock, {day(data.days[li])}</span>
              <span className="v"><b><Num v={d[0]} dec={1} /></b><small>thousand t</small></span>
              <span className="n">{d[1] == null ? '' : `${num(d[1], 0)}% of normative`}</span>
            </div>
            {d[2] ? <span className="flag">Critical</span> : null}
          </div>
          <Strip items={[{ label: 'Received that day', value: d[3], unit: 'kt', dec: 1 }, { label: 'Consumed that day', value: d[4], unit: 'kt', dec: 1 }, { label: 'Normative stock', value: d[5], unit: 'kt', dec: 0 }]} />
          <Sec title="Stock since April" unit="’000 t" scope="Dashed: normative stock">
            {hist?.days?.length
              ? <Line pts={hist.days.map(x => ({ d: x[0], v: x[1] }))} norm={hist.days.map(x => x[6])} fmt={x => `${kt(x)} kt`} h={116} />
              : <div className="cm-line-wait" />}
          </Sec>
        </>
      )}
      <Sec title="Each month" unit="’000 t">
        <table className="cm-tbl months">
          <thead><tr><th>Month</th><th>Received</th><th>Imported</th><th>Consumed</th><th>Closing</th></tr></thead>
          <tbody>
            {data.months.map(mm => {
              const r = p.m?.[mm.id] || []
              return <tr key={mm.id} className={mm.id === month ? 'on' : ''}><td><b>{mm.label}</b></td><td>{kt(r[6])}</td><td>{kt(r[4])}</td><td>{kt(r[7])}</td><td>{kt(r[8])}</td></tr>
            })}
          </tbody>
        </table>
      </Sec>
      {m.length > 0 && <Sec title="Where its coal came from" scope={monthName(month)}><SourceMix v={m} fmt={kt} unit=" kt" /></Sec>}
      <p className="cm-where">{p.lat == null
        ? 'Not on the map.'
        : p.precision === 'town' ? `Position: ${p.place} (town)` : 'Position: WRI Global Power Plant Database'}</p>
    </div>
  )
}

function MinePane({ p, data, state, fills, onIndia, onCompany }) {
  const f = p.flagship, mo = p.monthly
  const off = p.subsidiary && data.mines.subsidiaries?.[p.subsidiary]?.offtake
  const co = p.subsidiary && COMPANIES.includes(p.subsidiary) ? p.subsidiary : null
  return (
    <div className="cm-pane" key={`mine-${p.id}`}>
      <RailHead shape={state ? featuresOf(state) : INDIA_FEATURES} fill={state ? fills.get(state) : undefined} dots={[[p.lat, p.lon]]}
        kicker={`Coal mine · ${f ? `Coal India ${f.sets.join(' · ')}` : { operating: 'operating', closing: 'in final closure', closed: 'closed before 2009' }[p.stage]}`}
        title={p.label} sub={[p.owner, p.subsidiary && p.subsidiary !== p.owner ? p.subsidiary : null, p.area && `${p.area} area`, state].filter(Boolean).join(' · ')}
        back={co ? { label: SUB_NAME[co], go: () => onCompany(co) } : null} onIndia={onIndia} />
      {f ? (
        <>
          <div className="cm-vs big"><Ring pct={f.achieved_pct} size={84} stroke={7} />
            <div className="tx"><span className="l">Production, financial year to date</span>
              <span className="v"><b><Num v={f.ytd_actual_mt} dec={2} /></b><small>MT</small></span>
              <span className="n">of {num(f.ytd_target_mt, 2)} MT target · {num(f.achieved_pct, 1)}% · {day(f.as_of)}</span></div></div>
          {/* the day and the month to date (pass 79) — differences of the report's own FYTD readings, each window named */}
          <Strip items={[{ label: `Produced ${mineWin(data.mines.as_of, 'day')}`, value: f.day_mt == null ? null : f.day_mt * 1000, unit: 'thousand t', dec: 0 },
            { label: `Produced ${mineWin(data.mines.as_of, 'mtd')}`, value: f.mtd_mt, unit: 'MT' }]} />
          {mo && <Strip items={[{ label: `Production, ${monthName(mo.month)}`, value: mo.month_actual_mt, unit: 'MT' }, { label: 'Annual target', value: mo.annual_target_mt, unit: 'MT' }]} />}
          {off && <Sec title={`Offtake — ${p.subsidiary}`} scope="company total">
            <div className="cm-vs"><Ring pct={off.ytd_achieved_pct} />
              <div className="tx"><span className="v"><b>{num(off.ytd_actual_mt, 2)}</b><small>of {num(off.ytd_target_mt, 2)} MT</small></span><span className="n">{num(off.ytd_achieved_pct, 1)}% of target, FYTD</span></div></div>
          </Sec>}
        </>
      ) : <p className="cm-note">No production figure for this mine.{co && <> <button className="cm-inline" onClick={() => onCompany(co)}>{SUB_NAME[co]}</button></>}</p>}
      {/* THE MINE LIST'S FACTS (27 Oct'26), as the list gives them — no badge, no stars drawn */}
      {(p.district || p.mine_type || p.ownership || p.star_rating) && (
        <Sec title="Details">
          <dl className="cm-facts">
            {(p.district || p.state) && <div><dt>District</dt><dd>{[p.district, p.state].filter(Boolean).join(', ')}</dd></div>}
            {p.mine_type && <div><dt>Type</dt><dd>{p.mine_type}</dd></div>}
            {p.ownership && <div><dt>Ownership</dt><dd>{p.ownership}</dd></div>}
            {p.star_rating && <div><dt>Star rating, FY 2024–25</dt><dd>{p.star_rating}{p.cco_marks != null && ` (${num(p.cco_marks, 0)}%)`}</dd></div>}
          </dl>
        </Sec>
      )}
      <p className="cm-where">{p.precision === 'district' ? `Position: ${p.district || ''} district` : `Position: ${p.place || `${p.area} area`} (±25 km)`}</p>
    </div>
  )
}

function CompanyPane({ code, data, per = 'fytd', minesOf, onMine, onIndia }) {
  const c = data.companies.companies[code] || {}
  const days = data.companies.days
  const li = lastIdx(c.production || [])
  const prod = c.production?.[li], off = c.offtake?.[li]
  const day1 = per === 'day'
  const flag = minesOf.filter(p => p.flagship).sort((a, b) => (flagVal(b, per) || 0) - (flagVal(a, per) || 0))
  const pit = data.companies.pithead
  const pitKey = code === 'SCCL' ? 'Singareni' : 'CIL'
  const pitLast = pit.by_producer[pitKey]?.[lastIdx(pit.by_producer[pitKey] || [])]
  // the company's figures FOR THE PERIOD CHOSEN (pass 79), each as the dashboard prints it — a % only where it prints one
  const w = coWin(days[li], per)
  const P = coFig(data, code, 'production', per), O = coFig(data, code, 'offtake', per)
  const target = per === 'day' ? (prod?.day_target_kt != null ? `${kt(prod.day_target_kt)} thousand t set for the day` : null)
    : per === 'mtd' ? (prod?.mtd_target_mt != null ? `of ${num(prod.mtd_target_mt, 2)} MT target${P.pct != null ? ` · ${num(P.pct, 1)}%` : ''}` : null)
      : (prod ? `of ${num(prod.ytd_target_mt, 2)} MT target · ${num(prod.ytd_pct, 1)}%` : null)
  return (
    <div className="cm-pane" key={`co-${code}`}>
      <RailHead shape={INDIA_FEATURES} dots={minesOf.map(p => [p.lat, p.lon])}
        kicker={code === 'SCCL' ? 'Coal company · Singareni Collieries Company' : `Coal company · a Coal India subsidiary`}
        title={SUB_NAME[code]} sub={`${minesOf.length} mines · ${day(days[li])}`} onIndia={onIndia} />
      {prod && <Hero label={`Production, ${w}`} value={P.v} unit={P.unit} dec={day1 ? 1 : 2} note={target} />}
      <Strip items={[
        { label: `Offtake, ${w}`, value: O.v, unit: day1 ? 'kt' : 'MT', dec: day1 ? 1 : 2, note: O.pct != null ? `${num(O.pct, 1)}% of target` : null },
        ...(per !== 'fytd' ? [{ label: 'Production, FYTD', value: prod?.ytd_mt, unit: 'MT', note: prod ? `${num(prod.ytd_pct, 1)}% of target` : null }]
          : [{ label: `Produced ${shortDay(days[li])}`, value: prod?.day_kt, unit: 'kt', dec: 1, note: prod ? `of ${kt(prod.day_target_kt)} kt set` : null }]),
        { label: `Dispatched ${shortDay(days[li])}`, value: off?.day_kt, unit: 'kt', dec: 1 },
      ]} />
      <Sec title="Each day" unit="’000 t">
        <Pairs a="Produced" b="Dispatched" fmt={v => `${kt(v)} thousand t`}
          cols={days.map((d, i) => ({ key: d, label: shortDay(d).split(' ')[0], on: i === li, a: c.production?.[i]?.day_kt, b: c.offtake?.[i]?.day_kt }))} />
      </Sec>
      {pitLast != null && <Strip items={[{ label: `Pithead stock, ${pitKey === 'CIL' ? 'Coal India' : 'Singareni'}`, value: pitLast, unit: 'MT', dec: 0 }]} />}
      {flag.length > 0 && (
        <Sec title="Its Super 75 mines" unit={day1 ? 'thousand t' : 'MT'} scope={per === 'fytd' ? null : mineWin(data.mines.as_of, per)}>
          <MineTable mines={flag} per={per} onMine={onMine} limit={10} />
        </Sec>
      )}
    </div>
  )
}

function Tip({ tip, data, mode, mineMeasure, minePer = 'fytd', stateMines, plantsById, minesById, period, month, measure, host }) {
  if (!tip) return null
  const w = host?.clientWidth || 1000
  let body = null
  if (tip.kind === 'state') {
    const s = data.states[tip.id]
    const o = stateMines[tip.id]
    if (mode === 'plants') {
      const v = stateVal(s, period, month, measure)
      body = <><b>{tip.id}</b>{s ? <><span className="v">{mt(v)} MT</span><span className="s">{MEASURES[period].find(m => m[0] === measure)?.[1]} · {s.plants} plants</span></> : <span className="s">No thermal plant in CEA&rsquo;s reports</span>}</>
    } else if (mode === 'mines' || mode === 'companies') {
      const cos = o ? Object.entries(o.cos).sort((a, b) => b[1] - a[1]).slice(0, 4) : []
      body = <><b>{tip.id}</b>{o ? <>
        <span className="v">{mineFmt(mineVal(o, mineMeasure, minePer), mineMeasure, minePer)}</span>
        <span className="s">{mineLabel(mineMeasure, minePer, data.mines.as_of)} · {o.all} {o.all === 1 ? 'mine' : 'mines'} · {o.flag} Super 75</span>
        {cos.length > 0 && <span className="s">{cos.map(([c, n]) => `${c} ${n}`).join(' · ')}</span>}
      </> : <span className="s">No mine on CMPDI&rsquo;s list is drawn here</span>}</>
    } else body = <b>{tip.id}</b>
  } else if (tip.kind === 'plant') {
    const p = plantsById.get(tip.id)
    if (!p) return null
    const li = lastIdx(p.d || [])
    const d = p.d?.[li]
    body = <><b>{pretty(p.name)}</b><span className="v">{kt(plantVal(p, period, month, measure))} thousand t</span>
      <span className="s">{MEASURES[period].find(m => m[0] === measure)?.[1]} · {p.state}</span>
      {d && !MONTHLY(period) && <span className={`s${d[2] ? ' crit' : ''}`}>{d[2] ? 'Critical · ' : ''}{num(d[1], 0)}% of normative stock</span>}</>
  } else if (tip.kind === 'mine') {
    const p = minesById.get(tip.id)
    if (!p) return null
    body = <><b>{p.label}</b><span className="s">{[p.subsidiary || p.owner, p.area].filter(Boolean).join(' · ')}</span>
      {p.flagship && (minePer === 'fytd'
        ? <span className="v">{num(p.flagship.ytd_actual_mt, 2)} of {num(p.flagship.ytd_target_mt, 2)} MT · {num(p.flagship.achieved_pct, 1)}%</span>
        : <><span className="v">{prodFmt(flagVal(p, minePer), minePer)}</span><span className="s">Production, {mineWin(data.mines.as_of, minePer)}</span></>)}</>
  } else if (tip.kind === 'mines') {
    body = <><b>{tip.n} mines</b><span className="s">{tip.flag ? `${tip.flag} of them in Coal India’s Super 75` : 'None in Coal India’s Super 75'}</span><span className="s">Click to open</span></>
  } else if (tip.kind === 'company') {
    const c = data.companies.companies[tip.id]
    const p = c?.production?.[lastIdx(c?.production || [])]
    const f = coFig(data, tip.id, 'production', minePer)
    body = <><b>{SUB_NAME[tip.id]}</b>{p && <span className="v">{f.v == null ? '—' : num(f.v, minePer === 'day' ? 0 : 2)} {f.unit}{f.pct != null ? ` · ${num(f.pct, 1)}% of target` : ''}</span>}
      <span className="s">Production, {coWin(data.companies.days?.[lastIdx(c?.production || [])], minePer)}</span><span className="s">Shaded: the ground its mines cover</span></>
  }
  // a company's card DOCKS in the map's top-left corner (pass 79) — over the coal belt it covered the other labels
  if (tip.dock) return <div className="cm-tip dock" role="tooltip">{body}</div>
  // a state's card sits up and to the right of the pointer, clear of the state under it
  const left = Math.min(Math.max(10, tip.x + (tip.follow ? 18 : -120)), w - 250)
  const top = tip.follow ? Math.max(8, tip.y - 78) : tip.y - tip.r - 12
  return <div className={`cm-tip${tip.follow ? ' follow' : ''}`} style={{ left, top: Math.max(8, top - (tip.follow ? 0 : 60)) }} role="tooltip">{body}</div>
}

/** The tooltip holds its OWN state: the map calls apiRef.current(tip) on every pointer move,
 *  and only this re-renders — not the module, its rail and its tables. */
function TipHost({ apiRef, ...rest }) {
  const [tip, setTip] = useState(null)
  apiRef.current = setTip
  return <Tip tip={tip} {...rest} />
}

// ------------------------------------------------------------------ the module
// A PHONE'S MAP IS NEVER COVERED (10 Nov'26). A sheet over the map's foot was tried the same day and turned down
// — "cheeze chup rahi hai … sab kuch hi report ke peeche sahi nahi lag raha": it hid the south of India and cut
// the headline figure. The side panel stays UNDER the map, compact (website.css v66), and only the one-row key
// sits on the map's foot: India is fitted above it (Engine bottomInset)
const KEY_INSET = 54

/** On a phone the plant report opens in a large sheet; on a wider screen it is on the page. */
const ReportPlace = ({ phone, open, onClose, label, children }) => (phone ? <Sheet wide open={open} onClose={onClose} label={label}>{children}</Sheet> : children)

/** The plant report on a phone: its month, India's three totals as CEA prints them, and the door
 *  to the full report (every state and plant, the search, the CSV). */
function ReportCard({ month, row, plants, onOpen }) {
  return (
    <section className="wrap cm-rcard" aria-label="Monthly plant report">
      <div className="in">
        <span className="k">Monthly plant report</span>
        <h3>{monthName(month)}</h3>
        <p>Coal received, consumed and held at India&rsquo;s thermal power plants, state by state, from CEA&rsquo;s monthly coal statement.</p>
        {row && (
          <dl>
            <div><dt>Received</dt><dd>{mt(row[6])}<small>MT</small></dd></div>
            <div><dt>Consumed</dt><dd>{mt(row[7])}<small>MT</small></dd></div>
            <div><dt>Closing stock</dt><dd>{mt(row[8])}<small>MT</small></dd></div>
          </dl>
        )}
        <p className="n">India, as CEA totals it.</p>
        <button className="bx-btn primary" onClick={onOpen} aria-haspopup="dialog">Open the report <ArrowRight /></button>
      </div>
    </section>
  )
}

export default function CoalMap() {
  const q = useCoalmap()
  const data = q.data && !q.data.error ? q.data : null
  const [layers, setLayers] = useState({ plants: true, mines: false, companies: false })
  const [period, setPeriod] = useState('month')
  const [month, setMonth] = useState(null)
  const [measure, setMeasure] = useState({ month: 'receipt', fytd: 'receipt', week: 'receipt', day: 'stock' })
  const [sel, setSel] = useState(null)              // {kind, id}
  const [focus, setFocus] = useState(null)
  const tipApi = useRef(null)
  const onHover = useRef(t => tipApi.current?.(t)).current
  const zoomEl = useRef(null)
  const [hint, setHint] = useState(false)
  const [full, setFull] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef(null)
  const stage = useRef(null)
  const readout = useRef(null)
  const api = useRef(null)
  const hintT = useRef(0)
  const report = useRef(null)
  // A PHONE: the period, month and shading in a sheet behind one "Filters" button, and the plant
  // report as one card that opens in a large sheet (23 Oct'26). Three rows of controls sat over
  // the map, and the report's thirty state cards ran four screens below it.
  const phone = usePhone()
  const keyInset = phone && PHONE_COMPACT           // a phone: India is fitted above the key at the map's foot
  const [filters, setFilters] = useState(false)
  const [repOpen, setRepOpen] = useState(false)

  useEffect(() => { if (data && !month) setMonth(data.as_of.monthly) }, [data, month])
  const ms = measure[period]
  const [mineMeasure, setMineMeasure] = useState('operating')
  const [minePeriod, setMinePeriod] = useState('fytd')      // the mines' and companies' period (pass 79)
  const [drillPath, setDrillPath] = useState([])            // the clusters opened, by size (Engine onDrill)
  // WHICH MINES (10 Nov'26, the user: "coal india apni top 37 mines report karta hai … drop down me ek filter"):
  // every mine on the register, or only Coal India's MAJOR mines — the Super 35 and Super 75 sets of its
  // daily major-mines report (atlas.py: `flagship`), each with its FYTD production against target. Chosen,
  // the rest of the register steps back and these stand out, and the panel lists them.
  const [mineSet, setMineSet] = useState('all')
  // THE MAP DESCRIBES THE LAYER THAT IS ON. Plants on: the states carry the plants' figures.
  // Plants off, mines or companies on: they carry the mines'. Nothing on: plain land.
  const mode = layers.plants ? 'plants' : layers.mines ? 'mines' : layers.companies ? 'companies' : 'none'

  const plantsById = useMemo(() => new Map((data?.plants || []).map(p => [p.id, p])), [data])
  const mineAll = useMemo(() => (data?.mines?.points || []).map(p => ({ ...p, label: p.flagship ? pretty(p.published_as) : p.name, short: pretty(p.published_as || p.name) })), [data])
  const minesById = useMemo(() => new Map(mineAll.map(p => [p.id, p])), [mineAll])
  // EACH MINE IN THE STATE THE MINE LIST GIVES (27 Oct'26): an area's centroid can fall across a
  // state line, so the point decides only where a mine with no listed state is counted
  // …and a centroid that falls just outside every outline goes to the state nearest it (pass 79): it was counted nowhere
  const mineState = useMemo(() => new Map(mineAll.map(p => [p.id, p.state || stateOf(p.lat, p.lon) || nearestState(p.lat, p.lon)])), [mineAll])
  // on the list, placed no finer than its state: counted there, named there, never drawn
  const notDrawn = useMemo(() => data?.mines?.not_drawn || [], [data])
  const stateMines = useMemo(() => {
    const out = {}
    // A REGISTER MINE IS COUNTED ONCE: two published flagship names can join to one register mine
    // (Dhori, Khadia, Makardhokada) and are drawn twice, but they are one mine on the register and
    // on the list — counted twice, a state read one mine more than the list (27 Oct'26)
    const seen = new Set()
    // each state's Super 75 production for EVERY period (pass 79), and how many mines gave a figure for it
    const fresh = () => ({ all: 0, operating: 0, closing: 0, closed: 0, flag: 0, prod: { day: 0, mtd: 0, fytd: 0 }, has: { day: 0, mtd: 0, fytd: 0 }, target: 0, cos: {} })
    for (const p of mineAll) {
      const s = mineState.get(p.id)
      if (!s) continue
      const o = out[s] || (out[s] = fresh())
      if (p.flagship) {
        o.flag++; o.target += p.flagship.ytd_target_mt || 0
        for (const per of ['day', 'mtd', 'fytd']) { const v = flagVal(p, per); if (v != null) { o.prod[per] += v; o.has[per]++ } }
      }
      // ONE REGISTER MINE, COUNTED ONCE — by the register's own key (pass 79; a name could be shared)
      const id = p.register_key || p.id
      if (seen.has(id)) continue
      seen.add(id)
      o.all++
      o[p.stage] = (o[p.stage] || 0) + 1
      if (p.subsidiary) o.cos[p.subsidiary] = (o.cos[p.subsidiary] || 0) + 1
    }
    for (const m of notDrawn) {
      const o = out[m.state] || (out[m.state] = fresh())
      o.all++
      o[m.stage] = (o[m.stage] || 0) + 1
      ;(o.unseen || (o.unseen = [])).push(m)
      const c = m.subsidiary || m.owner
      if (c) o.cos[c] = (o.cos[c] || 0) + 1
    }
    return out
  }, [mineAll, mineState, notDrawn])

  // the choropleth: each state's figure on one coral ramp (sqrt, so a small state still reads)
  const shade = useMemo(() => {
    if (!data || !month) return { vals: [], max: 0 }
    const vals = mode === 'plants'
      ? Object.keys(data.states).map(n => [n, stateVal(data.states[n], period, month, ms)])
      : mode === 'none' ? [] : Object.keys(stateMines).map(n => [n, mineVal(stateMines[n], mineMeasure, minePeriod)])
    return { vals, max: Math.max(0, ...vals.map(([, v]) => v || 0)) }
  }, [data, mode, period, month, ms, stateMines, mineMeasure, minePeriod])
  // the theme is LIVE: a switch re-renders the map with the other ramp (website/theme.js)
  const dark = useTheme() === 'dark'
  const fills = useMemo(() => {
    const out = new Map()
    for (const [n, v] of shade.vals) out.set(n, v == null || v === 0 ? null : rampAt(Math.sqrt(v / Math.max(1e-9, shade.max)), dark))
    return out
  }, [shade, dark])
  const legendMax = shade.max

  const selState = sel?.kind === 'state' ? sel.id : sel?.kind === 'plant' ? plantsById.get(sel.id)?.state : null
  // THE RAIL AND THE REPORT FOLLOW A CLICK A BEAT BEHIND (5 Nov'26, "coal map bhot laggy hai"): the
  // map and the breadcrumb take the selection at once; the rail's pane and the monthly report (every
  // state, every plant) re-render from a DEFERRED copy, in a render React can interrupt — so a reader
  // clicking state after state never waits on the report between clicks, and the flight keeps its frames
  // ON A TOUCH SCREEN THE PANEL WAITS FOR THE MAP TO LAND (pass 82, "on the phone it is still very slow"). A phone
  // rebuilt the panel and the report while the glide ran, and each commit cost the glide 60–90 ms frames
  // (_cm_phone_perf.py, CPU 4x). The panel is under the map there, out of sight during a tap, so it takes the
  // selection once the glide (0.6 s) is done; a desktop's panel follows at once, as before.
  const [railSel, setRailSel] = useState(sel)
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) { setRailSel(sel); return undefined }
    const t = setTimeout(() => setRailSel(sel), 640)
    return () => clearTimeout(t)
  }, [sel])
  const selView = useDeferredValue(railSel)
  // THE RAIL SCROLLS ITSELF on a desktop (website.css v78), so a new selection opens at its top, not
  // wherever the reader left the last one
  const railBox = useRef(null)
  // (only where it scrolls itself: on a phone the panel is part of the page, and scrollTo forced a layout of it per tap)
  useEffect(() => { if (window.matchMedia?.('(min-width: 1021px)').matches) railBox.current?.scrollTo?.({ top: 0 }) }, [selView?.kind, selView?.id])
  const selStateView =selView?.kind === 'state' ? selView.id : selView?.kind === 'plant' ? plantsById.get(selView.id)?.state : null
  const plants = useMemo(() => {
    if (!SHOW_PLANT_DOTS || !data || !layers.plants || !month) return []
    const vals = data.plants.map(p => plantVal(p, period, month, ms))
    const max = Math.max(1, ...vals.map(v => v || 0))
    const li = data.days.length - 1
    return data.plants.map((p, i) => (p.lat == null ? null : {
      id: p.id, name: p.name, short: pretty(p.name), lat: p.lat, lon: p.lon,
      px: Math.round(6 + 20 * Math.sqrt((vals[i] || 0) / max)),
      critical: !MONTHLY(period) && !!p.d?.[li]?.[2],
      dim: !!selState && p.state !== selState,
    })).filter(Boolean)
  }, [data, layers.plants, period, month, ms, selState])
  // a mine set chosen: the others are DIMMED, not dropped — the map still says where the register's mines are —
  // and the chosen ones are PICKED: never folded into a cluster, so each stands as its own disc at every zoom
  // (11 Nov'26, "top 35 and 75 mine wala feature nahi hai": dimming alone changed nothing at India's zoom,
  // where every cluster holds a flagship mine and so none of them dimmed)
  // `st`: the state the mine is counted in — a chosen state lights only its own mines (Engine, .is-out)
  const mines = useMemo(() => (layers.mines ? mineAll.filter(p => p.stage !== 'closed').map(p => {
    const st = mineState.get(p.id)
    if (mineSet === 'all') return { ...p, st }
    const pick = !!(p.flagship && (mineSet === 'super75' || p.flagship.sets.includes('Super 35')))
    return { ...p, st, dim: !pick, pick }
  }) : []), [layers.mines, mineAll, mineSet, mineState])
  // CHOOSING A SET SHOWS IT: the major mines are a mines view, so the mines come on and the plants make way
  // (the map describes the layer that is on — with the plants on, the states would carry the plants' figures)
  const pickSet = k => {
    setMineSet(k)
    if (k !== 'all') setLayers(x => (x.mines && !x.plants ? x : { ...x, mines: true, plants: false }))
  }
  const companies = useMemo(() => {
    if (!data || !layers.companies) return []
    return COMPANIES.map(code => {
      const pts = mineAll.filter(p => p.subsidiary === code)
      if (!pts.length) return null
      // each label carries the figure for the period chosen: a published % of target, or the tonnes (pass 79)
      const f = coFig(data, code, 'production', minePeriod)
      return { id: code, code, name: SUB_NAME[code], lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length,
        pct: f.pct ?? null, txt: f.pct !== undefined && f.pct != null ? null : f.v == null ? '—' : minePeriod === 'day' ? `${num(f.v, 0)} kt` : `${num(f.v, 2)} MT`,
        pts: pts.map(p => [p.lat, p.lon]) }
    }).filter(Boolean)
  }, [data, layers.companies, mineAll, minePeriod])

  const results = useMemo(() => {
    const t = query.trim().toLowerCase()
    if (!data || t.length < 2) return []
    const st = Object.keys(data.states).filter(n => n.toLowerCase().includes(t)).map(n => ({ kind: 'state', id: n, label: n, sub: `${data.states[n].plants} plants` }))
    const pl = data.plants.filter(p => `${p.name} ${p.genco} ${p.state}`.toLowerCase().includes(t)).map(p => ({ kind: 'plant', id: p.id, label: pretty(p.name), sub: `Thermal plant · ${p.state || '—'}` }))
    const co = COMPANIES.filter(c => `${c} ${SUB_NAME[c]}`.toLowerCase().includes(t)).map(c => ({ kind: 'company', id: c, label: SUB_NAME[c], sub: 'Coal company' }))
    const mi = mineAll.filter(p => `${p.label} ${p.area} ${p.subsidiary}`.toLowerCase().includes(t)).sort((a, b) => !!b.flagship - !!a.flagship).map(p => ({ kind: 'mine', id: p.id, label: p.label, sub: `Coal mine · ${[p.subsidiary || p.owner, p.area].filter(Boolean).join(' · ')}` }))
    return [...st, ...co, ...pl.slice(0, 5), ...mi.slice(0, 5)].slice(0, 9)
  }, [data, query, mineAll])

  // ---------------------------------------------------------------- selecting
  const choose = (s, { fly = true } = {}) => {
    // what is already chosen, chosen again, is nothing new: no second glide, no outline traced again (pass 79 —
    // with the double-click wait gone, ten clicks on one state re-selected it ten times)
    if (s && sel && s.kind === sel.kind && s.id === sel.id) return
    setQuery('')
    api.current?.light?.(null)              // a state lit from the panel lets go when the panel changes
    if (!s) { setSel(null); if (fly) setFocus({ kind: 'india', at: Date.now() }); return }
    if (s.kind === 'mine' && !layers.mines) setLayers(l => ({ ...l, mines: true }))
    if (s.kind === 'company' && !layers.companies) setLayers(l => ({ ...l, companies: true }))
    if (s.kind === 'plant' && !layers.plants) setLayers(l => ({ ...l, plants: true }))
    setSel(s)
    if (!fly) return
    if (s.kind === 'state') setFocus({ kind: 'state', id: s.id, at: Date.now() })
    else if (s.kind === 'plant') {
      const p = plantsById.get(s.id)
      // with no plant drawn on the map, a plant takes the reader to its STATE
      if (!SHOW_PLANT_DOTS) { if (p?.state) setFocus({ kind: 'state', id: p.state, at: Date.now() }) }
      else if (p?.lat != null) setFocus({ kind: 'point', lat: p.lat, lon: p.lon, zoom: 7.5, at: Date.now() })
    }
    else if (s.kind === 'mine') { const p = minesById.get(s.id); if (p) setFocus({ kind: 'point', lat: p.lat, lon: p.lon, zoom: 9.5, at: Date.now() }) }
    else if (s.kind === 'company') { const pts = mineAll.filter(p => p.subsidiary === s.id); if (pts.length) setFocus({ kind: 'points', pts, maxZoom: 8, at: Date.now() }) }
  }
  // the "Ctrl + scroll to zoom" hint shows ONCE a visit: shown on every plain wheel over the
  // map it flashed in and out as the reader scrolled the page past, and read as a glitch
  const hinted = useRef(false)
  const onHint = () => {
    if (hinted.current) return
    hinted.current = true
    setHint(true)
    clearTimeout(hintT.current)
    hintT.current = setTimeout(() => setHint(false), 2800)
  }
  const toIndia = () => choose(null)
  // the rail's last line: the plant report, under the map (a phone: in its sheet)
  const toReport = () => (phone ? setRepOpen(true) : report.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  // Esc (outside a text box, and outside full screen, where Esc leaves full screen) and a
  // click on the sea both go back to all of India
  const selRef = useRef(sel)
  selRef.current = sel
  const drillRef = useRef(drillPath)
  drillRef.current = drillPath
  // a step of the trail through the clusters: back to that level (the mine chosen inside it lets go)
  const toDrill = level => {
    if (selRef.current) setSel(null)
    if (level < drillRef.current.length) api.current?.drillTo(level)
  }
  useEffect(() => {
    const k = e => {
      if (e.key !== 'Escape' || document.fullscreenElement) return
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return
      // inside the clusters, Esc steps back ONE level (pass 79); otherwise it goes back to all of India
      if (drillRef.current.length && (!selRef.current || selRef.current.kind === 'mine')) { if (selRef.current) setSel(null); else api.current?.back(); return }
      if (!selRef.current) return
      choose(null)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const onBackground = () => { if (selRef.current) choose(null) }

  // ---------------------------------------------------------------- full screen
  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const toggleFull = async () => {
    const r = root.current
    if (!r) return
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      setFull(false)
    } else if (r.requestFullscreen) {
      try { await r.requestFullscreen(); setFull(true) } catch { setFull(true) }       // a refused request still gets the in-page version
    } else setFull(true)
  }
  useEffect(() => {
    if (!full) return undefined
    const k = e => { if (e.key === 'Escape' && !document.fullscreenElement) setFull(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [full])

  // ---------------------------------------------------------------- the report's CSV
  const exportCsv = () => {
    if (!data) return
    const cols = ['state', 'plants', ...SOURCES.map(s => s[1]), 'received', 'consumed', 'closing stock']
    const lines = [cols.join(',')]
    for (const [n, s] of Object.entries(data.states)) {
      const v = shownRow(s.m[month] || [])
      lines.push([`"${n}"`, s.plants, ...v.map(x => (x == null ? '' : x))].join(','))
    }
    lines.push('', ['plant', 'state', 'capacity MW', ...SOURCES.map(s => s[1]), 'received', 'consumed', 'closing stock'].join(','))
    for (const p of data.plants) {
      const v = p.m?.[month]
      if (v) lines.push([`"${p.name}"`, `"${p.state || ''}"`, p.capacity ?? '', ...shownRow(v).map(x => (x == null ? '' : x))].join(','))
    }
    const blob = new Blob([`CEA monthly coal statement of thermal power stations, ${monthName(month)} — thousand tonnes as published; state rows are sums of the plants CEA lists in each state\n${lines.join('\n')}`], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BCX_coal_plants_${month}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const curPlant = sel?.kind === 'plant' ? plantsById.get(sel.id) : null
  const curMine = sel?.kind === 'mine' ? minesById.get(sel.id) : null
  // the breadcrumb: India › the state › the plant or mine (a company stands on its own)
  const crumb = []
  if (sel?.kind === 'company') crumb.push({ kind: 'company', id: sel.id, label: SUB_NAME[sel.id] })
  else if (sel) {
    const st = sel.kind === 'state' ? sel.id : sel.kind === 'plant' ? curPlant?.state : mineState.get(sel.id)
    // a mine chosen inside the clusters: the trail through them stands in for its state
    if (st && !(sel.kind === 'mine' && drillPath.length)) crumb.push({ kind: 'state', id: st, label: st, go: sel.kind !== 'state' ? () => choose({ kind: 'state', id: st }) : null })
    if (curPlant) crumb.push({ kind: 'plant', id: sel.id, label: pretty(curPlant.name) })
    if (curMine) crumb.push({ kind: 'mine', id: sel.id, label: curMine.label })
  }
  const measureLabel = MEASURES[period].find(m => m[0] === ms)?.[1]
  const asOf = MONTHLY(period) ? spanName(period, month) : period === 'week' && data ? `${shortDay(data.days[0])} – ${day(data.days[data.days.length - 1])}` : data ? day(data.days[data.days.length - 1]) : ''

  // the list's own count, every mine once — not the 660 points drawn (pass 79)
  const stg = data?.mines?.counts?.stages
  const mineTotal = stg ? (stg.operating || 0) + (stg.closing || 0) + (stg.closed || 0) : data?.mines?.counts?.points
  const layerCount = { plants: data?.plants.length, mines: mineTotal, companies: COMPANIES.length }
  const find = (
    <div className="cm-find">
      <label className="cm-search">
        <Search aria-hidden="true" />
        {/* a phone's field is half a row (pass 84 — the long line was cut at "compa") */}
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={phone ? 'Search' : 'Find a state, plant, mine or company'} aria-label="Find a state, plant, mine or company" />
        {query && <button onClick={() => setQuery('')} aria-label="Clear"><X /></button>}
      </label>
      {results.length > 0 && (
        <ol className="cm-results">
          {results.map(r => <li key={`${r.kind}-${r.id}`}><button onClick={() => choose({ kind: r.kind, id: r.id })}><i className={`k ${r.kind}`} /><span className="nm">{r.label}<small>{r.sub}</small></span></button></li>)}
        </ol>
      )}
      {query.trim().length > 1 && results.length === 0 && <p className="cm-results empty">Nothing on the map matches.</p>}
    </div>
  )
  // ---------------------------------------------------------------- the report: states that open in place
  // A state's row opens its plants under it (and takes the map to it); a state chosen on the map
  // or in the dropdown opens too. The search finds a state or a plant: a plant found opens its
  // state with only the plants that match.
  // ONE STATE IS OPEN, AND IT IS THE MAP'S (26 Oct'26): the report kept its own SET of open
  // states and added each state chosen on the map, so after A, then B, then C the report still
  // showed A open, and closing it uncovered B, then C. Now the open row IS the map's selected
  // state: choosing one on the map opens it here, opening a row selects it on the map, closing
  // the open row takes the map back to India, and nothing selected means nothing open.
  const [rq, setRq] = useState('')
  // THE CLICKED ROW STAYS UNDER THE POINTER. Choosing a state also changes the rail beside the
  // map (India → the state, with its plant list), and that changes the height of the page ABOVE
  // the report: without this the report jumped out of view the moment a row was clicked.
  const keepInPlace = el => {
    if (!el) return
    const top = el.getBoundingClientRect().top
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const d = el.getBoundingClientRect().top - top
      if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: 'instant' })
    }))
  }
  const toggleState = (n, el) => {
    choose(selState === n ? null : { kind: 'state', id: n })
    keepInPlace(el)
  }
  // the rail and the report are MEMOISED (below), so a click re-renders neither until the deferred
  // selection reaches them; their buttons call the LATEST handlers through this ref, so a memo never
  // holds a stale one (toggleState reads the selection of the render it was made in)
  const act = useRef(null)
  act.current = { choose, toIndia, toReport, toggleState, keepInPlace }
  const on = useMemo(() => ({
    choose: (s, o) => act.current.choose(s, o),
    india: () => act.current.toIndia(),
    report: () => act.current.toReport(),
    toggle: (n, el) => act.current.toggleState(n, el),
    keep: el => act.current.keepInPlace(el),
    light: n => api.current?.light?.(n),        // a by-state row under the pointer lights its state on the map
  }), [])
  // the rail beside the map: the pane for the DEFERRED selection (selView, above)
  const rail = useMemo(() => data && month && (
    <>
      {!selView && <IndiaPane data={data} mode={mode} period={period} month={month} measure={ms} mineMeasure={mineMeasure} minePer={minePeriod} mineSet={mineSet} mineAll={mineAll} stateMines={stateMines} fills={fills}
        onState={n => on.choose({ kind: 'state', id: n })} onPlant={id => on.choose({ kind: 'plant', id })} onMine={id => on.choose({ kind: 'mine', id })}
        onCompany={c => on.choose({ kind: 'company', id: c })} onReport={on.report} onLight={on.light} />}
      {selView?.kind === 'state' && <StatePane name={selView.id} data={data} mode={mode} layers={layers} period={period} month={month} measure={ms} mineMeasure={mineMeasure} minePer={minePeriod}
        stateMines={stateMines} minesIn={mineAll.filter(p => mineState.get(p.id) === selView.id)} fills={fills}
        onPlant={id => on.choose({ kind: 'plant', id })} onMine={id => on.choose({ kind: 'mine', id })} onCompany={c => on.choose({ kind: 'company', id: c })} onIndia={on.india} />}
      {selView?.kind === 'plant' && plantsById.get(selView.id) && <PlantPane p={plantsById.get(selView.id)} data={data} month={month} fills={fills} onIndia={on.india} onState={n => on.choose({ kind: 'state', id: n })} />}
      {selView?.kind === 'mine' && minesById.get(selView.id) && <MinePane p={minesById.get(selView.id)} data={data} state={mineState.get(selView.id)} fills={fills} onIndia={on.india} onCompany={c => on.choose({ kind: 'company', id: c })} />}
      {selView?.kind === 'company' && <CompanyPane code={selView.id} data={data} per={minePeriod} minesOf={mineAll.filter(p => p.subsidiary === selView.id)} onMine={id => on.choose({ kind: 'mine', id })} onIndia={on.india} />}
    </>
  ), [data, month, selView, mode, layers, period, ms, mineMeasure, minePeriod, mineSet, stateMines, fills, mineAll, mineState, plantsById, minesById, on])
  const reportRows = useMemo(() => {
    if (!data || !month) return []
    const t = rq.trim().toLowerCase()
    return Object.entries(data.states).sort((a, b) => (b[1].m[month]?.[6] || 0) - (a[1].m[month]?.[6] || 0)).map(([n, s]) => {
      const all = data.plants.filter(p => p.state === n && p.m?.[month]).sort((a, b) => (b.m[month][6] || 0) - (a.m[month][6] || 0))
      if (!t) return { n, s, open: selStateView === n, plants: all, partial: false }
      const stateHit = n.toLowerCase().includes(t)
      const hits = all.filter(p => `${p.name} ${pretty(p.name)} ${p.genco || ''}`.toLowerCase().includes(t))
      if (!stateHit && !hits.length) return null
      return stateHit ? { n, s, open: selStateView === n, plants: all, partial: false } : { n, s, open: true, plants: hits, partial: hits.length < all.length }
    }).filter(Boolean)
  }, [data, month, rq, selStateView])
  // the report's rows — every state and, opened, its plants — from the same deferred selection
  const reportBody = useMemo(() => data && month && (
    <>
      {reportRows.map(({ n, s, open, plants: ps, partial }) => {
        const v = s.m[month] || []
        return (
          <Fragment key={n}>
            {/* A STATE OPENS IN PLACE (22 Oct'26): its plants appear under it, in the same
                columns — they used to open in a second table below the report, where
                nobody saw them. A click also takes the map to the state.
                THE PLANTS ARE A BOX INSIDE THE TABLE (23 Oct'26): a header naming the
                state, a tinted panel inset from the table's edges with a light border,
                and a gap before the next state — opened, they read as more state rows. */}
            <tr className={`go st${open ? ' open' : ''}${selStateView === n ? ' on' : ''}`} tabIndex={0} aria-expanded={open}
              aria-label={`${open ? 'Close' : 'Open'} ${n}: its plants`}
              onClick={e => on.toggle(n, e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.toggle(n, e.currentTarget) } }}>
              <td><ChevronRight className="cv" aria-hidden="true" /><i className="sw" style={{ background: fills.get(n) || undefined }} /><b>{n}</b></td><td>{s.plants}</td>
              <KtCells v={v} />
            </tr>
            {open && (
              <tr className={`pl-head${!ps.length && !partial ? ' end' : ''}`}>
                <td colSpan={2 + SOURCES.length + 3}><b>Plants in {n}</b><span>{partial ? `${ps.length} of ${s.plants} match the search` : `${ps.length} ${ps.length === 1 ? 'plant' : 'plants'}`}</span></td>
              </tr>
            )}
            {/* the plants' own column names, inside their box (26 Oct'26): scrolled down a
                long state, the report's header was a screen away */}
            {open && ps.length > 0 && (
              <tr className="pl pl-cols" aria-hidden="true">
                <td>Plant</td><td />{SOURCES.map(x => <td key={x[0]}>{x[1]}</td>)}<td className="t">Received</td><td>Consumed</td><td>Closing stock</td>
              </tr>
            )}
            {open && ps.map((p, i) => (
              <tr key={p.id} className={`go pl${i === ps.length - 1 && !partial ? ' end' : ''}${selView?.kind === 'plant' && selView.id === p.id ? ' on' : ''}`} tabIndex={0}
                onClick={e => { on.choose({ kind: 'plant', id: p.id }); on.keep(e.currentTarget) }} onKeyDown={e => { if (e.key === 'Enter') { on.choose({ kind: 'plant', id: p.id }); on.keep(e.currentTarget) } }}>
                <td><b>{pretty(p.name)}</b><small>{[p.genco, p.capacity && `${num(p.capacity, 0)} MW`].filter(Boolean).join(' · ')}</small></td><td />
                <KtCells v={p.m[month]} />
              </tr>
            ))}
            {open && partial && <tr className="pl more end"><td colSpan={2 + SOURCES.length + 3}>{s.plants - ps.length} more plants in {n} — clear the search to see them all</td></tr>}
            {open && <tr className="pl-gap" aria-hidden="true"><td colSpan={2 + SOURCES.length + 3} /></tr>}
          </Fragment>
        )
      })}
      {!reportRows.length && <tr className="cm-rempty"><td colSpan={2 + SOURCES.length + 3}>No state or plant matches &ldquo;{rq}&rdquo;.</td></tr>}
      {data.india.m[month]?.row && !rq && (
        <tr className="tot"><td><b>India</b><small>as CEA totals it</small></td><td>{data.plants.filter(p => p.m?.[month]).length}</td>
          <KtCells v={data.india.m[month].row} /></tr>
      )}
    </>
  ), [data, month, reportRows, selView, selStateView, fills, rq, on])

  // EVERY STATE in one dropdown (22 Oct'26): every state and UT the map draws, A to Z,
  // each with its count for the layer that is on; choosing one flies the map there
  const stateList = STATE_NAMES
  const stateCount = n => (mode === 'plants' ? data?.states[n]?.plants : stateMines[n]?.all) ?? null
  // the map's three controls — in the bar on a wide screen, in the Filters sheet on a phone
  // THE PERIOD FOLLOWS THE LAYER (pass 79): the plants' Monthly / FYTD / Weekly / Daily, or — with the mines or
  // the companies on — Coal India's Daily / MTD / FYTD. One control, the same width either way, so nothing moves
  const mineMode = mode === 'mines' || mode === 'companies'
  const periodCtl = mineMode ? (
    <div className="cm-seg per" role="group" aria-label="Period of the mines' and companies' figures">
      {MINE_PERIODS.map(([k, l]) => <button key={k} className={minePeriod === k ? 'on' : ''} aria-pressed={minePeriod === k} onClick={() => setMinePeriod(k)}>{l}</button>)}
    </div>
  ) : (
    // with no layer on it stays in place, disabled
    <div className={`cm-seg per${layers.plants ? '' : ' off'}`} role="group" aria-label="Period" title={layers.plants ? undefined : 'Switch a layer on'}>
      {PERIODS.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} aria-pressed={period === k} disabled={!layers.plants} onClick={() => setPeriod(k)}>{l}</button>)}
    </div>
  )
  const mineAsOf = data?.mines?.as_of
  const coDay = data?.companies?.days?.[data.companies.days.length - 1]
  // the dates the mines' figures cover — the shading's own window when it is production, else the companies'
  const mineSpan = mineMeasure === 'flagship' ? mineWin(mineAsOf, minePeriod) : coWin(coDay, minePeriod)
  const whenCtl = (
    <label className={`cm-select when${layers.plants || mineMode ? '' : ' off'}`}>
      <span>{mineMode ? (minePeriod === 'day' ? 'Day' : 'Dates') : !layers.plants ? 'Figures' : period === 'month' ? 'Month' : period === 'fytd' ? 'To' : period === 'week' ? 'Week' : 'Day'}</span>
      {mineMode
        ? <output>{mineSpan}</output>
        : !layers.plants
          ? <output>—</output>
          : MONTHLY(period)
            ? <select value={month || ''} onChange={e => setMonth(e.target.value)} aria-label="Month">{(data?.months || []).map(m => <option key={m.id} value={m.id}>{monthName(m.id)}</option>)}</select>
            : <output>{asOf}</output>}
    </label>
  )
  const shadeCtl = (
    <label className="cm-select what">
      <span>Shading</span>
      {mode === 'plants' ? (
        <select value={ms} onChange={e => setMeasure(x => ({ ...x, [period]: e.target.value }))} aria-label="What the shading shows">
          {MEASURES[period].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      ) : mode === 'none' ? <output>Nothing — switch a layer on</output> : (
        <select value={mineMeasure} onChange={e => setMineMeasure(e.target.value)} aria-label="What the shading shows">
          {MINE_MEASURES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      )}
    </label>
  )
  const shadeNow = mode === 'plants' ? `Shading: ${measureLabel}` : mode === 'none' ? 'Switch a layer on to shade the states'
    : `Shading: ${mineLabel(mineMeasure, minePeriod, mineAsOf)}`
  // what the map shows NOW, in one line — on a phone it is the title card's line (the shading is the key's own title)
  const nowLine = layers.plants ? `${PERIODS.find(p => p[0] === period)[1]} · ${asOf}` : mineMode ? `${MINE_PERIODS.find(p => p[0] === minePeriod)[1]} · ${mineSpan}` : 'No layer on'
  // WHICH MINES — ALWAYS ON THE BAR (11 Nov'26: on a phone it lived in the Filters sheet and on a desktop it
  // showed only with the mines on, so the reader never found it). Choosing a set switches the mines on.
  const setCtl = (
    <label className="cm-select set">
      <span>Mines</span>
      <select value={mineSet} onChange={e => pickSet(e.target.value)} aria-label="Which mines to pick out">
        {MINE_SETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
  )
  // the same choice on a phone: three buttons in plain sight, a row of the bar of their own
  const setSeg = (
    <div className="cm-seg cm-set" role="group" aria-label="Coal India's major mines">
      {SET_SHORT.map(([k, l]) => <button key={k} className={mineSet === k ? 'on' : ''} aria-pressed={mineSet === k} onClick={() => pickSet(k)}>{l}</button>)}
    </div>
  )
  // A PHONE SAYS WHAT WAS CHOSEN ON THE MAP ITSELF (16 Nov'26, the user: on a phone a chosen state's or mine's data
  // "opens below the map, and it is not easily known that it opened"). A card takes the key's place at the map's foot
  // — the strip the map already keeps clear for the key, so it covers no mine — with the name, the panel's own
  // headline figure and "Details", which brings the panel below into view. It goes when the choice goes; the key
  // comes back. A chosen marker in that strip is panned clear of it (Engine reveal).
  const STAGE_WORD = { operating: 'Operating mine', closing: 'In final closure', closed: 'Closed before 2009' }
  const selInfo = (() => {
    if (!keyInset || !sel || !data) return null
    const minesFig = name => {
      const v = mineVal(stateMines[name], mineMeasure, minePeriod), u = mineUnit(mineMeasure, minePeriod)
      return { fig: v == null ? '—' : `${mineFmt(v, mineMeasure, minePeriod)} ${u ? (u === 'MT' ? 'MT' : 'kt') : 'mines'}`, what: mineLabel(mineMeasure, minePeriod, mineAsOf) }
    }
    if (sel.kind === 'state') {
      if (mode === 'mines' || mode === 'companies') return { kind: 'State', name: sel.id, ...minesFig(sel.id) }
      const v = stateVal(data.states[sel.id], period, month, ms)
      return { kind: 'State', name: sel.id, fig: v == null ? '—' : `${mt(v)} MT`, what: `${measureLabel} · ${asOf}` }
    }
    if (sel.kind === 'plant' && curPlant) {
      const v = plantVal(curPlant, period, month, ms)
      return { kind: 'Power plant', name: pretty(curPlant.name), fig: v == null ? '—' : `${mt(v)} MT`, what: `${measureLabel} · ${asOf}` }
    }
    if (sel.kind === 'mine' && curMine) {
      const f = flagVal(curMine, minePeriod)
      return { kind: 'Coal mine', name: curMine.label,
        fig: f == null ? (STAGE_WORD[curMine.stage] || 'Coal mine') : minePeriod === 'day' ? `${num(f * 1000, 0)} kt` : `${num(f, 2)} MT`,
        what: f == null ? [curMine.subsidiary || curMine.owner, curMine.area && `${curMine.area} area`].filter(Boolean).join(' · ') : `Production, ${mineWin(mineAsOf, minePeriod)}` }
    }
    if (sel.kind === 'company') {
      const f = coFig(data, sel.id, 'production', minePeriod)
      return { kind: 'Coal company', name: SUB_NAME[sel.id] || sel.id,
        fig: f.pct != null ? `${num(f.pct, 1)}%` : f.v == null ? '—' : `${num(f.v, f.dec ?? 2)} ${f.unit === 'MT' ? 'MT' : 'kt'}`,
        what: f.pct != null ? `of its production target, ${coWin(coDay, minePeriod)}` : `Production, ${coWin(coDay, minePeriod)}` }
    }
    return null
  })()
  // A CHOSEN MINE OR PLANT IS BROUGHT INTO VIEW (16 Nov'26, Engine focus): zoomed out, the map glides in a little,
  // centred on it between the crumb and the phone's card; zoomed in, it only glides over if the point is near an edge or
  // under the card. From the map or from a list (the panel, the "All 75 mines" sheet) alike.
  useEffect(() => {
    if (!sel || (sel.kind !== 'mine' && sel.kind !== 'plant')) return undefined
    const p = sel.kind === 'mine' ? minesById.get(sel.id) : plantsById.get(sel.id)
    if (!p || p.lat == null) return undefined
    const mine = sel.kind === 'mine' ? sel.id : null
    const t = setTimeout(() => api.current?.focus?.(p.lat, p.lon, keyInset ? { top: 56, bottom: 96, mine } : { top: 56, mine }), 60)
    return () => clearTimeout(t)
  }, [sel, keyInset, minesById, plantsById])
  const toDetails = () => {
    const el = railBox.current
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const tools = (
    <div className="cm-tools">
      <Dropdown className="cm-state-dd" label="State" value={selState || 'all'}
        onChange={v => (v === 'all' ? choose(null) : choose({ kind: 'state', id: v }))}
        options={[['all', 'All India', mode === 'plants' ? data?.plants.length : mineTotal], ...stateList.map(n => [n, n, stateCount(n)])]} />
      {find}
    </div>
  )
  return (
    <div className={`cm-module${full ? ' is-full' : ''}`} ref={root}>
      {/* the same title band every module opens with; the state and the search sit in it */}
      {/* A PHONE'S MAP OPENS ON THREE LIGHT ROWS, NOT FIVE (pass 84, the user: "too many toggles up front, the map
          below"): the state and the search share a row, the layers have theirs, Coal India's mines and Filters share
          the last; the title card's line says what the map shows (the Filters card that said it is gone) */}
      <ModuleHead className="cm-mast" title="India coal map" aside={tools}
        meta={!data ? 'Loading…' : phone ? nowLine : `As of ${day(data.days[data.days.length - 1])}`} />

      {/* THE BAR AND THE MAP ARE ONE BLOCK. The bar is pinned under the module bar only while
          the map is on screen: its sticky container is this section, so it leaves with the
          map. (Pinned to the whole module, it stayed stuck over the plant report and the
          footer — the "scroll glitch".) */}
      <section className="cm-wrap" aria-label="India coal map">
      <div className="cm-bar" role="toolbar" aria-label="What the map shows">
        <div className="wrap">
          <div className="cm-layers" role="group" aria-label="Layers">
            {LAYERS.map(([k, l]) => (
              <button key={k} className={`lay ${k}${layers[k] ? ' on' : ''}`} aria-pressed={layers[k]} title={layerCount[k] ? `${layerCount[k]} ${LAYER_NOUN[k]}` : undefined}
                onClick={() => setLayers(x => ({ ...x, [k]: !x[k] }))}><i aria-hidden="true" />{phone ? LAYER_SHORT[k] : l}</button>
            ))}
          </div>
          {phone ? (
            <div className="cm-row2">
              {setSeg}
              {/* what the map shows is on the title card's line and the key's title; the button only opens */}
              <button className="cm-filters sm" onClick={() => setFilters(true)} aria-haspopup="dialog" aria-label={`Filters — ${nowLine}. ${shadeNow}`}>
                <SlidersHorizontal aria-hidden="true" /><span>Filters</span>
              </button>
            </div>
          ) : <>{periodCtl}<i className="cm-br" aria-hidden="true" />{whenCtl}{shadeCtl}{setCtl}</>}
        </div>
      </div>
      {phone && (
        <Sheet open={filters} onClose={() => setFilters(false)} label="What the map shows">
          {close => (
            <div className="cm-filter-sheet">
              <h3>What the map shows</h3>
              <div className="f"><span className="k">Period</span>{periodCtl}</div>
              <div className="f">{whenCtl}</div>
              <div className="f">{shadeCtl}</div>
              <button className="bx-btn primary" onClick={close}>Show the map</button>
            </div>
          )}
        </Sheet>
      )}

      <div className="wrap">
      <div className="cm">
        <div className={`cm-stage${selInfo ? ' has-selcard' : ''}`} ref={stage}>
          {data && month && (
            <Engine fills={fills} plants={plants} mines={mines} companies={companies} selected={sel} onSelect={s => choose(s, { fly: s.kind !== 'mine' && s.kind !== 'plant' ? true : false })}
              onBackground={onBackground} onHover={onHover} focus={focus} zoomEl={zoomEl} readout={readout} onHint={onHint} api={api} freeWheel={full}
              bottomInset={keyInset ? KEY_INSET : 0} onDrill={setDrillPath} />
          )}
          {data && (
            // WHERE YOU ARE, on the map itself: India › a state › a plant or mine — every step a
            // button back to it, and "All India" always one click away
            // THE TRAIL THROUGH THE CLUSTERS IS PART OF IT (pass 79): All India › 340 mines › 89 mines — each an
            // earlier opening to go back to, and "Back" one level at its head (Esc does the same)
            <nav className={`cm-crumb${sel || drillPath.length ? ' deep' : ''}`} aria-label="Where you are on the map">
              {drillPath.length > 0 && <button className="bk" onClick={() => (sel?.kind === 'mine' ? setSel(null) : api.current?.back())} title="Back one level (Esc)"><ArrowLeft aria-hidden="true" />Back</button>}
              <button className={sel || drillPath.length ? '' : 'on'} onClick={toIndia} disabled={!sel && !drillPath.length}>All India</button>
              {drillPath.map((n, k) => {
                const last = k === drillPath.length - 1
                return (
                  <span key={`d${k}`} className="step"><ChevronRight aria-hidden="true" />
                    {last && !(sel?.kind === 'mine') ? <b>{n} mines</b> : <button onClick={() => toDrill(k + 1)}>{n} mines</button>}</span>
                )
              })}
              {crumb.map(c => (
                <span key={`${c.kind}-${c.id}`} className="step"><ChevronRight aria-hidden="true" />
                  {c.go ? <button onClick={c.go}>{c.label}</button> : <b>{c.label}</b>}</span>
              ))}
              {(sel || drillPath.length > 0) && <button className="x" onClick={toIndia} aria-label="Back to all of India" title="Back to all of India"><X /></button>}
            </nav>
          )}
          {!data && <div className="cm-loading">{q.error || q.data?.error ? <span>The coal map is unavailable: {q.error || q.data.detail}</span> : <><i /><i /><i /></>}</div>}
          {data && (
            <>
              <div className="cm-legend" aria-label="Legend">
                <span className="t">{mode === 'plants' ? `${measureLabel}, by state · MT` : mode === 'none' ? 'Switch a layer on to shade the states'
                  : `${mineMeasure === 'flagship' ? 'Super 75 production' : MINE_MEASURES.find(m => m[0] === mineMeasure)[1]}, by state${mineMeasure === 'flagship' ? ` · ${minePeriod === 'day' ? 'thousand t' : 'MT'}` : ''}`}</span>
                <span className="ramp"><i style={{ background: `linear-gradient(90deg, ${rampOf(dark).join(', ')})` }} /></span>
                <span className="ends"><b>0</b><b>{mode === 'plants' ? mt(legendMax) : mineMeasure === 'flagship' ? (minePeriod === 'day' ? num(legendMax * 1000, 0) : num(legendMax, 1)) : num(legendMax, 0)}</b></span>
                <span className="keys">
                  <span><i className="hatch" />{mode === 'plants' ? 'No plants reported' : 'No mines here'}</span>
                  {SHOW_PLANT_DOTS && layers.plants && <span><i className="pk" />Plant, sized by the figure</span>}
                  {SHOW_PLANT_DOTS && layers.plants && !MONTHLY(period) && <span><i className="pk crit" />Critical (CEA)</span>}
                  {layers.mines && <span><i className="mk" />Mine</span>}
                </span>
              </div>
              {/* the phone's card for what was chosen, in the key's place (selInfo, above) — keyed by the choice, so a new
                  one slides up again */}
              {selInfo && (
                <div key={`${sel.kind}-${sel.id}`} className="cm-selcard" role="status" aria-live="polite">
                  <span className="tx" title={`${selInfo.kind}: ${selInfo.name}`}><b>{selInfo.name}</b></span>
                  <span className="fg"><b>{selInfo.fig}</b><small>{selInfo.what}</small></span>
                  <button type="button" className="go" onClick={toDetails} aria-label={`${selInfo.kind} ${selInfo.name}: the details, under the map`}><ArrowDown aria-hidden="true" /><span>Details</span></button>
                </div>
              )}
              <div className="cm-zoom">
                <button onClick={() => api.current?.zoomIn()} aria-label="Zoom in" title="Zoom in (or Ctrl + scroll)"><Plus /></button>
                {/* inside the clusters, − steps OUT a level (pass 80, "no clear way to go out a level") */}
                <button onClick={() => (drillPath.length ? api.current?.back() : api.current?.zoomOut())}
                  aria-label={drillPath.length ? 'Back one level' : 'Zoom out'} title={drillPath.length ? 'Back one level (Esc)' : 'Zoom out'}><Minus /></button>
                <button onClick={() => choose(null)} aria-label="Back to all of India" title="All of India"><LocateFixed /></button>
                <button onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen (Esc)' : 'Full screen'}>{full ? <Minimize2 /> : <Maximize2 />}</button>
              </div>
              <div className="cm-readout" aria-hidden="true"><span ref={readout}>—</span><i /><span ref={zoomEl}>Zoom —</span></div>
              <div className={`cm-hint${hint ? ' on' : ''}`} aria-hidden={!hint}>Hold <kbd>Ctrl</kbd> or <kbd>⌘</kbd> and scroll to zoom — or pinch</div>
              <TipHost apiRef={tipApi} data={data} mode={mode} mineMeasure={mineMeasure} minePer={minePeriod} stateMines={stateMines} plantsById={plantsById} minesById={minesById}
                period={period} month={month} measure={ms} host={stage.current} />
            </>
          )}
        </div>

        <aside className="cm-rail" ref={railBox} aria-live="polite">{rail}</aside>
      </div>
      </div>
      </section>

      {data && month && phone && (
        <ReportCard month={month} row={data.india.m[month]?.row} plants={data.plants.filter(p => p.m?.[month]).length} onOpen={() => setRepOpen(true)} />
      )}
      {data && month && (
        // THE REPORT, AS A REPORT: a header with its month and its download, then ONE card — the
        // columns grouped (where the coal came from | what the month added up to), a zero set
        // back in grey so the figures that are there stand out, India's printed total closing
        // it, and the notes as labelled lines in the card's foot rather than loose small print
        <ReportPlace phone={phone} open={repOpen} onClose={() => setRepOpen(false)} label={`Monthly plant report, ${monthName(month)}`}>
        <section className="wrap cm-report" ref={report} aria-label="Monthly plant report">
          <div className="cm-report-h">
            <div>
              <h3>Monthly plant report</h3>
              <p>{monthName(month)} · &rsquo;000 t</p>
            </div>
            <div className="act">
              <label className="cm-search cm-rsearch">
                <Search aria-hidden="true" />
                <input value={rq} onChange={e => setRq(e.target.value)} placeholder="Find a state or plant" aria-label="Find a state or plant in the report" />
                {rq && <button onClick={() => setRq('')} aria-label="Clear"><X /></button>}
              </label>
              <label className="cm-select">
                <span>Month</span>
                <select value={month} onChange={e => setMonth(e.target.value)} aria-label="Report month">{data.months.map(m => <option key={m.id} value={m.id}>{monthName(m.id)}</option>)}</select>
              </label>
              <button className="cm-btn" onClick={exportCsv} aria-label="Download CSV"><Download /><span className="lg">Download </span>CSV</button>
            </div>
          </div>
          <div className="cm-card">
            <div className="bx-table-wrap">
              {/* with a state open the rest of the report falls back (.has-open), so the open state is
                  found again after a trip up to the map (26 Oct'26) */}
              <table className={`bx-table cm-rtable${reportRows.some(r => r.open) ? ' has-open' : ''}`}>
                <thead>
                  <tr className="grp"><th rowSpan={2}>State</th><th rowSpan={2}>Plants</th><th colSpan={SOURCES.length} data-m="hide">Coal received, by source</th><th colSpan={3} className="t" data-m="nolabel">The month</th></tr>
                  <tr>{SOURCES.map(s => <th key={s[0]}>{s[1]}</th>)}<th className="t">Received</th><th>Consumed</th><th data-short="Closing">Closing stock</th></tr>
                </thead>
                <tbody>{reportBody}</tbody>
              </table>
            </div>
            {/* THE NOTES ARE OFF (27 Oct'26, the user's call: "AI text"); what stays is the one line the
                licences require — WRI's CC BY 4.0 and © OpenStreetMap — with each publisher linked */}
            <p className="cm-credits">Sources: {data.sources.map((x, i) => <Fragment key={x.name}>{i > 0 && ' · '}{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.name}</a> : x.name}</Fragment>)} · Boundaries: Survey of India · Towns: © OpenStreetMap contributors</p>
          </div>
        </section>
        </ReportPlace>
      )}
    </div>
  )
}
