// Skeleton loaders: every block of the site has a placeholder of its own SHAPE, so the
// page lays out once and fills in — no spinner, no jump when the data lands.
import { useEffect, useRef } from 'react'

export const Sk = ({ w = '100%', h = 12, r, className = '', style }) => (
  <div className={`bx-skel ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
)

/** Fade-and-rise on first scroll into view.
 *
 *  It watches the DOM, not the route. It used to re-scan only when the VIEW changed, so
 *  Back from a series page to the data centre (same view, new elements) mounted blocks
 *  that were never observed and stayed at opacity 0 for good — "the data disappears when
 *  I press Back". A MutationObserver now hands every newly mounted .bx-reveal to the
 *  IntersectionObserver, whatever caused it to mount. */
export function useReveal() {
  useEffect(() => {
    const reveal = e => e.classList.add('in')
    if (!('IntersectionObserver' in window)) {
      const all = () => document.querySelectorAll('.bx-reveal:not(.in)').forEach(reveal)
      all()
      const mo = new MutationObserver(all)
      mo.observe(document.body, { childList: true, subtree: true })
      return () => mo.disconnect()
    }
    // A BLOCK STARTS TO SHOW BEFORE IT ARRIVES (23 Oct'26). It used to wait until it was 8% INSIDE
    // the viewport, so the foot of the screen sat blank (opacity 0) mid-scroll and read as "there
    // is nothing below". It now starts 12% below the fold, so it is already rising as it enters.
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target) }
    }), { rootMargin: '0px 0px 12% 0px', threshold: 0 })
    let raf = 0
    const scan = () => {
      raf = 0
      document.querySelectorAll('.bx-reveal:not(.in):not([data-rv])').forEach(e => { e.dataset.rv = '1'; io.observe(e) })
    }
    scan()
    // only a mutation that ADDS a .bx-reveal re-scans: the coal map's renderer adds and removes
    // thousands of SVG nodes as it zooms, and each batch used to query the whole document
    const adds = ms => ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.closest?.('.leaflet-container')
      && (n.classList.contains('bx-reveal') || n.getElementsByClassName('bx-reveal').length)))
    const mo = new MutationObserver(ms => { if (!raf && adds(ms)) raf = requestAnimationFrame(scan) })
    mo.observe(document.body, { childList: true, subtree: true })
    // A REMOUNT MUST RE-OBSERVE (4 Nov'26): StrictMode runs this effect twice on the dev server, and
    // the first run's `data-rv` marks outlived its disconnected observer, so the second run skipped
    // them — a page opened directly (#/news) kept its list at opacity 0 for good, scrolled or not.
    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf)
      document.querySelectorAll('.bx-reveal[data-rv]:not(.in)').forEach(e => { delete e.dataset.rv })
    }
  }, [])
}

export function HeroSkeleton() {
  return (
    <section className="bx-hero" aria-busy="true" aria-label="Loading">
      <div className="bx-hero-bg"><div className="bx-skel" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /></div>
      <div className="wrap bx-hero-in">
        <div className="bx-hero-copy" style={{ width: 'min(620px, 100%)' }}>
          <Sk w={220} h={34} r={999} style={{ background: 'var(--sk-grey, #e7ebf0)' }} />
          <Sk w="96%" h={60} r={12} style={{ background: 'var(--sk-grey, #e7ebf0)' }} /><Sk w="72%" h={60} r={12} style={{ background: 'var(--sk-grey, #e7ebf0)' }} />
          <Sk w="88%" h={15} style={{ background: 'var(--sk-grey, #e7ebf0)' }} /><Sk w="70%" h={15} style={{ background: 'var(--sk-grey, #e7ebf0)' }} />
          <div style={{ display: 'flex', gap: 12 }}><Sk w={180} h={48} r={12} style={{ background: 'var(--sk-grey, #e7ebf0)' }} /><Sk w={190} h={48} r={12} style={{ background: 'var(--sk-grey, #e7ebf0)' }} /></div>
        </div>
      </div>
    </section>
  )
}

/** A newsletter page, drawn in grey: masthead, KPI row, two chart blocks, a table. */
/** MARKET INSIGHTS' OWN SKELETON (2 Nov'26): its photo head, its module bar, a title card, four figures
 *  and two panels — so a first visit to #/insights sees the page it is about to get, not the home
 *  page's hero, while the payload loads. */
export function InsightsSkeleton() {
  const grey = { background: 'var(--sk-grey, #e7ebf0)' }
  return (
    <div className="bx-insights" aria-busy="true" aria-label="Loading Market Insights">
      <section className="bx-in-head">
        <div className="bg"><div className="bx-skel" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /></div>
        <div className="wrap in-head" style={{ display: 'grid', gap: 12 }}>
          <Sk w={170} h={13} style={grey} /><Sk w={110} h={12} style={grey} />
          <Sk w="min(440px, 80%)" h={56} r={12} style={grey} /><Sk w={190} h={14} style={grey} />
        </div>
      </section>
      <nav className="bx-in-nav" aria-hidden="true">
        <div className="wrap">
          <div className="bx-in-tabs">{Array.from({ length: 7 }, (_, i) => <span key={i} className="sk-tab"><Sk w="70%" h={14} /></span>)}</div>
        </div>
      </nav>
      <div className="bx-in-body">
        <div className="wrap" style={{ display: 'grid', gap: 22, paddingTop: 22 }}>
          <div className="bx-in-card"><div className="tx" style={{ display: 'grid', gap: 10 }}><Sk w={260} h={30} r={8} /><Sk w={120} h={13} /></div></div>
          <div className="bx-sk-kpis">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="bx-sk-kpi"><Sk w="60%" h={13} /><Sk w="45%" h={34} r={8} /><Sk w="100%" h={46} r={8} /></div>)}
          </div>
          <div className="bx-sk-panels">
            {Array.from({ length: 2 }, (_, i) => <div key={i} className="bx-sk-panel"><Sk w="50%" h={18} /><Sk w="100%" h={300} r={12} /></div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function IssueSkeleton() {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 8, width: '55%' }}><Sk w="70%" h={22} /><Sk w="45%" h={12} /></div>
        <Sk w={110} h={44} r={8} />
      </div>
      <Sk h={6} r={3} />
      <Sk w="85%" h={12} /><Sk w="70%" h={12} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[0, 1, 2, 3].map(i => <Sk key={i} h={92} r={10} />)}
      </div>
      <Sk w="40%" h={16} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Sk h={190} r={10} /><Sk h={190} r={10} /></div>
      <Sk w="35%" h={16} />
      {[0, 1, 2, 3, 4].map(i => <Sk key={i} h={18} r={4} />)}
    </div>
  )
}


/** Run `fn` once, the first time `ref` scrolls near the viewport. */
export function useNear(ref, fn, margin = '400px') {
  const done = useRef(false)
  useEffect(() => {
    if (!ref.current || done.current) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) { done.current = true; fn(); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [ref, fn, margin])
}
