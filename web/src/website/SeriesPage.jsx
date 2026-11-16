// ONE SERIES, ONE PAGE (#/explorer/<id>) — the series as its source publishes it.
//
// The header is the series' own corner of the coal chain (its group's photograph): the
// title on the left, and on the right, in a card, the latest reading with the reading
// before, the same month a year earlier (values, not percentages we derived) and any
// comparison the source itself publishes; under the title, what the series means in plain
// English. Then one chart of the series; for a monthly series, the same month in every
// year we hold; where it comes from; and the other series in its group, as the same tiles
// the data centre uses. The only control is the range, and it never moves or disappears.
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronRight, Download, Link2, Table2, ChartLine } from 'lucide-react'
import { ACCENT, BarChart, LineChart } from './charts.jsx'
import { day, month, monthLong, num, unitLabel } from './format.js'
import { toTime } from './api.js'
import { Chg, Seg } from './ui.jsx'
import { PHOTOS, Photo } from './media.jsx'
import { WhatItMeans } from './glossary.jsx'
import { FREQ_WORD, SeriesTile, groupOf, labelOf, latestOf, readingsOf, statusOf } from './seriesui.jsx'

const DAY = 86400000
const RANGES = { D: [['3M', 92], ['6M', 183], ['1Y', 366], ['All', null]], M: [['2Y', 24], ['5Y', 60], ['10Y', 120], ['All', null]] }
const axisFmt = t => num(t, Math.abs(t) < 10 && t % 1 ? 1 : 0)
const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The latest month, in every year we hold — the same month side by side takes the season
 *  out of the comparison, and it is a lookup, not a calculation: each row is a published
 *  value. The bars only draw those values to one scale. */
function SameMonth({ s }) {
  const m = s.freq === 'M' ? s.stats?.latest?.m : null
  if (!m) return null
  const rows = s.points.filter(([d, v]) => d.slice(5, 7) === m.slice(5, 7) && d.slice(0, 7) <= m && v != null).reverse()
  if (rows.length < 2) return null
  const top = Math.max(...rows.map(r => Math.abs(r[1])), 1)
  const name = MONTH_NAME[Number(m.slice(5, 7)) - 1]
  return (
    <section className="bx-sp-same">
      <div className="wrap">
        <div className="hd">
          <h2>{name}, year by year</h2>
          <p>The same month in each year we hold, as published. Setting {name} beside {name} keeps a seasonal swing from reading as a change.</p>
        </div>
        <ol className="bx-same">
          {rows.map(([d, v], i) => (
            <li key={d} className={i === 0 ? 'now' : ''}>
              <span className="y">{name.slice(0, 3)} {d.slice(0, 4)}</span>
              <span className="bar"><i style={{ width: `${(Math.abs(v) / top) * 100}%` }} /></span>
              <span className="v"><b>{num(v, s.decimals)}</b> {unitLabel(s.unit)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function cutRange(points, freq, n) {
  if (!n || !points.length) return points
  if (freq === 'M') return points.slice(-n)
  const last = Date.parse(points[points.length - 1][0] + 'T00:00:00Z')
  return points.filter(([d]) => Date.parse(d + 'T00:00:00Z') > last - n * DAY)
}

function downloadCsv(s) {
  const rows = [['date', `${s.id} (${s.unit})`], ...s.points]
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bcx_${s.id}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function DataTable({ s }) {
  const f = v => num(v, s.decimals)
  const rows = s.freq === 'A' ? s.points.map(p => [`FY ${p[0]}`, p[1]]) : s.points.slice(-180).map(p => [(s.freq === 'M' ? month : day)(p[0]), p[1]])
  return (
    <div className="bx-table-wrap bx-sp-table">
      <table className="bx-table">
        <thead><tr><th>{s.freq === 'D' ? 'Date' : 'Period'}</th><th>{s.short} ({unitLabel(s.unit)})</th></tr></thead>
        <tbody>{rows.slice().reverse().map(([k, v]) => <tr key={k}><td>{k}</td><td>{f(v)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export default function SeriesPage({ data, id }) {
  const by = useMemo(() => Object.fromEntries(data.series.map(s => [s.id, s])), [data])
  const s = by[id]
  const [range, setRange] = useState(null)
  const [table, setTable] = useState(false)
  const [copied, setCopied] = useState(false)
  const rangeN = range ?? (s?.freq === 'D' ? 366 : s?.freq === 'M' ? 60 : null)
  const f = v => (v == null ? '—' : `${num(v, s.decimals)} ${unitLabel(s.unit)}`)

  if (!s) {
    return (
      <section className="bx-sp-head"><div className="wrap bx-empty" style={{ minHeight: '40vh', alignContent: 'center' }}>
        <h3>We hold no series called &ldquo;{id}&rdquo;</h3>
        <a className="bx-btn secondary" href="#/explorer"><ArrowLeft />Back to the data centre</a>
      </div></section>
    )
  }

  const r = latestOf(s)
  const st = statusOf(s)
  const reads = readingsOf(s)
  const stamp = s.freq === 'M' ? month : day
  const coverage = s.freq === 'A' ? `FY ${s.points[0][0]} to FY ${s.as_of}` : `${stamp(s.first)} to ${stamp(s.as_of)}`
  const group = groupOf(s.id)
  const photo = PHOTOS[group?.photo] || PHOTOS.plantNight
  const related = group
    ? group.items.filter(([x]) => x !== s.id && by[x]).map(([x, l]) => [by[x], l])
    : data.series.filter(x => x.group === s.group && x.id !== s.id).slice(0, 3).map(x => [x, x.short])
  const pts = s.freq === 'A' ? s.points : cutRange(s.points, s.freq, rangeN)
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/explorer/${s.id}`); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* the address bar holds it */ }
  }

  return (
    <div className="bx-sp">
      <section className="bx-sp-hero">
        <div className="bg" aria-hidden="true"><Photo p={photo} eager sizes="100vw" /></div>
        <div className="wrap in">
          <div className="t">
            <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><a href="#/explorer">Data centre</a><ChevronRight /><span>{group ? group.title : s.group}</span></nav>
            {group && <span className="eyebrow">{group.title} · {labelOf(s.id)}</span>}
            <h1>{s.title}</h1>
            <p className="meta">{FREQ_WORD[s.freq]} · {unitLabel(s.unit)} · as published by <a href={s.source_url} target="_blank" rel="noreferrer">{s.source}</a></p>
            <WhatItMeans id={s.id} />
          </div>
          <div className="bx-sp-card">
            <span className="k">Latest reading</span>
            <span className="v">{r.value == null ? '—' : num(r.value, s.decimals)}<small>{unitLabel(s.unit)}</small></span>
            <span className="w">{s.freq === 'D' ? 'on ' : s.freq === 'M' ? 'in ' : ''}{r.when}{st !== 'fresh' && <em> · the latest published</em>}</span>
            {reads.length > 0 && (
              <dl>
                {reads.map(x => (
                  <div key={x.k}><dt>{x.k}</dt>
                    <dd>{x.unit ? `${num(x.v, x.dec ?? 1)} ${unitLabel(x.unit)}` : f(x.v)}{x.pct != null && <Chg v={x.pct} />}<small>{x.when}</small></dd></div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="bx-sp-chart">
        <div className="wrap">
          {s.withheld && <div className="bx-withheld"><AlertTriangle /><span><b>Paused from {day(s.withheld.from)}.</b> {s.withheld.reason}</span></div>}
          <div className="bx-sp-bar">
            <span className="lbl">{s.freq === 'A' ? 'Each fiscal year, April to March' : `${s.short}, ${unitLabel(s.unit)}`}</span>
            {s.freq !== 'A' && <Seg value={String(rangeN)} onChange={k => setRange(k === 'null' ? null : Number(k))} label="Range"
              options={RANGES[s.freq].map(([l, n]) => [String(n), l])} />}
          </div>
          <div className="bx-sp-plot">
            {table ? <DataTable s={s} />
              : s.freq === 'D'
                ? <LineChart height={400} yFmt={axisFmt} vFmt={f} xFmt={x => day(new Date(x).toISOString().slice(0, 10))} breakGap={8 * DAY}
                    series={[{ id: s.id, label: s.short, color: ACCENT, points: toTime(pts), area: true }]}
                    annotations={s.withheld ? [{ x: Date.parse(pts[pts.length - 1]?.[0]), label: `Paused from ${day(s.withheld.from)}` }] : []} ariaLabel={s.title} />
                : <BarChart height={400} yFmt={axisFmt} vFmt={f} ariaLabel={s.title}
                    categories={pts.map(p => (s.freq === 'A' ? p[0].replace('20', '').replace('-', '–') : month(p[0])))}
                    catTitle={i => (s.freq === 'A' ? `FY ${pts[i][0]}` : monthLong(pts[i][0]))}
                    groups={[{ id: s.id, label: s.short, color: ACCENT, values: pts.map(p => p[1]) }]} />}
          </div>
          <div className="bx-sp-tools">
            <span className="note">{coverage}. Figures as published; we do not recalculate them.</span>
            <span className="acts">
              <button onClick={() => setTable(v => !v)}>{table ? <><ChartLine />Chart</> : <><Table2 />Numbers</>}</button>
              <button onClick={() => downloadCsv(s)}><Download />Download</button>
              <button onClick={copy} className={copied ? 'done' : ''}>{copied ? <><Check />Copied</> : <><Link2 />Copy link</>}</button>
            </span>
          </div>
        </div>
      </section>

      <SameMonth s={s} />

      <section className="bx-sp-more">
        <div className="wrap">
          <div className="bx-sp-two">
            <div>
              <h2>About this data</h2>
              <dl className="bx-dl">
                <div><dt>Published by</dt><dd><a href={s.source_url} target="_blank" rel="noreferrer">{s.source}</a></dd></div>
                <div><dt>How often</dt><dd>{FREQ_WORD[s.freq]}</dd></div>
                <div><dt>Unit</dt><dd>{unitLabel(s.unit)}</dd></div>
                <div><dt>What we hold</dt><dd>{num(s.points.length)} {s.freq === 'D' ? 'days' : s.freq === 'M' ? 'months' : 'years'}, {coverage}</dd></div>
              </dl>
              {s.note && <p className="bx-sp-note">{s.note}</p>}
            </div>
            {related.length > 0 && (
              <div>
                <h2>More on {group ? group.title.toLowerCase() : s.group.toLowerCase()}</h2>
                <div className="bx-tiles three">{related.map(([x, l]) => <SeriesTile key={x.id} s={x} label={l} />)}</div>
                <a className="bx-link" href="#/explorer">{group ? 'Every coal series' : 'Back to the data centre'} <ArrowRight /></a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
