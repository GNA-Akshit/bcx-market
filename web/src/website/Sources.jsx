// SOURCES — a Market Insights module (#/insights/sources, 26 Oct'26). It was its own page
// (#/resources, Resources.jsx, kept) that no navigation reached and that kept the site's older look;
// as a module it sits in the module bar, the header lights Market Insights on it, and it wears the
// modules' anatomy — the title card, then white cards on the soft ground.
//
// IT LISTS WHAT THE SITE SHOWS, NOT EVERY FEED WE HOLD. The old page was built from the series list
// alone, so it named sources whose figures appear nowhere now (the IEX prices, the seaborne
// benchmarks) and missed the ones that feed the boards (CMPDI's national dashboard, CEA's daily and
// monthly reports — it called CEA "paused" while Plant stocks showed CEA's report of the day).
// Each report below names the board or series it reads, so its link and latest date come from the
// payload, never typed in; the coal map's base layers are the ones its own credits name.
import { ArrowUpRight } from 'lucide-react'
import { ModuleHead } from './ui.jsx'
import { day, monthLong } from './format.js'
import { PHOTOS } from './media.jsx'

// the photographs' credits card (see below) — switched OFF 26 Oct'26, the user's call
const SHOW_PHOTO_CREDITS = false
// CMPDI's Mine Closure portal: the coal mines' source (the register and the mine list both come from it)
export const MINE_PORTAL = 'https://minecl.cmpdi.co.in/index1.php'
const MOD = { overview: 'Overview', supply: 'Production & offtake', auction: 'E-auctions', map: 'Coal map', stocks: 'Plant stocks', power: 'Coal in electricity' }
const href = k => (k === 'overview' ? '#/insights' : `#/insights/${k}`)

/** Every report behind what the site shows, in order, each with the board or series it reads. */
export function reports(data) {
  const B = data.boards || {}
  const by = Object.fromEntries((data.series || []).map(s => [s.id, s]))
  const cco = (B.yoy?.rows || []).filter(r => r.basis === 'cco').map(r => r.fy).sort().pop()
  const month = m => (m ? monthLong(String(m).slice(0, 7)) : null)
  return [
    { pub: 'Ministry of Coal', name: 'National coal dashboard (CMPDI)', url: B.producers?.source_url, freq: 'Daily', latest: B.producers?.as_of && day(B.producers.as_of),
      what: 'India’s coal production and offtake, producer by producer, for the day and the year to date', on: ['overview'] },
    { pub: 'Ministry of Coal', name: 'Monthly Statistics at a Glance', url: B.sector_dispatch?.source_url || B.gen_mix?.source_url, freq: 'Monthly',
      latest: month(B.sector_dispatch?.month || B.gen_mix?.month),
      what: 'Coal despatched to each industry, India’s electricity by source, and the last full year’s production', on: ['overview', 'supply', 'power'] },
    { pub: 'Ministry of Coal', name: 'Monthly summary of the top 35 mines', freq: 'Monthly',
      what: 'Each flagship mine’s production for the month and its annual target', on: ['map'] },
    // the source of the coal mines (27 Oct'26, the user's call): CMPDI's Mine Closure portal
    { pub: 'Ministry of Coal', name: 'CMPDI Mine Closure portal', url: MINE_PORTAL, freq: 'Register',
      what: 'Every coal mine on the coal map — its owner, command area, state and district, type and closure status', on: ['map'] },
    { pub: 'Coal India', name: 'Daily production & offtake dashboard', url: B.supply?.source_url, freq: 'Daily', latest: B.supply?.as_of && day(B.supply.as_of),
      what: 'Coal India’s production, offtake and targets, company by company', on: ['supply', 'map'] },
    { pub: 'Coal India', name: 'Major coal mines (Super 35 / Super 75)', freq: 'Daily',
      what: 'Each flagship mine’s production against its target, financial year to date', on: ['map'] },
    // the E-auctions module (27 Oct'26)
    { pub: 'Coal India', name: 'Single Window Mode Agnostic e-auction summary', url: B.auction?.source_url, freq: 'Monthly', latest: month(B.auction?.month),
      what: 'Quantity offered and allocated, the share allocated and the premium over the notified price, subsidiary by subsidiary', on: ['auction'] },
    { pub: 'Central Electricity Authority', name: 'Daily coal stock report', url: B.plant_stocks?.source_url, freq: 'Daily',
      latest: B.plant_stocks?.as_of && day(B.plant_stocks.as_of),
      what: 'Coal stock at every thermal power plant, the critical plants and thermal PLF; indigenous and imported coal in stock', on: ['overview', 'stocks', 'power', 'map'] },
    { pub: 'Central Electricity Authority', name: 'Monthly coal statement of thermal power stations', url: B.plant_split?.month?.source_url, freq: 'Monthly',
      latest: month(B.plant_split?.month?.month),
      what: 'Indigenous and imported coal received, for the month and the year to date; each plant’s month on the coal map', on: ['overview', 'map'] },
    { pub: 'Grid Controller of India', name: '15-minute all-India demand and generation', url: by.blk_peak?.source_url, freq: 'Daily',
      latest: by.blk_peak?.as_of && day(by.blk_peak.as_of),
      what: 'Peak demand, energy met, thermal share and generation through the day', on: ['power'] },
    // (Koyla Shakti's imports by month were listed here for an afternoon, 27 Oct'26; the Overview's
    // imports table reads CEA's monthly statement instead, which runs to its latest month)
    { pub: 'Coal Controller’s Organisation', name: 'Provisional Coal Statistics', url: by.cco_production?.source_url, freq: 'Yearly',
      latest: cco && `FY ${cco}`, what: 'India’s coal production and offtake, year by year', on: ['overview'] },
    // THE COAL MAP'S BASE LAYERS ARE NOT LISTED HERE (26 Oct'26, the user's call): the World
    // Resources Institute's plant database, OpenStreetMap's towns and the Survey of India's outline
    // place things on the map, they publish none of its figures — the map's own notes credit them
  ]
}

function Report({ r }) {
  return (
    <li className="bx-src-rep">
      <div className="nm">
        {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.name}<ArrowUpRight aria-hidden="true" /></a> : <b>{r.name}</b>}
      </div>
      {/* what each report covers (r.what) is not printed (27 Oct'26 — read as filler); it stays in reports() */}
      <p className="f"><span>{r.freq}</span>{r.latest && <small>{['Dataset', 'Register'].includes(r.freq) ? r.latest : `Latest ${r.latest}`}</small>}</p>
      <p className="on"><span>On</span>{r.on.map((k, i) => <span key={k}>{i > 0 && ' · '}<a href={href(k)}>{MOD[k]}</a></span>)}</p>
    </li>
  )
}

/** The publishers, in order, each with its reports and the first of their links — the footer's
 *  "Data sources" reads this too, so the two can never list different publishers. */
export function publishers(data) {
  const pubs = []
  for (const r of reports(data)) {
    const p = pubs.find(x => x.name === r.pub)
    if (p) p.reports.push(r)
    else pubs.push({ name: r.pub, reports: [r] })
  }
  return pubs.map(p => ({ ...p, url: p.reports.find(r => r.url)?.url }))
}

export default function Sources({ data }) {
  const list = reports(data)
  const pubs = publishers(data)
  return (
    <>
      <ModuleHead title="Sources" meta={`${pubs.length} publishers · ${list.length} reports`} />
      <div className="wrap bx-in-main">
        <div className="bx-src-cards">
          {pubs.map(p => (
            <section key={p.name} className="bx-in-panel bx-src-card">
              <header><h3>{p.name}</h3><p className="u">{p.reports.length === 1 ? '1 report' : `${p.reports.length} reports`}</p></header>
              <div className="bd"><ul>{p.reports.map(r => <Report key={r.name} r={r} />)}</ul></div>
            </section>
          ))}
          {/* the photographs' credits — OFF since 26 Oct'26 (the user's call), code kept. CC BY-SA
              asks for the credit to be shown, so they must reappear somewhere if this stays off */}
          {SHOW_PHOTO_CREDITS && <section className="bx-in-panel bx-src-card bx-src-credits">
            <header><h3>Photographs</h3><p className="u">{Object.keys(PHOTOS).length} photographs, Wikimedia Commons</p></header>
            <div className="bd">
              <ul>
                {Object.values(PHOTOS).map(p => (
                  <li key={p.src}>{p.alt} — <a href={p.source} target="_blank" rel="noreferrer">{p.author}</a>, <a href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a>; colour adjusted.</li>
                ))}
              </ul>
            </div>
          </section>}
        </div>
      </div>
    </>
  )
}
