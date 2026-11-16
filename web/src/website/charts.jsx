// SVG charts for the public website. No chart library — the studio carries none, and
// these need exactly four forms: lines (with a crosshair), grouped bars, a stacked
// area, and a sparkline.
//
// RULES THESE ENFORCE (the dataviz method, not taste):
//  * ONE y-axis per chart. Two measures of different scale are two charts, or an
//    indexed comparison on one axis — never a second scale.
//  * Thin marks: 2px lines, hairline grid, bars anchored to the baseline with a
//    2px surface gap. Colour carries identity; text stays in ink.
//  * Every chart answers a hover AND a keyboard: arrow keys move the crosshair.
//  * A gap in the data is a gap in the line. Nothing is interpolated across it.
//  * Quiet finish: an area fades to the baseline, a line's last value is printed at its
//    end in INK beside a dot of the series' colour (text never wears the series colour),
//    and the crosshair names its date on the axis. Pills, halos and gradient bars were
//    tried and read as decoration; they are gone.
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MONTHS } from './format.js'
// The categorical order is the CVD-validated one (dataviz reference palette); the
// light/dark steps differ on purpose. Slot 0 of a FY comparison is the brand accent.
// THE DARK THEME DOES NOT CHANGE THESE (pass 64): a chart always draws its LIGHT colours as SVG attributes
// (and a legend swatch carries its colour in `data-c`), and website-dark.css repaints each of them by
// attribute — the dark steps, the years before DARKER so they recede, navy as LIGHT contrast — so a theme
// switch is instant and no chart has to re-render. A new colour here needs its line there.
export const CAT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
export const CAT_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const ACCENT = '#F1885B'      // BCX orange (bcx.market's, 27 Oct'26; was coral #ee6a2c) — on every chart, THIS fiscal year
export const PREV = '#8fa0b5'        // last fiscal year: cool grey-blue, never a second hue (dark: #6b7380)
export const PREV2 = '#cdd5df'       // the year before that (dark: #3c4149)
export const NAVY = '#1b3a63'        // a single series that is not a year comparison (dark: #d0d6e0)

export function useWidth(ref, fallback = 640, min = 220) {
  const [w, setW] = useState(fallback)
  useEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref, min])
  return w
}

// the width an end label or the axis date chip needs, from its text
const pillW = (text) => String(text).length * 6.5 + 14
// an SVG id may not hold the colons React's useId puts in it
const svgId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '')

/** The fade under an area: the series' colour at the top, nothing at the baseline. */
function Fade({ id, color, top = 0.13 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={color} stopOpacity={top} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </linearGradient>
  )
}

export function niceTicks(lo, hi, count = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { ticks: [0, 1], lo: 0, hi: 1 }
  if (lo === hi) { lo -= Math.abs(lo) * 0.1 || 1; hi += Math.abs(hi) * 0.1 || 1 }
  const raw = (hi - lo) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const e = raw / mag
  const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(+v.toFixed(10))
  return { ticks, lo: start, hi: end }
}

const DAY = 86400000

/** Month or year ticks for a time domain, sized so labels never collide. */
export function timeTicks(lo, hi, width) {
  const span = (hi - lo) / DAY
  const maxTicks = Math.max(3, Math.floor(width / 78))
  const out = []
  const a = new Date(lo)
  if (span > 365 * 3.2) {
    const years = span / 365
    const k = [1, 2, 5, 10, 20].find(x => years / x <= maxTicks) || 25
    let y = Math.ceil(a.getUTCFullYear() / k) * k
    for (; Date.UTC(y, 0, 1) <= hi; y += k) {
      const t = Date.UTC(y, 0, 1)
      if (t >= lo) out.push({ v: t, label: String(y) })
    }
    return out
  }
  if (span > 75) {
    const months = span / 30.4
    const k = [1, 2, 3, 6, 12].find(x => months / x <= maxTicks) || 12
    let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1
    if (m > 11) { m = 0; y += 1 }
    while (m % k !== (k === 12 ? 3 : 0) % k) { m += 1; if (m > 11) { m = 0; y += 1 } }
    for (let t = Date.UTC(y, m, 1); t <= hi; ) {
      const d = new Date(t)
      const mm = d.getUTCMonth()
      out.push({ v: t, label: (mm === 0 || out.length === 0) ? `${MONTHS[mm]}'${String(d.getUTCFullYear()).slice(2)}` : MONTHS[mm] })
      t = Date.UTC(d.getUTCFullYear(), mm + k, 1)
    }
    return out
  }
  const k = [1, 2, 7, 14].find(x => span / x <= maxTicks) || 14
  for (let t = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()); t <= hi; t += k * DAY) {
    const d = new Date(t)
    out.push({ v: t, label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` })
  }
  return out
}

function nearest(sorted, x) {
  let lo = 0, hi = sorted.length - 1
  if (hi < 0) return -1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < x) lo = mid; else hi = mid
  }
  return Math.abs(sorted[lo] - x) <= Math.abs(sorted[hi] - x) ? lo : hi
}

/** Contiguous runs of a series — split at a null or at a gap wider than `breakGap`.
 *  An area is filled per run; one polygon across a gap draws a wedge of data that
 *  does not exist. */
function runs(pts, breakGap) {
  const out = []
  let cur = [], lastX = null
  for (const p of pts) {
    if (p[1] == null || !Number.isFinite(p[1])) { if (cur.length) out.push(cur); cur = []; lastX = null; continue }
    if (breakGap && lastX != null && p[0] - lastX > breakGap) { out.push(cur); cur = [] }
    cur.push(p)
    lastX = p[0]
  }
  if (cur.length) out.push(cur)
  return out
}

function pathOf(pts, sx, sy, breakGap) {
  let d = '', pen = false, lastX = null
  for (const [x, y] of pts) {
    if (y == null || !Number.isFinite(y)) { pen = false; continue }
    if (breakGap && lastX != null && x - lastX > breakGap) pen = false
    d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`
    pen = true
    lastX = x
  }
  return d
}

function Tip({ tip, width }) {
  if (!tip) return null
  const left = Math.min(Math.max(8, tip.x + 14), width - 210)
  return (
    <div className="bx-tip" style={{ left, top: Math.max(0, tip.y) }}>
      <div className="t">{tip.title}</div>
      {tip.rows.map(r => (
        <div className={`r${r.em ? ' em' : ''}`} key={r.label}>
          <span><i className={r.kind || undefined} style={{ background: r.color }} data-c={r.color} />{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
      {tip.note ? <div className="n">{tip.note}</div> : null}
    </div>
  )
}

/**
 * Lines on one axis, with a crosshair.
 * series: [{id, label, color, points: [[x, y]], width, dash, area, labelEnd}]
 */
export function LineChart({
  series, height = 280, xType = 'time', xDomain, xTicks, xFmt, yFmt = String, vFmt,
  yDomain, yZero = false, refs = [], fillBetween, endLabels = true, breakGap,
  annotations = [], ariaLabel, tipNote, unit,
}) {
  const box = useRef(null)
  const width = useWidth(box)
  const uid = svgId(useId())
  const [hover, setHover] = useState(null)
  const live = series.filter(s => s.points && s.points.some(p => p[1] != null))
  // the end pills' text, measured before the margins are set so the widest one fits; on a
  // narrow chart the pill drops its unit (the panel names it) so the plot keeps its width
  const narrow = width < 520
  const endText = s => {
    const pts = s.points.filter(p => p[1] != null)
    const v = pts.reduce((a, b) => (b[0] > a[0] ? b : a))[1]
    return narrow ? yFmt(v) : (s.endText || (vFmt || yFmt)(v))
  }

  const geo = useMemo(() => {
    const xs = [], ys = []
    for (const s of live) for (const [x, y] of s.points) { xs.push(x); if (y != null) ys.push(y) }
    for (const r of refs) ys.push(r.y)
    if (!xs.length) return null
    let [x0, x1] = xDomain || [Math.min(...xs), Math.max(...xs)]
    if (x0 === x1) { x0 -= 1; x1 += 1 }
    let lo = yDomain ? yDomain[0] : Math.min(...ys)
    let hi = yDomain ? yDomain[1] : Math.max(...ys)
    if (yZero) { lo = Math.min(0, lo); hi = Math.max(0, hi) }
    if (!yDomain && !yZero) { const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.05 || 1; lo -= pad; hi += pad }
    const nt = niceTicks(lo, hi, height > 220 ? 5 : 3)
    const yl = yDomain ? yDomain[0] : nt.lo, yh = yDomain ? yDomain[1] : nt.hi
    const labW = Math.max(...nt.ticks.map(t => yFmt(t).length)) * 6.6 + 10
    const pills = live.filter(s => s.labelEnd !== false).map(s => pillW(endText(s)))
    const right = endLabels && pills.length ? Math.max(64, ...pills) : 12
    const m = { l: Math.max(34, labW), r: right, t: unit ? 24 : 14, b: 28 }
    const iw = Math.max(60, width - m.l - m.r), ih = height - m.t - m.b
    const sx = x => m.l + ((x - x0) / (x1 - x0)) * iw
    const sy = y => m.t + ih - ((y - yl) / (yh - yl)) * ih
    const allX = [...new Set(xs)].sort((a, b) => a - b)
    const per = live.map(s => {
      const pts = s.points.filter(p => p[1] != null).sort((a, b) => a[0] - b[0])
      return { s, pts, xs: pts.map(p => p[0]) }
    })
    const ticksX = xTicks || (xType === 'time' ? timeTicks(x0, x1, iw) : [])
    return { m, iw, ih, sx, sy, x0, x1, yl, yh, ticks: nt.ticks.filter(t => t >= yl - 1e-9 && t <= yh + 1e-9), allX, per, ticksX }
  }, [live, width, height, xDomain, yDomain, yZero, refs, xTicks, xType, endLabels, yFmt, vFmt])

  if (!geo) return <div ref={box} className="bx-chart" style={{ height }}><div className="bx-empty">No data in this range.</div></div>
  const { m, iw, ih, sx, sy, x0, x1, ticks, allX, per, ticksX } = geo

  const pick = (i) => {
    if (i < 0 || i >= allX.length) return
    const x = allX[i]
    const span = x1 - x0
    const rows = []
    let topY = Infinity
    for (const { s, pts, xs } of per) {
      const j = nearest(xs, x)
      if (j < 0) continue
      const [px, py] = pts[j]
      if (Math.abs(px - x) > span * 0.03) continue
      rows.push({ label: s.label, color: s.color, value: (vFmt || yFmt)(py), y: py, px })
      topY = Math.min(topY, sy(py))
    }
    setHover({ i, x, rows, topY })
  }
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const x = x0 + ((px - m.l) / iw) * (x1 - x0)
    pick(nearest(allX, x))
  }
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const cur = hover ? hover.i : allX.length - 1
    pick(Math.max(0, Math.min(allX.length - 1, cur + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  // end labels: a pill per line, nudged apart so they never sit on each other
  let ends = []
  if (endLabels) {
    ends = per.filter(p => p.pts.length && p.s.labelEnd !== false).map(({ s, pts }) => {
      const [lx, ly] = pts[pts.length - 1]
      return { id: s.id, color: s.color, x: sx(lx), dotY: sy(ly), y: sy(ly), text: endText(s) }
    }).sort((a, b) => a.y - b.y)
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15
  }

  let between = null
  if (fillBetween) {
    const A = per.find(p => p.s.id === fillBetween.a), B = per.find(p => p.s.id === fillBetween.b)
    if (A && B) {
      const bIdx = new Map(B.pts.map(p => [p[0], p[1]]))
      const pairs = A.pts.filter(p => bIdx.has(p[0])).map(p => [p[0], p[1], bIdx.get(p[0])])
      if (pairs.length > 1) {
        between = 'M' + pairs.map(p => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('L') +
          'L' + pairs.slice().reverse().map(p => `${sx(p[0]).toFixed(1)},${sy(p[2]).toFixed(1)}`).join('L') + 'Z'
      }
    }
  }

  const title = hover ? (xFmt ? xFmt(hover.x) : String(hover.x)) : ''
  const areaOf = (pts) => runs(pts, breakGap).filter(r => r.length > 1).map(r =>
    `M${r.map(p => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('L')}` +
    `L${sx(r[r.length - 1][0]).toFixed(1)},${m.t + ih}L${sx(r[0][0]).toFixed(1)},${m.t + ih}Z`).join('')
  return (
    <div ref={box} className="bx-chart" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} tabIndex={0}
        onMouseMove={onMove} onKeyDown={onKey} onFocus={() => !hover && pick(allX.length - 1)} onBlur={() => setHover(null)}>
        <defs>{per.map(({ s }, i) => s.area ? <Fade key={s.id} id={`${uid}a${i}`} color={s.color} /> : null)}</defs>
        <g className="grid">
          {ticks.map(t => <line key={t} x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} />)}
        </g>
        <g className="axis">
        {/* the unit, over the value axis (27 Oct'26): the panel no longer spells it out */}
        {unit && <text className="unit" x={2} y={11} textAnchor="start">{unit}</text>}
          {ticks.map(t => <text key={t} x={m.l - 8} y={sy(t) + 4} textAnchor="end">{yFmt(t)}</text>)}
          {ticksX.filter(t => t.v >= x0 && t.v <= x1).map(t => (
            <text key={t.v} x={sx(t.v)} y={m.t + ih + 18} textAnchor="middle">{t.label}</text>
          ))}
        </g>
        <line className="base" x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} />
        {refs.map(r => (
          <g className="ref" key={r.label}>
            <line x1={m.l} x2={m.l + iw} y1={sy(r.y)} y2={sy(r.y)} />
            <text x={m.l + iw - 4} y={sy(r.y) - 5} textAnchor="end">{r.label}</text>
          </g>
        ))}
        {annotations.map(a => (
          <g className="ann" key={a.label}>
            <line x1={sx(a.x)} x2={sx(a.x)} y1={m.t} y2={m.t + ih} stroke="currentColor" strokeOpacity=".18" />
            <text x={sx(a.x) + 5} y={m.t + 12}>{a.label}</text>
          </g>
        ))}
        {between && <path d={between} fill={fillBetween.color} opacity={fillBetween.opacity ?? 0.13} />}
        {per.map(({ s, pts }, i) => s.area && pts.length > 1 ? (
          <path key={s.id + 'a'} fill={`url(#${uid}a${i})`} d={areaOf(pts)} />
        ) : null)}
        {per.map(({ s, pts }) => (
          <path key={s.id} d={pathOf(pts, sx, sy, breakGap)} fill="none" stroke={s.color}
            strokeWidth={s.width || 2} strokeDasharray={s.dash || undefined}
            strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {per.map(({ s, pts }) => pts.length === 1 ? (
          <circle key={s.id + 'o'} cx={sx(pts[0][0])} cy={sy(pts[0][1])} r="4" fill={s.color} />
        ) : null)}
        <g className="end">
          {ends.map(e => (
            <g key={e.id}>
              <circle cx={e.x} cy={e.dotY} r="3.5" fill={e.color} stroke="var(--card, #fff)" strokeWidth="2" />
              <text x={Math.min(e.x + 9, m.l + iw + 9)} y={e.y + 4}>{e.text}</text>
            </g>
          ))}
        </g>
        {hover && (
          <g>
            <line className="xhair" x1={sx(hover.x)} x2={sx(hover.x)} y1={m.t} y2={m.t + ih} />
            {hover.rows.map(r => (
              <circle key={r.label} cx={sx(r.px)} cy={sy(r.y)} r="4.5" fill={r.color} stroke="#fff" strokeWidth="2" />
            ))}
            {/* the crosshair names its own date on the axis, over the tick labels */}
            <g className="xchip">
              <rect x={Math.max(m.l - 6, Math.min(sx(hover.x) - pillW(title) / 2, m.l + iw - pillW(title) + 6))} y={m.t + ih + 5}
                width={pillW(title)} height="19" rx="6" />
              <text x={Math.max(m.l - 6 + pillW(title) / 2, Math.min(sx(hover.x), m.l + iw + 6 - pillW(title) / 2))} y={m.t + ih + 18.5} textAnchor="middle">{title}</text>
            </g>
          </g>
        )}
      </svg>
      {hover && hover.rows.length > 0 && (
        <Tip width={width} tip={{ x: sx(hover.x), y: Math.max(0, hover.topY - 70), title, rows: hover.rows, note: tipNote }} />
      )}
    </div>
  )
}

/**
 * Grouped vertical bars. groups: [{id, label, color, values: [], partial: []}]
 * A part period draws at reduced weight with an outline, and the tooltip says so.
 */
// `marks` on a group (27 Oct'26): one value per category drawn as a short line across that bar — a
// target, say — named `markLabel` in the tooltip
// `labelFmt` (27 Oct'26, the user's call): each bar's figure printed over it — only where the label fits its
// bar, so a narrow phone chart drops them rather than overlap
// `lastOnly` (10 Nov'26, the phone): where the figures would have to stand on their bars, print ONE — the
// latest category's, of the last group (this period) — upright over its bar; a tap still shows every figure
export function BarChart({ categories, groups, height = 260, yFmt = String, vFmt, ariaLabel, catTitle, unit, refs = [], markLabel = 'target', labelFmt, lastOnly = false }) {
  const box = useRef(null)
  const width = useWidth(box)
  const [hover, setHover] = useState(null)
  const vals = groups.flatMap(g => g.values.filter(v => v != null))
  if (!vals.length) return <div ref={box} className="bx-chart"><div className="bx-empty">No data.</div></div>
  const marks = groups.flatMap(g => (g.marks || []).filter(v => v != null))
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals, ...marks, ...refs.map(r => r.y))
  const nt = niceTicks(lo, hi, 4)
  const labW = Math.max(...nt.ticks.map(t => yFmt(t).length)) * 6.6 + 10
  const m = { l: Math.max(34, labW), r: 8, t: (unit ? 24 : 12) + (labelFmt ? 14 : 0), b: 28 }
  const iw = Math.max(60, width - m.l - m.r)
  const band = iw / categories.length
  const pad = Math.min(14, band * 0.22)
  const bw = Math.max(2, (band - pad - 2 * (groups.length - 1)) / groups.length)
  // THE FIGURES OVER THE BARS, ONE RULE FOR THE WHOLE CHART (2 Nov'26 — on a phone "716 691", "998 973"
  // ran into each other: a label was allowed 10px wider than its bar, and the next bar is 2px away).
  // In order: the figure as given, upright, if no label is wider than the room beside its neighbour;
  // else a short form (1,047 → 1.05k); else that short form STANDING on its bar (vertical text never
  // collides); and on a bar too thin for even that (<10px), none — the tooltip still has it.
  const lab = (() => {                     // plain arithmetic, not a hook: it sits after an early return
    if (!labelFmt) return null
    const short = v => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('en-IN', { maximumFractionDigits: Math.abs(v) >= 10000 ? 0 : 2 })}k` : labelFmt(v))
    const room = groups.length > 1 ? bw + 2 : band - 6
    const widest = f => Math.max(0, ...groups.flatMap(g => g.values.filter(v => v != null).map(v => f(v).length * 6.2)))
    if (widest(labelFmt) <= room) return { fmt: labelFmt, up: false, need: 0 }
    if (widest(short) <= room) return { fmt: short, up: false, need: 0 }
    if (lastOnly) return { fmt: short, up: false, need: 0, only: categories.length - 1, g: groups.length - 1 }
    if (bw < 10) return null
    return { fmt: short, up: true, need: Math.max(0, widest(short) + 6 - 14) }
  })()
  if (lab?.up) m.t += lab.need
  const ih = height - m.t - m.b
  const sy = y => m.t + ih - ((y - nt.lo) / (nt.hi - nt.lo)) * ih
  const y0 = sy(0)
  const bar = (x, v, w) => {
    const y = sy(v), top = Math.min(y, y0), h = Math.max(1, Math.abs(y0 - y)), r = Math.min(4, w / 2, h)
    return v >= 0
      ? `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`
      : `M${x},${y0}V${top + h - r}Q${x},${top + h} ${x + r},${top + h}H${x + w - r}Q${x + w},${top + h} ${x + w},${top + h - r}V${y0}Z`
  }
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const c = hover ?? categories.length - 1
    setHover(Math.max(0, Math.min(categories.length - 1, c + (e.key === 'ArrowLeft' ? -1 : 1))))
  }
  const every = Math.ceil(categories.length / Math.max(3, Math.floor(iw / 44)))
  return (
    <div ref={box} className="bx-chart" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} tabIndex={0} onKeyDown={onKey}
        onFocus={() => hover == null && setHover(categories.length - 1)} onBlur={() => setHover(null)}>
        <g className="grid">{nt.ticks.map(t => <line key={t} x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} />)}</g>
        <g className="axis">
        {/* the unit, over the value axis (27 Oct'26): the panel no longer spells it out */}
        {unit && <text className="unit" x={2} y={11} textAnchor="start">{unit}</text>}
          {nt.ticks.map(t => <text key={t} x={m.l - 8} y={sy(t) + 4} textAnchor="end">{yFmt(t)}</text>)}
          {categories.map((c, i) => i % every === 0 ? (
            <text key={c + i} x={m.l + band * i + band / 2} y={m.t + ih + 18} textAnchor="middle">{c}</text>
          ) : null)}
        </g>
        {hover != null && <rect x={m.l + band * hover} y={m.t} width={band} height={ih} rx="8" fill="currentColor" opacity=".045" />}
        {/* an ACCENT reference (pass 84 — E-auctions' "Coal India overall") runs BEHIND the bars and their figures,
            so it never strikes through a figure; the plain ones keep their place over the bars */}
        {refs.filter(r => r.accent).map(r => (
          <g key={r.y} className="bref acc">
            <line x1={m.l} x2={m.l + iw} y1={sy(r.y)} y2={sy(r.y)} />
            {r.label && <text x={m.l + iw} y={sy(r.y) - 5} textAnchor="end">{r.label}</text>}
          </g>
        ))}
        {categories.map((c, i) => (
          // the hovered category keeps its full weight and the rest step back
          <g key={c + i} className="bars" opacity={hover == null || hover === i ? 1 : 0.42}>
            {groups.map((g, gi) => {
              const v = g.values[i]
              if (v == null) return null
              const x = m.l + band * i + pad / 2 + gi * (bw + 2)
              const part = g.partial && g.partial[i]
              const mk = g.marks?.[i]
              return <Fragment key={g.id}><path d={bar(x, v, bw)} fill={g.color} opacity={part ? 0.38 : 1}
                stroke={part ? g.color : 'none'} strokeDasharray={part ? '2 2' : undefined} />
                {mk != null && <g className="bmark"><line className="h" x1={x - 3} x2={x + bw + 3} y1={sy(mk)} y2={sy(mk)} /><line x1={x - 3} x2={x + bw + 3} y1={sy(mk)} y2={sy(mk)} /></g>}
                {lab && (lab.only == null || (i === lab.only && gi === lab.g)) && (lab.up
                  ? <text className="blab up" transform={`rotate(-90 ${x + bw / 2 + 3.5} ${(v >= 0 ? sy(v) : y0) - 4})`}
                      x={x + bw / 2 + 3.5} y={(v >= 0 ? sy(v) : y0) - 4} textAnchor="start">{lab.fmt(v)}</text>
                  // the one figure (lastOnly) may be wider than its bar: it stays inside the plot
                  : <text className="blab" x={lab.only == null ? x + bw / 2 : Math.min(x + bw / 2, m.l + iw - lab.fmt(v).length * 3.3)}
                      y={v >= 0 ? sy(v) - 5 : sy(v) + 13} textAnchor="middle">{lab.fmt(v)}</text>)}</Fragment>
            })}
            <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        <line className="base" x1={m.l} x2={m.l + iw} y1={y0} y2={y0} />
        {/* a reference across every bar — e.g. 100% of target — labelled at its right end */}
        {refs.filter(r => !r.accent).map(r => (
          <g key={r.y} className="bref">
            <line x1={m.l} x2={m.l + iw} y1={sy(r.y)} y2={sy(r.y)} />
            {r.label && <text x={m.l + iw} y={sy(r.y) - 5} textAnchor="end">{r.label}</text>}
          </g>
        ))}
      </svg>
      {hover != null && (
        <Tip width={width} tip={{
          x: m.l + band * hover + band / 2, y: 0,
          title: catTitle ? catTitle(hover) : categories[hover],
          rows: groups.filter(g => g.values[hover] != null).flatMap(g => [{
            label: g.label + (g.partial && g.partial[hover] ? ' (part)' : ''), color: g.color,
            value: (vFmt || yFmt)(g.values[hover]) },
            ...(g.marks?.[hover] != null ? [{ label: `${g.label} ${markLabel}`, color: g.color, value: (vFmt || yFmt)(g.marks[hover]) }] : [])]),
        }} />
      )}
    </div>
  )
}

/** GROUPED BARS ON THEIR SIDE (10 Nov'26 — the phone; the user: "graphs and tables abhi bhi bhot badly
 *  represented"): a category a row and one thin bar a group, each bar's figure at its end, so names and
 *  figures read across and never stand on end — seven subsidiaries are seven short rows, not fourteen
 *  slivers with their figures turned sideways. Short names sit to the LEFT of their bars; longer ones,
 *  or a row with an `aside` (a figure and its change on the name's line), sit ABOVE them. `refLine`
 *  ticks one value across every bar (Coal India's overall premium, say). HTML, so a name wraps rather
 *  than collides; every bar carries data-c, so the dark theme repaints it by colour. One scale for all. */
// THE REFERENCE IS ONE LINE (pass 84, the user: "Coal India overall" vanished on the dark site and drew as seven
// short ticks, one a row): one dashed line from the first bar to the last, placed from the bars' own measured track
// (so it sits where a bar of that length would end), in the accent where `refLine.accent` says so
export function GroupBars({ categories, groups, fmt = String, aside, refLine, ariaLabel, unit }) {
  const root = useRef(null)
  const [rl, setRl] = useState(null)
  const vals = groups.flatMap(g => g.values.filter(v => v != null))
  const hi = Math.max(...vals.map(v => Math.abs(v)), refLine?.v ?? 0) || 1
  const rv = refLine?.v
  useLayoutEffect(() => {
    const el = root.current
    if (rv == null || !el) { setRl(null); return undefined }
    const place = () => {
      const trs = el.querySelectorAll('.tr')
      if (!trs.length) return
      const c = el.getBoundingClientRect(), a = trs[0].getBoundingClientRect(), z = trs[trs.length - 1].getBoundingClientRect()
      const x = Math.round(a.left - c.left + a.width * Math.min(1, Math.abs(rv) / hi))
      setRl(o => (o && o.x === x && o.top === Math.round(a.top - c.top) - 5 && o.h === Math.round(z.bottom - a.top) + 10 ? o
        : { x, top: Math.round(a.top - c.top) - 5, h: Math.round(z.bottom - a.top) + 10 }))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [rv, hi, categories.length])
  if (!vals.length) return <div className="bx-chart"><div className="bx-empty">No data.</div></div>
  const at = v => `${Math.max(0, Math.min(100, (Math.abs(v) / hi) * 100))}%`
  const side = !aside && categories.every(c => String(c).length <= 7)
  return (
    <div ref={root} className={`bx-gbars${side ? ' side' : ''}${groups.length > 1 ? ' multi' : ''}${refLine ? ' has-rl' : ''}`} role="img" aria-label={ariaLabel}>
      {/* the unit, over the figures' column — where a vertical chart puts it over its axis */}
      {unit && <span className="un">{unit}</span>}
      {refLine && rl && <em className={`rfl${refLine.accent ? ' acc' : ''}`} aria-hidden="true" style={{ left: rl.x, top: rl.top, height: rl.h }} />}
      {categories.map((c, i) => (
        <div className="row" key={`${c}${i}`}>
          <div className="hd"><span className="l">{c}</span>{aside && <span className="as">{aside(i)}</span>}</div>
          <div className="bs">
            {groups.map(g => {
              const v = g.values[i]
              return (
                <div className="b" key={g.id} title={v == null ? undefined : `${g.label}: ${fmt(v)}`}>
                  <span className="tr">
                    {v != null && <i data-c={g.color} style={{ width: at(v), background: g.color }} className={g.partial?.[i] ? 'part' : undefined} />}
                  </span>
                  <span className={`v${g.muted ? ' mu' : ''}`}>{v == null ? '—' : fmt(v)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Horizontal ranking bars, HTML so long labels wrap instead of colliding. */
export function HBars({ rows, fmt = String, color = '#1b3a63', max }) {
  const top = max ?? Math.max(...rows.map(r => Math.abs(r.value || 0)), 1)
  return (
    <div className="bx-hbars">
      {rows.map(r => (
        <div className="row" key={r.label}>
          <span className="l">{r.label}</span>
          <span className="track">
            <i style={{ width: `${Math.max(0.5, (Math.abs(r.value || 0) / top) * 100)}%`, background: r.color || color }} />
          </span>
          <span className="v">{fmt(r.value)}{r.extra ? <em className={r.extraCls}>{r.extra}</em> : null}</span>
        </div>
      ))}
    </div>
  )
}

/** Stacked areas over 96 fifteen-minute blocks, with an optional line on top.
 *  DRAWN WITH CARE (13 Nov'26, pass 78 — the user: "very basic chart … better looking lines and legends and
 *  selections", same functionality): each band deepens toward its top edge, and that edge is a crisp line of the
 *  band's own colour (the seam between two bands is the lower one's edge, not a white cut); the line rides over
 *  the stack on a halo of the card's colour; the crosshair puts a marker on every edge and names its time on the
 *  axis; the band under the pointer — or the series a legend item names (`focus`) — is lit and the others fall
 *  back; a series switched off (`hidden` on a layer or the line) FOLDS into the stack, every band gliding to its
 *  new place (CSS `d`, where the browser has it), instead of vanishing; the day draws in from midnight once. */
export function StackedBlocks({ layers, line, height = 280, yFmt = String, vFmt, ariaLabel, unit, focus = null }) {
  const box = useRef(null)
  const width = useWidth(box)
  const uid = svgId(useId())
  const [hover, setHover] = useState(null)          // { i, band }
  const n = Math.max(...layers.map(l => l.values.length), line ? line.values.length : 0)
  if (!n) return <div ref={box} className="bx-chart"><div className="bx-empty">No data.</div></div>
  const vis = layers.filter(l => !l.hidden)
  const lineOn = !!line && !line.hidden
  const tot = Array.from({ length: n }, (_, i) => vis.reduce((s, l) => s + (l.values[i] || 0), 0))
  const hi = Math.max(...tot, ...(lineOn ? line.values.filter(v => v != null) : [0]))
  const nt = niceTicks(0, hi, 4)
  const labW = Math.max(...nt.ticks.map(t => yFmt(t).length)) * 6.6 + 10
  const m = { l: Math.max(34, labW), r: 12, t: unit ? 24 : 12, b: 28 }
  const iw = Math.max(60, width - m.l - m.r), ih = height - m.t - m.b
  const sx = i => m.l + (i / (n - 1)) * iw
  const sy = y => m.t + ih - (y / nt.hi) * ih
  const P = (i, v) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`
  // the stack, hidden layers included at zero height, so every path keeps its shape and can glide
  let acc = new Array(n).fill(0)
  const bands = layers.map(l => {
    const base = acc.slice()
    if (!l.hidden) acc = acc.map((a, i) => a + (l.values[i] || 0))
    const top = acc.slice()
    const edge = `M${top.map((a, i) => P(i, a)).join('L')}`
    return { l, base, top, edge, area: `${edge}L${base.map((a, i) => P(i, a)).reverse().join('L')}Z` }
  })
  // a gap stays a gap (nothing is drawn across a missing block); only an unbroken line can glide
  const lineGap = !!line && line.values.some(v => v == null)
  const lineD = !line ? null : lineGap ? pathOf(line.values.map((v, i) => [i, v]), sx, sy) : `M${line.values.map((v, i) => P(i, v)).join('L')}`
  const lineId = line?.id ?? 'line'
  const hh = i => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
  const ticks = [0, 16, 32, 48, 64, 80, 95].filter(i => i < n)
  // which band holds a value at block i (the pointer's height), if any
  const bandAt = (i, v) => bands.find(b => !b.l.hidden && v >= b.base[i] && v < b.top[i])?.l.id ?? null
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - m.l) / iw) * (n - 1))))
    const v = ((m.t + ih - (e.clientY - r.top)) / ih) * nt.hi
    setHover({ i, band: bandAt(i, v) })
  }
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setHover(h => ({ i: Math.max(0, Math.min(n - 1, (h?.i ?? n - 1) + (e.key === 'ArrowLeft' ? -1 : 1))), band: null }))
  }
  const lit = focus ?? hover?.band ?? null
  const cls = id => (lit == null ? '' : lit === id ? ' lit' : ' dim')
  const glide = d => ({ d: `path('${d}')` })      // CSS `d` transitions; the attribute stays for the rest
  const hv = hover?.i
  const tt = hv != null ? hh(hv) : ''
  const chipW = pillW(tt)
  const chipX = hv != null ? Math.max(m.l - 6, Math.min(sx(hv) - chipW / 2, m.l + iw - chipW + 6)) : 0
  return (
    <div ref={box} className="bx-chart bx-stack" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} tabIndex={0}
        onMouseMove={onMove} onKeyDown={onKey} onFocus={() => setHover(h => h ?? { i: n - 1, band: null })} onBlur={() => setHover(null)}>
        <defs>
          {layers.map((l, k) => (
            <linearGradient key={l.id} id={`${uid}g${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={l.color} stopOpacity=".96" />
              <stop offset="1" stopColor={l.color} stopOpacity=".64" />
            </linearGradient>
          ))}
          <clipPath id={`${uid}c`}><rect className="rv" x={m.l - 2} y={0} width={iw + 4} height={m.t + ih + 1} /></clipPath>
        </defs>
        <g className="grid">{nt.ticks.map(t => <line key={t} x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} />)}</g>
        <g className="axis">
        {/* the unit, over the value axis (27 Oct'26): the panel no longer spells it out */}
        {unit && <text className="unit" x={2} y={11} textAnchor="start">{unit}</text>}
          {nt.ticks.map(t => <text key={t} x={m.l - 8} y={sy(t) + 4} textAnchor="end">{yFmt(t)}</text>)}
          {ticks.map(i => <text key={i} x={sx(i)} y={m.t + ih + 18} textAnchor="middle" opacity={hv != null && Math.abs(sx(i) - sx(hv)) < chipW / 2 + 16 ? 0 : 1}>{i === 95 ? '24:00' : hh(i)}</text>)}
        </g>
        <g clipPath={`url(#${uid}c)`}>
          {bands.map((b, k) => (
            <path key={b.l.id} className={`ar${b.l.hidden ? ' off' : ''}${cls(b.l.id)}`} d={b.area} style={glide(b.area)} fill={`url(#${uid}g${k})`} />
          ))}
          {bands.map(b => (
            <path key={`${b.l.id}e`} className={`eg${b.l.hidden ? ' off' : ''}${cls(b.l.id)}`} d={b.edge} style={glide(b.edge)} fill="none" stroke={b.l.color} />
          ))}
          {line && (
            <g className={`ln${lineOn ? '' : ' off'}${lit != null && lit !== lineId ? ' dim' : ''}`}>
              <path className="halo" d={lineD} style={lineGap ? undefined : glide(lineD)} fill="none" />
              <path d={lineD} style={lineGap ? undefined : glide(lineD)} fill="none" stroke={line.color} strokeDasharray={line.dash} />
            </g>
          )}
        </g>
        <line className="base" x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} />
        {hv != null && (
          <g className="hov">
            <line className="xhair" x1={sx(hv)} x2={sx(hv)} y1={m.t} y2={m.t + ih} />
            {bands.filter(b => !b.l.hidden).map(b => (
              <circle key={b.l.id} className={`mk${cls(b.l.id)}`} cx={sx(hv)} cy={sy(b.top[hv])} r={lit === b.l.id ? 4.5 : 3.5} fill={b.l.color} />
            ))}
            {lineOn && line.values[hv] != null && <circle className="mk ln" cx={sx(hv)} cy={sy(line.values[hv])} r="5" fill={line.color} />}
            <g className="xchip">
              <rect x={chipX} y={m.t + ih + 5} width={chipW} height="19" rx="6" />
              <text x={chipX + chipW / 2} y={m.t + ih + 18.5} textAnchor="middle">{tt}</text>
            </g>
          </g>
        )}
      </svg>
      {hv != null && (
        <Tip width={width} tip={{
          x: sx(hv), y: 0, title: `${hh(hv)}–${hh(hv + 1)}`,
          rows: [...(lineOn ? [{ label: line.label, color: line.color, kind: 'ln', em: lit === lineId, value: (vFmt || yFmt)(line.values[hv]) }] : []),
                 ...vis.slice().reverse().map(l => ({ label: l.label, color: l.color, em: lit === l.id, value: (vFmt || yFmt)(l.values[hv]) }))],
        }} />
      )}
    </div>
  )
}

/** A sparkline: shape only, no axis. Its numbers are always printed beside it.
 *  Drawn at its measured width (a stretched viewBox turned the end dot into an ellipse),
 *  with the area fading to its foot. `fill={false}` draws the line alone. */
export function Spark({ values, color = '#1b3a63', height = 34, fill = true, dot }) {
  const box = useRef(null)
  const W = useWidth(box, 200, 40)
  const uid = svgId(useId())
  const v = (values || []).filter(x => x != null)
  if (v.length < 2) return <div ref={box} style={{ height }} />
  const lo = Math.min(...v), hi = Math.max(...v)
  const pad = 5, X = i => pad + (i / (v.length - 1)) * (W - 2 * pad)
  const sy = y => height - 4 - ((y - lo) / (hi - lo || 1)) * (height - 9)
  const pts = v.map((y, i) => `${X(i).toFixed(1)},${sy(y).toFixed(1)}`)
  const ex = X(v.length - 1), ey = sy(v[v.length - 1])
  return (
    <div ref={box} className="spark" style={{ height }}>
      <svg width={W} height={height} aria-hidden="true">
        {fill && <defs><Fade id={`${uid}s`} color={color} top={0.2} /></defs>}
        {fill && <path d={`M${pts.join('L')}L${ex.toFixed(1)},${height}L${pad},${height}Z`} fill={`url(#${uid}s)`} />}
        <path d={`M${pts.join('L')}`} fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={ex} cy={ey} r="2.8" fill={dot || color} stroke="#fff" strokeWidth="1.4" />
      </svg>
    </div>
  )
}

/** A KPI tile's trend, drawn the way the daily letter draws its FYTD-Pro tiles (23 Oct'26):
 *  three faint gridlines with the high, middle and low of the line in a right gutter, a soft
 *  area, and A MARKER AT EVERY READING — seven days read as seven points — the latest in the
 *  accent colour. Each marker names its date and figure on hover. The line draws itself in
 *  when it mounts; the tile remounts it when the period changes (prefers-reduced-motion: off). */
const tick = v => {
  const a = Math.abs(v)
  const d = a >= 100 ? 0 : a >= 10 ? 1 : 2
  return v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const pointDate = (iso, freq) => {
  const [y, m, d] = iso.split('-').map(Number)
  return freq === 'M' ? `${MON[m - 1]}'${String(y).slice(2)}` : `${d} ${MON[m - 1]}`
}

export function TrendSpark({ trend, height = 46, fmt = v => tick(v), color = NAVY, dot = ACCENT, mini = false }) {
  const box = useRef(null)
  const W = useWidth(box, 220, mini ? 40 : 80)
  const uid = svgId(useId())
  const pts = (trend?.points || []).filter(p => p[1] != null)
  if (pts.length < 2) return <div ref={box} className={`tspark${mini ? ' mini' : ''}`} style={{ height }} />
  const v = pts.map(p => p[1])
  const lo = Math.min(...v), hi = Math.max(...v)
  // mini (a phone tile): the same line, markers and high / middle / low lines, in a narrower
  // gutter with smaller labels (23 Oct'26 — without them the tile's line had no scale)
  const gut = mini ? 30 : 40, lw = Math.max(40, W - gut), top = 5, bot = height - 5, mid = (top + bot) / 2
  const lx = lw + (mini ? 4 : 6)
  const X = i => 4 + (i / (pts.length - 1)) * (lw - 8)
  const Y = y => bot - ((y - lo) / (hi - lo || 1)) * (bot - top)
  const xy = pts.map((p, i) => [X(i), hi === lo ? mid : Y(p[1])])
  const d = `M${xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`
  const many = pts.length > 14
  return (
    <div ref={box} className={`tspark${mini ? ' mini' : ''}`} style={{ height }}>
      <svg width={W} height={height} role="img" aria-label={`${trend.label}: ${pts.map(p => `${pointDate(p[0], trend.freq)} ${fmt(p[1])}`).join(', ')}`}>
        <defs><Fade id={`${uid}t`} color={color} top={0.12} /></defs>
        <g className="grid">
          {[top, mid, bot].map(y => <line key={y} x1="0" x2={lw} y1={y} y2={y} />)}
        </g>
        {/* a label that rounds to its neighbour says nothing: a flat line gets one, at its level */}
        <g className="ax">
          {fmt(hi) === fmt(lo)
            ? <text x={lx} y={mid + 3.5}>{fmt(hi)}</text>
            : <>
              <text x={lx} y={top + 3.5}>{fmt(hi)}</text>
              {fmt((hi + lo) / 2) !== fmt(hi) && fmt((hi + lo) / 2) !== fmt(lo) && <text x={lx} y={mid + 3.5} className="m">{fmt((hi + lo) / 2)}</text>}
              <text x={lx} y={bot + 3.5}>{fmt(lo)}</text>
            </>}
        </g>
        <path className="area" d={`${d}L${xy[xy.length - 1][0].toFixed(1)},${bot}L${xy[0][0].toFixed(1)},${bot}Z`} fill={`url(#${uid}t)`} />
        <path className="ln" d={d} pathLength="1" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => {
          const last = i === xy.length - 1
          return (
            <g key={pts[i][0]} className={`pt${last ? ' last' : ''}`} style={{ '--i': i / (xy.length - 1) }}>
              <title>{`${pointDate(pts[i][0], trend.freq)}: ${fmt(pts[i][1])}`}</title>
              <circle cx={x} cy={y} r="8" fill="transparent" />
              <circle className="mk" cx={x} cy={y} r={last ? 3.2 : many ? 1.5 : 2.1} fill={last ? dot : color} stroke={last ? '#fff' : 'none'} strokeWidth={last ? 1.4 : 0} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="bx-legend">
      {items.map(it => (
        <span key={it.label}><i className={it.kind || ''} style={{ background: it.color, color: it.color }} data-c={it.color} />{it.label}</span>
      ))}
    </div>
  )
}
