// Pieces the data centre's pages share: the coal series it shows (four groups of four),
// the series tile, the search box, and a series' readings.
//
// AS PUBLISHED. These are other organisations' figures, so the data centre prints them
// as their source publishes them: the latest reading, the reading before it, the same
// month a year earlier — values, not percentages we derived. A comparison is printed only
// where the SOURCE publishes it (Coal India's dashboard publishes its year-to-date growth;
// the e-auction summary publishes its premium), and it says so.
import { useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { ACCENT, BarChart, LineChart, Spark } from './charts.jsx'
import { day, month, monthLong, num, unitLabel } from './format.js'
import { toTime } from './api.js'
import { DATA_CENTRE } from './flags.js'

export const FREQ_WORD = { D: 'Daily', M: 'Monthly', A: 'Yearly' }
const DAY = 86400000
const axis = t => num(t, Math.abs(t) < 10 && t % 1 ? 1 : 0)

/** "Coal India" from "Coal India — daily production & offtake dashboard (MoC)". */
export const publisher = s => s.source.split('—')[0].trim()

/** A series as published, as a chart: a year of days as a line, months and years as bars. */
export function SeriesChart({ s, height, months = 36 }) {
  const f = v => `${num(v, s.decimals)} ${unitLabel(s.unit)}`
  if (s.freq === 'D') {
    const last = Date.parse(s.points[s.points.length - 1][0])
    const pts = s.points.filter(([d]) => Date.parse(d) > last - 366 * DAY)
    return <LineChart height={height} yFmt={axis} vFmt={f} xFmt={x => day(new Date(x).toISOString().slice(0, 10))} breakGap={8 * DAY}
      series={[{ id: s.id, label: s.short, color: ACCENT, points: toTime(pts), area: true }]} ariaLabel={s.title} />
  }
  const pts = s.freq === 'A' ? s.points : s.points.slice(-months)
  return <BarChart height={height} yFmt={axis} vFmt={f} ariaLabel={s.title}
    categories={pts.map(p => (s.freq === 'A' ? p[0].replace('20', '').replace('-', '–') : month(p[0])))}
    catTitle={i => (s.freq === 'A' ? `FY ${pts[i][0]}` : monthLong(pts[i][0]))}
    groups={[{ id: s.id, label: s.short, color: ACCENT, values: pts.map(p => p[1]) }]} />
}

/** The coal series the data centre shows: FOUR GROUPS OF FOUR, on purpose — the grid is
 *  symmetric (a photo cover and four equal tiles per row) and the list stays short.
 *  Each item is [series id, its label inside the group]. `photo` keys media.PHOTOS. */
export const COAL_GROUPS = [
  { key: 'production', title: 'Production', blurb: 'What India mines', photo: 'mineDragline',
    items: [['cil_production_daily', 'Coal India'], ['msg_production', 'All India'],
            ['msg_production_captive', 'Captive & commercial mines'], ['cco_production', 'All India, by fiscal year']] },
  { key: 'despatch', title: 'Despatch', blurb: 'What leaves the mines', photo: 'mineShovel',
    items: [['cil_offtake_daily', 'Coal India'], ['msg_offtake', 'All India'],
            ['msg_offtake_cil', 'Coal India, by month'], ['sector_power', 'To power stations']] },
  { key: 'prices', title: 'Prices and auctions', blurb: 'What coal sells for', photo: 'portParadip',
    items: [['swma_premium', 'E-auction premium'], ['swma_allocated', 'E-auction quantity sold'],
            ['newcastle', 'Newcastle, Australia'], ['api4', 'Richards Bay, South Africa']] },
  { key: 'movement', title: 'Rail and imports', blurb: 'How coal moves, and what India buys abroad', photo: 'railSilo',
    items: [['fois_rakes', 'Rakes loaded'], ['cil_mode_rail', 'Coal India, sent by rail'],
            ['cco_imports', 'All coal imports'], ['imports_noncoking', 'Non-coking coal imports']] },
]
export const COAL_IDS = COAL_GROUPS.flatMap(g => g.items.map(i => i[0]))
export const groupOf = id => COAL_GROUPS.find(g => g.items.some(i => i[0] === id))
export const labelOf = id => groupOf(id)?.items.find(i => i[0] === id)?.[1]

/** fresh / stale / paused */
export const statusOf = s => (s.withheld ? 'paused' : s.stale ? 'stale' : 'fresh')

/** The latest reading, as published. */
export function latestOf(s) {
  const st = s.stats || {}
  if (s.freq === 'A') return { value: st.latest?.value, when: `FY ${st.latest?.fy}` }
  if (s.freq === 'M') return { value: st.latest?.value, when: month(st.latest?.m) }
  return { value: st.latest?.value, when: day(st.latest?.date) }
}

/** The readings to set beside the latest one — raw values with their dates, plus any
 *  comparison the source itself published. Nothing here is a percentage we computed. */
export function readingsOf(s) {
  const st = s.stats || {}
  const out = []
  const prev = s.freq === 'A' ? st.yoy : s.freq === 'M' ? st.mom : st.dod
  if (prev?.base != null) out.push({ k: s.freq === 'A' ? 'The year before' : 'The reading before', v: prev.base, when: s.freq === 'A' ? `FY ${prev.base_label}` : prev.base_label })
  if (s.freq === 'M' && st.yoy?.base != null) out.push({ k: 'A year earlier', v: st.yoy.base, when: st.yoy.base_label })
  const pub = Object.values(st).find(c => c && c.published && c.pct != null)
  if (pub) out.push({ k: `${pub.label}, as published`, v: pub.value, unit: pub.unit, dec: pub.decimals, pct: pub.pct, when: `against ${pub.base_label}` })
  return out
}

/** The series' own recent shape for a sparkline — raw readings, nothing derived. */
export const recent = s => (s.freq === 'D' ? s.points.slice(-90) : s.points.slice(-24)).map(p => p[1])

// a series' own page lives in the data centre: with the data centre off there is no page,
// so no link (flags.DATA_CENTRE) — callers render a plain figure instead of an anchor
export const seriesHref = id => (DATA_CENTRE ? `#/explorer/${id}` : null)

/** One series as a tile: its label, cadence and date, the latest value, its recent shape.
 *  Every tile has the same anatomy and the same size, so a row of them is even. */
export function SeriesTile({ s, label }) {
  const r = latestOf(s)
  const st = statusOf(s)
  return (
    <a className="bx-tile" href={seriesHref(s.id)} aria-label={`${label || s.title}: ${r.value == null ? 'no reading' : `${num(r.value, s.decimals)} ${unitLabel(s.unit)}`}, ${r.when}`}>
      <span className="lbl">{label || s.title}</span>
      <span className="sub">{st !== 'fresh' && <i className={`dot ${st}`} title={st === 'paused' ? 'Paused — its page says why' : 'Not updated recently by its source'} />}{FREQ_WORD[s.freq]} · {r.when}</span>
      <span className="val"><b>{r.value == null ? '—' : num(r.value, s.decimals)}</b><small>{unitLabel(s.unit)}</small></span>
      <span className="sp"><Spark values={recent(s)} color={st === 'fresh' ? '#F1885B' : '#a3adbb'} height={36} /></span>
      <ArrowUpRight className="go" />
    </a>
  )
}

/** A search box that finds a series by name, source or topic and goes to it. */
export function SeriesSearch({ series, onPick, placeholder = 'Search series', big = false, exclude = [] }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const box = useRef(null)
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    const pool = series.filter(s => !exclude.includes(s.id))
    const words = t.split(/\s+/)
    return pool.filter(s => {
      const h = `${s.title} ${s.short} ${s.source} ${s.group} ${groupOf(s.id)?.title || ''} ${labelOf(s.id) || ''}`.toLowerCase()
      return words.every(w => h.includes(w))
    }).slice(0, 8)
  }, [q, series, exclude])
  const pick = (s) => { setQ(''); setOpen(false); onPick(s.id) }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(hits.length - 1, x + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)) }
    else if (e.key === 'Enter' && hits[i]) { e.preventDefault(); pick(hits[i]) }
    else if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur() }
  }
  return (
    <div className={`bx-find${big ? ' big' : ''}`} ref={box}
      onBlur={e => { if (!box.current?.contains(e.relatedTarget)) setOpen(false) }}>
      <Search />
      <input value={q} placeholder={placeholder} aria-label={placeholder} role="combobox" aria-expanded={open && hits.length > 0}
        onChange={e => { setQ(e.target.value); setOpen(true); setI(0) }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {/* every search box on the site can be cleared in one tap (27 Oct'26, the user's call) */}
      {q && <button type="button" className="clr" onMouseDown={e => e.preventDefault()} onClick={() => { setQ(''); setI(0) }} aria-label="Clear the search"><X /></button>}
      {open && q.trim() && (
        <div className="bx-find-list" role="listbox">
          {hits.length ? hits.map((s, k) => {
            const r = latestOf(s)
            return (
              <button key={s.id} role="option" aria-selected={k === i} className={k === i ? 'on' : ''}
                onMouseEnter={() => setI(k)} onMouseDown={e => e.preventDefault()} onClick={() => pick(s)}>
                <span><b>{s.title}</b><small>{groupOf(s.id)?.title || s.group} · {FREQ_WORD[s.freq].toLowerCase()}</small></span>
                <em>{r.value == null ? '' : `${num(r.value, s.decimals)} ${unitLabel(s.unit)}`}</em>
              </button>
            )
          }) : <div className="none">No series matches &ldquo;{q}&rdquo;.</div>}
        </div>
      )}
    </div>
  )
}
