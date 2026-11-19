// PART TWO OF THE HOME PAGE: INDUSTRY DATA.
//
// Everything above this band is BCX — who it is, what it believes, how the exchange will
// work, who it is hiring. Everything below it, down to the contact band, is India's coal
// industry in the figures its public bodies publish. Reviewers could not tell where one
// ended and the other began: "Industry data" was a small eyebrow over the coal chain, and
// industry figures sat between "About" and "Vision". So the boundary is now a band that
// cannot be missed — dark, full bleed, a large title that says what follows is not BCX's
// own business, the number of public sources behind it, and India's coal market at a glance
// in one card. The sections after it share one cool tint (.bx-zone) until the contact band.
import { ArrowRight, Database, Factory, Pickaxe, TriangleAlert, Truck } from 'lucide-react'
import { Credit, PHOTOS, Photo } from './media.jsx'
import { Spark } from './charts.jsx'
import { PAGE_PHOTOS } from './flags.js'
import { arrow, day, dir, num, pct } from './format.js'

/** One figure of the card. `change` is a percentage (coloured by its sign); `count` a change
 *  in a count, printed in ink — more plants in critical stock is not "up" news. */
function Row({ icon: Icon, label, sub, value, unit, change, count, spark }) {
  return (
    <div className="bx-mrow">
      <span className="ic"><Icon /></span>
      <span className="l"><b>{label}</b><small>{sub}</small></span>
      <span className="sp"><Spark values={spark} color="#F1885B" height={26} /></span>
      <span className="v"><b>{value}</b><small>{unit}</small>
        {change != null && <em className={dir(change)}>{arrow(change)} {pct(change)}</em>}
        {change == null && count != null && <em className="flat">{count > 0 ? '+' : count < 0 ? '−' : '±'}{num(Math.abs(count), 0)}</em>}</span>
    </div>
  )
}

const pts = t => (t?.points || []).map(p => p[1])

/** INDIA'S COAL MARKET AT A GLANCE (23 Oct'26, the user's call: Coal India's despatch, the
 *  day-ahead power price and Newcastle coal "were not that valuable" here). Four figures, each
 *  its publisher's own with its date: the year's production and offtake across India (the
 *  national coal dashboard), the coal at the thermal power plants and the plants with critical
 *  stock (CEA's daily report). The card is a DOOR to Market Insights, not a second copy of it. */
function MarketCard({ data }) {
  const P = data.boards?.producers
  const tot = P?.rows.find(r => r.key === 'Total(Coal)')
  const S = data.boards?.plant_stocks
  const fig = key => S?.strip.find(x => x.key === key)
  const stock = fig('stock'), crit = fig('critical')
  const fy = P && `India · FY ${P.fy} to ${day(P.as_of)}`
  return (
    <a className="bx-mcard" href="#/insights" aria-label="Open Market Insights">
      <span className="hd"><span className="live" />Coal market at a glance<small>{day(data.data_as_of)}</small></span>
      {tot?.production?.fytd != null && <Row icon={Pickaxe} label="Coal production" sub={fy} value={num(tot.production.fytd, 1)} unit="MT"
        spark={pts(tot.production.trend?.fytd)} />}
      {tot?.offtake?.fytd != null && <Row icon={Truck} label="Coal offtake" sub={fy} value={num(tot.offtake.fytd, 1)} unit="MT"
        spark={pts(tot.offtake.trend?.fytd)} />}
      {stock?.value != null && <Row icon={Factory} label="Coal at power plants" sub={`CEA daily report, ${day(S.as_of)}`} value={num(stock.value, 2)} unit="MT"
        change={stock.change?.pct} spark={pts(stock.trend)} />}
      {crit?.value != null && <Row icon={TriangleAlert} label="Plants with critical stock" sub={`of ${S.plants_total || S.plants_reported} plants, ${day(S.as_of)}`}
        value={num(crit.value, 0)} unit="plants" count={crit.change?.abs} spark={pts(crit.trend)} />}
    </a>
  )
}

export function IndustryOpener({ data }) {
  const sources = new Set((data.series || []).map(s => s.source.split('—')[0].trim())).size
  return (
    <section className={`bx-industry${PAGE_PHOTOS ? '' : ' flat'}`} id="industry">
      {/* PAGE_PHOTOS off (19 Nov'26): no photograph, a still gradient (website-bands.css `.flat`) */}
      <div className="bg" aria-hidden="true">{PAGE_PHOTOS && <Photo p={PHOTOS.plantNight} sizes="100vw" />}</div>
      {PAGE_PHOTOS && <Credit p={PHOTOS.plantNight} className="on-dark" />}
      {/* NOT "wrap in": the reveal marks a shown block with the class `in`, so a `.bx-industry .in`
          grid rule also caught the two revealed blocks inside it and split them into columns */}
      <div className="wrap bx-industry-in">
        <div className="tx bx-reveal">
          <span className="bx-badge"><Database /> Market Snapshot</span>
          <h2>India&rsquo;s coal market, <em>in public data.</em></h2>
          <p className="facts">
            <span><b>{sources}</b> public sources</span><i aria-hidden="true" />
            <span><b>Every morning</b> refreshed</span><i aria-hidden="true" />
            <span><b>As published</b> by each source</span>
          </p>
          <a className="bx-btn white" href="#/insights">Open Market Insights <ArrowRight /></a>
        </div>
        <div className="bx-reveal"><MarketCard data={data} /></div>
      </div>
    </section>
  )
}
