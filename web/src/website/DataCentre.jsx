// THE DATA CENTRE (#/explorer) — THE LIBRARY. Coal only, as published, and photographic:
// the same coal chain the landing page shows, so the two read as one site.
//
//   1. HEADER        the coal yard at Amlohri, full bleed, with the search box on it
//   2. COAL SERIES   four groups of four — a photo cover and four equal tiles per row,
//                    so the grid is symmetric and every tile has the same anatomy
//   3. TABLES        three published tables behind tabs that never move
//   4. TRADE TERMS   every term the data centre underlines, A to Z
//   5. THE LETTER    the daily letter, as the way to have this every morning
//
// ONE FIGURE, ONE HOME. Today's market is Market insights (#/insights); this page is where
// a series is LOOKED UP, with its whole history. It used to open with "Coal at a glance" —
// five of today's figures behind tabs — which the home page and Market insights both also
// printed, so a reader met the same Coal India despatch three times on three pages. The
// header links to Market insights instead of repeating it.
//
// NOTHING ON THIS PAGE SCROLLS INSIDE ITSELF. The tables were a fixed-height box that
// scrolled internally and trapped the wheel. A TabPanel is now as tall as its tallest pane
// (ui.TabPanel), which is why the glossary, far longer than any table, is its own section.
//
// Every figure is the source's own; where a source publishes a comparison we show it and
// say so, and we compute none of our own (seriesui.readingsOf).
import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ChevronRight, Database, RefreshCw } from 'lucide-react'
import { TabPanel } from './ui.jsx'
import { day } from './format.js'
import { PHOTOS, Photo } from './media.jsx'
import { tableTabs } from './Tables.jsx'
import { GlossaryList } from './glossary.jsx'
import { COAL_GROUPS, COAL_IDS, SeriesSearch, SeriesTile } from './seriesui.jsx'

export default function DataCentre({ data, onOpen, onLetters }) {
  const by = useMemo(() => Object.fromEntries(data.series.map(s => [s.id, s])), [data])
  const coal = useMemo(() => data.series.filter(s => COAL_IDS.includes(s.id)), [data])
  const tables = useMemo(() => tableTabs(data, COAL_IDS), [data])
  const [table, setTable] = useState(tables[0]?.[0])
  const t = tables.find(x => x[0] === table) || tables[0]
  const sources = new Set(coal.map(s => s.source.split('—')[0].trim())).size
  const hero = PHOTOS.railSilo
  return (
    <div className="bx-dc2">
      <section className="bx-dc3-head">
        <div className="bg" aria-hidden="true"><Photo p={hero} eager sizes="100vw" /></div>
        <div className="wrap in">
          <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><span>Data centre</span></nav>
          <span className="eyebrow">Coal market data</span>
          <h1>Data centre</h1>
          <p className="lede">Every coal series we hold — production, despatch, prices and auctions — with its full history, as the public sources publish it.</p>
          <SeriesSearch series={coal} onPick={onOpen} big placeholder={`Search ${coal.length} coal series`} />
          <ul className="bx-dc3-facts">
            <li><Database />{coal.length} coal series</li>
            <li><BookOpen />{sources} public sources</li>
            <li><RefreshCw />Updated {day(data.data_as_of)}</li>
            <li><a href="#/insights">Today&rsquo;s figures: Market Insights <ChevronRight /></a></li>
            <li><a href="#/insights/sources">Where the figures come from <ChevronRight /></a></li>
          </ul>
        </div>
        <a className="bx-photo-credit" href={hero.source} target="_blank" rel="noreferrer">Rake loading at Amlohri, Singrauli · {hero.author} · {hero.license}</a>
      </section>

      <section className="bx-dc2-all" id="all-series">
        <div className="wrap">
          <div className="bx-dc2-sh"><h2>Coal series</h2><p>Open any one for its history and source</p></div>
          <div className="bx-tgroups">
            {COAL_GROUPS.map(g => (
              <div className="bx-tgroup" key={g.key}>
                <div className="cover">
                  <Photo p={PHOTOS[g.photo]} sizes="(max-width: 1100px) 100vw, 240px" />
                  <span><b>{g.title}</b>{g.blurb}</span>
                </div>
                {g.items.map(([id, label]) => by[id] && <SeriesTile key={id} s={by[id]} label={label} />)}
              </div>
            ))}
          </div>
          <p className="bx-status-key"><span><i className="dot stale" />Not updated recently by its source</span></p>
        </div>
      </section>

      {t && (
        <section className="bx-dc2-ref">
          <div className="wrap">
            <div className="bx-dc2-sh"><h2>Tables</h2><p>As the source publishes them</p></div>
            <TabPanel tabs={tables.map(([k, l]) => [k, l])} value={t[0]} onChange={setTable} label="Table"
              pane={k => {
                const x = tables.find(y => y[0] === k)
                return <><p className="bx-tab-note">{x[2]}</p><div className="bx-table-wrap">{x[3]}</div></>
              }} />
          </div>
        </section>
      )}

      <section className="bx-dc2-terms" id="terms">
        <div className="wrap">
          <div className="bx-dc2-sh"><h2>Trade terms</h2><p>In plain English — each one is underlined wherever it appears</p></div>
          <GlossaryList />
        </div>
      </section>

      <section className="bx-dc-letter">
        <div className="wrap"><div className="in">
          <div className="ph"><Photo p={PHOTOS.plantRajpura} sizes="(max-width: 900px) 100vw, 520px" /></div>
          <div className="tx">
            <span className="eyebrow">The newsletter</span>
            <h2>The coal market, <em>in your inbox by nine.</em></h2>
            <p>The India Coal Market Daily is written from these same public sources every morning, and every issue is kept here to read.</p>
            <button className="bx-btn primary" onClick={onLetters}>Read today&rsquo;s letter <ArrowRight /></button>
          </div>
        </div></div>
      </section>
    </div>
  )
}
