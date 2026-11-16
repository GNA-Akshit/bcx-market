// The hero: BCX's own promise (from bcx.market) over the coal market's landscape — NCL's
// Dudhichua pit. On a DESKTOP the photograph is full bleed behind the words. ON A PHONE IT IS A BANNER
// (10 Nov'26, chosen from twelve variants the user flipped through): a 230px strip of the pit under the
// header's own solid bar, edge to edge, its foot dissolving into the page — a CSS MASK, not a colour wash,
// so it meets the ground in no line in either theme — and the words on clean ground under it. The credit
// the licence requires is hidden on a phone until the picture is held. Rejected the same day, in order:
// the photo as a card under the words ("out of place"), a drawing of India's coalfields ("khaali khaali …
// childish and AI generated"), a faint grid ("AI generated"); the eleven other try-out variants are gone.
//
// NO MARKET FIGURES HERE. The home page is in two parts — BCX first, then India's coal
// industry in public data — and the hero opens part one. This morning's market used to rest
// on the hero in a card, which put industry figures above "About BCX" and blurred the line
// between what BCX is and what the industry publishes; that card now opens part two
// (Industry.jsx).
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChartLine, ChevronRight, Newspaper, Scale, Zap } from 'lucide-react'
import { PHOTOS, Photo } from './media.jsx'
import { HERO } from './content.js'
import { parallax, useOnScroll, usePhone } from './ui.jsx'
import { HERO_CTA, NEWSLETTER } from './flags.js'

// THE PHONE'S DOORS (23 Oct'26): on a phone the three things a visitor can DO here sit right under
// the hero as rows, the way an app lists its sections. Navigation only — no figures (the hero
// rule above): the figures are behind the first door.
const DOORS = [
  [ChartLine, 'Market Insights', 'Production, offtake and plant stocks', '#/insights'],
  ...(NEWSLETTER ? [[Newspaper, 'Newsletter', 'Every morning at 09:00 IST', '#/newsletter']] : []),
  [Scale, 'Regulations', 'Coal exchange and coal mining', '#/legal'],
]

export default function Hero({ onGo }) {
  // the parallax moves the photograph itself, once a frame — no re-render
  const layer = useRef(null)
  // past two screens the photograph is long gone: stop writing to it
  useOnScroll(y => { if (layer.current && y < window.innerHeight * 2) layer.current.style.transform = `translate3d(0, ${parallax(y)}px, 0) scale(1.06)` })
  const phone = usePhone()
  // THE CREDIT ON A PHONE SHOWS ON A TAP-AND-HOLD: the licence line is small print the reader never asked
  // for, so it stays hidden until the picture is held (~450 ms, no movement), then shows for a few seconds.
  // A tap or a scroll never brings it up; the desktop keeps it in the corner.
  const [credit, setCredit] = useState(false)
  const hold = useRef({ t: 0, x: 0, y: 0 })
  useEffect(() => { if (!credit) return undefined; const t = setTimeout(() => setCredit(false), 4000); return () => clearTimeout(t) }, [credit])
  const holdStart = e => {
    const p = e.touches ? e.touches[0] : e
    hold.current = { x: p.clientX, y: p.clientY, t: setTimeout(() => setCredit(true), 450) }
  }
  const holdMove = e => {
    const p = e.touches ? e.touches[0] : e
    if (Math.hypot(p.clientX - hold.current.x, p.clientY - hold.current.y) > 8) clearTimeout(hold.current.t)
  }
  const holdEnd = () => clearTimeout(hold.current.t)
  const pic = PHOTOS.heroMine
  return (
    <section className={`bx-hero${phone ? ' ph-banner' : ''}`} id="top">
      {phone ? (
        // the banner: the strip itself takes the hold; website.css "v70"
        <div className="bx-hero-ph banner" aria-hidden="true"
          onTouchStart={holdStart} onTouchMove={holdMove} onTouchEnd={holdEnd} onTouchCancel={holdEnd}
          onContextMenu={e => { e.preventDefault(); setCredit(true) }}>
          <Photo p={pic} eager sizes="100vw" />
        </div>
      ) : (
        <div className="bx-hero-bg" aria-hidden="true">
          <div ref={layer}>
            <Photo p={pic} eager sizes="100vw" />
          </div>
        </div>
      )}
      <div className="wrap bx-hero-in">
        <div className="bx-hero-copy">
          {/* the "An initiative by GNA Energy" pill is OFF (16 Nov'26, the user: remove the GNA Energy details from the
              home page) — it comes back if content.HERO.org is set again */}
          {HERO.org && <a className="bx-pill" href={HERO.orgUrl} target="_blank" rel="noreferrer"><span className="ic"><Zap /></span>{HERO.pill} <b>{HERO.org}</b></a>}
          <h1>{HERO.title[0]}<em>{HERO.title[1]}</em></h1>
          <p className="lede">{HERO.lede}</p>
          <div className="bx-hero-ctas">
            <button className="bx-btn primary" onClick={() => onGo('about')}>Discover BCX <ArrowRight /></button>
            {/* the second button opens the market itself — "Industry data" scrolled to a band on
                this page and read as all the data there was (23 Oct'26). It has to look clickable on
                its own (5 Nov'26): its icon in a tile, an arrow that moves — flags.HERO_CTA, website-bands.css */}
            <a className={`bx-btn secondary cta-${HERO_CTA}`} href="#/insights">
              <span className="tile" aria-hidden="true"><ChartLine /></span>
              <span className="lb">Market Insights</span>
              <ArrowRight className="go" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <a className={`bx-photo-credit${phone ? ` hold${credit ? ' show' : ''}` : ''}`} href={pic.source} target="_blank" rel="noreferrer">
        Dudhichua mine, Singrauli · {pic.author} · {pic.license}
      </a>
      <nav className="bx-doors wrap" aria-label="Go to">
        {DOORS.map(([I, t, s, href]) => (
          <a key={href} href={href}>
            <span className="ic"><I aria-hidden="true" /></span>
            <span className="tx"><b>{t}</b><small>{s}</small></span>
            <ChevronRight className="go" aria-hidden="true" />
          </a>
        ))}
      </nav>
    </section>
  )
}
