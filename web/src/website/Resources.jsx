// RESOURCES (#/resources) — the public sources behind every figure on this site.
//
// Built from the payload's own source list (payload._sources), so it can never name a
// source we do not read, or miss one we do: one row per PUBLISHER, the reports we read
// from it, what we show from each, how often it publishes and the latest date we hold —
// printed even when old, with "not updated since" or "paused" beside it. Data sources
// only: by request, no regulations or other legal documents are reproduced here.
// Reached from the footer and the data centre.
import { ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { FREQ_WORD } from './seriesui.jsx'
import { day, monthLong } from './format.js'
import { METHOD, SHOW_METHOD } from './Research.jsx'
import { DATA_CENTRE } from './flags.js'
import { PHOTOS } from './media.jsx'

// THE PHOTOGRAPHS' CREDITS. Most of the site's photographs are CC BY-SA, which requires the
// author, the licence and the source to be shown; they moved here from the footer on 23 Oct'26.
function PhotoCredits() {
  return (
    <section className="bx-src-photos">
      <div className="wrap">
        <h2>Photographs</h2>
        <ul>
          {Object.values(PHOTOS).map(p => (
            <li key={p.src}>{p.alt} — <a href={p.source} target="_blank" rel="noreferrer">{p.author}</a>, <a href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a>, via Wikimedia Commons; colour adjusted.</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const stamp =r => (r.last_freq === 'D' ? day(r.last) : r.last_freq === 'M' ? monthLong(r.last.slice(0, 7)) : `FY ${r.last}`)

export default function Resources({ data }) {
  const titles = Object.fromEntries(data.series.map(s => [s.id, s.title]))
  const pubs = new Map()
  for (const r of data.sources || []) {
    const [who, ...rest] = r.source.split('—')
    const p = pubs.get(who.trim()) || { name: who.trim(), reports: [] }
    const report = rest.join('—').trim() || 'Published data'
    p.reports.push({ ...r, report: report[0].toUpperCase() + report.slice(1) })
    pubs.set(p.name, p)
  }
  const list = [...pubs.values()].sort((a, b) => b.reports.reduce((n, r) => n + r.series.length, 0) - a.reports.reduce((n, r) => n + r.series.length, 0))
  return (
    <div className="bx-resources">
      <section className="bx-rs-hero">
        <div className="wrap">
          <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><a href="#/insights">Market Insights</a><ChevronRight /><span>Sources</span></nav>
          <span className="eyebrow">Sources</span>
          <h1>Where the figures <em>come from</em></h1>
          <p className="lede">The {list.length} publishers and {(data.sources || []).length} reports behind the figures on this site.</p>
        </div>
      </section>

      <section className="bx-src-list">
        <div className="wrap">
          <ul>
            {list.map(p => (
              <li key={p.name} className="bx-src-row">
                <h2>{p.name}</h2>
                <div className="reports">
                  {p.reports.map(r => (
                    <div key={r.source} className="rep">
                      <span className="t">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.report} <ArrowUpRight /></a> : r.report}</span>
                      <span className="what">{(() => {
                        const all = r.series.map(id => titles[id]).filter(Boolean)
                        return all.length > 6 ? `${all.slice(0, 6).join('; ')}; and ${all.length - 6} more` : all.join('; ')
                      })()}</span>
                      <span className="when">
                        {r.freqs.map(f => FREQ_WORD[f]).join(', ')}{r.last ? ` · latest ${stamp(r)}` : ''}
                        {!r.current && <small className={r.paused ? 'paused' : 'stale'}>{r.paused ? 'paused' : 'not updated since'}</small>}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PhotoCredits />

      {SHOW_METHOD && <section className="bx-rs-method">
        <div className="wrap">
          <div className="bx-dc2-sh"><h2>How we use them</h2><p>The same rules on every page of this site</p></div>
          <div className="bx-rs-rules">
            {METHOD.map(([I, t, p]) => <div key={t}><span className="ic"><I /></span><b>{t}</b><p>{p}</p></div>)}
          </div>
          <p className="bx-rs-links">
            <a className="bx-link" href="#/insights">Market Insights <ArrowRight /></a>
            {DATA_CENTRE && <a className="bx-link" href="#/explorer">The data centre <ArrowRight /></a>}
            <a className="bx-link" href="#/research">Research &amp; reports <ArrowRight /></a>
          </p>
        </div>
      </section>}
    </div>
  )
}
