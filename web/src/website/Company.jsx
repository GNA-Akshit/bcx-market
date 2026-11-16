// Who BCX is — about, vision and mission, principles, careers, contact — in BCX's own
// approved words (./content.js, from bcx.market) — and the coal chain, which opens the
// home page's industry-data part (see Industry.jsx for the two-part order). Press coverage
// is its own page (NewsPage.jsx).
//
// NOT A SLIDE DECK. Each section has its own composition: an editorial split, the coal
// chain (four photographs that each carry a figure and a link — a picture on this page
// must say something), a quoted statement, an open row, a typographic careers block, a
// closing band.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Cpu, Globe2, Mail, MapPin, Scale, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Credit, PHOTOS, Photo } from './media.jsx'
import LinkedInIcon from './LinkedIn.jsx'
import { ABOUT, CAREERS, CONTACT, MISSION, PRINCIPLES, VISION } from './content.js'
import { FillText, HRail, SecHead, Sheet, usePhone } from './ui.jsx'
import { monthLong, num } from './format.js'
import { shortSource } from './sourceLabel.js'
import { SeriesChart, seriesHref } from './seriesui.jsx'
import { BANDS, DATA_CENTRE } from './flags.js'

export function About() {
  return (
    <section className="bx-sec" id="about">
      <div className="wrap">
        <div className="bx-about bx-reveal">
          <div className="l">
            <span className="eyebrow">About BCX</span>
            <h2 className="h-sec big">{ABOUT.title[0]}<em>{ABOUT.title[1]}</em></h2>
          </div>
          <div className="r">
            {ABOUT.body.map((p, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{p}</p>)}
            <p className="bx-facts-line">{ABOUT.stats.map(([v, k]) => <span key={k}><b>{v}</b> {k.toLowerCase()}</span>)}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * THE COAL CHAIN — India's coal industry, link by link. Each photograph carries ONE
 * national figure exactly as its public source publishes it (no growth we computed, no
 * share we derived), the publisher's name beside it, and where BCX will fit. The section
 * and every card say "industry data" so no figure can read as BCX's own achievement —
 * reviewers took "1,047 MT" for a BCX claim. A stage whose figure is missing keeps its
 * photograph and its sentence, never an invented number.
 */
function chainStages(data) {
  const by = Object.fromEntries((data?.series || []).map(s => [s.id, s]))
  const pub = id => by[id]?.source?.split('—')[0].trim()
  const latest = id => by[id]?.stats?.latest
  const prod = latest('cco_production'), rakes = latest('fois_rakes'), power = latest('sector_power'), imp = latest('cco_imports')
  return [
    { key: 'mine', id: 'cco_production', photo: PHOTOS.mineDragline, stage: 'The mine', place: 'Dudhichua, Singrauli',
      figure: prod && `${num(prod.value, 0)} MT`, what: prod && <>of coal mined across India, <span className="nw">FY {prod.fy}</span></>,
      source: pub('cco_production'),
      bcx: 'BCX will list coal by mine and grade.',
      about: 'The coal mined across India in each fiscal year, as the Coal Controller’s Organisation reports it. On BCX, coal will be listed by mine and grade, so a buyer sees exactly what is on offer before bidding.' },
    // a rake loading under the silo at Amlohri (5 Nov'26): the locomotive photo was soft at card size
    // (the user's call), and a rake being LOADED is what this card's figure counts
    { key: 'rail', id: 'fois_rakes', photo: PHOTOS.railSilo, stage: 'The railway', place: 'Rake loading, NCL Amlohri',
      figure: rakes && `${num(rakes.value, 0)} rakes`, what: rakes && <>loaded at Coal India sidings, <span className="nw">{monthLong(rakes.m)}</span></>,
      source: pub('fois_rakes'),
      bcx: 'BCX will track each delivery to the plant.',
      about: 'The rakes loaded at Coal India’s sidings each month, from its rail dashboard. Rail carries more of India’s coal than any other mode; BCX will follow each delivery from the siding to the plant.' },
    { key: 'plant', id: 'sector_power', photo: PHOTOS.plantRamagundam, stage: 'The power plant', place: 'NTPC Ramagundam',
      figure: power && `${num(power.value, 1)} MT`, what: power && <>of coal sent to power stations, <span className="nw">{monthLong(power.m)}</span></>,
      source: pub('sector_power'),
      bcx: "Power producers are coal's largest buyers.",
      about: 'The coal despatched to India’s power stations each month, as the Ministry of Coal reports it. Power producers are coal’s largest buyers — the demand side of the market BCX will clear.' },
    { key: 'port', id: 'cco_imports', photo: PHOTOS.portParadip, stage: 'The port', place: 'Paradip, Odisha',
      figure: imp && `${num(imp.value, 0)} MT`, what: imp && <>of coal imported into India, <span className="nw">FY {imp.fy}</span></>,
      source: pub('cco_imports'),
      bcx: 'A clear domestic price to weigh against imports.',
      about: 'The coal India imported in each fiscal year, as the Coal Controller’s Organisation reports it. A clear domestic price lets buyers weigh Indian coal against imports.' },
  ]
}

/** One link of the chain, looked at closely — in a panel over the page, not a new page. */
function StagePanel({ stage, s, onOpen, close }) {
  return (
    <article className="bx-stage-panel">
      <div className="ph">
        <Photo p={stage.photo} sizes="560px" />
        <span className="place">{stage.place}</span>
        <Credit p={stage.photo} />
      </div>
      <div className="bd">
        <span className="kick">{stage.stage} · Industry data</span>
        {stage.figure && <b className="fig">{stage.figure}</b>}
        {stage.what && <span className="what">{stage.what}</span>}
        <p className="about">{stage.about}</p>
        {s && (
          <figure className="ch">
            <SeriesChart s={s} height={230} months={24} />
            <figcaption>As published by <a href={s.source_url} target="_blank" rel="noreferrer">{s.source}</a></figcaption>
          </figure>
        )}
        <div className="acts">
          {DATA_CENTRE && <button className="bx-btn primary" onClick={() => onOpen(stage.id)}>Open in the data centre <ArrowRight /></button>}
          <button className={`bx-btn ${DATA_CENTRE ? 'secondary' : 'primary'}`} onClick={close}>Close</button>
        </div>
      </div>
    </article>
  )
}

const clamp01 = v => Math.max(0, Math.min(1, v))
const calmMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The chain's story, drawn as the reader scrolls: one line runs from the mine through the
 * railway to the power plant, and a second from the port back to the plant, so the two
 * meet where Indian and imported coal both end up. (A single left-to-right line would say
 * coal goes from the plant to the port, which it does not.)
 *
 * Desktop only — it needs the four cards in one row; on a narrower screen the cards stack
 * and the line is simply not drawn. Positions come from offsetLeft/offsetTop, which ignore
 * the cards' reveal transform (a bounding box would be 22px off until the fade-in ends).
 */
function ChainFlow({ wrap }) {
  const [geo, setGeo] = useState(null)
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const measure = () => {
      const cards = [...el.querySelectorAll('.bx-chain-card')]
      const tops = new Set(cards.map(c => c.offsetTop))
      if (cards.length !== 4 || tops.size !== 1) { setGeo(null); return }
      const ph = cards[0].querySelector('.ph')
      setGeo({ w: el.offsetWidth, h: el.offsetHeight, y: ph.offsetTop + ph.offsetHeight,
               xs: cards.map(c => c.offsetLeft + c.offsetWidth / 2) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrap])
  // The line follows the scroll ONLY while the chain is near the screen, from a position measured
  // when something changes size — not a getBoundingClientRect and a re-render on every frame of
  // every scroll anywhere on the page, which, beside the header's rail, forced a layout of the
  // whole home page each frame and made the industry band stutter (2 Nov'26). The progress is
  // rounded to 1/200, so a frame that would not move the line does not re-render it.
  useEffect(() => {
    const el = wrap.current
    if (!geo || !el) return undefined
    if (calmMotion()) { setP(1); return undefined }
    let raf = 0, abs = 0, near = false
    const measure = () => { abs = el.getBoundingClientRect().top + window.scrollY }
    const paint = () => {
      raf = 0
      const top = abs - window.scrollY
      setP(Math.round(clamp01((window.innerHeight * 0.88 - top) / (window.innerHeight * 0.5)) * 200) / 200)
    }
    const on = () => { if (near && !raf) raf = requestAnimationFrame(paint) }
    measure(); paint()
    const io = new IntersectionObserver(([e]) => { near = e.isIntersecting; measure(); paint() }, { rootMargin: '60% 0px 60% 0px' })
    io.observe(el)
    const ro = new ResizeObserver(() => { measure(); paint() })
    ro.observe(document.body)
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on); window.removeEventListener('resize', on)
    }
  }, [geo, wrap])
  if (!geo) return null
  const { y, xs: [xm, xr, xp, xo] } = geo
  const a = clamp01(p / 0.62)                    // mine -> rail -> plant
  const b = clamp01((p - 0.26) / 0.36)           // port -> plant, arriving at the same moment
  const xa = xm + (xp - xm) * a, xb = xo - (xo - xp) * b
  const on = { mine: a > 0, rail: xa >= xr, plant: a >= 1 && b >= 1, port: b > 0 }
  const node = (k, x, r) => <circle key={k} className={`node${on[k] ? ' on' : ''}${k === 'plant' ? ' end' : ''}`} cx={x} cy={y} r={r} />
  return (
    <svg className="bx-chain-flow" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
      <line className="track" x1={xm} x2={xo} y1={y} y2={y} />
      {a > 0 && <line className="run" x1={xm} x2={xa} y1={y} y2={y} />}
      {b > 0 && <line className="run" x1={xo} x2={xb} y1={y} y2={y} />}
      {on.plant && <circle className="halo" cx={xp} cy={y} r={22} />}
      {a >= 1 && <polygon className="arrow" points={`${xp - 25},${y - 6} ${xp - 16},${y} ${xp - 25},${y + 6}`} />}
      {b >= 1 && <polygon className="arrow" points={`${xp + 25},${y - 6} ${xp + 16},${y} ${xp + 25},${y + 6}`} />}
      {node('mine', xm, 8)}{node('rail', xr, 8)}{node('port', xo, 8)}{node('plant', xp, 11)}
    </svg>
  )
}

export function Chain({ data, onOpen }) {
  const stages = chainStages(data)
  const by = Object.fromEntries((data?.series || []).map(s => [s.id, s]))
  const [open, setOpen] = useState(null)
  const last = useRef(null)                       // keeps the panel filled while it slides out
  const wrap = useRef(null)
  if (open) last.current = stages.find(x => x.key === open)
  const cur = last.current
  const phone = usePhone()
  const cards = chainCards(stages, setOpen)
  return (
    <section className="bx-sec" id="chain">
      <div className="wrap">
        <SecHead eyebrow="Market Snapshot · The coal chain" title={<>India&rsquo;s coal industry, <em>mine to plant.</em></>} />
        {phone ? (
          // a phone: the four stages as cards in one swipe row (2 Nov'26, the user's call) — no drawn line,
          // which needs the four in one visible row
          <HRail bleed className="bx-chain-rail bx-reveal" label="The coal chain">{cards}</HRail>
        ) : (
          <div className="bx-chain-wrap" ref={wrap}>
            <ChainFlow wrap={wrap} />
            <div className="bx-chain bx-reveal">{cards}</div>
          </div>
        )}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} label={cur ? `${cur.stage}: industry data` : 'Industry data'}>
        {close => cur && <StagePanel stage={cur} s={by[cur.id]} onOpen={onOpen} close={close} />}
      </Sheet>
    </section>
  )
}

/** One stage of the chain as a card: a link, so a modified click still opens the series in a new tab; a
 *  plain click opens the stage's panel and keeps the reader on the page. */
function chainCards(stages, setOpen) {
  return stages.map(s => (
            // a link, so a modified click still opens the series in a new tab; a plain click
            // opens the panel and keeps the reader on this page
            <a className="bx-chain-card" key={s.key} href={seriesHref(s.id) || '#/chain'} aria-haspopup="dialog"
              onClick={e => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); setOpen(s.key) }}>
              <div className="ph">
                <Photo p={s.photo} sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                <span className="place">{s.place}</span>
                {/* the card is a link, so its credit is text; the panel it opens links the source */}
                <Credit p={s.photo} link={false} />
              </div>
              <div className="tx">
                <span className="stage">{s.stage}</span>
                {s.figure && <>
                  <b className="fig">{s.figure}</b>
                  <span className="what">{s.what}</span>
                  {s.source && <span className="src-line" title={s.source}>Industry data · {shortSource(s.source)}</span>}
                  {/* a phone's 96px thumbnail cannot hold the credit without cutting the licence off: there
                      it is a line of the card's text instead (CSS shows it ≤600px only) */}
                  <span className="cr-line">Photo: {s.photo.author} · {s.photo.license}</span>
                </>}
                <p>{s.bcx}</p>
                <span className="bx-link">Look closer <ArrowRight /></span>
              </div>
            </a>
  ))
}

const PILLAR_ICON = [ShieldCheck, Cpu, Globe2]

/** The mission, in full: each aim and what it means. */
const MissionList = () => (
  <ul>{MISSION.map(([t, p]) => <li key={t}><span className="ck"><Check /></span><span className="tx"><b>{t}</b>{p}</span></li>)}</ul>
)

// THE SEVEN AIMS SCROLL INSIDE THEIR CARD (23 Oct'26, the user's call — the card ran far longer
// than the vision beside it). On a wide screen the card is exactly as tall as the vision column
// (CSS `contain: size`), on a phone a fixed height; the page scrolls on once the list reaches its
// end. The phone's titles-and-a-sheet version (28th pass) is kept behind MISSION_SHEET.
const MISSION_SHEET = false

export function VisionMission() {
  const phone = usePhone() && MISSION_SHEET
  const [open, setOpen] = useState(false)
  return (
    // A NAVY BAND (5 Nov'26, flags.BANDS): the page was white on white; the vision is the page's first
    // dark band, and its statement fills in word by word as it crosses the screen
    <section className={`bx-sec ${BANDS ? 'navy' : 'soft'}`} id="vision">
      <div className="wrap bx-vm">
        <div className="bx-vision bx-reveal">
          <span className={`eyebrow${BANDS ? ' light' : ''}`}>Our vision</span>
          {BANDS ? <FillText text={VISION.statement} /> : <blockquote>{VISION.statement}</blockquote>}
          <div className="pillars">
            {VISION.pillars.map(([t, s], i) => {
              const I = PILLAR_ICON[i]
              return <div key={t}><span className="ic"><I /></span><span><b>{t}</b>{s}</span></div>
            })}
          </div>
        </div>
        <div className={`bx-mission bx-reveal${phone ? ' short' : ''}`}>
          <span className="eyebrow">Our mission{phone && <small> · {MISSION.length} aims</small>}</span>
          {/* seven aims, each a heading and what it means (BCX's changes document, 22 Oct'26) */}
          {phone ? (
            <>
              <ol>{MISSION.map(([t]) => <li key={t}><span className="ck"><Check /></span><b>{t}</b></li>)}</ol>
              <button className="bx-btn secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">Read our mission <ArrowRight /></button>
            </>
          ) : <div className="bx-mscroll" tabIndex={0} aria-label="Our mission, seven aims"><MissionList /></div>}
        </div>
      </div>
      {phone && (
        <Sheet open={open} onClose={() => setOpen(false)} label="Our mission">
          <div className="bx-mission-sheet">
            <span className="eyebrow">Our mission</span>
            <h3>{MISSION.length} aims, and what each one means</h3>
            <MissionList />
          </div>
        </Sheet>
      )}
    </section>
  )
}

const PR_ICON = [Scale, Zap, Sparkles, ShieldCheck]

export function Principles() {
  const phone = usePhone()
  return (
    <section className="bx-sec tight" id="principles">
      <div className="wrap">
        <SecHead eyebrow="Our core principles" title={<>Four principles behind <em>every trade.</em></>} />
        {/* a phone: the four as cards in one swipe row (2 Nov'26, the user's call); the desktop is unchanged */}
        {phone ? (
          <HRail bleed className="bx-pr-rail bx-reveal" label="Our core principles">
            {PRINCIPLES.map(([t, p], i) => {
              const I = PR_ICON[i]
              return <div key={t} className="bx-pr-card"><span className="ic"><I /></span><h3>{t}</h3><p>{p}</p></div>
            })}
          </HRail>
        ) : (
          <div className="bx-principles bx-reveal">
            {PRINCIPLES.map(([t, p], i) => {
              const I = PR_ICON[i]
              return <div key={t}><span className="ic"><I /></span><h3>{t}</h3><p>{p}</p></div>
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export function Careers() {
  const phone = usePhone()
  return (
    <section className={`bx-sec${BANDS ? '' : ' soft'}`} id="careers">
      <div className="wrap bx-careers">
        <div className="tx bx-reveal">
          <span className="eyebrow">Careers</span>
          <h2 className="h-sec">{CAREERS.title}<em>.</em></h2>
          <p className="lede">{CAREERS.intro}</p>
          <p className="note">{CAREERS.note}</p>
          <a className="bx-btn primary" href={`mailto:${CONTACT.email}?subject=Careers%20at%20BCX`}><Mail /> Write to us</a>
        </div>
        {/* four cards, each a heading and its line, as BCX's changes document suggests */}
        {phone ? (
          // a phone: the reasons as cards in one swipe row (2 Nov'26)
          <div className="why why-rail bx-reveal">
            <h3>Why join BCX?</h3>
            <HRail bleed label="Why join BCX">
              {CAREERS.reasons.map(([t, p]) => <div key={t} className="bx-why-card"><b>{t}</b><span>{p}</span></div>)}
            </HRail>
          </div>
        ) : (
          <div className="why bx-reveal">
            <h3>Why join BCX?</h3>
            <ul className="cards">{CAREERS.reasons.map(([t, p]) => <li key={t}><b>{t}</b><span>{p}</span></li>)}</ul>
          </div>
        )}
      </div>
    </section>
  )
}

export function Contact() {
  return (
    <section className="bx-sec" id="contact">
      <div className="wrap">
        <div className="bx-contact bx-reveal">
          <Photo p={PHOTOS.railChp} sizes="100vw" />
          <Credit p={PHOTOS.railChp} className="on-dark" />
          <div className="tx">
            <span className="eyebrow light">Contact</span>
            <h2>{CONTACT.title}</h2>
            <p>{CONTACT.lede}</p>
            <a className="bx-btn white" href={`mailto:${CONTACT.email}`}><Mail /> {CONTACT.email}</a>
          </div>
          <div className="cards">
            <div className="cc"><span className="ic"><MapPin /></span><span><b>{CONTACT.company}</b>{CONTACT.address}</span></div>
            <a className="cc" href={`mailto:${CONTACT.email}`}><span className="ic"><Mail /></span><span><b>Enquiries</b>{CONTACT.email}</span><ArrowRight className="go" /></a>
            {/* BCX on LinkedIn (27 Oct'26) — the company page, in a new tab */}
            {CONTACT.linkedin && (
              <a className="cc" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                <span className="ic"><LinkedInIcon /></span><span><b>LinkedIn</b>Bharat Coal Exchange (BCX)</span><ArrowUpRight className="go" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
