// MARKET INSIGHTS (#/insights, #/insights/<module>) — India's coal market in six modules:
// an overview, production & offtake, the coal map, plant stocks, coal in electricity,
// imports & prices.
// The coal map (CoalMap.jsx, ADR-0047) is lazy-loaded — it is the one module that is not the
// strip-and-pairs anatomy below, because it is a map rather than a page of figures, but it
// sits in the SAME frame: title band, then the page column. #/insights/mines opens it.
//
// ONE FRAME (22 Oct'26, "the page looks unfinished"): photo head → module bar → a white
// title band with the module's controls → the figures on the soft ground → a closing row.
// The title used to float on the grey and the map ran edge to edge under it — an uneven
// break between two different left edges.
//
// QUIET BY DESIGN. This page was turned down twice: first as "basic", then — once every
// figure and panel carried an icon, a gradient badge, fact chips, a target meter and value
// pills — as cluttered "AI slop". What is left is typography and structure:
//   * four figures on ONE strip split by hairlines — a label, the number, its change, and
//     (where a target is set) its share of target as a plain percentage. No meters;
//   * charts in pairs of identical, level panels, a full-width one where a chart needs it;
//   * no icons, no badges, no chips, no prose.
//
// INDUSTRY DATA, AS PUBLISHED, WITH ITS DATE. Every figure is a public body's own; nothing
// here is a BCX trade, price or volume. The comparisons printed (% of target, the change on
// a period) are computed on the server (payload._supply, compare.py) — the browser only
// lays them out.
//
// Each module is an address of its own, so Back walks between them. The module bar is
// sticky; in "Production & offtake" the Daily / MTD / FYTD switch changes the figures in
// place — same rows, same height. The data centre (#/explorer) stays the library.
//
// PLANT STOCKS IS A MODULE AGAIN (22 Oct'26). It was folded into "Coal in electricity" as one
// withheld panel while its only feed was broken (four withheld figures did not make a page).
// CEA's own daily report now gives it a page's worth: the stock, the status of every plant,
// the critical plants by CEA's categories, and their remarks.
import { Children, Fragment, Suspense, createContext, lazy, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ArrowUpRight, ChartColumn, ChevronLeft, ChevronRight, Factory, Gavel, House, Library, MapIcon, Search, Ship, X, Zap } from 'lucide-react'
import { ACCENT, BarChart, CAT, GroupBars, Legend, LineChart, NAVY, StackedBlocks, TrendSpark, pointDate } from './charts.jsx'
import { Chg, Dropdown, HRail, ModuleHead, PageBand, Seg, Sheet, usePhone } from './ui.jsx'
import { day, month as monthShort, monthLong, num, unitLabel } from './format.js'
import { shortSource } from './sourceLabel.js'
import { PHOTOS, Photo } from './media.jsx'
import { apiUrl, prefetchJson, toTime } from './api.js'
import { SeriesChart, latestOf, seriesHref } from './seriesui.jsx'
import { BANDS, DATA_CENTRE, PHONE_COMPACT } from './flags.js'
import { pretty } from './coalmap/names.js'
import Sources from './Sources.jsx'

// one line icon per module, on the module bar only — the figures themselves carry none
// a phone shows all the modules in ONE row, no sideways scroll: an icon over a one-word name
// six modules since Sources joined (26 Oct'26): "Production" and "Electricity" no longer fit a sixth
// of a 390px bar, so the phone says "Supply" and "Power"; the desktop keeps the full names
// seven since E-auctions (27 Oct'26): "Coal map" is "Map" — at a seventh of a 360px bar it was clipped
const MODULE_SHORT = { overview: 'Overview', supply: 'Supply', auction: 'Auction', map: 'Map', stocks: 'Stocks', power: 'Power', prices: 'Prices', sources: 'Sources' }
const MODULE_ICON = { overview: House, supply: ChartColumn, auction: Gavel, map: MapIcon, stocks: Factory, power: Zap, prices: Ship, sources: Library }
export const MODULES = [
  ['overview', 'Overview'],
  ['supply', 'Production & offtake'],
  ['map', 'Coal map'],
  ['stocks', 'Plant stocks'],
  ['power', 'Coal in electricity'],
  ['prices', 'Imports & prices'],
  // Coal India's e-auctions, month and year to date (27 Oct'26, the user's call — after a sample page);
  // second last, just before Sources (27 Oct'26, later the same day, the user's call — it was third)
  ['auction', 'E-auctions'],
  // the publishers behind every figure — was the #/resources page no navigation reached (26 Oct'26)
  ['sources', 'Sources'],
]
// switched OFF for now (22 Oct'26, the user's call) — the code stays; its address opens Overview
// SOURCES IS OFF TOO (16 Nov'26, the user: "I am being told to remove the sources tab") — Sources.jsx is kept; its
// addresses open the Overview (Website.parse), and the visit total it carried shows on Regulations instead
const HIDDEN = new Set(['prices', 'sources'])
export const SHOWN_MODULES = MODULES.filter(([k]) => !HIDDEN.has(k))
// SWITCHED OFF, CODE KEPT (23 Oct'26, the user's call — "baad me kya pata use aaye"): one line
// each turns them back on
const SHOW_TRADE_TABLES = false        // Overview: India's coal imports and exports, top ten countries
const SHOW_OTHER_PRODUCERS = false     // Production & offtake: Singareni, commercial and captive figures
const SHOW_STOCK_HISTORY = false       // Plant stocks: critical plants and stock against normative, each day
const SHOW_STOCK_WATCH_TABLE = false  // Overview: the three largest generating companies in each stock band (27 Oct'26)
const SHOW_TARGET_TILE = false       // Production & offtake: Coal India's production target as a figure (27 Oct'26)
const SHOW_AUCTION_TABLE = false     // E-auctions: the by-subsidiary table under the two charts (27 Oct'26)
const SHOW_IMPORTS_TABLE = false     // Overview: imported coal as a table with slim bars (27 Oct'26 — a chart now)
const SHOW_TARGET_MET = false        // Production & offtake: the two "target met" tiles (27 Oct'26 — rakes took their place; the share of target is in the production tiles and the company table)
const SHOW_WIDE_COTABLE = false      // Production & offtake: the full-width company table with share-of-target bars (27 Oct'26 — the panel is half width now)
// the coal map carries Leaflet and India's outline: loaded only when its module opens
const loadCoalMap = () => import('./CoalMap.jsx')
const CoalMap = lazy(loadCoalMap)
// PREFETCH ON INTENT (2 Nov'26): the coal map is the heaviest module (its code and a ~600 KB
// payload). Pointing at its tab, or the page going idle, starts both, so a click opens a drawn map.
const warmMap = () => { loadCoalMap().catch(() => {}); prefetchJson(apiUrl('/api/website/coalmap')) }
// a retired module's address opens where its figures went
const ALIAS = { mines: 'map' }

const DAY_MS = 86400000
const CHART_H = 250
const HERO_H = 300
// the Overview's year-by-year chart on a phone: the height that makes its card the producers' card's (pass 84)
const YEAR_CHART_PC = 272
// a phone's charts are a little shorter: the panels stack, so a chart no longer sits level with
// a neighbour, and 250px of a 844px screen is a lot of one chart
// THE PHONE, MADE COMPACT (10 Nov'26, flags.PHONE_COMPACT): a chart card's frame shrinks, category charts lie on
// their side (charts.GroupBars), long tables become rows that open a sheet — and a chart is 180px, not 220
const usePC = () => usePhone() && PHONE_COMPACT
const useChartH = () => { const phone = usePhone(); return phone ? (PHONE_COMPACT ? 180 : 220) : CHART_H }
// a source's short name — the same on a tile, a chart's footer, a phone's card and sheet: sourceLabel.js
const COMPANY = {
  'CIL+SCCL': 'Coal India + Singareni', CIL: 'Coal India (all)', BCCL: 'Bharat Coking Coal', CCL: 'Central Coalfields',
  ECL: 'Eastern Coalfields', MCL: 'Mahanadi Coalfields', NCL: 'Northern Coalfields', SECL: 'South Eastern Coalfields',
  WCL: 'Western Coalfields', SCCL: 'Singareni Collieries',
}
const SUBS = ['BCCL', 'CCL', 'ECL', 'MCL', 'NCL', 'SECL', 'WCL']
const axis = v => num(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)
// a bar's own figure over it (27 Oct'26): fewer decimals as it grows, so it fits its bar
const barLab = v => num(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)
const pctLab = v => `${num(v, 0)}%`
const dateFmt = x => day(new Date(x).toISOString().slice(0, 10))
const lastDays = (s, days) => {
  if (!s?.points?.length) return []
  const end = Date.parse(s.points[s.points.length - 1][0])
  return s.points.filter(([d]) => Date.parse(d) > end - days * DAY_MS)
}
// a series' trend for its tile: the last seven daily readings or twelve monthly ones, one point
// each, ending on the reading the tile prints (the boards' own trends come from libs/website/trend.py)
const trendOf = s => {
  if (!s?.points?.length || s.freq === 'A') return null
  const pts = s.points.filter(p => p[1] != null).slice(s.freq === 'D' ? -7 : -12)
  if (pts.length < 2) return null
  const span = (Date.parse(pts[pts.length - 1][0]) - Date.parse(pts[0][0])) / DAY_MS
  const label = s.freq === 'D' ? (Math.round(span) === pts.length - 1 ? `Last ${pts.length} days` : `Last ${pts.length} readings`) : `Last ${pts.length} months`
  return { label, freq: s.freq, points: pts }
}
const pubName = s => s?.source?.split('—')[0].trim()
// publishers, not reports — the same count the home page's industry band prints
const publishers = data => new Set((data.series || []).map(s => pubName(s))).size

// ------------------------------------------------------------------ atoms
// ON A PHONE A FIGURE IS A COMPACT TILE, TWO TO A ROW, AND A TAP OPENS ALL OF IT (23 Oct'26,
// ADR-0045 28th pass — the user's call). One tile a row ran Production & offtake to nine
// screens. The tile keeps what is read at a glance — the label, the number, how it moved (or
// what it covers), a small trend and its date; a sheet holds the rest: the trend with its axis
// and every reading, the share of target, the source. The desktop's tiles are untouched: the
// phone gets different MARKUP, so the choice is made here, not in CSS.
const KpiOpen = createContext(null)               // set on a phone only: open(figure) shows its sheet
const trendFmt = dec => v => num(v, Math.min(dec, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2))

/** How a figure moved, as every tile prints it: percentage points for a share, a plain count
 *  in ink (more critical plants is not "up" news), otherwise a change chip. */
function ChangeMark({ change, changeUnit = '%', note }) {
  if (change == null) return <span className="na" title={note || undefined}>—</span>
  if (changeUnit === 'pp') return <span className={`chg ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>{change > 0 ? '+' : change < 0 ? '−' : ''}{num(Math.abs(change), 1)} pp</span>
  if (changeUnit === 'n') return <span className="chg flat">{change > 0 ? '+' : change < 0 ? '−' : ''}{num(Math.abs(change), 0)}</span>
  return <Chg v={change} />
}

/** A phone's figure: a button that opens the figure's sheet. Every line keeps a fixed height —
 *  the label two lines, what moved two, the share of target one (in a strip that has one), the
 *  rest one — so a period switch changes the words in a tile and never its size, and nothing
 *  below it moves (scratch/dev/_probe_toggles.py at 390px). */
// A PHONE TILE'S UNIT IS SHORT (13 Nov'26, the user: "the thousand is going out of the cell" on narrower phones). A
// tile is about 150 px across, and "2,420.2 thousand t" ran 31–38 px past it at 375–390 px (and "million t", "lakh t",
// "rakes a day" with it) — the value line clips, so the unit was cut off. On a phone tile: kt, MT, rakes (its label
// says "a day"); the tile's sheet and every desktop tile keep the words. AND THE NUMBER FITS ITS TILE: the tile is a
// size container, and the number's size is the tile's width less the unit's, over the number's own width in ems
// (--nw, digits ~0.6 em, separators ~0.3) — 23 px where it fits, never under 15 (website.css "v82").
// scratch/dev/_probe_kc_units.py, 320–390 px.
const PHONE_UNIT = { kt: 'kt', MT: 'MT', 'thousand t': 'kt', "'000 t": 'kt', 'million t': 'MT', 'rakes a day': 'rakes' }
const phoneUnit = u => PHONE_UNIT[u] ?? unitLabel(u)
// …AND ITS LABEL SHORT (13 Nov'26, the user: "the name is too big for the metric card … use abbreviations like CIL
// production"): on a phone tile only — the sheet it opens and every desktop tile keep the full words
const PHONE_LABEL = {
  'Coal India production': 'CIL production', 'Coal India offtake': 'CIL offtake', 'Production – offtake gap': 'Prod. – offtake',
  'Rakes loaded a day, monthly average': 'Rakes a day, monthly avg', 'Thermal share of demand met': 'Thermal share of demand',
  'Premium over notified price': 'Premium over notified', 'Indigenous coal at plants': 'Indigenous coal',
  'Imported coal at plants': 'Imported coal', 'Thermal PLF, month to date': 'Thermal PLF, MTD',
}
const phoneLabel = l => PHONE_LABEL[l] ?? l
const emWidth = s => [...s].reduce((w, ch) => w + (/[0-9]/.test(ch) ? 0.66 : /[A-Za-z%—₹]/.test(ch) ? 0.7 : 0.34), 0)

// A SWITCH SHOWS WHAT IT CHANGED (16 Nov'26, the user: "when we click the toggles … the transition needs to be better,
// so that something changed is reflected better"). A figure whose value changes shows its new value AT ONCE and its
// tile glows once in the accent; a figure the switch does not change (the plants' stock levels on the Overview) stays
// still — so the eye goes to what moved. (The number counted from the old value to the new for a day; the user, the
// same day: "the number should not go up in the increasing fashion, it should just switch".) Nothing moves.
const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** A number that bumps each time `value` changes (never on the first draw): the key of the tile's one-off glow. */
function usePulse(value) {
  const [n, setN] = useState(0)
  const last = useRef(value)
  useEffect(() => {
    if (last.current !== value && last.current != null && value != null && !calm()) setN(x => x + 1)
    last.current = value
  }, [value])
  return n
}

function KpiCompact({ fig, open }) {
  // `keepSub`: a bare figure that keeps the empty line, because its neighbour period has one (E-auctions' FYTD)
  const { label, value, dec = 0, unit, when, of, change, changeLabel, changeUnit = '%', note, trend, plain, swap, bare, keepSub } = fig
  const sw = swap ? ' bx-swap' : ''
  const txt = value == null ? '—' : num(value, dec)
  const u = phoneUnit(unit)
  // the number's width in ems, and the unit's in px (12 px type, plus the 4 px gap and a little air)
  const fit = { '--nw': Math.max(1, emWidth(txt)).toFixed(2), '--uw': `${Math.round((u || '').length * 6.8 + 8)}px` }
  const pulse = usePulse(value)
  return (
    <button type="button" className="bx-kpi bx-kc" onClick={() => open(fig)} aria-haspopup="dialog">
      <span className="lbl" title={label}>{phoneLabel(label)}</span>
      {pulse > 0 && <i key={pulse} className="bx-pulse" aria-hidden="true" />}
      <span className="val" style={fit} title={`${txt} ${unitLabel(unit)}`}><b>{value == null ? '—' : num(value, dec)}</b><small>{u}</small></span>
      {bare && keepSub && <span className="sub" aria-hidden="true" />}
      {!bare && <span key={`c${swap}`} className={`sub${sw}`}>
        {plain ? plain : <><ChangeMark change={change} changeUnit={changeUnit} note={note} />{changeLabel && <> {changeLabel}</>}</>}
      </span>}
      <span key={`o${swap}`} className={`of${of != null && of >= 100 ? ' met' : ''}${sw}`}>{of != null && <><b>{num(of, 1)}%</b> of target</>}</span>
      {trend !== undefined && <span key={`t${swap}`} className={`sp${sw}`}><TrendSpark mini trend={trend} height={42} fmt={trendFmt(dec)} /></span>}
      <span key={`w${swap}`} className={`when${sw}`}>{when}</span>
    </button>
  )
}

/** The figure's sheet (phone): the whole of what the desktop tile prints, and more room for its
 *  trend — the line with its high, middle and low, then every reading under it, the last one
 *  (the figure above) marked. */
function KpiDetail({ fig }) {
  const { label, value, dec = 0, unit, when, of, change, changeLabel, changeUnit = '%', note, trend, href, plain, source, sourceUrl, bare, aside } = fig
  const fmt = trendFmt(dec)
  const pts = (trend?.points || []).filter(p => p[1] != null)
  return (
    <div className="bx-kd">
      <h3>{label}</h3>
      {when && <p className="when">{when}</p>}
      <p className="val"><b>{value == null ? '—' : num(value, dec)}</b><small>{unitLabel(unit)}</small></p>
      {!bare && <p className="chg-line">
        {plain ? <span>{plain}</span> : <><ChangeMark change={change} changeUnit={changeUnit} note={note} />{changeLabel && <span>{changeLabel}</span>}</>}
      </p>}
      {of != null && <p className={`of${of >= 100 ? ' met' : ''}`}><b>{num(of, 1)}%</b> of the target for the same period</p>}
      {aside && <p className="note">{aside}</p>}
      {change == null && !plain && note && <p className="note">{note}</p>}
      {trend !== undefined && (
        <section className="tr">
          <h4>{trend?.label || 'No trend published'}</h4>
          <TrendSpark trend={trend} height={132} fmt={fmt} />
          {pts.length > 0 && (
            <dl className="pts">
              {pts.map(([d, v], i) => <div key={d} className={i === pts.length - 1 ? 'last' : undefined}><dt>{pointDate(d, trend.freq)}</dt><dd>{fmt(v)}</dd></div>)}
            </dl>
          )}
        </section>
      )}
      {source && (
        <p className="src">Source{' '}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" title={source}>{shortSource(source)}<ArrowUpRight aria-hidden="true" /></a> : <b title={source}>{shortSource(source)}</b>}
        </p>
      )}
      {href && <a className="bx-btn secondary" href={href}>The full series <ArrowRight /></a>}
    </div>
  )
}

/** A strip of figures. On a phone the tiles are compact and drop their source lines, so the
 *  strip names its publishers once, under the tiles; the desktop's strip is exactly as before. */
// GROUPS (16 Nov'26, the user: on the Overview only two of the five figures follow Daily / MTD / FYTD — "put a
// division between the 2 metrics which do change and the 3 which don't"): `groups` = [[count, label, className]…].
// A desktop draws each group under its own label, a rule between them; a phone keeps ONE swipe row with a rule
// between the groups and both labels on one line above it.
function Strip({ five = false, three = false, groups = null, children }) {
  const phone = useContext(KpiOpen) != null
  const n = five ? ' five' : three ? ' three' : ''
  if (!phone && groups) {
    const all = Children.toArray(children).filter(Boolean)
    let at = 0
    return (
      <div className={`bx-kpis strip${n} grouped`} style={{ '--g': groups.map(([c]) => `minmax(0, ${c}fr)`).join(' ') }}>
        {groups.map(([c, label, cls], gi) => {
          const part = all.slice(at, at + c)
          at += c
          return <div key={gi} className={`bx-kgrp${cls ? ` ${cls}` : ''}`} style={{ '--n': c }}><span className="gl">{label}</span>{part}</div>
        })}
      </div>
    )
  }
  if (!phone) return <div className={`bx-kpis strip${n}`}>{children}</div>
  const kids = Children.toArray(children).filter(k => k?.props)
  const srcs = []
  for (const { props: { source, sourceUrl } } of kids) {
    const s = shortSource(source)
    if (s && !srcs.some(x => x[0] === s)) srcs.push([s, sourceUrl])
  }
  const hasOf = kids.some(k => k.props.of != null)
  const sourceLine = srcs.length > 0 && (
    <p className="bx-kc-srcs">Sources:{' '}
      {srcs.map(([s, u], i) => <Fragment key={s}>{i > 0 && ' · '}{u ? <a href={u} target="_blank" rel="noopener noreferrer">{s}</a> : s}</Fragment>)}
    </p>
  )
  // GROUPS ON A PHONE ARE BLOCKS (16 Nov'26, the user: "the division is not easily distinguishable there, the toggles
  // for daily and everything are still over everything"): each group its own block under its heading — the period
  // group's switch IN its heading, its two figures side by side under it, all in view; then a rule, and the levels'
  // block with its own swipe row. The switch sits over exactly what it changes.
  if (groups) {
    const all = Children.toArray(children).filter(Boolean)
    let at = 0
    return (
      <div className={`bx-kpis strip kc rail grouped-ph${n}${hasOf ? ' has-of' : ''}`}>
        {groups.map(([c, label, cls], gi) => {
          const part = all.slice(at, at + c)
          at += c
          return (
            <section key={gi} className={`bx-kgrp-ph${cls ? ` ${cls}` : ''}`}>
              <div className="gl">{label}</div>
              {c <= 2 ? <div className="bx-kc-row">{part}</div> : <HRail label="Figures">{part}</HRail>}
            </section>
          )
        })}
        {sourceLine}
      </div>
    )
  }
  // the phone's figures are ONE SWIPE ROW (2 Nov'26, the user's call): every figure in a line, the next
  // one peeking in, dots under it — not a two-by-three wall the reader must scroll past
  return (
    <div className={`bx-kpis strip kc rail${n}${hasOf ? ' has-of' : ''}`}>
      <HRail label="Figures">{children}</HRail>
      {sourceLine}
    </div>
  )
}

// an inline comparison's label, short enough for four tiles a row: "vs Oct 2025, same days" -> "vs Oct'25",
// "vs FY 2025-26, same days" -> "vs FY25-26" (the full label is the title)
const shortCmp = s => s.replace(/, same days$/, '').replace(/FY (\d{2})(\d{2})-(\d{2})/, 'FY$2-$3').replace(/ (?:19|20)(\d{2})\b/, "'$1")

/** One figure: its label and date, the number, how it moved, its share of target (when it
 *  has one, as a plain percentage) and its trend. `href` opens its full series.
 *  `swap` is the period the figure belongs to: when it changes, the parts that changed (the
 *  date, the number, the line under it, the trend) are remounted and fade up in place — a
 *  quiet cue that the tile now says something else. Nothing moves: opacity and a 3px rise,
 *  never layout (website.css `.bx-swap`, off under prefers-reduced-motion). */
function Kpi(fig) {
  const open = useContext(KpiOpen)
  const pulse = usePulse(fig.value)          // before the phone's early return: a hook is never conditional
  if (open) return <KpiCompact fig={fig} open={open} />
  const { label, value, dec = 0, unit, when, of, change, changeLabel, changeUnit = '%', note, trend, href, plain, source, sourceUrl, swap, bare, inline, aside } = fig
  const sw = swap ? ' bx-swap' : ''
  // INLINE (27 Oct'26): the change beside the number and the share of target (or the plain line)
  // beside the trend's label — no lines of their own, so the tile is as tall as a bare one.
  // `aside`: a short figure for that place that leaves the change where it is (a target met's target)
  const side = inline ? (of != null ? <em className={of >= 100 ? 'met' : undefined}><b>{num(of, 1)}%</b> of target</em> : plain ? <em>{plain}</em> : aside ? <em>{aside}</em> : null) : null
  const body = (
    <>
      {pulse > 0 && <i key={pulse} className="bx-pulse" aria-hidden="true" />}
      <span className="hd"><span className="lbl">{label}</span>{when && <span key={`w${swap}`} className={`when${sw}`}>{when}</span>}</span>
      <span className="val"><b>{value == null ? '—' : num(value, dec)}</b><small>{unitLabel(unit)}</small>
        {/* inline, the comparison's label loses its ", same days" (kept in the title) so it fits one line */}
        {inline && !plain && <span key={`vc${swap}`} className={`vchg${sw}`} title={changeLabel || undefined}><ChangeMark change={change} changeUnit={changeUnit} note={note} />{changeLabel && <small>{shortCmp(changeLabel)}</small>}</span>}</span>
      {/* a figure its source publishes with no comparison says what it covers, in the same
          line a comparison would sit in — so every tile in the strip stays the same height */}
      {/* `bare`: the figure and nothing under it (27 Oct'26 — the line that said what a figure
          covers read as filler; the date is in the tile's head) */}
      {bare || inline ? null : plain ? <span key={`p${swap}`} className={`chg-line${sw}`}><small>{plain}</small></span> : <span key={`c${swap}`} className={`chg-line${sw}`}>
        <ChangeMark change={change} changeUnit={changeUnit} note={note} />
        {changeLabel && <small>{changeLabel}</small>}
      </span>}
      {of != null && !inline && <span key={`o${swap}`} className={`of${of >= 100 ? ' met' : ''}${sw}`} title="Share of the target for the same period"><b>{num(of, 1)}%</b> of target</span>}
      {/* the trend names its span ("Last 7 days", "October, day by day") and ends on the
          figure above; a tile whose trend is missing keeps the same box, so a strip never steps */}
      {trend !== undefined && (
        <span key={`t${swap}`} className={`sp tr${sw}`}>
          <span className={`tr-h${side ? ' split' : ''}`}><span>{trend?.label || 'No trend published'}</span>{side}</span>
          <TrendSpark trend={trend} fmt={trendFmt(dec)} />
        </span>
      )}
      {/* who published this figure — a link out to the publisher (never inside an <a> tile) */}
      {source && (sourceUrl && !href
        ? <a className="src" href={sourceUrl} target="_blank" rel="noopener noreferrer" title={source}>Source: {shortSource(source)}</a>
        : <span className="src" title={source}>Source: {shortSource(source)}</span>)}
    </>
  )
  return href ? <a className={`bx-kpi${inline ? ' inl' : ''}`} href={href}>{body}</a> : <div className={`bx-kpi${inline ? ' inl' : ''}`}>{body}</div>
}

/** A figure from a series: its latest reading, the comparison the server computed for its
 *  cadence (the reading before, the month before, the year before) and its recent shape. */
function SeriesKpi({ s, label }) {
  if (!s) return null
  const st = s.stats || {}
  const r = latestOf(s)
  const c = s.freq === 'D' ? st.dod : s.freq === 'M' ? st.mom : st.yoy
  const pp = s.unit === '%'
  return (
    // inline, as every tab's tiles: the change beside the number, so every strip is one height (13 Nov'26)
    <Kpi label={label || s.title} value={r.value} dec={s.decimals} unit={s.unit} when={r.when} inline
      change={pp ? c?.abs : c?.pct} changeUnit={pp ? 'pp' : '%'}
      changeLabel={c?.base_label ? `vs ${s.freq === 'A' ? 'FY ' : ''}${c.base_label}` : ''}
      trend={s.freq !== 'A' ? trendOf(s) : undefined} href={seriesHref(s.id)} source={s.source} sourceUrl={s.source_url} />
  )
}

// a module's title band (ui.ModuleHead): white, edge to edge, under the module bar
const Head = ModuleHead

/** A chart in a panel. Every panel in a grid has the same anatomy and the same height:
 *  title, unit, a legend row that is always there (so charts side by side start level),
 *  the chart, its source. `legend={false}`: a full-width panel with no neighbour. */
function Panel({ id, title, short, unit, source, sourceUrl, legend, tools, children, className = '' }) {
  // A PHONE'S CARD IS ALL CHART (10 Nov'26, the user: "ek chart ne pura page leliya, iski heading do line me
  // aarahi hai"): its title in one line (`short`, where the desktop's would wrap), its date and its source on
  // ONE line under it, and no footer — the frame took ~200px of a 613px card around a 220px chart
  const pc = usePC()
  if (pc) {
    const src = shortSource(source)
    return (
      <section id={id} className={`bx-in-panel pc ${className}`}>
        <header>
          <h3>{short || title}</h3>
          {(unit || src) && <p className="u">{unit}{unit && src ? ' · ' : ''}{src && <>Source: {sourceUrl
            ? <a href={sourceUrl} target="_blank" rel="noreferrer" title={source}>{src}</a> : <span title={source}>{src}</span>}</>}</p>}
        </header>
        {(legend !== false || tools) && <div className="lg">{legend && (Array.isArray(legend) ? <Legend items={legend} /> : legend)}{tools && <div className="tools">{tools}</div>}</div>}
        <div className="bd">{children}</div>
      </section>
    )
  }
  return (
    <section id={id} className={`bx-in-panel ${className}`}>
      <header><h3>{title}</h3>{unit && <p className="u">{unit}</p>}</header>
      {(legend !== false || tools) && <div className="lg">{legend && (Array.isArray(legend) ? <Legend items={legend} /> : legend)}{tools && <div className="tools">{tools}</div>}</div>}
      <div className="bd">{children}</div>
      {/* the SAME short name as the tiles above (sourceLabel.js); the full one is the title */}
      {source && (
        <footer>
          <span>Source</span>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" title={source}>{shortSource(source)}</a> : <b title={source}>{shortSource(source)}</b>}
        </footer>
      )}
    </section>
  )
}

/** Daily lines over the same window, one axis. */
function Trend({ items, days = 180, fmt, height, unit }) {
  const ch = useChartH()
  const live = items.filter(it => it.s)
  return (
    <LineChart height={height ?? ch} unit={unit} yFmt={axis} vFmt={fmt} xFmt={dateFmt} breakGap={6 * DAY_MS}
      ariaLabel={live.map(it => it.label).join(', ')}
      series={live.map(it => ({ id: it.s.id, label: it.label, color: it.color, area: live.length === 1,
                                points: toTime(lastDays(it.s, days)) }))} />
  )
}

// ------------------------------------------------------------------ the period switch
// One Daily / MTD / FYTD choice drives both pages' production and offtake. India's figures
// are the national coal dashboard's (CMPDI): the day and the year to date AS PUBLISHED; the
// month to date is the year to date it printed on its latest day less the one it printed on
// the last day of the previous month (series.producers) — it publishes no month figure.
const BASES = [['day', 'Daily'], ['mtd', 'MTD'], ['fytd', 'FYTD']]
// the period in words, where a label names it (the Overview's figure groups)
const PERIOD_NAME = { day: 'Daily', mtd: 'Month to date', fytd: 'Financial year to date' }
const PRODUCER_KEYS = ['CIL', 'Singareni', 'Commercial', 'Captive & Others*']

/** THE PERIOD DOCK (phone): once the title card's Daily / MTD / FYTD switch has scrolled away
 *  under the bars, the same switch waits at the foot of the screen, so the period is one tap
 *  away from any figure. It is the same state, so the two can never disagree; it floats over the
 *  page, so showing it moves nothing; and it leaves before the closing row, so it never sits on
 *  the footer. Solid white (a blur on a fixed element re-renders the page under it every frame). */
function PeriodDock({ basis, setBasis }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    // the module's period switch: in its title card, or (the Overview, 16 Nov'26) in the heading of the figures it drives
    const seg = document.querySelector('#insights-body .bx-in-h .bx-seg') || document.querySelector('#insights-body .bx-kgrp-ph.per .bx-seg, #insights-body .bx-kgrp.per .bx-seg')
    const end = document.querySelector('#insights-body .bx-in-more')
    if (!seg || !end || typeof IntersectionObserver === 'undefined') return undefined
    const at = { gone: false, end: false }
    // the header and the module bar cover the top of the screen: under them is out of sight
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        if (e.target === seg) at.gone = !e.isIntersecting && e.boundingClientRect.top < window.innerHeight / 2
        else at.end = e.isIntersecting
      }
      setShow(at.gone && !at.end)
    }, { rootMargin: '-140px 0px 0px 0px' })
    io.observe(seg)
    io.observe(end)
    return () => io.disconnect()
  }, [])
  const host = document.querySelector('.bx') || document.body
  return createPortal(
    <div className={`bx-dock${show ? ' show' : ''}`} aria-hidden={!show} inert={show ? undefined : ''}>
      <Seg value={basis} onChange={setBasis} options={BASES} label="Period" />
    </div>, host)
}

function natBasis(P, basis) {
  const d = new Date(`${P.as_of}T00:00:00`)
  // THE MONTH TO DATE NAMES ITS TRUE SPAN (11 Nov'26). It is the year to date less the last reading of the month
  // before; when that reading is not the month's last day (CMPDI's 30 and 31 Oct'26 were never read — the old
  // cluster was down), the figure runs from the day after it, and "November to 9 Nov" over "30 Oct to 9 Nov" was
  // a label the figure contradicted
  const from = P.mtd_base ? new Date(`${P.mtd_base}T00:00:00`) : null
  if (from) from.setDate(from.getDate() + 1)
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const short = s => day(s).replace(/ \d{4}$/, '')
  // AS ITS DAYS (13 Nov'26, the user: "1st to 9th Nov is more easy to understand" than "November to 9 Nov"):
  // "1–9 Nov'26" — compare.mtd_span says the same on every other tab
  const span = from && from.getMonth() !== d.getMonth() ? `${short(iso(from))} – ${short(P.as_of)}`
    : d.getDate() === 1 ? short(P.as_of) : `1–${short(P.as_of)}`
  return basis === 'day' ? { when: day(P.as_of), plain: 'on the dashboard’s latest day', unit: day(P.as_of) }
    : basis === 'mtd' ? { when: span, plain: P.mtd_base ? `since ${day(P.mtd_base)}` : 'this month', unit: span }
      : { when: `FY ${P.fy}`, plain: `1 April to ${day(P.as_of).replace(/ \d{4}$/, '')}`, unit: `FY ${P.fy} to date` }
}

// the share of India's electricity each source generated, as the Ministry of Coal prints it
const MIX_COLOR = { Coal: NAVY, Lignite: '#5b6e86', Hydro: CAT[0], Nuclear: CAT[3], 'Gas, Naptha & Diesel': CAT[4], Others: CAT[2] }

/** A ring of the published shares, coal first, with each share named beside it. */
function Donut({ rows, height = CHART_H }) {
  const r = 78, w = 22, c = 2 * Math.PI * r
  let at = 0
  const lead = rows[0]
  return (
    <div className="bx-donut" style={{ height }}>
      <svg viewBox="0 0 200 200" role="img" aria-label={rows.map(x => `${x.source} ${num(x.share, 1)}%`).join(', ')}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line-2)" strokeWidth={w} />
        {rows.map(x => {
          const len = ((x.share || 0) / 100) * c
          const seg = <circle key={x.source} cx="100" cy="100" r={r} fill="none" stroke={MIX_COLOR[x.source] || CAT[6]} strokeWidth={w}
            strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-at} transform="rotate(-90 100 100)" />
          at += len
          return seg
        })}
        {lead && <><text x="100" y="98" textAnchor="middle" className="v">{num(lead.share, 1)}%</text>
          <text x="100" y="120" textAnchor="middle" className="l">{lead.source}</text></>}
      </svg>
      <ul>
        {rows.map(x => (
          <li key={x.source}><i style={{ background: MIX_COLOR[x.source] || CAT[6] }} /><span>{x.source}</span><b>{num(x.share, 1)}%</b></li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------------ overview
// India's coal trade by country as a TABLE of numbers (22 Oct'26, the user's call: easier to
// read than bars): rank, country, non-coking, coking, total and the share AS PUBLISHED
// (Koyla Shakti, from CCO's figures). Small exports keep three decimals so none reads as 0.
function CountryTable({ rows }) {
  const dec = v => (v != null && Math.abs(v) < 1 ? 3 : 2)
  const cell = v => (v == null ? '—' : num(v, dec(v)))
  return (
    <div className="bx-table-wrap">
      <table className="bx-table bx-trade-t" data-stack="no">
        <thead><tr><th>#</th><th>Country</th><th>Non-coking</th><th>Coking</th><th>Total</th><th>Share</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.country}>
              <td className="rk">{r.rank}</td><td><b>{r.country}</b></td>
              <td className={r.noncoking === 0 ? 'z' : undefined}>{cell(r.noncoking)}</td>
              <td className={r.coking === 0 ? 'z' : undefined}>{cell(r.coking)}</td>
              <td><b>{cell(r.total)}</b></td><td>{r.share == null ? '—' : `${num(r.share, 1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const fyCat = r => `${r.fy}${r.partial ? '*' : ''}`

// THE SITE'S TWO COLOURS ON A YEAR COMPARISON TOO (27 Oct'26, the user's call — a pale grey-blue beside navy
// looked like another site's chart): the same period a year earlier in navy, this one in the BCX orange
const LAST_YEAR = NAVY
const THIS_YEAR = ACCENT
const RC_NAME = { domestic: 'Domestic', imported: 'Imported', receipt: 'Total received', consumption: 'Total consumed' }
const RC_PHONE = { domestic: 'Domestic', imported: 'Imported', receipt: 'Received', consumption: 'Consumed' }

/** CEA'S MONTHLY STATEMENT, AS IT PRINTS IT (26 Oct'26, the user's call): coal received at the
 *  thermal plants — domestic, imported and in all — and coal consumed, in the latest month or
 *  April to it, each beside the same period a year earlier, as vertical bars (the user's
 *  preference). Under the bars each figure and its change on the year, computed on the server
 *  (series.receipts_from). The switch changes the figures, never the panel's height. */
function Receipts({ R, view, height, phone }) {
  const [ly, cur] = view === 'month' ? [R.periods[0], R.periods[1]] : [R.periods[2], R.periods[3]]
  const names = phone ? RC_PHONE : RC_NAME
  // A PHONE (PHONE_COMPACT): the four rows on their side, each figure at its bar's end and its change on the
  // year on the name's line — the chart IS the figures, so the four tiles under it (158px) are not repeated
  if (phone && PHONE_COMPACT) {
    return (
      <div key={view} className="bx-swap">
        <GroupBars unit="MT" fmt={v => num(v, 2)} ariaLabel={`Coal received and consumed at thermal power plants, ${cur.label} against ${ly.label}, million tonnes`}
          categories={R.rows.map(r => names[r.key])}
          aside={i => (R.rows[i].change[view]?.pct != null ? <Pct v={R.rows[i].change[view].pct} /> : <span className="na">—</span>)}
          groups={[{ id: 'ly', label: ly.label, color: LAST_YEAR, values: R.rows.map(r => r.values[ly.key]), muted: true },
                   { id: 'cur', label: cur.label, color: THIS_YEAR, values: R.rows.map(r => r.values[cur.key]) }]} />
      </div>
    )
  }
  return (
    <>
      <div key={view} className="bx-swap">
        <BarChart labelFmt={barLab} height={height} unit="MT" yFmt={axis} vFmt={v => `${num(v, 2)} MT`}
          ariaLabel={`Coal received and consumed at thermal power plants, ${cur.label} against ${ly.label}`}
          categories={R.rows.map(r => names[r.key])}
          catTitle={i => `${R.rows[i].label} — ${ly.label} and ${cur.label}`}
          groups={[{ id: 'ly', label: ly.label, color: LAST_YEAR, values: R.rows.map(r => r.values[ly.key]) },
                   { id: 'cur', label: cur.label, color: THIS_YEAR, values: R.rows.map(r => r.values[cur.key]) }]} />
      </div>
      <dl key={`f${view}`} className="bx-rc-figs bx-swap">
        {R.rows.map(r => (
          <div key={r.key} className={r.total ? 'tot' : undefined}>
            <dt>{RC_NAME[r.key]}</dt>
            <dd title={`Against ${ly.label}`}><b>{num(r.values[cur.key], 2)}</b>{r.change[view]?.pct != null ? <Pct v={r.change[view].pct} /> : <span className="na">—</span>}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

// worst first: the watch is for the plants running short
const WATCH = ['critical', 'low', 'moderate', 'comfortable']
const WATCH_TOP = 150        // a bar runs to 150% of normative stock; the tick marks 100%

/** ONE BAR FOR STOCK AGAINST NORMATIVE, wherever the page draws it (27 Oct'26 — the stock watch,
 *  the plant list and CEA's summary each had their own): a track to 150% of the normative stock,
 *  the fill in its band's colour, a tick at 100% (the normative stock), a faint line at 25%
 *  (CEA's critical line), and the percentage at its end. The band comes from the server. */
function StockBar({ pct, band, dec = 1, label, className = '' }) {
  const at = v => `${Math.max(0, Math.min(100, (v / WATCH_TOP) * 100))}%`
  return (
    <span className={`bx-sbar ${className}`} role="img" aria-label={label || (pct == null ? 'no figure' : `${num(pct, dec)}% of the normative stock`)}>
      <span className="track">
        <span className="fill" style={{ width: at(pct ?? 0), background: STATUS[band] || STATUS.unreported }} />
        <span className="crit" style={{ left: at(25) }} />
        <span className="norm" style={{ left: at(100) }} />
      </span>
      <b>{pct == null ? '—' : `${num(pct, dec)}%`}</b>
    </span>
  )
}

/** THE COAL STOCK WATCH (26 Oct'26, the user's call — after CEA's plant-wise chart and a "stock
 *  watch" sample): the plants by stock status as a ring (the Plant stocks module's own count of
 *  CEA's plants), and beside it the three largest generating companies in each band. A company
 *  is its plants ADDED UP, on the server (plantstock.genco_watch): its stock against its
 *  normative stock as a bar with a tick at 100%, the stock, the days it lasts at CEA's daily
 *  requirement, its change on the previous report and its PLF this month. */
function StockWatch({ B, band }) {
  const G = B.gencos
  const total = B.bands.reduce((s, b) => s + (b.plants || 0), 0)
  const by = Object.fromEntries(G.bands.map(b => [b.key, b]))
  const prevShort = B.prev ? day(B.prev).replace(/ \d{4}$/, '') : null
  const chg = prevShort ? `Change on ${prevShort}` : 'Change'
  // a phone shows ONE band at a time (`band`, the switch in the panel's head): the four bands lie in
  // one grid cell, so switching changes the rows and never the panel's height
  const one = band != null
  const count = b => (b.companies === 0 ? 'no company'
    : b.companies > b.rows.length ? `the ${b.rows.length} largest of ${b.companies} companies`
      : `${b.companies} ${b.companies === 1 ? 'company' : 'companies'}`)
  return (
    <div className="bx-sw">
      <div className="bx-sw-ring">
        <PlantRing title="Plants by stock status" center={total} centerLabel="plants"
          items={B.bands.map(b => ({ key: b.key, label: b.label, note: b.key === 'critical' ? 'CEA · under 25%' : b.key === 'not_operating' ? '' : b.range,
            value: b.plants, extra: gw(b.capacity_mw), color: STATUS[b.key] }))} />
        {/* the ring is Plant stocks' own count: its home is there, with every plant (one figure, one home) */}
        <a className="bx-sw-more" href="#/insights/stocks">Every plant, in Plant stocks <ArrowRight aria-hidden="true" /></a>
      </div>
      <div className="bx-sw-t">
        <div className="hd" aria-hidden="true">
          <span>Company</span><span>Stock against normative</span><span>Stock <small>’000 t</small></span><span>Days of stock</span><span>{chg}</span><span>PLF</span>
        </div>
        <div className={one ? 'bx-coviews' : undefined}>
        {WATCH.map(k => {
          const b = by[k]
          if (!b) return null
          return (
            <section key={k} className={`grp${one ? ` bx-pane${band === k ? ' on' : ''}` : ''}`} aria-hidden={one && band !== k ? true : undefined}
              aria-label={`${b.label}: ${b.range} of normative`}>
              <h4><i style={{ background: STATUS[k] }} aria-hidden="true" /><b>{b.label}</b><small>{b.range}</small></h4>
              {b.rows.length === 0 && <p className="none">No company in this range on {day(B.as_of)}.</p>}
              {b.rows.map(r => (
                // A COMPANY OPENS ITS PLANTS (27 Oct'26, the user's call): the row is a link to Plant stocks,
                // its list narrowed to the company — #/insights/stocks/<company>
                <a key={r.genco} className="row go" href={`#/insights/stocks/${encodeURIComponent(r.genco)}`} title={`${r.genco}: its plants in Plant stocks`}>
                  <span className="nm"><b>{r.genco}<ArrowRight aria-hidden="true" /></b><small>{r.plants} {r.plants === 1 ? 'plant' : 'plants'} · {r.states.length === 1 ? r.states[0] : `${r.states.length} states`}</small></span>
                  <StockBar className="bar" pct={r.pct} band={k} label={`${r.genco}: stock ${num(r.pct, 1)}% of normative`} />
                  {/* data-l: the phone's label over each figure (the header row is hidden there) */}
                  <span className="n" data-l="Stock ’000 t">{num(r.stock_kt, 0)}</span>
                  <span className="n" data-l="Days">{r.days == null ? '—' : num(r.days, 1)}</span>
                  <span className="n" data-l={prevShort ? `vs ${prevShort}` : 'Change'}>{r.change?.pct != null ? <Pct v={r.change.pct} /> : '—'}</span>
                  <span className="n" data-l="PLF">{r.plf == null ? '—' : `${num(r.plf, 1)}%`}</span>
                </a>
              ))}
            </section>
          )
        })}
        </div>
      </div>
    </div>
  )
}

/** IMPORTED COAL AT THE THERMAL POWER PLANTS, MONTH BY MONTH (27 Oct'26, the user's call — beside the
 *  plants ring, with its own Monthly / FYTD switch; the source is CEA's monthly coal statement, the
 *  "Imported" line of the summary at its end, so it runs to CEA's latest month): this financial
 *  year's months — or April to each — beside the same span a year earlier, each pair as two slim
 *  bars on one scale (this year orange, a year earlier navy, as every year comparison on the site)
 *  and the change. Both views lie in one grid cell, so the switch moves nothing. (It was Koyla
 *  Shakti's all-India months until the same day — kept as series.imports_from — which stop at the
 *  last whole year.) */
/** THE SAME FIGURES AS A CHART (27 Oct'26, the user's call — "better represent", the table's slim
 *  bars read thin): each month this year beside the same month a year earlier as vertical bars,
 *  this year orange, a year earlier navy, each bar's figure over it; the switch makes the bars April
 *  to each month. Under the chart, fixed whichever view: CEA's latest month and April to it, each
 *  with its change on a year earlier. The table is kept, unrendered (SHOW_IMPORTS_TABLE). */
function ImportsChart({ I, view, height }) {
  const [k, kl] = view === 'month' ? ['value', 'ly'] : ['fytd', 'fytd_ly']
  const last = I.rows[I.rows.length - 1]
  const fig = (v, g) => <><b>{v == null ? '—' : num(v, 2)}</b>{g != null ? <Pct v={g} /> : <span className="na">—</span>}</>
  const pc = usePC()
  return (
    <>
      <div key={view} className="bx-swap">
        <BarChart labelFmt={barLab} lastOnly={pc} height={height} unit="MT" yFmt={axis} vFmt={v => `${num(v, 2)} MT`}
          ariaLabel={`Imported coal received at thermal power plants, ${view === 'month' ? 'each month' : 'April to each month'}, FY ${I.fy} against FY ${I.prev_fy}`}
          categories={I.rows.map(r => r.short.slice(0, 3))}
          catTitle={i => `${view === 'month' ? '' : 'April to '}${I.rows[i].label}, and a year earlier`}
          groups={[{ id: 'ly', label: `FY ${I.prev_fy}`, color: LAST_YEAR, values: I.rows.map(r => r[kl]) },
                   { id: 'cur', label: `FY ${I.fy}`, color: THIS_YEAR, values: I.rows.map(r => r[k]) }]} />
      </div>
      {last && (
        <dl className="bx-rc-figs two">
          <div><dt>{last.label}</dt><dd title={`Against ${last.label.replace(/\d{4}$/, y => y - 1)}`}>{fig(last.value, last.change_pct)}</dd></div>
          <div className="tot"><dt>April to {last.label.replace(/ \d{4}$/, '')}</dt><dd title="Against the same months a year earlier">{fig(last.fytd, last.fytd_change_pct)}</dd></div>
        </dl>
      )}
    </>
  )
}

function ImportsTable({ I, view, phone }) {
  const rows = I.rows
  const pane = v => {
    const [k, kl, kc] = v === 'month' ? ['value', 'ly', 'change_pct'] : ['fytd', 'fytd_ly', 'fytd_change_pct']
    const top = Math.max(1e-9, ...rows.flatMap(r => [r[k] || 0, r[kl] || 0]))
    const w = x => `${Math.max(0, Math.min(100, ((x || 0) / top) * 100))}%`
    return (
      <div key={v} className={`bx-pane${view === v ? ' on' : ''}`} aria-hidden={view !== v}>
        <table className="bx-cot bx-imp" data-stack="no">
          <thead><tr>
            <th className="co">{v === 'month' ? 'Month' : 'April to'}</th>
            {!phone && <th className="bb" aria-hidden="true" />}
            <th className="v">{phone ? I.fy.replace(/^\d{2}/, '') : `FY ${I.fy}`}</th><th className="v ly">{phone ? I.prev_fy.replace(/^\d{2}/, '') : `FY ${I.prev_fy}`}</th><th className="v c">Change</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.month}>
                <td className="co"><b>{r.short}</b></td>
                {!phone && <td className="bb"><span className="ib2"><i className="c" style={{ width: w(r[k]) }} /><i className="l" style={{ width: w(r[kl]) }} /></span></td>}
                <td className="v">{r[k] == null ? <span className="z">—</span> : num(r[k], 2)}</td>
                <td className="v ly">{r[kl] == null ? <span className="z">—</span> : num(r[kl], 2)}</td>
                <td className="v c">{r[kc] != null ? <Pct v={r[kc]} /> : <span className="na">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <div className="bx-table-wrap"><div className="bx-coviews">{pane('month')}{pane('fytd')}</div></div>
}

function Overview({ data, basis, setBasis }) {
  const P = data.boards?.producers
  const Y = data.boards?.yoy
  const T = data.boards?.trade_countries
  const nb = P ? natBasis(P, basis) : null
  const prow = key => P?.rows.find(r => r.key === key)
  const k = (key, m, label) => {
    const c = prow(key)?.[m]
    return <Kpi key={key + m} label={label} value={c?.[basis]} dec={2} unit="MT" when={nb?.when} bare
      trend={c?.trend?.[basis] ?? null} swap={basis} source={P?.source_short} sourceUrl={P?.source_url} />
  }
  // INDIGENOUS AND IMPORTED COAL, FROM CEA's daily coal stock report (Koyla Shakti no longer feeds them,
  // 23 Oct'26). Until 12 Nov'26 they followed the period and switched to coal RECEIVED under MTD / FYTD.
  const PS = data.boards?.plant_split
  // THE THREE PLANT TILES ARE LEVELS, WHATEVER THE PERIOD (12 Nov'26, the data review: "do not mix 9 Nov stock
  // levels with Sep flow receipts under an MTD/FYTD selector"). Under MTD and FYTD these tiles used to switch to
  // coal RECEIVED in CEA's latest month (September) — another measure and another date under the same label.
  // A stock has no month to date: each tile shows the stock at the plants on CEA's latest daily report, and its
  // own date says so. The receipts keep their own chart, labelled with their month.
  const cea = PS?.day
  const split = cea && {
    when: day(cea.as_of), plain: 'In stock at thermal power plants',
    d: cea.domestic, i: cea.imported, td: cea.trend?.domestic ?? null, ti: cea.trend?.imported ?? null, src: cea,
  }
  const ST = data.boards?.plant_stock_total?.day
  const stockWhen = ST && day(ST.as_of)
  const yrows = Y?.rows || []
  const part = yrows.find(r => r.partial)
  const legend = [{ label: 'Production', color: NAVY }, { label: 'Offtake', color: ACCENT }]
  // FOUR CHARTS IN THREE PLACES (26 Oct'26, the user's call): India year by year and this period
  // by producer are ONE panel with a switch again (they were two, side by side, from 23 Oct);
  // beside it CEA's coal received and consumed at the plants; under both, the coal stock watch.
  const PRODUCER_BARS = [['CIL', 'Coal India'], ['Singareni', 'Singareni'], ['Commercial', 'Commercial'], ['Captive & Others*', 'Captive & others']]
  const [chartView, setChartView] = useState('year')
  const byProducer = chartView === 'producer'
  const [rcView, setRcView] = useState('month')
  const [swBand, setSwBand] = useState('critical')      // the stock watch's band, on a phone
  const [impView, setImpView] = useState('month')       // India's imports: each month, or April to it
  const IM = data.boards?.imports
  const R = data.boards?.receipts
  const B = data.boards?.plant_stocks
  const phone = useContext(KpiOpen) != null
  const pc = phone && PHONE_COMPACT
  const ch = useChartH()
  return (
    <>
      <Head title="Market overview" meta={P ? `As of ${day(P.as_of)}` : ''}
        aside={null} />
      {phone && <PeriodDock basis={basis} setBasis={setBasis} />}
      <div className="wrap bx-in-main">
      {/* TWO GROUPS (16 Nov'26): the switch's two figures under the period it shows, then the plants' three levels,
          which are the latest reading whatever the period */}
      {/* THE SWITCH SITS OVER WHAT IT CHANGES (16 Nov'26, the user: "the toggles are on the right but production and
          offtake is on the left — very confusing"): on a desktop the Daily / MTD / FYTD switch is in the heading of
          the two figures it drives, not at the far end of the title card over the plants' levels it does not touch;
          a phone keeps it in the title card, directly above its one row (and the dock) */}
      <Strip five groups={[
        // a phone too, since 16 Nov'26 ("the toggles for daily and everything are still over everything"): the switch
        // under this heading, the two figures under it — the plants' levels a block of their own below a rule
        [2, <><span className="gt">India&rsquo;s production and offtake</span><Seg value={basis} onChange={setBasis} options={BASES} label="Period" /></>, 'per'],
        [3, <span className="gt"><b>Latest</b> · coal at thermal power plants</span>, 'lvl'],
      ]}>
        {k('Total(Coal)', 'production', 'India production')}
        {k('Total(Coal)', 'offtake', 'India offtake')}
        <Kpi label="Thermal plant coal stock" value={ST?.value} dec={2} unit="MT" when={stockWhen} bare
          trend={ST?.trend ?? null} source={ST?.source_short} sourceUrl={ST?.source_url} />
        {/* one line each, so the five figures sit level (a two-line label pushed its figure down) */}
        <Kpi label="Indigenous coal at plants" value={split?.d} dec={2} unit="MT" when={split?.when} bare
          trend={split?.td ?? null} source={split?.src?.source_short} sourceUrl={split?.src?.source_url} />
        <Kpi label="Imported coal at plants" value={split?.i} dec={2} unit="MT" when={split?.when} bare
          trend={split?.ti ?? null} source={split?.src?.source_short} sourceUrl={split?.src?.source_url} />
      </Strip>
      <div className="bx-in-grid">
        <Panel title={byProducer ? 'India’s production and offtake, by producer' : 'India’s production and offtake, year by year'} legend={legend}
          short={byProducer ? 'Production & offtake, by producer' : 'Production & offtake, by year'}
          source={byProducer ? P?.source : 'Coal Controller’s Organisation · Ministry of Coal'}
          sourceUrl={byProducer ? P?.source_url : 'https://coal.gov.in/major-statistics/production-and-supplies'}
          unit={byProducer ? nb?.unit : yrows.length ? `FY ${yrows[0].fy} to ${yrows[yrows.length - 1].fy}${part ? ` (to ${day(part.as_of)})` : ''}` : ''}
          tools={<span className="bx-chart-tog"><Seg small value={chartView} onChange={setChartView} options={[['year', 'Year by year'], ['producer', 'By producer']]} label="Chart" /></span>}>
          {byProducer && pc
            ? P && <div key={`p${basis}`} className="bx-swap"><GroupBars unit="MT" fmt={barLab} ariaLabel={`India's coal production and offtake by producer, ${nb?.unit}, million tonnes`}
                categories={PRODUCER_BARS.map(([, l]) => l)}
                groups={[{ id: 'p', label: 'Production', color: NAVY, values: PRODUCER_BARS.map(([key]) => prow(key)?.production?.[basis] ?? null) },
                         { id: 'o', label: 'Offtake', color: ACCENT, values: PRODUCER_BARS.map(([key]) => prow(key)?.offtake?.[basis] ?? null) }]} /></div>
            : byProducer
            ? P && <div key={`p${basis}`} className="bx-swap"><BarChart labelFmt={barLab} height={ch} unit="MT" yFmt={axis} vFmt={v => `${num(v, 2)} MT`} ariaLabel={`India's coal production and offtake by producer, ${nb?.unit}`}
                categories={PRODUCER_BARS.map(([, l]) => l)}
                catTitle={i => `${PRODUCER_BARS[i][1]} — ${nb?.unit}`}
                groups={[{ id: 'p', label: 'Production', color: NAVY, values: PRODUCER_BARS.map(([key]) => prow(key)?.production?.[basis] ?? null) },
                         { id: 'o', label: 'Offtake', color: ACCENT, values: PRODUCER_BARS.map(([key]) => prow(key)?.offtake?.[basis] ?? null) }]} /></div>
            // ON A PHONE THE YEARS' CHART IS AS TALL AS THE PRODUCERS' (pass 84, the user: the card grew 75 px on
            // switching to "By producer" — 348 vs 423 px, _probe_yearcard.py): the switch changes the chart, never the card
            : yrows.length > 0 && <BarChart labelFmt={barLab} lastOnly={pc} height={pc ? YEAR_CHART_PC : ch} unit="MT" yFmt={axis} vFmt={v => `${num(v, 1)} MT`} ariaLabel="India's coal production and offtake by financial year"
              // A YEAR CCO HAS NOT FINALISED IS PROVISIONAL, AND SAYS SO (12 Nov'26, the data review: FY 2025-26's
              // 1,043.63 — the Ministry's twelve monthly figures added — against ~1,039 in another statement):
              // the bar keeps the monthly figures as published, marked provisional until CCO's final year is out
              categories={yrows.map(r => (r.basis === 'msg' ? `${r.fy} prov.` : r.fy))}
              catTitle={i => `FY ${yrows[i].fy}${yrows[i].partial ? `, to ${day(yrows[i].as_of)}` : yrows[i].basis === 'msg' ? ', provisional: the Ministry of Coal’s 12 monthly figures added' : ''}`}
              groups={[{ id: 'p', label: 'Production', color: NAVY, values: yrows.map(r => r.production ?? null) },
                       { id: 'o', label: 'Offtake', color: ACCENT, values: yrows.map(r => r.offtake ?? null) }]} />}
        </Panel>
        {R && (
          <Panel title="Coal received and consumed at thermal power plants" short="Coal received & consumed at plants" unit={R.periods[1].label}
            source={R.source} sourceUrl={R.file || R.source_url}
            legend={rcView === 'month' ? [{ label: R.periods[0].label, color: LAST_YEAR }, { label: R.periods[1].label, color: THIS_YEAR }]
              : [{ label: R.periods[2].label, color: LAST_YEAR }, { label: R.periods[3].label, color: THIS_YEAR }]}
            tools={<span className="bx-chart-tog"><Seg small value={rcView} onChange={setRcView} options={[['month', 'Latest month'], ['fytd', 'April to date']]} label="Period" /></span>}>
            {/* the figures under its bars take the room the left panel's two-line note does, so on a
                wide screen its chart is that much shorter and the two panels end level */}
            <Receipts R={R} view={rcView} height={phone ? ch : ch - 64} phone={phone} />
          </Panel>
        )}
        {SHOW_STOCK_WATCH_TABLE && B?.gencos && (
          <Panel className="wide" title="Coal stock watch — generating companies" legend={false} source={B.source} sourceUrl={B.source_url}
            unit={day(B.as_of)}
            tools={phone ? <Seg small value={swBand} onChange={setSwBand} options={WATCH.map(k => [k, BAND_LABEL[k]])} label="Band" /> : null}>
            <StockWatch B={B} band={phone ? swBand : null} />
          </Panel>
        )}
        {/* THE RING ALONE, AND INDIA'S IMPORTS BESIDE IT (27 Oct'26, the user's call): the stock watch's
            company table is off (SHOW_STOCK_WATCH_TABLE) — the ring stays, each status a link to Plant
            stocks narrowed to it — and the right half is India's coal imports, month by month */}
        {B?.bands && (
          <Panel className="bx-ow-ring" title="Thermal power plants by coal stock" short="Plants by coal stock" unit={day(B.as_of)} legend={false} source={B.source} sourceUrl={B.source_url}>
            <div className="bx-sw-ring">
              <PlantRing name="Plants by stock status" center={B.bands.reduce((s, b) => s + (b.plants || 0), 0)} centerLabel="plants"
                items={B.bands.map(b => ({ key: b.key, label: b.label, note: b.key === 'critical' ? 'CEA · under 25%' : b.key === 'not_operating' ? '' : b.range,
                  value: b.plants, extra: gw(b.capacity_mw), color: STATUS[b.key],
                  href: WATCH.includes(b.key) ? `#/insights/stocks/${b.key}` : undefined, hrefTitle: `${b.label} plants, in Plant stocks` }))} />
              <a className="bx-sw-more" href="#/insights/stocks">Every plant, in Plant stocks <ArrowRight aria-hidden="true" /></a>
            </div>
          </Panel>
        )}
        {IM && (
          <Panel title="Imported coal at thermal power plants" short="Imported coal at plants" source={IM.source} sourceUrl={IM.source_url}
            unit={impView === 'month' ? 'Each month' : 'April to each month'}
            legend={[{ label: `FY ${IM.prev_fy}`, color: LAST_YEAR }, { label: `FY ${IM.fy}`, color: THIS_YEAR }]}
            tools={<span className="bx-chart-tog"><Seg small value={impView} onChange={setImpView} options={[['month', 'Monthly'], ['fytd', 'FYTD']]} label="Period" /></span>}>
            {SHOW_IMPORTS_TABLE ? <ImportsTable I={IM} view={impView} phone={phone} /> : <ImportsChart I={IM} view={impView} height={phone ? ch : 322} />}
          </Panel>
        )}
        {SHOW_TRADE_TABLES && <>
          <Panel title="India’s coal imports, top ten countries" unit={T ? `FY ${T.fy} · million tonnes · share of India’s imports, as published` : ''} source={T?.source} sourceUrl={T?.source_url} legend={false}>
            {T?.imports?.length > 0 && <CountryTable rows={T.imports} />}
          </Panel>
          <Panel title="India’s coal exports, top ten countries" unit={T ? `FY ${T.fy} · million tonnes · share of India’s exports, as published` : ''} source={T?.source} sourceUrl={T?.source_url} legend={false}>
            {T?.exports?.length > 0 && <CountryTable rows={T.exports} />}
          </Panel>
        </>}
      </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ production & offtake
// Eight figures (Coal India and Singareni from Coal India's dashboard; commercial and captive
// mines from the national dashboard), then Coal India company by company with its targets, then
// the coal each producer sends to each consuming industry. Every figure as published.

/** A change as quiet coloured text — an arrow and a percentage, no pill — for tables. */
function Pct({ v, quiet = false }) {
  const d = v > 0 ? 'up' : v < 0 ? 'down' : 'flat'
  // quiet: a growth on a small figure (the server says which), set in grey, not up/down colour
  return <span className={`pct ${d}${quiet ? ' quiet' : ''}`}>{v > 0 ? '↑' : v < 0 ? '↓' : '·'} {num(Math.abs(v), 1)}%</span>
}

/** One figure a cell, and under it, on one quiet line, its share of target and its change. */
// THE PHONE'S COMPANY TABLE SAYS LESS (13 Nov'26, the user: "the production number, the target percentage and the change
// is too much for phone … only show percent up or down"): a figure and its change, one line under it — the share of
// target is the desktop table's and the tile's sheet's. Each row is a line shorter, so the card is.
function FigCell({ c, dec }) {
  if (!c || c.value == null) return <td className="fc"><span className="v"><b className="z">—</b></span><span className="sub">not published</span></td>
  return (
    <td className="fc">
      <span className="v"><b>{num(c.value, dec)}</b></span>
      <span className="sub">
        {c.change_pct != null ? <Pct v={c.change_pct} /> : <span className="na" title={c.note || 'no comparison'}>—</span>}
      </span>
    </td>
  )
}

/** COAL INDIA, COMPANY BY COMPANY, AS A CHART (26 Oct'26, the user's call): the same figures as
 *  the table — Coal India's own total as two figures, then each subsidiary's production and
 *  offtake as bars on ONE scale, its target a tick across its bar, the figure and its share of
 *  target at the bar's end. A period change slides the bars; the panel keeps its height. */
function CompanyChart({ b, order, unitShort }) {
  const cil = order.find(r => r.company === 'CIL')
  const subs = order.filter(r => r.company !== 'CIL')
  const M = [['production', 'Production'], ['offtake', 'Offtake']]
  const max = Math.max(1e-9, ...subs.flatMap(r => M.flatMap(([m]) => [r[m]?.value, r[m]?.target])).filter(v => v != null))
  const pc = v => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  const fig = (c) => (c?.value == null ? '—' : num(c.value, b.decimals))
  return (
    <div className="bx-cochart">
      <div className="tot">
        {M.map(([m, l]) => {
          const c = cil?.[m]
          return (
            <div key={m} className="fig">
              <span className="k">Coal India {l.toLowerCase()} <small>all eight subsidiaries</small></span>
              <span className="v"><b>{fig(c)}</b><small>{unitShort}</small></span>
              <span className="sub">
                {c?.of_target != null && <span className={`ofp${c.of_target >= 100 ? ' met' : ''}`}>{num(c.of_target, 1)}% of target</span>}
                {c?.of_target != null && <i aria-hidden="true">·</i>}
                {c?.change_pct != null ? <Pct v={c.change_pct} /> : <span className="na" title={c?.note || undefined}>no comparison</span>}
              </span>
            </div>
          )
        })}
      </div>
      <p className="lgd" aria-hidden="true"><span><i className="p" />Production</span><span><i className="o" />Offtake</span><span><i className="t" />Target</span></p>
      <ul className="bars">
        {subs.map(r => (
          <li key={r.company}>
            <span className="nm"><b>{r.company}</b><small>{COMPANY[r.company]}</small></span>
            <span className="rows">
              {M.map(([m, l]) => {
                const c = r[m]
                return (
                  <span key={m} className={`bar ${m}`} role="img"
                    aria-label={`${COMPANY[r.company]} ${l.toLowerCase()}: ${fig(c)} ${unitShort}${c?.of_target != null ? `, ${num(c.of_target, 1)}% of target` : ''}`}>
                    <span className="track">
                      <span className="fill" style={{ width: pc(c?.value ?? 0) }} />
                      {c?.target != null && <span className="tgt" style={{ left: pc(c.target) }} />}
                    </span>
                    <span className="val"><b>{fig(c)}</b>{c?.of_target != null && <small className={c.of_target >= 100 ? 'met' : undefined}>{num(c.of_target, 0)}%</small>}</span>
                  </span>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Coal despatched to each industry by ONE despatcher (phone): the month and the year to date,
 *  each with its growth on the same period last year. Every despatcher reports the same
 *  industries, so switching between them changes the figures and never the table's height. */
function DespatchOne({ D, k }) {
  const cell = (v, g, quiet) => (v == null ? <td className="fc"><span className="v"><b className="z">—</b></span><span className="sub">not reported</span></td>
    : <td className="fc"><span className="v"><b>{num(v, 2)}</b></span><span className="sub">{g != null ? <Pct v={g} quiet={quiet} /> : <span className="na">no comparison</span>}</span></td>)
  return (
    <div className="bx-table-wrap">
      <table className="bx-table bx-figtable bx-desp" data-stack="no">
        <thead><tr><th>Industry</th><th>{D.label}</th><th>FY {D.fy} to date</th></tr></thead>
        <tbody key={k} className="bx-swap-rows">
          {D.rows.map(r => {
            const c = r[k]
            return (
              <tr key={r.sector}>
                <td><b>{r.sector === 'CPP' ? 'Captive power plants' : r.sector}</b></td>
                {cell(c?.month, c?.growth, c?.small)}
                {cell(c?.fytd, c?.fytd_growth, c?.fytd_small)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** COAL INDIA, COMPANY BY COMPANY — ONE LINE A COMPANY (27 Oct'26, the user's call: the table "did
 *  not read easily" and stood twice as tall as it needed). Production, then offtake, each as the
 *  figure, its share of target as a short bar with the target ticked, and its change. Coal India's
 *  own total leads, tinted. A phone keeps the two-column table (CoTablePhone) that fits it. */
const OF_TOP = 125          // a share-of-target bar runs to 125%; the tick marks 100%
function OfBar({ v }) {
  if (v == null) return <span className="ofbar none">—</span>
  const w = x => `${Math.max(0, Math.min(100, (x / OF_TOP) * 100))}%`
  return (
    <span className={`ofbar${v >= 100 ? ' met' : ''}`} title={`${num(v, 1)}% of target`}>
      <span className="tr"><i style={{ width: w(v) }} /><em style={{ left: w(100) }} /></span>
      <b>{num(v, 1)}%</b>
    </span>
  )
}
function CoTable({ b, order, unitShort }) {
  const M = [['production', 'Production'], ['offtake', 'Offtake']]
  const cells = c => [
    <td key="v" className="v">{c?.value == null ? '—' : num(c.value, b.decimals)}</td>,
    <td key="o" className="o"><OfBar v={c?.of_target} /></td>,
    <td key="c" className="c">{c?.change_pct != null ? <Pct v={c.change_pct} /> : <span className="na" title={c?.note || undefined}>—</span>}</td>,
  ]
  return (
    <div className="bx-table-wrap">
      <table className="bx-cot" data-stack="no">
        <thead>
          <tr><th rowSpan={2} className="co">Company</th>{M.map(([m, l]) => <th key={m} colSpan={3} className="grp">{l}</th>)}</tr>
          <tr>{M.map(([m]) => [<th key={m + 'v'} className="v">{unitShort}</th>, <th key={m + 'o'} className="o">Of target</th>, <th key={m + 'c'} className="c">{b.change_label}</th>])}</tr>
        </thead>
        <tbody key={b.key} className="bx-swap-rows">
          {order.map(r => (
            <tr key={r.company} className={r.company === 'CIL' ? 'tot' : undefined}>
              <td className="co"><b>{r.company === 'CIL' ? 'Coal India' : COMPANY[r.company] || r.company}</b><small>{r.company === 'CIL' ? 'all subsidiaries' : r.company}</small></td>
              {cells(r.production)}
              {cells(r.offtake)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** COAL INDIA, COMPANY BY COMPANY, AT HALF WIDTH (27 Oct'26, the user's call — "aadhe me", beside the
 *  rakes chart): production and offtake, each figure with its share of target and its change on ONE
 *  quiet line under it — the share-of-target column and its bars went (CoTable kept for the wide panel). */
/** How far a figure stands from its target, in per cent (27 Oct'26, the user's call — "106%" read as a
 *  total; "+6.4% vs target" says how far up or down): the share of target the server worked out, less
 *  100. Above the target in the up colour, below it in the down colour. */
function VsTarget({ of }) {
  const d = of - 100
  const t = Math.abs(d) < 0.05 ? 'on target' : `${d > 0 ? '+' : '−'}${num(Math.abs(d), 1)}% vs target`
  return <span className={`ofp ${d >= 0 ? 'met' : 'below'}`} title={`${num(of, 1)}% of the target`}>{t}</span>
}

function CoHalfTable({ b, order, unitShort }) {
  const cell = c => (
    <td className="v">{c?.value == null ? <span className="z">—</span> : <>
      <b>{num(c.value, b.decimals)}</b>
      <small>
        {c.of_target != null && <VsTarget of={c.of_target} />}
        {c.change_pct != null && <Pct v={c.change_pct} />}
      </small>
    </>}</td>
  )
  return (
    <div className="bx-table-wrap">
      <table className="bx-cot bx-coh" data-stack="no">
        <thead><tr><th className="co">Company</th><th className="v">Production <small>{unitShort}</small></th><th className="v">Offtake <small>{unitShort}</small></th></tr></thead>
        <tbody key={b.key} className="bx-swap-rows">
          {order.map(r => (
            <tr key={r.company} className={r.company === 'CIL' ? 'tot' : undefined}>
              <td className="co"><b>{r.company === 'CIL' ? 'Coal India' : COMPANY[r.company] || r.company}</b><small>{r.company === 'CIL' ? 'all' : r.company}</small></td>
              {cell(r.production)}
              {cell(r.offtake)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** COAL INDIA, COMPANY BY COMPANY, IN TONNES (27 Oct'26, the user's call — "MT ke basis pe, bhale hi
 *  target rehne dena pade"): Coal India's own total is two figures over the chart (its bars would
 *  dwarf every subsidiary's), each with its share of target and its change; under them the seven
 *  subsidiaries' production and offtake as vertical bars on one scale, each bar's figure over it
 *  (its target line went the same day, the user's call — `marks` stays in BarChart). All from
 *  payload._supply; the unit follows the period. */
function CoChart({ b, order, unitShort, height, pc = false }) {
  const cil = order.find(r => r.company === 'CIL')
  const subs = order.filter(r => r.company !== 'CIL')
  const M = [['production', 'Production'], ['offtake', 'Offtake']]
  const f = v => `${num(v, b.decimals)} ${unitShort}`
  return (
    <div className="bx-cochart bx-comt">
      <div className="tot">
        {M.map(([m, l]) => {
          const c = cil?.[m]
          return (
            <div key={m} className="fig">
              <span className="k">Coal India {l.toLowerCase()}</span>
              <span className="v"><b>{c?.value == null ? '—' : num(c.value, b.decimals)}</b><small>{unitShort}</small></span>
              <span className="sub">
                {c?.of_target != null && <VsTarget of={c.of_target} />}
                {c?.of_target != null && <i aria-hidden="true">·</i>}
                {c?.change_pct != null ? <Pct v={c.change_pct} /> : <span className="na" title={c?.note || undefined}>no comparison</span>}
              </span>
            </div>
          )
        })}
      </div>
      {/* a phone: the legend here, under the figures (pass 84), then the seven subsidiaries on their side, a
          figure at each bar's end (their figures stood on end) */}
      {pc && <Legend items={[{ label: 'Production', color: NAVY, kind: 'box' }, { label: 'Offtake', color: ACCENT, kind: 'box' }]} />}
      {pc ? <GroupBars unit={unitShort} fmt={barLab} ariaLabel={`Coal India's subsidiaries: production and offtake, ${b.label}, ${unitShort}`}
        categories={subs.map(r => r.company)}
        groups={[{ id: 'p', label: 'Production', color: NAVY, values: subs.map(r => r.production?.value ?? null) },
                 { id: 'o', label: 'Offtake', color: ACCENT, values: subs.map(r => r.offtake?.value ?? null) }]} />
      : <BarChart labelFmt={barLab} height={height} unit={unitShort} yFmt={axis} vFmt={f}
        ariaLabel={`Coal India's subsidiaries: production and offtake against target, ${b.label}`}
        categories={subs.map(r => r.company)}
        catTitle={i => `${COMPANY[subs[i].company]} — ${b.label}`}
        groups={[{ id: 'p', label: 'Production', color: NAVY, values: subs.map(r => r.production?.value ?? null) },
                 { id: 'o', label: 'Offtake', color: ACCENT, values: subs.map(r => r.offtake?.value ?? null) }]} />}
    </div>
  )
}

/** The same companies as columns: production and offtake as a share of target, the target a line
 *  at 100% (26–27 Oct'26) — kept, unrendered, since the chart went to tonnes. */
function CoChartPct({ b, order, unitShort, height }) {
  const fig = c => (c?.value == null ? '—' : `${num(c.value, b.decimals)} ${unitShort}`)
  return (
    <BarChart height={height} unit="% of target" yFmt={v => `${num(v, 0)}`} vFmt={v => `${num(v, 1)}% of target`}
      ariaLabel={`Coal India's companies: production and offtake as a share of target, ${b.label}`}
      categories={order.map(r => (r.company === 'CIL' ? 'Coal India' : r.company))}
      catTitle={i => `${order[i].company === 'CIL' ? 'Coal India' : COMPANY[order[i].company]} — production ${fig(order[i].production)}, offtake ${fig(order[i].offtake)}`}
      refs={[{ y: 100 }]}
      groups={[{ id: 'p', label: 'Production', color: NAVY, values: order.map(r => r.production?.of_target ?? null) },
               { id: 'o', label: 'Offtake', color: ACCENT, values: order.map(r => r.offtake?.of_target ?? null) }]} />
  )
}

/** Coal despatched to each industry — ONE LINE AN INDUSTRY (27 Oct'26): for each despatcher, the
 *  month and the year to date side by side, each with its growth, small, beside it. */
/** COAL DESPATCHED TO EACH INDUSTRY — THE MONTH OR THE YEAR TO DATE, AND A TOTAL (27 Oct'26, the
 *  user's call): one period at a time (the panel's Monthly / FYTD switch) instead of both side by
 *  side, so each despatcher is one column, and a Total column at the end — the three despatchers
 *  added up on the server (series.dispatch_total). Each figure with its growth on the same period
 *  a year earlier, small, beside it. The rows never change, so the switch moves nothing. */
const DESP_COLS = D => [...D.dispatchers, { key: 'total', label: 'Total' }]
// a phone's despatcher switch: four short names fit a 360px panel
const DESP_SHORT = { cil: 'Coal India', sccl: 'Singareni', captive: 'Captive', total: 'Total' }
function DespatchPeriod({ D, view }) {
  const f = view === 'month' ? ['month', 'growth', 'small'] : ['fytd', 'fytd_growth', 'fytd_small']
  return (
    <div className="bx-table-wrap">
      <table className="bx-cot bx-dsp" data-stack="no">
        <thead>
          <tr><th className="co">Industry</th>{DESP_COLS(D).map(x => <th key={x.key} className={`v${x.key === 'total' ? ' tt' : ''}`}>{x.label}</th>)}</tr>
        </thead>
        <tbody key={view} className="bx-swap-rows">
          {D.rows.map(r => (
            <tr key={r.sector}>
              <td className="co"><b>{r.sector === 'CPP' ? 'Captive power plants' : r.sector}</b></td>
              {DESP_COLS(D).map(x => {
                const c = r[x.key]
                const v = c?.[f[0]]
                return <td key={x.key} className={`v${x.key === 'total' ? ' tt' : ''}`}>{v == null ? <span className="z">—</span> : <>{num(v, 2)}{c[f[1]] != null && <Pct v={c[f[1]]} quiet={c[f[2]]} />}</>}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The month and the year to date side by side, for each despatcher (26–27 Oct'26) — kept, unrendered. */
function DespatchTable({ D }) {
  const cell = (v, g, quiet, key) => (
    <td key={key} className="v">{v == null ? <span className="z">—</span> : <>{num(v, 2)}{g != null && <Pct v={g} quiet={quiet} />}</>}</td>
  )
  return (
    <div className="bx-table-wrap">
      <table className="bx-cot bx-dst" data-stack="no">
        <thead>
          <tr><th rowSpan={2} className="co">Industry</th>{D.dispatchers.map(x => <th key={x.key} colSpan={2} className="grp">{x.label}</th>)}</tr>
          <tr>{D.dispatchers.map(x => [<th key={x.key + 'm'} className="v">{D.label}</th>, <th key={x.key + 'f'} className="v">FYTD</th>])}</tr>
        </thead>
        <tbody>
          {D.rows.map(r => (
            <tr key={r.sector}>
              <td className="co"><b>{r.sector === 'CPP' ? 'Captive power plants' : r.sector}</b></td>
              {D.dispatchers.map(x => {
                const c = r[x.key]
                return [cell(c?.month, c?.growth, c?.small, x.key + 'm'), cell(c?.fytd, c?.fytd_growth, c?.fytd_small, x.key + 'f')]
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Supply({ data, by, basis, setBasis }) {
  const phone = useContext(KpiOpen) != null
  const pc = phone && PHONE_COMPACT
  const [desp, setDesp] = useState(null)
  // the CHART first, the table second (27 Oct'26, the user's call)
  const [coView, setCoView] = useState('chart')       // the company chart, or the same figures as a table
  const [dsView, setDsView] = useState('month')       // the despatch table: the month, or the year to date
  const sup = data.boards?.supply
  const P = data.boards?.producers
  const D = data.boards?.sector_dispatch
  if (!sup && !P) return <Head title="Production & offtake" meta="The coal dashboards have not been read yet." />
  const nb = P ? natBasis(P, basis) : null
  const b = sup?.bases.find(x => x.key === basis)
  const row = co => b?.rows.find(r => r.company === co)
  // Coal India and its seven subsidiaries only: Singareni has its own figures in the strip above
  const order = b ? ['CIL', ...SUBS].map(row).filter(Boolean) : []
  const cil = row('CIL')
  const dk = D && DESP_COLS(D).some(x => x.key === desp) ? desp : D?.dispatchers[0]?.key
  const unitShort = b?.unit === 'kt' ? "'000 t" : 'MT'
  // the production and offtake tiles print their share of target beside their trend — except while
  // "target met" is a figure of its own (SHOW_TARGET_MET): one figure, one place
  const k = (co, m, label) => {
    const c = row(co)?.[m]
    return <Kpi key={co + m} label={label} value={c?.value} dec={b?.decimals} unit={b?.unit} when={b?.label} inline
      of={SHOW_TARGET_TILE || !SHOW_TARGET_MET ? c?.of_target : null} change={c?.change_pct} changeLabel={b?.change_label} note={c?.note}
      trend={c?.trend ?? null} swap={basis} source="Coal India daily dashboard" sourceUrl={sup?.source_url} />
  }
  // RAKES LOADED (27 Oct'26, the user's call — in place of "target met"): Coal India's rakes for the
  // period (series.rake_loading_from) — the latest full daily report; rakes a day this month to date;
  // rakes a day April to the Ministry's latest month — each against its own comparison
  const RK = data.boards?.rake_loading
  const rp = RK?.[basis]
  // the day names its report; the month and the year carry their own labels from the server
  const rkWhen = !rp ? '' : basis === 'day' ? day(rp.as_of) : rp.label
  const rkCmp = !rp ? '' : basis === 'day' ? (rp.prev ? `vs ${day(rp.prev).replace(/'\d{2}$/, '')}` : '') : rp.cmp
  const rakes = () => (
    <Kpi key="rakes" label={basis === 'day' ? 'Rakes loaded' : basis === 'fytd' ? 'Rakes loaded a day, monthly average' : 'Rakes loaded a day'} value={rp?.total} dec={basis === 'day' ? 0 : 1}
      unit={basis === 'day' ? 'rakes' : 'rakes a day'} when={rkWhen} inline change={rp?.change_pct} changeLabel={rkCmp}
      trend={rp?.trend ?? null} swap={basis}
      source={basis === 'fytd' ? RK?.fytd_source_short : RK?.source_short} sourceUrl={basis === 'fytd' ? RK?.fytd_source_url : RK?.source_url} />
  )
  // TARGET MET (27 Oct'26, the user's call — it replaced the target as a figure): the share of the
  // period's target Coal India met, its last seven published days, and its move on the day before in
  // percentage points; the target itself sits beside the trend's label. All from payload._supply.
  const met = (co, m, label) => {
    const c = row(co)?.[m]
    return <Kpi key={co + m + 'met'} label={label} value={c?.of_target} dec={1} unit="%" when={b?.label} inline
      change={c?.met_change_pp} changeUnit="pp" changeLabel={c?.met_prev ? `vs ${day(c.met_prev).replace(/'\d{2}$/, '')}` : ''}
      aside={c?.target != null ? `Target ${num(c.target, b.decimals)} ${unitLabel(b.unit)}` : null}
      trend={c?.met_trend ?? null} swap={basis} source="Coal India daily dashboard" sourceUrl={sup?.source_url} />
  }
  // COMMERCIAL AND CAPTIVE AS FIGURES, NOT A TABLE ROW (23 Oct'26): "India, by producer" printed
  // Coal India and Singareni a second time beside the four figures above it; the two producers
  // it alone carries now sit in the strip, from the same national dashboard and its trend
  const kp = (key, m, label) => {
    const c = P?.rows.find(r => r.key === key)?.[m]
    return <Kpi key={key + m} label={label} value={c?.[basis]} dec={2} unit="MT" when={nb?.when} plain={nb?.plain}
      trend={c?.trend?.[basis] ?? null} swap={basis} source={P?.source_short} sourceUrl={P?.source_url} />
  }
  const notesOf = x => [...new Set(x.rows.flatMap(r => [r.production?.note, r.offtake?.note]).filter(Boolean))]
  return (
    <>
      <Head title="Production & offtake" meta={sup ? `As of ${day(sup.as_of)}` : ''}
        aside={<Seg value={basis} onChange={setBasis} options={BASES} label="Period" />} />
      {phone && <PeriodDock basis={basis} setBasis={setBasis} />}
      <div className="wrap bx-in-main">
      {b && (
        <Strip three={!SHOW_OTHER_PRODUCERS && !SHOW_TARGET_MET && !b.gap}>
          {k('CIL', 'production', 'Coal India production')}
          {k('CIL', 'offtake', 'Coal India offtake')}
          {/* COAL INDIA'S TARGET AS A FIGURE OF ITS OWN (23 Oct'26, the user's call): the target
              its dashboard sets for the period — production as the figure, offtake on the line
              under it. The two tiles beside it print their share of it. OFF since 27 Oct'26
              (SHOW_TARGET_TILE): "target met" for production and offtake took its place. */}
          {SHOW_TARGET_TILE && <Kpi key="CILtarget" label="Coal India production target" value={cil?.production?.target} dec={b.decimals} unit={b.unit} when={b.label} inline
            plain={cil?.offtake?.target != null ? `Offtake target ${num(cil.offtake.target, b.decimals)} ${unitLabel(b.unit)}` : 'As Coal India’s dashboard sets it'}
            trend={cil?.production?.target_trend ?? null} swap={basis} source="Coal India daily dashboard" sourceUrl={sup?.source_url} />}
          {!SHOW_TARGET_TILE && SHOW_TARGET_MET && met('CIL', 'production', 'Production target met')}
          {!SHOW_TARGET_TILE && SHOW_TARGET_MET && met('CIL', 'offtake', 'Offtake target met')}
          {/* THE GAP BETWEEN PRODUCTION AND OFFTAKE (27 Oct'26, the user's call): Coal India's production less its
              offtake for the period (payload.production_gap) — below zero when offtake ran ahead of production.
              THIRD, beside the two figures it subtracts; rakes fourth (the user's call, later the same day) */}
          {/* ITS COMPARISON (pass 84): the gap's move against the same comparison point as its neighbours, as a
              percentage like theirs (payload.gap_base / production_gap) — none for the year, where Coal India's
              production growth fails its own check, and none where the gap crossed zero */}
          {b.gap && <Kpi key="gap" label="Production – offtake gap" value={b.gap.value} dec={b.decimals} unit={b.unit} when={b.label} inline
            change={b.gap.change_pct ?? null} changeLabel={b.change_label}
            note={b.gap.change_pct != null ? undefined : b.gap.note || 'No comparison: Coal India’s production growth for the year does not reconcile'}
            aside={b.gap.value >= 0 ? 'Production above offtake' : 'Offtake above production'}
            trend={b.gap.trend ?? null} swap={basis} source="Coal India daily dashboard" sourceUrl={sup?.source_url} />}
          {!SHOW_TARGET_MET && rakes()}
          {SHOW_OTHER_PRODUCERS && [
            k('SCCL', 'production', 'Singareni production'),
            k('SCCL', 'offtake', 'Singareni offtake'),
            P && kp('Commercial', 'production', 'Commercial mines production'),
            P && kp('Commercial', 'offtake', 'Commercial mines offtake'),
            P && kp('Captive & Others*', 'production', 'Captive & others production'),
            P && kp('Captive & Others*', 'offtake', 'Captive & others offtake'),
          ]}
        </Strip>
      )}
      <div className="bx-in-grid">
        {b && (
          // HALF THE ROW (27 Oct'26, the user's call): the company chart / table beside the rakes chart;
          // the table is the compact one — each figure with its share of target and change UNDER it
          <Panel title="Coal India, company by company" short="Coal India, by company" unit={b.label} source={sup.source} sourceUrl={sup.source_url}
            // ON A PHONE THE LEGEND IS THE CHART'S OWN (pass 84, the user: switching Table / Chart moved the toggle — the
            // legend above it came and went): it sits inside the chart, under Coal India's two figures, so the toggle
            // stands in one place in both views
            className={SHOW_WIDE_COTABLE ? 'wide' : 'bx-co-half'} legend={coView === 'chart' && !pc ? [{ label: 'Production', color: NAVY, kind: 'box' }, { label: 'Offtake', color: ACCENT, kind: 'box' }] : false}
            tools={<Seg small value={coView} onChange={setCoView} options={[['chart', 'Chart'], ['table', 'Table']]} label="Show as" />}>
            {/* TABLE OR CHART, THE SAME FIGURES (26 Oct'26): both lie in ONE grid cell (.bx-pane), so
                the panel is as tall as the taller of the two and switching moves nothing */}
            <div className="bx-coviews">
              <div className={`bx-pane${coView === 'table' ? ' on' : ''}`} aria-hidden={coView !== 'table'}>
                {/* ONE FIGURE A CELL, ITS CONTEXT ON A QUIET LINE UNDER IT (23 Oct'26): seven columns of
                    numbers and pills did not read at a glance — now production and offtake are two
                    columns, each the figure, and beneath it its share of target and its change */}
                {/* three columns read as a table on a phone too: it stays one (data-stack="no") */}
                {!phone && SHOW_WIDE_COTABLE && <CoTable b={{ ...b, key: basis }} order={order} unitShort={unitShort} />}
                {!phone && !SHOW_WIDE_COTABLE && <CoHalfTable b={{ ...b, key: basis }} order={order} unitShort={unitShort} />}
                {phone && <div className="bx-table-wrap">
                  <table className="bx-table bx-figtable bx-co" data-stack="no">
                    <thead>
                      {/* the unit on the heading's line, short as the tiles' (kt, MT) — it wrapped to a second line */}
                      <tr><th>Company</th><th data-short="Production">Production <small>{phoneUnit(unitShort)}</small></th><th data-short="Offtake">Offtake <small>{phoneUnit(unitShort)}</small></th></tr>
                    </thead>
                    <tbody key={basis} className="bx-swap-rows">
                      {order.map(r => (
                        <tr key={r.company} className={r.company === 'CIL' ? 'tot' : 'sub'}>
                          {/* the company's CODE, as the chart prints it — the full name wrapped every row to two lines (13 Nov'26) */}
                          {/* …Coal India's too, "CIL" (pass 84 — "Coal India" broke its row in two at 360–390 px) */}
                          <td title={r.company === 'CIL' ? 'Coal India, all subsidiaries' : COMPANY[r.company] || r.company}><b>{r.company}</b></td>
                          <FigCell c={r.production} dec={b.decimals} />
                          <FigCell c={r.offtake} dec={b.decimals} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
              </div>
              <div className={`bx-pane${coView === 'chart' ? ' on' : ''}`} aria-hidden={coView !== 'chart'}>
                {/* the earlier chart (CompanyChart: each subsidiary's bars against its target) is kept, unrendered */}
                <div key={`c${basis}`} className="bx-swap"><CoChart pc={pc} b={b} order={order} unitShort={unitShort} height={phone ? 446 : (SHOW_WIDE_COTABLE ? 290 : 340)} /></div>
              </div>
            </div>
          </Panel>
        )}
        {/* RAKES LOADED, BY SUBSIDIARY (27 Oct'26, the user's call — after a FOIS sample): the period's
            rakes (orange) beside its comparison (navy), each bar's figure over it; it follows the page's
            Daily / MTD / FYTD switch (series.rake_loading_from) */}
        {b && !SHOW_WIDE_COTABLE && rp && (
          // m2: its line under the title follows the period and runs to two lines in some; a phone keeps two lines
          // for it in every period, so the Daily / MTD / FYTD switch moves nothing below (_probe_toggles.py)
          <Panel className="m2" title="Rakes loaded, by subsidiary"
            unit={basis === 'day' ? `Coal India's report of ${day(rp.as_of)}` : basis === 'mtd' ? `${rp.label} · rakes a day · ${rp.days} reports` : `${rp.span} · rakes a day`}
            source={basis === 'fytd' ? RK.fytd_source : RK.source} sourceUrl={basis === 'fytd' ? RK.fytd_source_url : RK.source_url}
            legend={[{ label: basis === 'day' ? (rp.prev ? day(rp.prev) : 'Report before') : rp.prev_label, color: LAST_YEAR, kind: 'box' },
                     { label: basis === 'day' ? day(rp.as_of) : rp.cur_label, color: THIS_YEAR, kind: 'box' }]}>
            <div key={`r${basis}`} className="bx-swap">
              {pc ? <GroupBars unit={basis === 'day' ? 'rakes' : 'rakes a day'} fmt={v => num(v, basis === 'day' ? 0 : 1)} ariaLabel={`Coal India's rakes loaded by subsidiary, ${rkWhen}`}
                categories={rp.rows.map(r => r.company)}
                groups={[{ id: 'p', label: basis === 'day' ? (rp.prev ? day(rp.prev) : 'Report before') : rp.prev_label, color: LAST_YEAR, values: rp.rows.map(r => r.prev), muted: true },
                         { id: 'c', label: basis === 'day' ? day(rp.as_of) : rp.cur_label, color: THIS_YEAR, values: rp.rows.map(r => r.cur) }]} />
              : <BarChart labelFmt={barLab} height={phone ? 220 : 500} unit={basis === 'day' ? 'rakes' : 'rakes a day'} yFmt={axis}
                vFmt={v => `${num(v, basis === 'day' ? 0 : 1)} ${basis === 'day' ? 'rakes' : 'rakes a day'}`}
                ariaLabel={`Coal India's rakes loaded by subsidiary, ${rkWhen}`}
                categories={rp.rows.map(r => r.company)} catTitle={i => `${COMPANY[rp.rows[i].company]} — ${rkWhen}`}
                groups={[{ id: 'p', label: basis === 'day' ? (rp.prev ? day(rp.prev) : 'Report before') : rp.prev_label, color: LAST_YEAR, values: rp.rows.map(r => r.prev) },
                         { id: 'c', label: basis === 'day' ? day(rp.as_of) : rp.cur_label, color: THIS_YEAR, values: rp.rows.map(r => r.cur) }]} />}
            </div>
          </Panel>
        )}
        {D && (
          <Panel className="wide" title="Coal despatched to each industry" short="Coal despatched, by industry"
            unit={phone ? `${D.label} · million tonnes` : `${dsView === 'month' ? monthLong(D.month) : `FY ${D.fy} · ${D.fy_span}`} · million tonnes · change on a year earlier`}
            source={D.source} sourceUrl={D.source_url} legend={false}
            tools={phone ? <Seg small value={dk} onChange={setDesp} options={DESP_COLS(D).map(x => [x.key, DESP_SHORT[x.key] || x.label])} label="Despatched by" />
              : <span className="bx-chart-tog"><Seg small value={dsView} onChange={setDsView} options={[['month', 'Monthly'], ['fytd', 'FYTD']]} label="Period" /></span>}>
            {/* a phone: one despatcher at a time, picked above — three columns of three figures did
                not fit a phone's width as a table, and as cards ran to three screens */}
            {phone ? <DespatchOne D={D} k={dk} /> : <DespatchPeriod D={D} view={dsView} />}
            {/* the earlier two-line despatch table, kept, unrendered */}
            {false && <div className="bx-table-wrap">
              <table className="bx-table bx-figtable bx-sector">
                <thead>
                  <tr><th>Industry</th>{D.dispatchers.map(x => <th key={x.key} data-short={x.label}>{x.label} <small>{D.label} · FYTD</small></th>)}</tr>
                </thead>
                <tbody>
                  {D.rows.map(r => (
                    <tr key={r.sector}>
                      <td><b>{r.sector === 'CPP' ? 'Captive power plants' : r.sector}</b>{r.sector === 'CPP' && <small>CPP</small>}</td>
                      {D.dispatchers.map(x => {
                        const c = r[x.key]
                        return (
                          <td key={x.key} className="fc">
                            {c ? <>
                              <span className="v"><b>{num(c.month, 2)}</b>{c.growth != null && <Pct v={c.growth} quiet={c.small} />}</span>
                              <span className="sub">FYTD {num(c.fytd, 2)}{c.fytd_growth != null && <> · <Pct v={c.fytd_growth} quiet={c.fytd_small} /></>}</span>
                            </> : <><span className="v"><b className="z">—</b></span><span className="sub">not reported</span></>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </Panel>
        )}
      </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ e-auctions
// THE E-AUCTION SNAPSHOT (27 Oct'26, the user's call — "with our visuals and css" after a sample
// page): Coal India's Single Window Mode Agnostic e-auctions as its monthly summary prints them
// (series.auction_from). The month or the year to date (one switch in the title card): four
// figures for Coal India overall, then offered vs allocated and the premium, subsidiary by
// subsidiary, the same as a table, and month by month for the subsidiary chosen. No prose; the
// month and the source on every panel. Lakh tonnes and percentages AS PRINTED.
const AUC_NAME = { ECL: 'Eastern Coalfields', BCCL: 'Bharat Coking Coal', CCL: 'Central Coalfields', NCL: 'Northern Coalfields',
  WCL: 'Western Coalfields', SECL: 'South Eastern Coalfields', MCL: 'Mahanadi Coalfields', NEC: 'North Eastern Coalfields', CIL: 'Coal India' }
// Coal India overall, a dashed line across the subsidiaries' bars — ORANGE (pass 84, the user: the grey-blue
// #5b6e86 vanished on the dark site); the line itself is the accent too (`accent` on the ref)
const AUC_REF = ACCENT

/** The share allocated as a short bar to 100%, the figure at its end — the table's one visual. */
function ShareBar({ v }) {
  if (v == null) return <span className="ofbar none">—</span>
  return (
    <span className="ofbar sh" title={`${num(v, 0)}% of the quantity offered`}>
      <span className="tr"><i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></span>
      <b>{num(v, 0)}%</b>
    </span>
  )
}

function Auction({ data }) {
  const A = data.boards?.auction
  const [per, setPer] = useState('month')
  const [co, setCo] = useState('CIL')
  const ch = useChartH()
  const phone = useContext(KpiOpen) != null
  const pc = phone && PHONE_COMPACT
  if (!A) return <Head title="E-auction snapshot" meta="Coal India's e-auction summaries have not been read yet." />
  const P = A.periods[per]
  const K = P.kpis
  const mon = monthShort(A.month).replace(/'\d{2}$/, '')
  const when = per === 'month' ? A.label : `FY ${A.fy} · Apr–${mon}`
  // the month against the month before (a quantity in per cent, a share in points); the year to
  // date has no comparison — the summaries held start in Feb'26 — so its tiles are bare
  const fig = (f, label, unit, dec) => {
    const x = K[f] || {}
    const pp = f === 'alloc_pct' || f === 'premium_pct'
    const cmp = per === 'month'
      ? { inline: true, change: pp ? x.change?.pp : x.change?.pct, changeUnit: pp ? 'pp' : '%', changeLabel: A.prev_label ? `vs ${A.prev_label.split(' ')[0]}` : '' }
      : { bare: true, keepSub: true }
    return <Kpi key={f} label={label} value={x.value} dec={dec} unit={unit} when={when} {...cmp}
      trend={x.trend ?? null} swap={per} source={A.source} sourceUrl={A.source_url} />
  }
  const subs = P.rows.filter(r => r.company !== 'CIL' && (r.offered != null || r.premium_pct != null))
  const cil = P.rows.find(r => r.company === 'CIL') || {}
  const H = A.history
  const hc = H.by[co] || {}
  const coName = AUC_NAME[co] || co
  const coPick = <Dropdown value={co} onChange={setCo} label="Company" options={['CIL', ...A.companies.filter(c => c !== 'CIL')].map(c => [c, c === 'CIL' ? 'Coal India (all)' : c])} />
  const lt = v => `${num(v, 2)} lakh t`
  return (
    <>
      <Head title="E-auction snapshot" meta={`As of ${A.label}`}
        aside={<Seg value={per} onChange={setPer} options={[['month', 'Monthly'], ['fytd', 'FYTD']]} label="Period" />} />
      <div className="wrap bx-in-main">
        <Strip>
          {fig('offered', 'Quantity offered', 'lakh t', 2)}
          {fig('allocated', 'Quantity allocated', 'lakh t', 2)}
          {fig('alloc_pct', 'Allocation rate', '%', 0)}
          {fig('premium_pct', 'Premium over notified price', '%', 0)}
        </Strip>
        <div className="bx-in-grid bx-auc-grid">
          {/* BY SUBSIDIARY ON TOP, MONTH BY MONTH UNDER IT (27 Oct'26, the user's call — the measure rows were
              undone the same day): each column one measure, quantities left, the premium right */}
          <Panel title="Offered and allocated, by subsidiary" unit={P.label} source={A.source} sourceUrl={A.source_url}
            short="Offered & allocated, by subsidiary" legend={[{ label: 'Offered', color: NAVY }, { label: 'Allocated', color: ACCENT }]}>
            <div key={per} className="bx-swap">
              {pc ? <GroupBars unit="lakh t" fmt={barLab} ariaLabel={`Coal India's e-auctions by subsidiary, ${P.label}: quantity offered and allocated, lakh tonnes`}
                categories={subs.map(r => r.company)}
                groups={[{ id: 'o', label: 'Offered', color: NAVY, values: subs.map(r => r.offered) },
                         { id: 'a', label: 'Allocated', color: ACCENT, values: subs.map(r => r.allocated) }]} />
              : <BarChart labelFmt={barLab} height={ch} unit="lakh t" yFmt={axis} vFmt={lt} ariaLabel={`Coal India's e-auctions by subsidiary, ${P.label}: quantity offered and allocated`}
                categories={subs.map(r => r.company)} catTitle={i => `${AUC_NAME[subs[i].company]} — ${P.label}`}
                groups={[{ id: 'o', label: 'Offered', color: NAVY, values: subs.map(r => r.offered) },
                         { id: 'a', label: 'Allocated', color: ACCENT, values: subs.map(r => r.allocated) }]} />}
            </div>
          </Panel>
          <Panel title="Premium over notified price, by subsidiary" short="Premium, by subsidiary" unit={P.label} source={A.source} sourceUrl={A.source_url}
            legend={[{ label: 'Premium', color: NAVY }, ...(cil.premium_pct != null ? [{ label: `Coal India overall (${num(cil.premium_pct, 0)}%)`, color: AUC_REF, kind: 'dash' }] : [])]}>
            <div key={per} className="bx-swap">
              {pc ? <GroupBars unit="% over notified price" fmt={pctLab} ariaLabel={`Coal India's e-auction premium over the notified price by subsidiary, ${P.label}`}
                categories={subs.map(r => r.company)} refLine={cil.premium_pct != null ? { v: cil.premium_pct, accent: true } : null}
                groups={[{ id: 'p', label: 'Premium', color: NAVY, values: subs.map(r => r.premium_pct) }]} />
              : <BarChart labelFmt={pctLab} height={ch} unit="%" yFmt={v => num(v, 0)} vFmt={v => `${num(v, 0)}% over notified price`}
                ariaLabel={`Coal India's e-auction premium over the notified price by subsidiary, ${P.label}`}
                categories={subs.map(r => r.company)} catTitle={i => `${AUC_NAME[subs[i].company]} — ${P.label}`}
                refs={cil.premium_pct != null ? [{ y: cil.premium_pct, accent: true }] : []}
                groups={[{ id: 'p', label: 'Premium', color: NAVY, values: subs.map(r => r.premium_pct) }]} />}
            </div>
          </Panel>
          <Panel title="Offered and allocated, month by month" short="Offered & allocated, by month" unit={`${coName} · lakh tonnes`}
            source={A.source} sourceUrl={A.source_url} legend={[{ label: 'Offered', color: NAVY }, { label: 'Allocated', color: ACCENT }]} tools={coPick}>
            <div key={co} className="bx-swap">
              <BarChart labelFmt={barLab} lastOnly={pc} height={ch} unit="lakh t" yFmt={axis} vFmt={lt}
                ariaLabel={`${coName}: e-auction quantity offered and allocated, month by month`}
                categories={H.months.map(monthShort)} catTitle={i => `${coName} — ${H.labels[i]}`}
                groups={[{ id: 'o', label: 'Offered', color: NAVY, values: hc.offered || [] },
                         { id: 'a', label: 'Allocated', color: ACCENT, values: hc.allocated || [] }]} />
            </div>
          </Panel>
          <Panel title="Premium over notified price, month by month" short="Premium, by month" unit={`${coName} · ${H.labels[0]} to ${H.labels[H.labels.length - 1]}`}
            source={A.source} sourceUrl={A.source_url} legend={[{ label: 'Premium', color: NAVY }]} tools={coPick}>
            <div key={co} className="bx-swap">
              <BarChart labelFmt={pctLab} lastOnly={pc} height={ch} unit="%" yFmt={v => num(v, 0)} vFmt={v => `${num(v, 0)}% over notified price`}
                ariaLabel={`${coName}: e-auction premium over the notified price, month by month`}
                categories={H.months.map(monthShort)} catTitle={i => `${coName} — ${H.labels[i]}`}
                groups={[{ id: 'p', label: 'Premium', color: NAVY, values: hc.premium_pct || [] }]} />
            </div>
          </Panel>
          {/* the subsidiary table is OFF (27 Oct'26, the user's call) — SHOW_AUCTION_TABLE */}
          {SHOW_AUCTION_TABLE && <Panel className="wide" title="By subsidiary" unit={`${P.label} · lakh tonnes`} source={A.source} sourceUrl={A.source_url} legend={false}>
            <div className="bx-table-wrap">
              <table className="bx-cot bx-auc" data-stack="no">
                <thead>
                  <tr><th className="co">Company</th><th className="v">Offered</th><th className="v">Allocated</th>
                    {/* a phone says the short names: five columns of full ones ran the table to 674px */}
                    {!phone && <th className="o">Share allocated</th>}<th className="v">{phone ? 'Premium' : 'Premium over notified price'}</th></tr>
                </thead>
                <tbody key={per} className="bx-swap-rows">
                  {[cil, ...P.rows.filter(r => r.company !== 'CIL')].map(r => (
                    <tr key={r.company} className={r.company === 'CIL' ? 'tot' : undefined}>
                      <td className="co"><b>{r.company === 'CIL' ? (phone ? 'CIL' : 'Coal India') : phone ? r.company : AUC_NAME[r.company] || r.company}</b><small>{r.company === 'CIL' ? 'overall' : r.company}</small></td>
                      <td className="v">{r.offered == null ? <span className="z">—</span> : num(r.offered, 2)}</td>
                      {/* a phone: the share allocated under the quantity, not a column of its own (five did not fit 360px) */}
                      <td className="v">{r.allocated == null ? <span className="z">—</span> : num(r.allocated, 2)}{phone && r.alloc_pct != null && <small className="sh">{num(r.alloc_pct, 0)}% allocated</small>}</td>
                      {!phone && <td className="o"><ShareBar v={r.alloc_pct} /></td>}
                      <td className="v">{r.premium_pct == null ? <span className="z">—</span> : `${num(r.premium_pct, 0)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>}
        </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ plant stocks
// Coal at the power plants, from CEA's own daily coal stock report (libs/website/plantstock):
// the national figures and the CRITICAL plants by CEA's categories exactly as its summary
// block prints them; the plants that are not critical spread over ranges of CEA's own
// "% of normative", with the ranges printed beside them, because CEA defines only CRITICAL.
// (It replaced the "Coal stock at power plants" panel in Coal in electricity, which read a
// feed broken since 25 Aug'26 and could only show itself withheld.)
const STATUS = { comfortable: '#12875e', moderate: '#c98a1b', low: '#e07b39', critical: '#cf3f33', not_operating: '#98a3b4', unreported: '#c7cdd6' }
const gw = mw => (mw == null ? '—' : `${num(mw / 1000, mw >= 10000 ? 0 : 1)} GW`)

const CAT_SHORT = { domestic: 'On domestic coal', imported: 'Designed on imported coal', washery_rejects: 'On washery rejects', not_operating: 'Not in operation' }
// CEA's four categories: identity, not status — one red family, darkest for the largest
const CAT_RING = ['#b3261e', '#e0705f', '#f2a99c', '#c7cdd6']

/** A ring of plant counts with its legend beside it: label, a small note, the count and one
 *  more figure. The ring's centre names the whole. A slice of zero draws nothing. */
function PlantRing({ title, name, items, center, centerLabel }) {
  // an item with an `href` is a LINK (27 Oct'26 — the Overview's ring opens Plant stocks at that status)
  const r = 62, w = 18, c = 2 * Math.PI * r
  const total = items.reduce((s, i) => s + (i.value || 0), 0) || 1
  let at = 0
  return (
    <section className="bx-ring">
      {title && <h4>{title}</h4>}
      <div className="bd">
        <svg viewBox="0 0 160 160" role="img" aria-label={`${name || title}: ${items.map(i => `${i.label} ${i.value}`).join(', ')}`}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line-2)" strokeWidth={w} />
          {items.filter(i => i.value > 0).map(i => {
            const len = (i.value / total) * c
            const seg = <circle key={i.key} cx="80" cy="80" r={r} fill="none" stroke={i.color} strokeWidth={w}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-at} transform="rotate(-90 80 80)"><title>{`${i.label}: ${i.value}`}</title></circle>
            at += len
            return seg
          })}
          <text x="80" y="80" textAnchor="middle" className="v">{center}</text>
          <text x="80" y="99" textAnchor="middle" className="l">{centerLabel}</text>
        </svg>
        <ul>
          {items.map(i => {
            const body = <>
              <i style={{ background: i.color }} aria-hidden="true" />
              <span className="t"><b>{i.label}</b><small>{i.note}</small></span>
              <span className="v"><b>{i.value}</b><small>{i.extra}</small></span>
              {i.href && <ChevronRight className="go" aria-hidden="true" />}
            </>
            return <li key={i.key} className={i.href ? 'lnk' : undefined}>{i.href ? <a href={i.href} title={i.hrefTitle}>{body}</a> : body}</li>
          })}
        </ul>
      </div>
    </section>
  )
}
// NAMED BY THE RANGE (12 Nov'26, the data review): CEA defines only "critical"; the rest are ranges of CEA's own
// % of normative stock, and are called exactly that (plantstock.BANDS)
const BAND_LABEL = { comfortable: '75% and over', moderate: '50–75%', low: '25–50%', critical: 'Critical', not_operating: 'Not in operation', unreported: 'No figure' }
const PF_FILTERS = [['top', '3 of each'], ['critical', 'Critical'], ['low', '25–50%'], ['moderate', '50–75%'], ['comfortable', '75%+'], ['all', 'All']]
const PF_SAMPLE = ['critical', 'low', 'moderate', 'comfortable']
const PF_PAGE = 12

/** Every plant in CEA's report, searchable: by name, state, company or CEA's remark, and by
 *  status. Twelve rows a page and the page always twelve rows tall (a blank row holds the
 *  place), so searching or filtering never moves the pager or anything under it. */
/** One plant, in full (the phone's finder opens it): what CEA prints for it, its remark whole. */
function PlantDetail({ p }) {
  return (
    <div className="bx-kd bx-pd">
      <h3>{pretty(p.plant)}</h3>
      <p className="when">{[p.state, p.genco].filter(Boolean).join(' · ')}{p.cat !== 'domestic' ? ` · ${CAT_SHORT[p.cat]}` : ''}</p>
      <p className="st"><span className={`bx-pf-st ${p.band}`}><i style={{ background: STATUS[p.band] }} aria-hidden="true" />{BAND_LABEL[p.band]}</span></p>
      <dl className="pts two">
        <div><dt>Stock against normative</dt><dd>{p.pct == null ? '—' : `${num(p.pct, 0)}%`}</dd></div>
        <div><dt>Stock</dt><dd>{p.stock_kt == null ? '—' : `${num(p.stock_kt, 1)} thousand t`}</dd></div>
        <div><dt>Normative stock</dt><dd>{p.normative_kt == null ? '—' : `${num(p.normative_kt, 0)} thousand t`}</dd></div>
        <div><dt>Capacity</dt><dd>{p.capacity_mw == null ? '—' : `${num(p.capacity_mw, 0)} MW`}</dd></div>
      </dl>
      <section className="rm"><h4>CEA&rsquo;s remark</h4><p>{p.remark || 'CEA prints no remark beside this plant.'}</p></section>
    </div>
  )
}

function PlantFinder({ plants, company = null, status = null }) {
  const phone = usePhone()
  const [pick, setPick] = useState(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [q, setQ] = useState(company || '')
  const [band, setBand] = useState(status || (company ? 'all' : 'top'))
  const [page, setPage] = useState(0)
  // ONE COMPANY'S PLANTS (27 Oct'26): the Overview's stock watch opens #/insights/stocks/<company>
  // — the list narrows to that company's plants (its exact name, as CEA heads them) and the page
  // comes to it. THE COMPANY IS THE SEARCH (the user's call: it had no way to be cleared): its
  // name stands in the search box, matched EXACTLY while it is left as it is (NTPC's 27 plants,
  // not "NTPC JV"'s), and its ✕ — or editing it — returns to every plant.
  const exact = !!company && q === company
  const own = useMemo(() => (exact ? plants.filter(p => p.genco === company) : plants), [plants, company, exact])
  // A STATUS (27 Oct'26): the Overview's ring opens #/insights/stocks/<status> — the same list with
  // that status's filter chosen (and the page brought to it, as for a company)
  const was = useRef(company || status)
  useEffect(() => {
    setQ(company || ''); setBand(status || (company ? 'all' : 'top')); setPage(0)
    // to a company, or back from one to every plant ("Show every plant"): either way the reader
    // is looking at this list, so the page comes to it rather than to the top of the module
    const moved = company || status || was.current
    was.current = company || status
    if (!moved) return undefined
    // after the page change has placed the page, so the move to the list is the last word
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => document.getElementById('ps-every')?.scrollIntoView({ block: 'start', behavior: 'smooth' })) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [company, status])
  const t = exact ? '' : q.trim().toLowerCase()
  // THREE OF EACH (27 Oct'26, the user's call — "as the Overview did"): the list opens on the three
  // largest plants (by capacity) in each status, worst status first; a status's own button lists all
  // of it, and a search always searches every plant
  const sample = band === 'top' && !t
  const hits = useMemo(() => (sample
    ? PF_SAMPLE.flatMap(k => own.filter(p => p.band === k).sort((a, b) => (b.capacity_mw || 0) - (a.capacity_mw || 0)).slice(0, 3))
    : own.filter(p => (band === 'all' || band === 'top' || p.band === band)
      && (!t || `${p.plant} ${pretty(p.plant)} ${p.state || ''} ${p.genco || ''} ${p.remark || ''}`.toLowerCase().includes(t)))), [own, band, t, sample])
  const counts = useMemo(() => Object.fromEntries(PF_FILTERS.map(([k]) => [k, k === 'all' ? own.length
    : k === 'top' ? PF_SAMPLE.reduce((s, b) => s + Math.min(3, own.filter(p => p.band === b).length), 0)
      : own.filter(p => p.band === k).length])), [own])
  const pages = Math.max(1, Math.ceil(hits.length / PF_PAGE))
  const pg = Math.min(page, pages - 1)
  const shown = hits.slice(pg * PF_PAGE, pg * PF_PAGE + PF_PAGE)
  return (
    <div className="bx-pf">
      {/* what the list holds — one line, always there, so narrowing to a company moves nothing */}
      <p className="bx-pf-scope">
        {exact
          // the sentence in ONE span: in a flex row each bare text run is its own item, and
          // "MAHAGENCO" and "'s plants" sat a gap apart
          ? <><span><b>{company}</b>&rsquo;s plants in CEA&rsquo;s report · {own.length}</span><a href="#/insights/stocks">Show every plant</a></>
          : <span>Every plant in CEA&rsquo;s report · {plants.length}</span>}
      </p>
      <div className="bx-pf-bar">
        <label className="bx-pf-search">
          <Search aria-hidden="true" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder={phone ? 'Plant, state or company' : 'Find a plant, state, company or remark'} aria-label="Find a plant" />
          {/* with a company opened from the stock watch the ✕ is a LINK to every plant, so the
              address loses the company too (Back still returns to it) */}
          {q && (company
            ? <a className="clr" href="#/insights/stocks" aria-label="Clear the search — every plant"><X /></a>
            : <button onClick={() => { setQ(''); setPage(0) }} aria-label="Clear the search"><X /></button>)}
        </label>
        <div className="bx-seg sm bx-pf-filter" role="tablist" aria-label="Status">
          {PF_FILTERS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={band === k} className={band === k ? 'on' : ''} onClick={() => { setBand(k); setPage(0) }}>
              {k !== 'all' && <i style={{ background: STATUS[k] }} aria-hidden="true" />}{l}<span>{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      {/* a phone: one compact row a plant — its status, its stock against normative and its stock;
          a tap opens the plant with CEA's remark in full (twelve cards with six fields each ran
          the page to four screens) */}
      {phone ? (
        <ul className="bx-pf-list">
          {shown.map(p => (
            <li key={`${p.plant}|${p.state}`}>
              <button type="button" onClick={() => { setPick(p); setPickOpen(true) }} aria-haspopup="dialog">
                <i className="dot" style={{ background: STATUS[p.band] }} aria-hidden="true" />
                <span className="t"><b>{pretty(p.plant)}</b><small>{BAND_LABEL[p.band]}{p.state ? ` · ${p.state}` : ''}</small></span>
                <span className="n"><b>{p.pct == null ? '—' : `${num(p.pct, 0)}%`}</b><small>{p.stock_kt == null ? '—' : `${num(p.stock_kt, 1)} kt`}</small></span>
                <ChevronRight className="go" aria-hidden="true" />
              </button>
            </li>
          ))}
          {Array.from({ length: PF_PAGE - shown.length }).map((_, i) => (
            <li key={`pad${i}`} className="pad" aria-hidden="true">{i === 0 && !shown.length ? 'No plant matches the search.' : ''}</li>
          ))}
        </ul>
      ) : <div className="bx-table-wrap">
        <table className="bx-table bx-pf-table">
          <thead><tr><th>Plant</th><th className="sg">State</th><th className="sg">Company</th><th>Status</th><th data-short="Of normative">Stock against normative</th><th>Stock</th><th>Normative</th><th>CEA&rsquo;s remark</th></tr></thead>
          <tbody>
            {shown.map(p => (
              <tr key={`${p.plant}|${p.state}`}>
                {/* STATE AND COMPANY AS COLUMNS on a wide screen (27 Oct'26 — both are short: 14 and 9 letters at most,
                    and one line a plant is a shorter table); a narrower one keeps them on the line under the name */}
                <td title={pretty(p.plant)}><b>{pretty(p.plant)}</b>
                  <small className="sgl">{[p.state, p.genco].filter(Boolean).join(' · ')}{p.cat !== 'domestic' ? ` · ${CAT_SHORT[p.cat]}` : ''}</small>
                  {p.cat !== 'domestic' && <small className="cat">{CAT_SHORT[p.cat]}</small>}</td>
                <td className="sg">{p.state || '—'}</td><td className="sg">{p.genco || '—'}</td>
                <td><span className={`bx-pf-st ${p.band}`}><i style={{ background: STATUS[p.band] }} aria-hidden="true" />{BAND_LABEL[p.band]}</span></td>
                {/* the page's one stock bar (StockBar): to 150%, the normative stock ticked, CEA's 25% faint */}
                <td><StockBar pct={p.pct} band={p.band} dec={0} /></td>
                <td>{p.stock_kt == null ? '—' : num(p.stock_kt, 1)}</td>
                <td>{p.normative_kt == null ? '—' : num(p.normative_kt, 0)}</td>
                <td className="rm" title={p.remark || undefined}>{p.remark || '—'}</td>
              </tr>
            ))}
            {Array.from({ length: PF_PAGE - shown.length }).map((_, i) => (
              <tr key={`pad${i}`} className="pad" aria-hidden="true"><td colSpan={8}>{i === 0 && !shown.length ? 'No plant matches the search.' : ' '}</td></tr>
            ))}
          </tbody>
        </table>
      </div>}
      {phone && <Sheet open={pickOpen} onClose={() => setPickOpen(false)} label={pick ? pretty(pick.plant) : 'Plant'}>{pick && <PlantDetail p={pick} />}</Sheet>}
      <div className="bx-pf-foot">
        <span>{hits.length ? `${pg * PF_PAGE + 1}–${pg * PF_PAGE + shown.length} of ${hits.length} plants` : 'No plant matches'}</span>
        <div className="pager">
          <button disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Previous page"><ChevronLeft /></button>
          <span>Page {pg + 1} of {pages}</span>
          <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Next page"><ChevronRight /></button>
        </div>
      </div>
    </div>
  )
}

/** CEA'S SUMMARY BY COAL AND LOCATION, ON A PHONE (10 Nov'26 — as cards, seven rows of nine figures ran to
 *  1,468px): one compact row each — the coal and where, its stock against normative and its total stock —
 *  in the plant finder's own anatomy; a tap opens every figure CEA prints for it. */
function BasisRows({ rows, when }) {
  const [pick, setPick] = useState(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <ul className="bx-pf-list bx-basis-list">
        {rows.map(r => (
          <li key={r.key} className={r.key === 'TOTAL' ? 'tot' : r.total ? 'sub-tot' : undefined}>
            <button type="button" onClick={() => { setPick(r); setOpen(true) }} aria-haspopup="dialog">
              <i className="dot" style={{ background: STATUS[r.band] || STATUS.unreported }} aria-hidden="true" />
              <span className="t"><b>{r.coal}</b><small>{[r.where, `${num(r.plants, 0)} plants`].filter(Boolean).join(' · ')}</small></span>
              <span className="n"><b>{r.pct == null ? '—' : `${num(r.pct, 0)}%`}</b><small>{num(r.stock_total_kt, 1)} kt</small></span>
              <ChevronRight className="go" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={open} onClose={() => setOpen(false)} label={pick ? `${pick.coal}${pick.where ? `, ${pick.where}` : ''}` : 'Plants'}>
        {pick && (
          <div className="bx-kd bx-pd">
            <h3>{pick.coal}{pick.where ? ` · ${pick.where}` : ''}</h3>
            <p className="when">{when} · &rsquo;000 t</p>
            <p className="st"><StockBar pct={pick.pct} band={pick.band} dec={0} label={`${num(pick.pct, 0)}% of the normative stock`} /></p>
            <dl className="pts two">
              <div><dt>Plants</dt><dd>{num(pick.plants, 0)}</dd></div>
              <div><dt>Capacity</dt><dd>{num(pick.capacity_mw, 0)} MW</dd></div>
              <div><dt>Daily requirement</dt><dd>{num(pick.daily_req_kt, 1)}</dd></div>
              <div><dt>Stock · domestic</dt><dd>{num(pick.stock_domestic_kt, 1)}</dd></div>
              <div><dt>Stock · imported</dt><dd>{num(pick.stock_import_kt, 1)}</dd></div>
              <div className="last"><dt>Stock · total</dt><dd>{num(pick.stock_total_kt, 1)}</dd></div>
              <div><dt>Normative stock</dt><dd>{num(pick.normative_kt, 1)}</dd></div>
            </dl>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Stocks({ data, item }) {
  const B = data.boards?.plant_stocks
  const pc = usePC()
  if (!B) return <Head title="Coal stock at power plants" meta="CEA's daily coal stock report has not been read yet." />
  const total = B.plants_total || B.plants_reported
  const rows = B.history?.rows || []
  const col = f => B.history.fields.indexOf(f)
  const pseudo = (id, f) => ({ id, freq: 'D', points: rows.filter(r => r[col(f)] != null).map(r => [r[0], r[col(f)]]) })
  const prevLabel = B.prev ? `vs ${day(B.prev).replace(/ \d{4}$/, '')}` : ''
  const f = key => B.strip.find(x => x.key === key) || {}
  // every tile carries its own last seven days (plantstock.build) — the normative stock too
  const k = (key, unitCh) => {
    const x = f(key)
    // ONE TILE ANATOMY ON EVERY TAB (13 Nov'26, the user: "the vertical length … same as the Production & offtake
    // tab"): the change BESIDE the number (inline), the trend, one source line at the foot — these tiles were
    // 243px with the change on a line of its own and no source, Production & offtake's 236px
    return <Kpi key={key} label={x.label} value={x.value} dec={x.decimals} unit={x.unit} when={day(B.as_of)} inline
      change={unitCh === '%' ? x.change?.pct : x.change?.abs} changeUnit={unitCh} changeLabel={x.change?.abs != null ? prevLabel : ''}
      trend={x.trend ?? null} source={B.source} sourceUrl={B.source_url} />
  }
  const prevShort = B.prev ? day(B.prev).replace(/ \d{4}$/, '') : ''
  const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : 'no change')
  return (
    <>
      <Head title="Coal stock at power plants" meta={`As of ${day(B.as_of)}`} />
      <div className="wrap bx-in-main">
      <Strip>
        {k('stock', '%')}
        {k('normative', '%')}
        {k('pct', 'pp')}
        {k('critical', 'n')}
      </Strip>
      <div className="bx-in-grid">
        {/* ONE compact panel (22 Oct'26: the two tall bar panels "looked like a ppt"): the
            plants by stock status as a proportion bar over five hairline cells, then the
            critical plants by CEA's category as four more — the KPI strip's own anatomy */}
        {/* TWO RINGS, side by side, in the space the strips took (22 Oct'26: the strips, the
            proportion line and the note under them "looked bad"). Each ring's legend carries
            what the note used to say — the range beside each status, CEA's beside critical. */}
        <Panel className="wide" title="Where the plants stand" unit={`${day(B.as_of)} · ${total} plants`} source={B.source} sourceUrl={B.source_url} legend={false}>
          <div className="bx-ps-rings">
            <PlantRing title="By stock status" center={total} centerLabel="plants"
              items={B.bands.map(b => ({ key: b.key, label: b.label, note: b.key === 'critical' ? 'CEA · under 25%' : b.key === 'not_operating' ? '' : b.range,
                value: b.plants, extra: gw(b.capacity_mw), color: STATUS[b.key] }))} />
            <PlantRing name="Critical plants, by CEA’s category" title={<>Critical plants, by CEA&rsquo;s category{prevShort && <small>change on {prevShort}</small>}</>} center={f('critical').value ?? '—'} centerLabel="critical"
              items={B.critical_by_category.map((c, i) => ({ key: c.key, label: CAT_SHORT[c.key] || c.label, note: c.plants ? `of ${c.plants}` : 'none',
                value: c.critical || 0, extra: c.prev != null && c.critical != null ? (c.critical === c.prev ? '±0' : signed(c.critical - c.prev)) : '', color: CAT_RING[i] }))} />
          </div>
        </Panel>
        {SHOW_STOCK_HISTORY && <>
          <Panel title="Plants with critical stock, each day" unit="Every daily report since April, plants" source={B.source} sourceUrl={B.source_url}>
            <Trend days={400} fmt={v => `${num(v, 0)} plants`} items={[{ s: pseudo('ps_crit', 'critical_plants'), label: 'Critical plants', color: STATUS.critical }]} />
          </Panel>
          <Panel title="Stock against normative, each day" unit="Every daily report since April, % of the normative stock, all plants" source={B.source} sourceUrl={B.source_url}>
            <Trend days={400} fmt={v => `${num(v, 0)}%`} items={[{ s: pseudo('ps_pct', 'pct_of_normative'), label: 'Stock against normative', color: NAVY }]} />
          </Panel>
        </>}
        <Panel className="wide" title="By coal and location" unit={`${day(B.as_of)} · '000 t`} source={B.source} sourceUrl={B.source_url} legend={false}>
          {pc ? <BasisRows rows={B.basis} when={day(B.as_of)} /> : <div className="bx-table-wrap">
            <table className="bx-table bx-supply bx-ps-basis">
              <thead>
                <tr className="grp"><th rowSpan={2}>Plants</th><th rowSpan={2}>Number</th><th rowSpan={2}>Capacity</th><th rowSpan={2}>Daily requirement</th>
                  <th colSpan={3}>Stock</th><th rowSpan={2}>Normative stock</th><th rowSpan={2}>Against normative</th></tr>
                <tr><th>Domestic</th><th>Imported</th><th>Total</th></tr>
              </thead>
              <tbody>
                {B.basis.map(r => (
                  <tr key={r.key} className={r.key === 'TOTAL' ? 'tot' : r.total ? 'sub-tot' : ''}>
                    <td><b>{r.coal}</b>{r.where && <small>{r.where}</small>}</td>
                    <td>{num(r.plants, 0)}</td><td>{num(r.capacity_mw, 0)} MW</td><td>{num(r.daily_req_kt, 1)}</td>
                    <td>{num(r.stock_domestic_kt, 1)}</td><td>{num(r.stock_import_kt, 1)}</td><td><b>{num(r.stock_total_kt, 1)}</b></td>
                    <td>{num(r.normative_kt, 1)}</td><td className="sb"><StockBar pct={r.pct} band={r.band} dec={0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </Panel>
        <Panel id="ps-every" className="wide" title="Every plant" unit={`${day(B.as_of)} · '000 t`} source={B.source} sourceUrl={B.source_url} legend={false}>
          {/* the address names a company (the stock watch) or a status (the Overview's ring) */}
          <PlantFinder plants={B.plants || []} company={WATCH.includes(item) ? null : item} status={WATCH.includes(item) ? item : null} />
          {B.flagged != null && f('critical').value != null && B.flagged !== f('critical').value &&
            <p className="bx-in-tnote">{`That day CEA marks ${B.flagged} plants critical in its list, while its summary prints ${f('critical').value}; the figures above are the summary's.`}</p>}
        </Panel>
      </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ coal in electricity
/** A LEGEND THAT SWITCHES (27 Oct'26, the user's call): each item a button that shows or hides its
 *  series — "only demand and thermal" is two clicks. The last one shown cannot be hidden. The
 *  buttons never move: hiding dims an item, it does not remove it. */
// pass 78 (13 Nov'26, "better looking … legends and selections"): pointing at an item lights its series in the
// chart (`onFocus`)
// ALL FIRST, THEN PICK (pass 84, the user: one tap hid one series, a double-click — which no phone can find — showed
// one alone, and "Show all" came and went): an "All" chip leads the row, pressed while every series shows. From All,
// a tap on a series shows THAT SERIES ALONE (what a reader wants first: "just thermal"); after that each tap adds or
// takes away one, and taking away the last — or adding back every one — is All again (`pickSeries`). Nothing is
// ever hidden or disabled, so no chip moves; a series in the chart is tinted, one out of it is dashed.
const pickSeries = (keys, off, k) => {
  if (!off.size) return new Set(keys.filter(x => x !== k))          // from All: that one alone
  const x = new Set(off)
  if (x.has(k)) x.delete(k); else x.add(k)
  return x.size >= keys.length ? new Set() : x                       // none left: All again
}
function ToggleLegend({ items, off, onPick, onAll, onFocus, lit }) {
  const all = off.size === 0
  // a MOUSE pointing, or a keyboard's focus — never a tap, which would leave the chart lit after the finger lifts
  const point = (e, key) => { if (e.pointerType === 'mouse') onFocus?.(key) }
  const focus = (e, key) => { if (e.currentTarget.matches(':focus-visible')) onFocus?.(key) }
  return (
    <div className="bx-legend tog pick" role="group" aria-label="Series in the chart" onPointerLeave={e => point(e, null)}>
      <button type="button" className={`all${all ? ' on' : ''}`} aria-pressed={all} onClick={onAll}
        title={all ? 'Every series is shown — tap one to see it alone' : 'Show every series'} onPointerEnter={e => point(e, null)}>All</button>
      {items.map(it => {
        const on = !off.has(it.key)
        return (
          <button key={it.key} type="button" className={`${on ? 'on' : 'off'}${all ? ' any' : ''}${lit === it.key && on ? ' lit' : ''}`} aria-pressed={!all && on}
            style={{ '--c': it.color }}
            title={all ? `Show ${it.label} alone` : on ? `Take ${it.label} out` : `Add ${it.label}`}
            onClick={() => onPick(it.key)}
            onPointerEnter={e => point(e, on ? it.key : null)} onFocus={e => focus(e, on ? it.key : null)} onBlur={() => onFocus?.(null)}>
            <i className={it.kind || ''} style={{ background: it.color, color: it.color }} data-c={it.color} />{it.label}
          </button>
        )
      })}
    </div>
  )
}
const MIX = [['thermal', 'Thermal', NAVY], ['hydro', 'Hydro', CAT[0]], ['nuclear', 'Nuclear', CAT[3]], ['renewable', 'Renewable', CAT[2]], ['gas', 'Gas', CAT[4]]]

// NO POWER PRICES FOR NOW (23 Oct'26, the user's call — "abhi dam rtm rates nahi dikhane"): the
// day-ahead price's figure and chart are switched off, code kept; one line turns them back on
const SHOW_POWER_PRICES = false

function Power({ data, by }) {
  const shape = data.boards?.day_shapes?.mix
  const gm = data.boards?.gen_mix
  const PS = data.boards?.plant_stocks
  const plf = PS?.plf
  const col = f => (shape ? shape.fields.indexOf(f) + 1 : -1)
  const [off, setOff] = useState(() => new Set())     // the generation chart's hidden series
  const [lit, setLit] = useState(null)                // the series a legend item points at
  const mixKeys = [...MIX.filter(([f]) => col(f) > 0).map(([f]) => f), ...(col('demand') > 0 ? ['demand'] : [])]
  const pick = k => setOff(o => pickSeries(mixKeys, o, k))
  const pc = usePC()
  return (
    <>
      <Head title="Coal in electricity" meta={by.blk_peak?.as_of ? `As of ${day(by.blk_peak.as_of)}` : ''} />
      <div className="wrap bx-in-main">
      <Strip>
        <SeriesKpi s={by.blk_peak} label="Peak demand met" />
        <SeriesKpi s={by.blk_energy} label="Energy met" />
        <SeriesKpi s={by.thermal_share} label="Thermal share of demand met" />
        {/* THERMAL PLF in the day-ahead price's place. CEA prints each plant's month-to-date PLF
            and NO all-India figure, so this is the plants' figures weighted by their capacity
            (plantstock.plf_figure, the coal letter's definition) — and its source line says so */}
        {SHOW_POWER_PRICES ? <SeriesKpi s={by.dam_price} label="Day-ahead price" />
          // MONTH TO DATE, AND SAYS SO (12 Nov'26, the data review): CEA's input is each plant's "Current
          // Month PLF" — not one day's — so the figure is the month to the report's date
          : <Kpi label="Thermal PLF, month to date"
              value={plf?.value} dec={1} unit="%" when={plf && `1–${day(plf.as_of)}`} inline
              change={plf?.change?.abs} changeUnit="pp" note={plf?.note}
              changeLabel={plf?.prev_date ? `vs ${new Date(`${plf.prev_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'this month to date'}
              trend={plf?.trend ?? null} source="CEA daily report" sourceUrl={PS?.source_url} />}
      </Strip>
      <div className="bx-in-grid">
        {shape && (
          <Panel className="wide" title="Generation through the day" unit={day(shape.date)} source={shape.source}
            legend={<ToggleLegend off={off} onPick={pick} onAll={() => setOff(new Set())} onFocus={setLit} lit={lit}
              items={[...MIX.filter(([f]) => col(f) > 0).map(([f, l, c]) => ({ key: f, label: l, color: c, kind: 'box' })), ...(col('demand') > 0 ? [{ key: 'demand', label: 'Demand', color: ACCENT }] : [])]} />}>
            {/* every series is passed, a hidden one flagged: it folds into the stack instead of vanishing */}
            <StackedBlocks height={pc ? 210 : HERO_H} unit="MW" yFmt={axis} vFmt={v => `${num(v, 0)} MW`} ariaLabel="Generation mix through the day"
              focus={lit && !off.has(lit) ? lit : null}
              layers={MIX.filter(([f]) => col(f) > 0).map(([f, l, c]) => ({ id: f, label: l, color: c, hidden: off.has(f), values: shape.blocks.map(b => b[col(f)]) }))}
              line={col('demand') > 0 ? { id: 'demand', label: 'Demand', color: ACCENT, hidden: off.has('demand'), values: shape.blocks.map(b => b[col('demand')]) } : null} />
          </Panel>
        )}
        <Panel title="Thermal share of demand met" unit="Daily" source={by.thermal_share?.source} sourceUrl={by.thermal_share?.source_url}>
          <Trend days={180} unit="%" fmt={v => `${num(v, 1)}%`} items={[{ s: by.thermal_share, label: 'Thermal share', color: NAVY }]} />
        </Panel>
        {/* the electricity India generated, by source — moved here from the Overview (23 Oct'26) */}
        {/* NOT THE THERMAL SHARE ABOVE (12 Nov'26, the data review): a different measure — share of TOTAL
            GENERATION by fuel, for a month, from the Ministry of Coal — beside the daily share of DEMAND MET */}
        <Panel title="Share of total generation, by fuel" short="Generation by fuel" unit={gm ? `${gm.label} · monthly` : ''}
          source={gm?.source} sourceUrl={gm?.source_url}>
          {gm?.rows?.length > 0 && <Donut rows={gm.rows} />}
        </Panel>
        {SHOW_POWER_PRICES && (
          <Panel title="Day-ahead power price" unit="Daily, ₹ per MWh" source={by.dam_price?.source} sourceUrl={by.dam_price?.source_url}>
            <Trend days={180} fmt={v => `₹${num(v, 0)}/MWh`} items={[{ s: by.dam_price, label: 'Day-ahead price', color: NAVY }]} />
          </Panel>
        )}
      </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ imports & prices
const BENCH = [['newcastle', 'Newcastle', NAVY], ['api4', 'Richards Bay (API4)', ACCENT], ['api2', 'ARA (API2)', CAT[2]]]

function Prices({ by }) {
  const bench = BENCH.filter(([id]) => by[id])
  const ic = by.imports_coking, inc = by.imports_noncoking
  const fys = ic && inc ? ic.points.map(p => p[0]).filter(fy => inc.points.some(q => q[0] === fy)) : []
  const val = (s, fy) => s.points.find(p => p[0] === fy)?.[1] ?? null
  return (
    <>
      <Head title="Imports & prices" meta={`ICE Futures, Coal India and the Coal Controller's Organisation, as of ${day(by.newcastle?.as_of)}`} />
      <div className="wrap bx-in-main">
      <Strip>
        <SeriesKpi s={by.newcastle} label="Newcastle" />
        <SeriesKpi s={by.api4} label="Richards Bay (API4)" />
        <SeriesKpi s={by.api2} label="ARA (API2)" />
        <SeriesKpi s={by.swma_premium} label="E-auction premium" />
      </Strip>
      <div className="bx-in-grid">
        <Panel title="Seaborne coal benchmarks" unit="Daily, $ per tonne" source={by.newcastle?.source} sourceUrl={by.newcastle?.source_url}
          legend={bench.map(([, l, c]) => ({ label: l, color: c }))}>
          <Trend days={366} fmt={v => `$${num(v, 2)}/t`} items={bench.map(([id, l, c]) => ({ s: by[id], label: l, color: c }))} />
        </Panel>
        <Panel title="Coal imports" unit="By fiscal year, million tonnes" source={ic?.source} sourceUrl={ic?.source_url}
          legend={[{ label: 'Non-coking', color: NAVY, kind: 'box' }, { label: 'Coking', color: ACCENT, kind: 'box' }]}>
          {fys.length > 0 && (
            <BarChart height={CHART_H} yFmt={axis} vFmt={v => `${num(v, 2)} MT`} ariaLabel="Coal imports by fiscal year"
              categories={fys.map(f => f.replace('20', '').replace('-', '–'))} catTitle={i => `FY ${fys[i]}`}
              groups={[{ id: 'n', label: 'Non-coking', color: NAVY, values: fys.map(f => val(inc, f)) },
                       { id: 'c', label: 'Coking', color: ACCENT, values: fys.map(f => val(ic, f)) }]} />
          )}
        </Panel>
        <Panel title="Coal India e-auction premium" unit="Monthly, % over the notified price" source={by.swma_premium?.source} sourceUrl={by.swma_premium?.source_url}>
          {by.swma_premium && <SeriesChart s={by.swma_premium} height={CHART_H} months={18} />}
        </Panel>
        <Panel title="E-auction quantity allocated" unit="Monthly, million tonnes" source={by.swma_allocated?.source} sourceUrl={by.swma_allocated?.source_url}>
          {by.swma_allocated && <SeriesChart s={by.swma_allocated} height={CHART_H} months={18} />}
        </Panel>
      </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ the page
export default function Insights({ data, module, item = null }) {
  const by = Object.fromEntries(data.series.map(s => [s.id, s]))
  const asked = ALIAS[module] || module
  const mod = SHOWN_MODULES.some(([k]) => k === asked) ? asked : 'overview'
  const hero = PHOTOS.mineShovel
  const View = { overview: Overview, supply: Supply, auction: Auction, stocks: Stocks, power: Power, prices: Prices, sources: Sources, map: null }[mod]
  // one Daily / MTD / FYTD choice for Overview and Production & offtake: the page is mounted
  // once for every module, so the choice made on one is the one the other opens on
  const [basis, setBasis] = useState('day')
  // the map's code and payload, fetched in the first idle moment (unless the reader saves data)
  useEffect(() => {
    if (navigator.connection?.saveData) return undefined
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 2500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(warmMap, { timeout: 6000 })
    return () => cancel(id)
  }, [])
  // a phone's figures open in ONE sheet, held here; the figure stays mounted while it slides out
  const phone = usePhone()
  const [fig, setFig] = useState(null)
  const [figOpen, setFigOpen] = useState(false)
  const openFig = useCallback(f => { setFig(f); setFigOpen(true) }, [])
  const at = Math.max(0, SHOWN_MODULES.findIndex(([k]) => k === mod))
  // THE MODULE BAR'S ONE HIGHLIGHT (flags.BANDS, 5 Nov'26): on a desktop the tabs fill the card, so they
  // are not equal widths — the highlight is measured from the open tab and slides to the next one
  // (this page stays mounted from module to module). Written to the DOM, never React state.
  const tabs = useRef(null)
  useLayoutEffect(() => {
    const el = tabs.current
    if (!BANDS || !el) return undefined
    const place = () => {
      const a = el.querySelector('a.on')
      if (!a) return
      el.style.setProperty('--ix', `${a.offsetLeft}px`)
      el.style.setProperty('--iw', `${a.offsetWidth}px`)
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mod])
  return (
    <KpiOpen.Provider value={phone ? openFig : null}>
    <div className={`bx-insights${BANDS ? ' v-band' : ''}`}>
      {/* THE NAVY BAND (5 Nov'26, flags.BANDS): the photo head under a fade read as unfinished; the
          title now sits large on a navy band and the modules' card rises out of its foot */}
      {BANDS ? (
        <PageBand crumb="Market Insights" title={<>Market <em>Insights</em></>} sheet="var(--bg-soft)" photo={hero}
          sub={<span className="bx-band-pill">Last updated <b>{day(data.data_as_of)}</b></span>} />
      ) : (
      <section className="bx-in-head">
        <div className="bg" aria-hidden="true"><Photo p={hero} eager sizes="100vw" /></div>
        <div className="wrap in-head">
          <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><span>Market Insights</span></nav>
          <span className="eyebrow">Market data</span>
          <h1>Market <em>Insights</em></h1>
          {/* one plain line (22 Oct'26): the lede and three "facts" read as machine-written */}
          <p className="bx-in-facts"><span>Last updated <b>{day(data.data_as_of)}</b></span></p>
        </div>
        <a className="bx-photo-credit" href={hero.source} target="_blank" rel="noreferrer">Dudhichua mine, Singrauli · {hero.author} · {hero.license}</a>
      </section>
      )}

      {/* the modules on ONE floating card that rises out of the photo (v28): a line icon per
          module, hairline dividers, the open one on a soft wash with the accent under it */}
      <nav className="bx-in-nav" aria-label="Modules">
        <div className="wrap">
          <div ref={tabs} className="bx-in-tabs" style={{ '--n': SHOWN_MODULES.length, '--at': at }}>
            {SHOWN_MODULES.map(([k, l]) => {
              const I = MODULE_ICON[k]
              return (
                <a key={k} href={k === 'overview' ? '#/insights' : `#/insights/${k}`} className={k === mod ? 'on' : ''}
                  aria-current={k === mod ? 'page' : undefined}
                  onPointerEnter={k === 'map' ? warmMap : undefined} onFocus={k === 'map' ? warmMap : undefined}>{I && <I aria-hidden="true" />}<span className="l">{l}</span><span className="s" aria-hidden="true">{MODULE_SHORT[k] || l}</span></a>
              )
            })}
            {/* a phone: ONE accent that slides to the open module (website.css v34); the
                desktop keeps its accent under each tab */}
            <i className="bx-in-ind" aria-hidden="true" />
          </div>
        </div>
      </nav>

      {/* every module: its title band (edge to edge, white) and then its figures in the page
          column — the coal map included, so nothing on this page starts at a different edge */}
      <div className={`bx-in-body${mod === 'map' ? ' is-map' : ''}`} id="insights-body">
        {mod === 'map'
          ? <Suspense fallback={<><Head title="India coal map" meta="Loading the plants, the mines and the coal companies…" /><div className="cm-loading"><i /><i /><i /></div></>}><CoalMap /></Suspense>
          : <View data={data} by={by} basis={basis} setBasis={setBasis} item={item} />}
        {/* the module's foot — also the phone's period dock's end marker (PeriodDock), so it stays when empty; its
            "Where the figures come from" link went with the Sources module (16 Nov'26) */}
        <div className="wrap">
          <div className="bx-in-more">
            {DATA_CENTRE &&<a href="#/explorer">Every series, with its full history <ArrowRight /></a>}
          </div>
        </div>
      </div>
    </div>
    {phone && <Sheet open={figOpen} onClose={() => setFigOpen(false)} label={fig?.label || 'Figure'}>{fig && <KpiDetail fig={fig} />}</Sheet>}
    </KpiOpen.Provider>
  )
}
