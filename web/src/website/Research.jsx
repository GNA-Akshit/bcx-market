// RESEARCH & REPORTS (#/research) — what BCX publishes about the coal market, and how.
//
// One format is live: the India Coal Market Daily (#/newsletter), every morning since its
// first issue. The weekly monitor and the monthly review are planned, and say so the way
// the Legal register does — what each will hold, "coming up", a way to be told — never a
// link to a report that does not exist and never a date we have not committed to.
// Reached from the footer and from the daily letter (not the top nav, by choice).
import { ArrowRight, BarChart3, BellRing, CalendarDays, ChevronRight, Clock3, FileText, Newspaper, ScrollText, Scale } from 'lucide-react'
import { CONTACT } from './content.js'
import { DATA_CENTRE } from './flags.js'
import { day, dayLong } from './format.js'

const PLANNED = [
  { key: 'weekly', icon: CalendarDays, cadence: 'Weekly', title: 'Coal market monitor',
    what: 'Seven reported days at a glance: despatch against target, stocks at the plants, rakes, and the week in power demand and prices.' },
  { key: 'monthly', icon: BarChart3, cadence: 'Monthly', title: 'Coal sector review',
    what: 'The month’s production and despatch by producer, e-auction premiums, imports and the policy changes that moved the market.' },
]

// how the site handles other organisations' figures — each one true of the site today. NOT SHOWN
// since 23 Oct'26 (no methodology on the site — management); SHOW_METHOD brings it back here and
// on the Sources page
export const SHOW_METHOD = false
export const METHOD = [
  [ScrollText, 'As published', 'Figures are reproduced as each public body publishes them. We do not adjust, smooth or fill them.'],
  [Clock3, 'Every figure keeps its date', 'Sources report on different days. Each figure carries its own date, so two numbers from different days are never presented as one moment.'],
  [Scale, 'Like with like', 'A change is measured only against a comparable period — the same days last year, the previous published day — and says which.'],
  [FileText, 'A broken feed is withheld', 'When a source stops carrying its full coverage, its figures are withheld with the reason printed, not estimated.'],
]

const notify = t => `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Notify me: BCX ${t.toLowerCase()}`)}`

export default function Research({ issues }) {
  const latest = issues?.[0], first = issues?.[issues.length - 1]
  return (
    <div className="bx-research">
      <section className="bx-rs-hero">
        <div className="wrap">
          <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><a href="#/insights">Market Insights</a><ChevronRight /><span>Research &amp; reports</span></nav>
          <span className="eyebrow">Research &amp; reports</span>
          <h1>Research on India&rsquo;s <em>coal market</em></h1>
          <p className="lede">What BCX publishes about the coal market: a letter every morning, with a weekly monitor and a monthly
            review to come.</p>
        </div>
      </section>

      <section className="bx-rs-list">
        <div className="wrap">
          <a className="bx-rs-live" href="#/newsletter">
            <span className="ic"><Newspaper /></span>
            <span className="tx">
              <span className="k">Daily · live</span>
              <b>India Coal Market Daily</b>
              <span className="what">Production and despatch, stocks at the plants, power demand and the day&rsquo;s coal news.</span>
              <span className="meta">{latest ? <>Latest issue {dayLong(latest.date)} · {issues.length} issues since {day(first.date)}</> : 'Every morning at 09:00 IST'}</span>
            </span>
            <span className="bx-btn primary">Read the latest issue <ArrowRight /></span>
          </a>
          <div className="bx-rs-planned">
            {PLANNED.map(p => (
              <div key={p.key} className="bx-rs-card">
                <span className="ic"><p.icon /></span>
                <span className="k">{p.cadence} · coming up</span>
                <b>{p.title}</b>
                <p>{p.what}</p>
                <a className="bx-link" href={notify(`${p.cadence} ${p.title}`)}><BellRing /> Ask to be notified</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {SHOW_METHOD && <section className="bx-rs-method">
        <div className="wrap">
          <div className="bx-dc2-sh"><h2>How we handle the figures</h2><p>The same rules on every page of this site</p></div>
          <div className="bx-rs-rules">
            {METHOD.map(([I, t, p]) => <div key={t}><span className="ic"><I /></span><b>{t}</b><p>{p}</p></div>)}
          </div>
          <p className="bx-rs-links">
            <a className="bx-link" href="#/insights">Market Insights <ArrowRight /></a>
            {DATA_CENTRE && <a className="bx-link" href="#/explorer">The data centre <ArrowRight /></a>}
            <a className="bx-link" href="#/insights/sources">Our sources <ArrowRight /></a>
          </p>
        </div>
      </section>}
    </div>
  )
}
