// What BCX covers, and the footer.
//
// WHAT WE COVER (#/coverage) replaced "How the exchange will work" on 22 Oct'26, at
// management's request: the site does not describe the exchange's methodology or its
// registration. Its copy is the "Designed for the entire coal value chain" section of the
// approved mock-up (BCX_Full_PreRegistration_Website.html) — the one part of that page this
// site did not already carry — with each area linking to the page that holds it. The
// Exchange section below is kept, not rendered.
//
// IF THE EXCHANGE SECTION IS EVER SHOWN AGAIN, ITS STATUS LINE GOES WITH IT. Bharat Coal
// Exchange is not registered, no contract is Authority-approved and nothing is traded (see
// docs/exchange/COAL_EXCHANGE.md). A public page that described the mechanism without saying
// so would read as an operating market, so the two are one component: show both or neither.
// (Since 22 Oct'26 the site shows neither — management asked for no methodology and no
// registration talk until registration is done.)
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, CircleCheck, Clock3, FileText, Gavel, IndianRupee, Info, Layers, Lock,
         Mail, MapPin, Phone, Scale, Sigma, TrainFront, Truck, Warehouse, Zap } from 'lucide-react'
import BcxLogo from './BrandLogo.jsx'      // the bcx.market logo (27 Oct'26)
import { CONTACT } from './content.js'
import { LEGAL, SHOW_REGISTER } from './Legal.jsx'
import { DATA_CENTRE, HOME_REGULATIONS, NEWSLETTER } from './flags.js'
import { HRail, usePhone } from './ui.jsx'
import { publishers } from './Sources.jsx'
import { useVisits } from './api.js'
import LinkedInIcon from './LinkedIn.jsx'

// the footer's "Data sources" column — switched OFF 27 Oct'26 (the user's call), code kept
const SHOW_FOOTER_SOURCES = false

// One trading day, from libs/exchange/refdata.CALL_SESSION_CLOCK — a real sequence.
const CLOCK = [
  [FileText, 'Before T', 'Contract published', 'Source, grade, delivery point, lot size and margins fixed in public.'],
  [Lock, '11:00', 'Sealed bids and offers open', 'Buyers and sellers enter orders nobody else can see.'],
  [Clock3, '14:00', 'The book freezes', 'No new order or withdrawal; the audit trail is locked.'],
  [Sigma, '14:30', 'One price is found', 'A uniform clearing price and the largest deliverable volume.'],
  [CircleCheck, '15:00', 'Buyers and sellers matched', 'Eligible pairs allocated; confirmations issue.'],
  [Truck, 'T+2', 'Delivery begins', 'Followed from siding to plant, settled on quality delivered.'],
]

const MECH = [
  [Scale, 'Double-sided call auction', 'One uniform price for many buyers and sellers — and only coal that can actually be delivered clears.'],
  [Gavel, 'Sealed-bid and reverse auctions', 'Sellers offer parcels to sealed bids; buyers post requirements for sellers to compete on.'],
  [Layers, 'Continuous order book', 'Standing bids and offers on standard contracts, matched by price and time.'],
  [TrainFront, 'Delivery, end to end', 'Every trade followed from the siding to the plant.'],
]

export function Exchange() {
  return (
    <section className="bx-sec line" id="exchange">
      <div className="wrap bx-xch">
        <div className="bx-xch-copy bx-reveal">
          <span className="eyebrow">How the exchange will work</span>
          <h2 className="h-sec">A coal price discovered in the open, <em>not announced.</em></h2>
          <p className="lede">A delivery-based coal exchange designed under the Coal Exchange Rules, 2026 — standard
            contracts, sealed price discovery, and delivery followed to the plant.</p>
          <div className="bx-mechs">
            {MECH.map(([I, t, p]) => <div className="bx-mech" key={t}><span className="ic"><I /></span><span><b>{t}</b><p>{p}</p></span></div>)}
          </div>
          <div className="bx-status" role="note">
            <Info />
            <span><b>Registration filed; not yet operating.</b> BCX has filed its project report under Rule 7(2)(d) of the
              Coal Exchange Rules, 2026. Until the Authority registers it, nothing on this site is an offer to buy or sell coal.</span>
          </div>
        </div>
        <ol className="bx-vline bx-reveal" aria-label="One trading day">
          <li className="hd"><b>One trading day</b><span>The double-sided call auction</span></li>
          {CLOCK.map(([I, t, n, p]) => (
            <li key={t}><span className="dot"><I /></span><span className="tm">{t}</span><span className="tx"><b>{n}</b>{p}</span></li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// The six areas, in the mock-up's words; each opens the page (or the home section) that
// carries it. "Research & policy" drops the mock-up's "market methodology".
const AREAS = [
  [BarChart3, 'Supply & offtake intelligence', 'Production · Offtake', '#/insights/supply',
    'Compare producer-wise output and dispatch with clearly distinguished daily and cumulative figures.'],
  [Warehouse, 'Coal stocks & replenishment', 'CEA · Power plants', '#/insights/map',
    'Explore thermal power plant stocks, critical plants, coal receipts and consumption, plant by plant and state by state.'],
  [IndianRupee, 'Price & sourcing context', 'Prices · Imports', '#/insights',
    'Follow published coal benchmarks, e-auction outcomes and imports, as their sources report them.'],
  [Zap, 'Coal–power linkages', 'Generation · Demand', '#/insights/power',
    'Understand thermal generation patterns and the electricity-sector context of coal consumption.'],
  [TrainFront, 'Logistics information', 'Rail · Road · Ports', '#/chain',
    'Rail, road, pithead and port-linked supply, from the mine to the plant.'],
  // Research & reports is off (26 Oct'26): the daily coal letter this describes is the newsletter
  // with the newsletter off (flags.NEWSLETTER) the card opens Regulations
  [BookOpen, 'Research & policy', 'Research · Regulations', NEWSLETTER ? '#/newsletter' : '#/legal',
    NEWSLETTER ? 'The daily coal letter, accessible explainers and the public regulatory developments the coal market works under.'
      : 'Accessible explainers and the public regulatory developments the coal market works under.'],
]

export function Coverage() {
  const phone = usePhone()
  return (
    <section className="bx-sec line" id="coverage">
      <div className="wrap bx-cov">
        <div className="bx-cov-copy bx-reveal">
          <span className="eyebrow">A better view of coal markets</span>
          <h2 className="h-sec">Designed for the entire <em>coal value chain.</em></h2>
          <p className="lede">A research-first information service spanning producers, generators, industrial consumers,
            importers, traders and logistics stakeholders.</p>
        </div>
        {/* a phone: the six as cards in one swipe row (2 Nov'26, the user's call); the desktop is unchanged */}
        {phone ? (
          <HRail bleed className="bx-cov-rail bx-reveal" label="What we cover">
            {AREAS.map(([I, t, tag, href]) => (
              <a key={t} className="bx-cov-card" href={href}>
                <span className="ic"><I /></span>
                <b>{t}</b>
                <small>{tag}</small>
                <ArrowRight className="go" aria-hidden="true" />
              </a>
            ))}
          </HRail>
        ) : (
          <ul className="bx-cov-grid bx-reveal">
            {AREAS.map(([I, t, tag, href, p]) => (
              <li key={t}>
                <a href={href}>
                  <span className="ic"><I /></span>
                  <span className="tx"><b>{t}</b><p>{p}</p><small>{tag}</small></span>
                  <ArrowRight className="go" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function Footer({ data, onNav, onLetters, onExplore, showVisits = false }) {
  // one line per PUBLISHER, the same list as Market Insights' Sources module (Sources.publishers,
  // 26 Oct'26) — it used to read every series we hold, so it named publishers the site no longer shows
  const sources = data ? publishers(data).map(p => [p.name, p.url]) : []
  // THE VISIT COUNTER, on the Sources module's footer ONLY, bottom right (28 Oct'26, the user's
  // call — on the home page it would read cheap); read only when it is shown
  const visits = useVisits(showVisits)
  // a phone lists the publishers on their own page (Sources), not as eleven links in the footer
  const phone = usePhone()
  return (
    <footer className={`bx-foot cols-${3 + (SHOW_REGISTER ? 1 : 0) + (SHOW_FOOTER_SOURCES ? 1 : 0)}`}>
      <div className="wrap">
        <div className="cols">
          <div>
            {/* the logo in its own orange and black on every surface (5 Nov'26, the user's call) — so
                the footer is a light BCX tint, never a dark one */}
            <BcxLogo />
            <p className="tag">{CONTACT.tagline}.</p>
            <p className="ln"><MapPin size={16} /><span>{CONTACT.company}<br />{CONTACT.address}</span></p>
            {/* the footer's address is connect@ (16 Nov'26) — info@ is the Contact section's, for enquiries — and the
                phone beside it */}
            <p className="ln"><Mail size={16} /><a href={`mailto:${CONTACT.connect || CONTACT.email}`}>{CONTACT.connect || CONTACT.email}</a></p>
            {CONTACT.phone && <p className="ln"><Phone size={16} /><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></p>}
            {CONTACT.linkedin && <p className="ln"><LinkedInIcon size={16} /><a href={CONTACT.linkedin} target="_blank" rel="noreferrer">BCX on LinkedIn</a></p>}
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {[['about', 'About us'], ['vision', 'Vision & mission'], ['coverage', 'About BCX'],
                ['careers', 'Careers'], ['contact', 'Contact']].map(([k, l]) => <li key={k}><button className="lnk" onClick={() => onNav(k)}>{l}</button></li>)}
              <li><a href="#/news">News &amp; media</a></li>
            </ul>
          </div>
          <div>
            <h4>Market data</h4>
            <ul>
              <li><a href="#/insights">Market Insights</a></li>
              {DATA_CENTRE && <li><button className="lnk" onClick={() => onExplore()}>Data centre</button></li>}
              {NEWSLETTER && <li><button className="lnk" onClick={onLetters}>Newsletter</button></li>}
              {/* the coal chain's link, where the chain still is (a build that ships - flags.HOME_REGULATIONS) */}
              {!HOME_REGULATIONS && <li><button className="lnk" onClick={() => onNav('chain')}>Mine to plant</button></li>}
              {/* FOUR COLUMNS, NOT FIVE (27 Oct'26): with BCX's register hidden the Regulations column
                  held one link, so the link moved here; the column comes back with the register */}
              {!SHOW_REGISTER && <li><a href="#/legal/regulations">Latest regulations</a></li>}
            </ul>
          </div>
          {SHOW_REGISTER && (
            <div>
              <h4>Regulations</h4>
              <ul>
                <li><a href="#/legal/regulations">Latest regulations</a></li>
                {LEGAL.map(d => <li key={d.id}><a href={`#/legal/${d.id}`}>{d.title}</a></li>)}
              </ul>
            </div>
          )}
          {/* the publishers' column — OFF since 27 Oct'26 (the user's call), code kept: Market data's
              "Sources" link opens the module that lists them */}
          {SHOW_FOOTER_SOURCES && (
            <div className="src">
              <h4>Data sources</h4>
              {phone
                ? <a className="bx-foot-src" href="#/insights/sources">Figures from {sources.length} public sources <ArrowRight aria-hidden="true" /></a>
                : <ul>{sources.map(([s, u]) => <li key={s}>{u ? <a href={u} target="_blank" rel="noreferrer">{s}</a> : <a href="#/insights/sources">{s}</a>}</li>)}</ul>}
            </div>
          )}
        </div>
        {/* the photographs' credits (CC BY-SA requires them) are in Market Insights' Sources module
            (Sources.jsx) — not in the footer */}
        <div className="legal">
          <span>© {new Date().getFullYear()} {CONTACT.company}. All rights reserved.</span>
          {showVisits && visits != null && <span className="bx-visits">{visits.toLocaleString('en-IN')} visit{visits === 1 ? '' : 's'}</span>}
        </div>
      </div>
    </footer>
  )
}
