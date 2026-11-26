// THE EVENTS SECTION (26 Nov'26, LIVE - flags.HOME_EVENTS), in the coal chain's place ("a lot of reviews that this
// section is useless"); if it goes, the chain comes back, not the regulations.
//
// BCX at the 8th Annual India Coal Conference (Elekore; Hyatt Regency, New Delhi, 17–19 Nov 2026), where BCX was the
// Exchange Partner - the organiser's own event page. The photographs are BCX's own (scripts/website/make_event_photos.py),
// shown as taken. Sujay Haldar's name and title are the ones on his badge and memento.
//
// THE TICKER, INSIDE THE COLUMN (option B of seven, picked by the user on the comparison page): the photographs drift left
// on their own within the page's own edges - a window the width of the column, clipped square, never faded into the page
// (the first ticker ran edge to edge and faded: "goofy", "horrible" on the white page). Hover pauses it and brings up
// the arrows, which sit ON the column's edges; an arrow glides it one photograph. A photograph opens full size in a viewer
// (arrows at the screen's edges, ← → and Esc). It also stops while it is off screen, while the tab is hidden, while a
// control has focus, and for a reader who asks for reduced motion. A phone has no hover: its arrows always show and a swipe
// moves the strip. The strip is moved by a transform on each animation frame - never React state, never a scroll.
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const IMG = '/site/img/events'
const SHOTS = [
  { file: 'icc26-panel', alt: 'Sujay Haldar, Executive Director, BCX, speaking during a panel discussion at the India Coal Conference 2026' },
  { file: 'icc26-memento', alt: 'Sujay Haldar receiving the conference memento on stage' },
  { file: 'icc26-stage', alt: 'Sujay Haldar, second from left, with fellow speakers on stage' },
]
const COPIES = 3                       // one set is wider than the column, so three always fill the window as it wraps
const SPEED = 32                       // px a second
const GLIDE = 520                      // ms for an arrow's one-photograph move
const ease = t => 1 - (1 - t) ** 3

export default function EventTicker() {
  const reel = useRef(null)
  const track = useRef(null)
  const st = useRef({ x: 0, set: 0, step: 0, hold: false, seen: true, glide: null, drag: null })
  const [open, setOpen] = useState(null)               // the photograph in the viewer, by index

  useEffect(() => {
    const s = st.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const measure = () => {
      const k = track.current?.children
      if (!k || k.length <= SHOTS.length) return
      s.set = k[SHOTS.length].offsetLeft - k[0].offsetLeft
      s.step = k[1].offsetLeft - k[0].offsetLeft
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track.current)
    const io = new IntersectionObserver(([e]) => { s.seen = e.isIntersecting }, { rootMargin: '120px 0px' })
    io.observe(reel.current)
    const wrap = x => (s.set ? ((x % s.set) + s.set) % s.set : x)
    let raf = 0, last = performance.now()
    const frame = now => {
      const dt = Math.min(64, now - last)
      last = now
      if (s.glide) {
        const p = Math.min(1, (now - s.glide.t0) / GLIDE)
        s.x = s.glide.from + (s.glide.to - s.glide.from) * ease(p)
        if (p >= 1) { s.x = wrap(s.x); s.glide = null }
      } else if (!s.hold && !s.drag && s.seen && !document.hidden && !reduced) {
        s.x = wrap(s.x + (SPEED * dt) / 1000)
      }
      if (track.current) track.current.style.transform = `translate3d(${-s.x}px,0,0)`
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [])

  const nudge = d => {
    const s = st.current
    if (!s.step) return
    s.glide = { from: s.x, to: (Math.round((s.glide ? s.glide.to : s.x) / s.step) + d) * s.step, t0: performance.now() }
  }
  // a swipe on touch: the strip follows the finger, then drifts on
  const down = e => { if (e.pointerType !== 'mouse') st.current.drag = { x0: e.clientX, from: st.current.x, moved: false } }
  const move = e => {
    const d = st.current.drag
    if (!d) return
    if (Math.abs(e.clientX - d.x0) > 6) d.moved = true
    st.current.x = d.from - (e.clientX - d.x0)
  }
  const up = () => {
    const s = st.current
    if (!s.drag) return
    s.dragged = s.drag.moved                          // a swipe is not a tap: it must not open the viewer
    s.drag = null
    s.x = s.set ? ((s.x % s.set) + s.set) % s.set : s.x
  }
  const openAt = i => {
    if (st.current.dragged) { st.current.dragged = false; return }
    setOpen(i)
  }
  const hold = on => { st.current.hold = on }

  return (
    <section className="bx-sec bx-events" id="events" aria-labelledby="ev-title">
      <div className="wrap">
        <div className="bx-events-hd">
          <div className="t">
            <span className="eyebrow">Events</span>
            <h2 className="h-sec" id="ev-title">8th Annual India Coal Conference</h2>
          </div>
          <p className="body">
            Sujay Haldar, Executive Director, represented Bharat Coal Exchange as a speaker at the conference, organised by
            Elekore with the support of the Ministry of Coal and Coal India Limited. BCX took part as the conference&rsquo;s
            Exchange Partner, alongside producers, power, steel and cement buyers, traders and logistics operators, under the
            theme &ldquo;Coal at the Core: Securing India&rsquo;s Energy Future in a Decarbonising World&rdquo;.
          </p>
        </div>
        <div className="bx-tick" ref={reel} role="region" aria-roledescription="carousel" aria-label="Photographs from the India Coal Conference 2026"
          onMouseEnter={() => hold(true)} onMouseLeave={() => hold(false)} onFocus={() => hold(true)} onBlur={() => hold(false)}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="bx-tick-win">
            <ul ref={track}>
              {Array.from({ length: COPIES }, (_, c) => SHOTS.map((p, i) => (
                <li key={`${c}-${p.file}`} aria-hidden={c > 0 ? 'true' : undefined}>
                  <button type="button" className="bx-tick-tile" onClick={() => openAt(i)} tabIndex={c > 0 ? -1 : 0}
                    aria-label={`View larger: ${p.alt}`}>
                    <img src={`${IMG}/${p.file}-sm.webp`} srcSet={`${IMG}/${p.file}-sm.webp 900w, ${IMG}/${p.file}.webp 1600w`}
                      sizes="(max-width: 760px) 78vw, 520px" alt={c > 0 ? '' : p.alt} loading="lazy" decoding="async"
                      draggable="false" width="1600" height="1066" />
                  </button>
                </li>
              )))}
            </ul>
          </div>
          <button type="button" className="bx-tick-arr prev" onClick={() => nudge(-1)} aria-label="Previous photograph"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className="bx-tick-arr next" onClick={() => nudge(1)} aria-label="Next photograph"><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>
      {open != null && <Viewer at={open} onMove={setOpen} onClose={() => setOpen(null)} />}
    </section>
  )
}

/** The photograph full size over the page: its arrows at the screen's two edges, a count, Esc and the arrow keys. */
function Viewer({ at, onMove, onClose }) {
  const n = SHOTS.length
  const go = useCallback(d => onMove((at + d + n) % n), [at, n, onMove])
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', key)
    const was = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = was }
  }, [go, onClose])
  const p = SHOTS[at]
  return (
    <div className="bx-viewer" role="dialog" aria-modal="true" aria-label="Photographs from the India Coal Conference 2026"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <figure><img key={p.file} src={`${IMG}/${p.file}.webp`} alt={p.alt} width="1600" height="1066" /></figure>
      <button type="button" className="bx-viewer-arr prev" onClick={() => go(-1)} aria-label="Previous photograph"><ChevronLeft aria-hidden="true" /></button>
      <button type="button" className="bx-viewer-arr next" onClick={() => go(1)} aria-label="Next photograph"><ChevronRight aria-hidden="true" /></button>
      <button type="button" className="bx-viewer-x" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
      <span className="bx-viewer-n" aria-live="polite">{at + 1} / {n}</span>
    </div>
  )
}
