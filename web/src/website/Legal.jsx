// LEGAL & DOCUMENTS (#/legal, #/legal/<tab or section>) — two things, kept apart on purpose,
// behind two tabs and a dropdown:
//
//   1. REGULATIONS (#/legal, #/legal/regulations) — the law BCX works under, as its issuers
//      publish it (the Coal Exchange Rules, the MMDR Act as amended in 2025, the Colliery
//      Control Rules…). Each row LINKS OUT to the issuer's own copy and nothing is hosted here: the
//      issuer's file is the official one, an amendment can never leave a stale copy on our
//      page, and a site that re-hosted the law would read as publishing it. The entries are
//      data, checked against each document (content.REGULATIONS).
//   2. BCX DOCUMENTS (#/legal/documents, #/legal/<section>) — BCX's own register: rules,
//      circulars, notices, contracts. Deliberately EMPTY: BCX has filed its project report
//      under Rule 7(2)(d) of the Coal Exchange Rules, 2026 and is not registered, so it has
//      none yet. Each section says what it will hold and what has to happen first.
//
// The dropdown narrows the tab: a category of regulation, or one section of the register (a
// footer link to #/legal/circulars opens the register on Circulars). A row must LOOK like a
// document you can open — a file tile, the title, and a "View document" button — because a
// card of text read as something written about a regulation rather than the regulation.
//
// Rules for whoever edits this next:
//   * a regulation is added only after reading the issuer's own file, with its reference;
//   * add no BCX document until BCX is registered and someone asks for it;
//   * never print a DATE for a milestone BCX does not control (registration is the
//     Authority's decision); say what it waits on instead.
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, BellRing, Check, ChevronDown, ChevronRight, ExternalLink, FileSpreadsheet, FileText, Info, Mail,
         Megaphone, ScrollText, ShieldCheck, UserPlus } from 'lucide-react'
import { CONTACT, REGULATIONS, REG_CHECKED, REG_GROUPS, REG_SOURCES } from './content.js'
import { day } from './format.js'
import { Dropdown, PageBand, SecHead, isReload } from './ui.jsx'
import { openContact } from './ContactForm.jsx'
import { BANDS, CONTACT_FORM } from './flags.js'
import { PHOTOS } from './media.jsx'

/** The register: one row per section. `when` names what it waits on, not a date. */
export const LEGAL = [
  { id: 'rules', icon: ScrollText, title: 'Rules & procedures',
    what: 'BCX’s rulebook: who may trade, how orders are matched and cleared, how coal is delivered and settled, and how disputes are resolved.',
    holds: ['Rules', 'Byelaws', 'Business rules', 'Procedures'], when: 'Once BCX is registered' },
  { id: 'circulars', icon: FileText, title: 'Circulars',
    what: 'Notices to members on trading, margins, fees, clearing and settlement, and changes to the trading system.',
    holds: ['Trading', 'Clearing & settlement', 'Membership', 'Technology'], when: 'From the first trading day' },
  { id: 'notices', icon: Megaphone, title: 'Public notices',
    what: 'Announcements for everyone: launch dates, trading holidays, new contracts, and the disclosures an exchange makes in public.',
    holds: ['Announcements', 'Trading holidays', 'Disclosures'], when: 'From launch' },
  { id: 'contracts', icon: FileSpreadsheet, title: 'Contract specifications',
    what: 'Each standard contract, fixed in public before anyone trades it: source, grade, lot size, delivery point and margins.',
    holds: ['Specifications', 'Grades', 'Delivery points'], when: 'Before trading opens' },
  { id: 'membership', icon: UserPlus, title: 'Membership',
    what: 'Who can become a member, the eligibility criteria and fees, and the forms to apply with.',
    holds: ['Eligibility', 'Fees', 'Application forms'], when: 'When membership opens' },
  { id: 'policies', icon: ShieldCheck, title: 'Policies',
    what: 'How BCX and this website handle your information, the terms for using them, and how to raise a grievance.',
    holds: ['Privacy policy', 'Terms of use', 'Grievances'], when: 'In preparation' },
]

// Where BCX stands. The first step is a fact the site already states (About.jsx); the
// rest are what the sections above wait on — in order, and with no dates.
const PATH = [
  ['done', 'Project report filed', 'Under Rule 7(2)(d) of the Coal Exchange Rules, 2026.'],
  ['now', 'Registration', 'The Authority decides on BCX’s application.'],
  ['next', 'Rules and contracts published', 'Here, in full, before anyone trades.'],
  ['next', 'Trading opens', 'Circulars and notices follow from the first day.'],
]

// OFF, 22 Oct'26, at management's request: the site says nothing about BCX's registration
// or what follows it, so the BCX documents tab (every section of which waits on
// registration), the "Where BCX stands" path and the status note are not shown. The code
// stays; set this true to bring the tab back.
export const SHOW_REGISTER = false
// "A QUESTION ABOUT THESE REGULATIONS?" AND ITS WRITE TO US ARE OFF (23 Nov'26, the user); `true` brings them back. With
// the register off too, the closing band has nothing to show and is not drawn.
export const SHOW_ASK = false

const isSection = s => LEGAL.some(d => d.id === s)
/** which tab an address opens: the register for #/legal/documents and its sections */
export const legalTab = s => (SHOW_REGISTER && (s === 'documents' || isSection(s)) ? 'documents' : 'regulations')

const notify = title => `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Notify me: BCX ${title.toLowerCase()}`)}`
const tone = s => ({ 'In force': 'ok', Notified: 'ok', Approved: 'ok', Draft: 'draft', Superseded: 'old' }[s] || '')
const host = u => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }

/** One regulation, built to read as a document you can open: a file tile, its kind, date
 *  and standing, the title, who issued it under what reference, and a "View document"
 *  button. The whole card is the link; it opens the issuer's own copy in a new tab. */
function Regulation({ r, bare = false }) {
  return (
    <li>
      <a className="bx-rg-row" href={r.url} target="_blank" rel="noopener noreferrer"
        aria-label={`${r.title} — opens the official ${r.file} on ${host(r.url)}`}>
        <span className="doc" aria-hidden="true"><FileText /><b>{r.file}</b></span>
        <span className="tx">
          <span className="meta">
            <span className="k">{r.kind}</span>
            <time dateTime={r.date}>{day(r.date)}</time>
            {r.status && <span className={`s ${tone(r.status)}`}>{r.status}</span>}
          </span>
          <span className="t">{r.title}</span>
          {r.note && !bare && <span className="n">{r.note}</span>}
          <span className="by">{r.issuer}{r.ref && <> · <em>{r.ref}</em></>} · {host(r.url)}</span>
        </span>
        <span className="go">View document<ArrowUpRight aria-hidden="true" /></span>
      </a>
    </li>
  )
}

/** THE HOME PAGE'S LATEST REGULATIONS (18 Nov'26, pass 92 — in the coal chain's place). The VP could not see the chain's
 *  use; the user: a professional home page, "not AI generated", no animations. What an exchange's home page carries: its
 *  newest documents, here the four newest regulations exactly as the Regulations page shows them (the same row, its
 *  `bare` form: no notes of ours — every title is its issuer's), each opening the issuer's own copy. */
export function LatestRegulations({ n = 4 }) {
  const items = [...REGULATIONS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)
  return (
    <section className="bx-sec bx-hreg" id="chain">
      <div className="wrap">
        <SecHead eyebrow="Regulations" title={<>What&rsquo;s new <em>in coal regulation.</em></>}
          lede="The latest Acts, rules and notices, each opening the issuer’s own copy."
          action={<a className="bx-btn secondary" href="#/legal/regulations">All regulations <ArrowRight /></a>} />
        <ul className="bx-rg-list bx-hreg-list bx-reveal">
          {items.map(r => <Regulation key={r.url} r={r} bare />)}
        </ul>
      </div>
    </section>
  )
}

function Regulations({ cat }) {
  const groups = REG_GROUPS.filter(([key]) => cat === 'all' || key === cat)
  return (
    <section className="bx-rg" id="lg-regulations">
      <div className="wrap">
        <div className="bx-lg-hd">
          <h2>{cat === 'all' ? 'Latest regulations' : REG_GROUPS.find(([k]) => k === cat)[1]}</h2>
          <p>{[...new Set(REGULATIONS.map(r => r.issuer))].join(' and ')} · checked {day(REG_CHECKED)}</p>
        </div>
        <div className="bx-rg-groups">
          {groups.map(([key, title]) => {
            const items = REGULATIONS.filter(r => r.group === key).sort((a, b) => b.date.localeCompare(a.date))
            return items.length > 0 && (
              <div className="bx-rg-group" key={key} data-group={key}>
                {cat === 'all' && <h3>{title}<small>{items.length}</small></h3>}
                <ol className="bx-rg-list">{items.map(r => <Regulation key={r.url} r={r} />)}</ol>
              </div>
            )
          })}
        </div>
        <div className="bx-rg-foot">
          <p><Info aria-hidden="true" /><span>Each document opens on its issuer’s website, which holds the official copy. BCX does not host or alter them.</span></p>
          <ul>{REG_SOURCES.map(([l, u]) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer">{l}<ExternalLink aria-hidden="true" /></a></li>)}</ul>
        </div>
      </div>
    </section>
  )
}

function Register({ part }) {
  const rows = LEGAL.filter(d => part === 'all' || d.id === part)
  return (
    <section className="bx-lg-list" id="lg-documents">
      <div className="wrap">
        <div className="bx-lg-hd">
          <h2>{part === 'all' ? 'BCX documents' : rows[0].title}</h2>
          <p>{part === 'all' ? 'Six sections, each published here as BCX opens' : 'Published here as BCX opens'}</p>
        </div>
        <ul>
          {rows.map(d => (
            <li key={d.id} id={`lg-${d.id}`} className={`bx-lg-row${part === d.id ? ' on' : ''}`}>
              <span className="ic"><d.icon /></span>
              <div className="tx">
                <h3>{d.title}</h3>
                <p>{d.what}</p>
                <div className="holds" aria-label="Will hold">{d.holds.map(h => <span key={h}>{h}</span>)}</div>
              </div>
              <div className="st">
                <span className="k">Coming up</span>
                <span className="when"><i aria-hidden="true" />{d.when}</span>
                <a className="bx-link" href={notify(d.title)}><BellRing />Ask to be notified</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Website mounts this keyed on the address, so a tab or a footer deep link always starts
 *  from the state its address names. */
export default function Legal({ section }) {
  const tab = legalTab(section)
  const [cat, setCat] = useState('all')
  const [part, setPart] = useState(isSection(section) ? section : 'all')

  // a deep link (#/legal/circulars) opened cold lands on its section; navigate() places
  // every later visit itself, a restored position is never overridden, and a refresh starts
  // at the top
  useEffect(() => {
    if (!section || isReload()) return
    requestAnimationFrame(() => {
      if (window.scrollY < 4) document.getElementById(`lg-${section}`)?.scrollIntoView({ block: 'start' })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // [value, label, count] — the count sits right-aligned in the list, not in brackets
  const options = tab === 'regulations'
    ? [['all', 'All regulations', REGULATIONS.length], ...REG_GROUPS.map(([k, l]) => [k, l, REGULATIONS.filter(r => r.group === k).length])]
    : [['all', 'All sections', LEGAL.length], ...LEGAL.map(d => [d.id, d.title])]

  return (
    <div className={`bx-legal${BANDS && !SHOW_REGISTER ? ' v-band' : ''}`}>
      {/* the navy band (flags.BANDS); the register's "Where BCX stands" panel keeps the old head */}
      {BANDS && !SHOW_REGISTER ? (
        // the band's line under the title went (19 Nov'26, the user) - the title and the cards say it
        <PageBand crumb="Regulations" title={<>Coal Exchange <em>Regulations</em></>} photo={PHOTOS.portParadip} />
      ) : (
      <section className="bx-lg-hero">
        <div className="wrap in">
          <div className="t">
            <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><span>Regulations</span></nav>
            <span className="eyebrow">Legal</span>
            <h1>{SHOW_REGISTER ? <>Legal &amp; <em>documents</em></> : <>Coal Exchange <em>Regulations</em></>}</h1>
            <p className="lede">The laws and regulations coal trading in India works under, each linked to the official
              copy its issuer publishes.</p>
            {SHOW_REGISTER && <p className="why">BCX’s own documents follow once it is registered: until then it has no rulebook to
              publish, and each section of its register says what it will hold and what comes first.</p>}
          </div>
          {SHOW_REGISTER && <aside className="bx-lg-path" aria-label="Where BCX stands">
            <h2>Where BCX stands</h2>
            <ol>
              {PATH.map(([s, t, p]) => (
                <li key={t} className={s} aria-current={s === 'now' ? 'step' : undefined}>
                  <span className="dot">{s === 'done' && <Check />}</span>
                  <b>{t}{s === 'now' && <em>We are here</em>}</b>
                  <span className="p">{p}</span>
                </li>
              ))}
            </ol>
          </aside>}
        </div>
      </section>
      )}

      <div className="bx-lg-bar" id="lg-bar">
        <div className="wrap">
          <nav className="bx-lg-tabs" aria-label="Documents">
            <a href="#/legal/regulations" className={tab === 'regulations' ? 'on' : ''} aria-current={tab === 'regulations' ? 'page' : undefined}>
              Regulations<span>{REGULATIONS.length}</span></a>
            {SHOW_REGISTER && <a href="#/legal/documents" className={tab === 'documents' ? 'on' : ''} aria-current={tab === 'documents' ? 'page' : undefined}>
              BCX documents<span>{LEGAL.length}</span></a>}
          </nav>
          <div className="bx-lg-pick">
            <span>{tab === 'regulations' ? 'Category' : 'Section'}</span>
            <Dropdown value={tab === 'regulations' ? cat : part} onChange={v => (tab === 'regulations' ? setCat : setPart)(v)}
              options={options} label={tab === 'regulations' ? 'Category of regulation' : 'Section of the register'} />
          </div>
        </div>
      </div>

      <div id="lg-body">
        {tab === 'regulations' ? <Regulations cat={cat} /> : <Register part={part} />}
      </div>

      {(SHOW_REGISTER || SHOW_ASK) && <section className="bx-lg-end">
        <div className="wrap in">
          {SHOW_REGISTER && <div className="bx-status" role="note">
            <Info />
            <span><b>Registration filed; not yet operating.</b> BCX has filed its project report under Rule 7(2)(d) of the
              Coal Exchange Rules, 2026. Until the Authority registers it, nothing on this site is an offer to buy or sell coal.</span>
          </div>}
          {SHOW_ASK && <div className="ask">
            <b>A question about these regulations?</b>
            {/* the form (18 Nov'26 — a form, not a mailto); local only (flags.CONTACT_FORM) */}
            {CONTACT_FORM
              ? <button type="button" className="bx-btn primary" onClick={() => openContact('other')}><Mail /> Write to us</button>
              : <a className="bx-btn primary" href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Legal & documents')}`}><Mail /> Write to {CONTACT.email}</a>}
          </div>}
        </div>
      </section>}
    </div>
  )
}
