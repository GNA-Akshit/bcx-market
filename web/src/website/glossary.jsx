// Plain English for the data centre: what each coal series measures and why it matters,
// and the trade terms behind them, defined where they appear.
//
// EXPLAIN holds two sentences per series — what it is, then why a buyer cares — written
// to be true of the series whatever its latest value (no figures, no trends, so the text
// never goes stale or contradicts the chart beside it). A term written [[id]] or
// [[id|label]] becomes a Term: dotted underline, definition on hover, focus or tap.
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const GLOSSARY = {
  rake: { term: 'Rake', def: 'A full train of coal wagons — usually about 58 wagons, carrying around 3,800 tonnes.' },
  fois: { term: 'FOIS', def: 'Freight Operations Information System: Indian Railways’ system for booking and tracking freight trains.' },
  swma: { term: 'SWMA', def: 'Single Window Mode Agnostic: Coal India’s e-auction, where buyers bid for coal whether it will move by rail or by road.' },
  notified: { term: 'Notified price', def: 'The price Coal India publishes for each grade of coal. E-auction bids are measured against it.' },
  premium: { term: 'Premium', def: 'How far a winning e-auction bid is above the notified price, as a percentage of it.' },
  nar: { term: 'NAR', def: 'Net As Received: the heat in coal as it arrives, after allowing for its moisture. It reads lower than GAR for the same coal.' },
  gar: { term: 'GAR', def: 'Gross As Received: the heat in coal as it arrives, before allowing for its moisture.' },
  kcal: { term: 'kcal/kg', def: 'Kilocalories per kilogram: how much heat a kilogram of coal gives when burned. Higher means better coal.' },
  fob: { term: 'FOB', def: 'Free on board: the price at the loading port, before freight and insurance to the buyer.' },
  api4: { term: 'API4', def: 'The industry price index for coal exported from Richards Bay, South Africa.' },
  despatch: { term: 'Despatch', def: 'Coal that has left the mine for a buyer. Production is what is mined; despatch is what is sold and moved.' },
  captive: { term: 'Captive mine', def: 'A mine allotted to a company to supply its own plants — a power station, a steel works or a cement works.' },
  commercial: { term: 'Commercial mine', def: 'A mine auctioned by the Ministry of Coal whose owner may sell the coal in the open market.' },
  noncoking: { term: 'Non-coking coal', def: 'Thermal coal, burned for heat in power stations and industry — as against coking coal, which is used to make steel.' },
  coking: { term: 'Coking coal', def: 'Coal of the quality needed to make coke for steel-making.' },
  fy: { term: 'Fiscal year', def: 'India’s financial year, April to March. FY 2024–25 runs from 1 April 2024 to 31 March 2025.' },
  mt: { term: 'MT', def: 'Million tonnes. Daily figures are given in thousand tonnes (’000 t).' },
}

export const EXPLAIN = {
  cil_production_daily: ['How much coal Coal India’s mines dig up each day, from its own daily dashboard.',
    'Coal India mines roughly three-quarters of India’s coal, so this is the quickest read on supply.'],
  msg_production: ['All the coal mined in India each month — Coal India, Singareni, and captive and commercial mines together — as the Ministry of Coal reports it.',
    'The Ministry publishes a few months after the month ends, so this trails the daily figures.'],
  msg_production_captive: ['Coal mined each month by [[captive|captive]] and [[commercial|commercial]] mines, as the Ministry of Coal reports it.',
    'Commercial mines may sell their coal in the open market — the kind of seller an exchange is built for.'],
  cco_production: ['India’s total coal production for each [[fy|fiscal year]], as the Coal Controller’s Organisation reports it.',
    'These are the year-end figures that the monthly numbers build towards.'],
  cil_offtake_daily: ['How much coal leaves Coal India’s mines for its customers each day, by rail and road.',
    '[[despatch|Despatch]], not production, is the coal buyers actually receive.'],
  msg_offtake: ['All the coal despatched from India’s mines each month, as the Ministry of Coal reports it.',
    'It is the national total of the coal that reached buyers.'],
  msg_offtake_cil: ['Coal India’s despatch for each month, from the Ministry of Coal’s monthly report.',
    'It is the official monthly count of the despatch Coal India reports day by day.'],
  sector_power: ['The coal despatched to power stations each month, as the Ministry of Coal reports it.',
    'Power producers are coal’s largest buyers, so this is the demand side of the market.'],
  swma_premium: ['How far above Coal India’s [[notified|notified price]] buyers bid, on average, at its [[swma|SWMA]] e-auctions each month.',
    'A high [[premium|premium]] means buyers are competing hard for coal — usually a sign that supply is tight.'],
  swma_allocated: ['The coal Coal India sold through its [[swma|SWMA]] e-auctions each month, in [[mt|million tonnes]].',
    'Read with the premium, it shows how much coal changed hands at market prices.'],
  newcastle: ['The benchmark price for high-grade thermal coal shipped from Newcastle, Australia — 6,000 [[kcal|kcal/kg]] [[nar|NAR]], [[fob|FOB]] — as settled each day, in US dollars a tonne.',
    'It is the reference price for seaborne coal in Asia, and what Indian importers weigh domestic coal against.'],
  api4: ['The benchmark price for thermal coal shipped from Richards Bay, South Africa ([[api4|API4]]), as settled each day, in US dollars a tonne.',
    'South Africa is one of the main sources of the coal India imports.'],
  fois_rakes: ['The number of [[rake|rakes]] — full coal trains — loaded at Coal India’s sidings each month, from its [[fois|FOIS]] rail dashboard.',
    'Rail carries more of India’s coal than any other mode, so this is the pace of coal on the move.'],
  cil_mode_rail: ['The part of Coal India’s despatch that left by rail each month, as the Ministry of Coal reports it.',
    'Rail is how coal travels the long distances from the coalfields to the power stations.'],
  cco_imports: ['All the coal India imported in each [[fy|fiscal year]] — thermal coal for power and industry, and [[coking|coking coal]] for steel — as the Coal Controller’s Organisation reports it.',
    'It is the coal India buys abroad because it does not mine enough of the right kind at home.'],
  imports_noncoking: ['Imports of [[noncoking|non-coking coal]] — the thermal coal burned in power stations and factories — for each fiscal year.',
    'This is the imported coal that competes most directly with Indian coal.'],
}

const HEADER = 84            // the sticky header's height plus a margin: never place a bubble under it

/** A trade term: dotted underline, its definition on hover (mouse), focus (keyboard) or
 *  tap (touch).
 *
 *  THE BUBBLE IS PORTALLED, AND FIXED. Positioned inside the term, it was cut off by any
 *  scrolling ancestor — the "at a glance" panel scrolls, so every definition there showed
 *  only its bottom edge. It now lives at the top of the site, placed from the term's own
 *  line box: centred over the first line (or under the last, when the header leaves no room
 *  above), kept 12px inside the screen, following the term as the page or a panel scrolls,
 *  and closed when the term leaves the screen. */
export function Term({ id, children }) {
  const g = GLOSSARY[id]
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)              // null until measured: rendered hidden once
  const term = useRef(null)
  const tip = useRef(null)
  // how the term was last reached: a tap fires pointerdown, focus, then click, so focus
  // must not open it for touch (the click would then toggle it straight shut again)
  const pointer = useRef('keyboard')
  const tid = useId()
  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined }
    const place = () => {
      if (!term.current || !tip.current) return
      const lines = term.current.getClientRects()   // a term can wrap: use its first/last line
      const first = lines[0], last = lines[lines.length - 1]
      if (!first || last.bottom < HEADER - 20 || first.top > window.innerHeight) { setOpen(false); return }
      const w = tip.current.offsetWidth, h = tip.current.offsetHeight
      const vw = document.documentElement.clientWidth
      const below = first.top - h - 10 < HEADER
      const at = below ? last : first
      const left = Math.max(12, Math.min(at.left + at.width / 2 - w / 2, vw - 12 - w))
      setPos({ left, top: below ? last.bottom + 10 : first.top - h - 10 })
    }
    place()
    let raf = 0
    const follow = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place) }
    window.addEventListener('scroll', follow, true)  // capture: a panel's scroll moves it too
    window.addEventListener('resize', follow)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open])
  if (!g) return children
  return (
    <span ref={term} className={`bx-term${open ? ' open' : ''}`} tabIndex={0} role="button" aria-expanded={open}
      aria-describedby={open ? tid : undefined}
      onPointerDown={e => { pointer.current = e.pointerType }}
      onPointerEnter={e => { if (e.pointerType === 'mouse') setOpen(true) }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setOpen(false) }}
      onFocus={() => { if (pointer.current === 'keyboard') setOpen(true) }}
      onBlur={() => setOpen(false)}
      onClick={e => {
        e.preventDefault(); e.stopPropagation()
        if (pointer.current === 'touch' || pointer.current === 'pen') setOpen(o => !o)
        pointer.current = 'keyboard'
      }}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}>
      {children}
      {open && createPortal(
        // React bubbles portal events to the term: without these, a tap ON the bubble blurs
        // the term (closing it) and its click toggles it straight back open
        <span role="tooltip" id={tid} ref={tip} className="bx-term-tip"
          onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
          style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}>
          <b>{g.term}</b>{g.def}
        </span>,
        document.querySelector('.bx') || document.body,
      )}
    </span>
  )
}

/** Text with [[id]] / [[id|label]] terms in it, rendered with Terms. */
export function Explained({ text }) {
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
    const m = part.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/)
    return m ? <Term key={i} id={m[1]}>{m[2] || GLOSSARY[m[1]]?.term || m[1]}</Term> : part
  })
}

/** "What this means": the two sentences for a series, or nothing if it has none. */
export function WhatItMeans({ id, short = false, className = '' }) {
  const e = EXPLAIN[id]
  if (!e) return null
  return (
    <p className={`bx-explain ${className}`}>
      {!short && <span className="k">What this means</span>}
      <Explained text={e[0]} />{!short && <> <Explained text={e[1]} /></>}
    </p>
  )
}

/** Every term, A to Z — the data centre's Glossary tab. */
export function GlossaryList() {
  const items = Object.values(GLOSSARY).sort((a, b) => a.term.localeCompare(b.term))
  return (
    <dl className="bx-glossary">
      {items.map(g => <div key={g.term}><dt>{g.term}</dt><dd>{g.def}</dd></div>)}
    </dl>
  )
}
