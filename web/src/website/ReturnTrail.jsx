// THE WAY BACK (pass 84). A link IN A CARD that opens another page or another Market Insights module leaves ONE
// pill at the foot of the screen, naming where the reader came from — "Back to What we cover", "Back to Thermal power
// plants by coal stock" — never a bare "Back to Overview".
//  * It waits a moment after the new page opens, and takes no tap for 0.4 s more, so the tap that followed the link
//    can never land on it.
//  * It steps back through the browser's history, which puts the page where it was (Website.navigate keeps each
//    page's scroll).
//  * It goes for good on ×, after 9 s ignored (not while a pointer or focus is on it), or on any other move, and is
//    never shown twice for one jump.
// SITE-WIDE (pass 84b, the user: "I came to this page by clicking Coal stocks & replenishment on the home page" —
// the trail lived inside Market Insights, which is not on screen when a home card is clicked): the click is read
// here, before the site's own handler navigates, and the site root shows the pill on whichever page it lands.
// Which links leave one: a Market Insights card's (`.bx-in-panel`), a home section's (`main section[id]`, not the
// hero). The header, the menus, the module bar, the dock, the search and any sheet are navigation of their own.
// scratch/dev/_probe_return_pill.py, _probe_return_home.py
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, X } from 'lucide-react'
import { here, nameOfHref } from './route.js'

const WAIT = 1100
const LIFE = 9000
const ALIAS = { mines: 'map', resources: 'sources' }
// a home section by the name the page gives it
const HOME_NAME = { about: 'About BCX', coverage: 'What we cover', vision: 'Our vision', principles: 'Our principles', careers: 'Careers',
  industry: 'Market Snapshot', chain: 'The coal chain', letter: 'Newsletter', contact: 'Contact' }
const MODULE_NAME = { overview: 'Overview', supply: 'Production & offtake', map: 'Coal map', stocks: 'Plant stocks', power: 'Coal in electricity',
  auction: 'E-auctions', sources: 'Sources' }

/** The page an address shows: "insights/<module>" for Market Insights, the page's name otherwise, "home" for the
 *  home page and its sections (moving between those is a scroll, not a jump). */
export function pageOf(hash) {
  const p = (hash || '').replace(/^#\/?/, '').split(/[/?]/).filter(Boolean)
  if (p[0] === 'site') p.shift()
  if (p[0] === 'insights') return `insights/${ALIAS[p[1]] || p[1] || 'overview'}`
  if (p[0] === 'resources') return 'insights/sources'
  // the names the site's router gives these pages (Website.parse → route.view)
  if (['newsletter', 'newsletters', 'research'].includes(p[0])) return 'letter'
  if (p[0] === 'data') return 'explorer'
  if (['legal', 'news', 'explorer'].includes(p[0])) return p[0]
  return 'home'
}

/** Where a clicked link sits, by the name the reader sees — or null when it is not a link that leaves a trail. */
function originOf(a, from) {
  if (a.closest('[role="dialog"], .bx-head, .bx-foot, .bx-crumbs, .bx-doors, nav[aria-label="Menu"], .bx-in-tabs, .bx-dock, .bx-ret')) return null
  const card = a.closest('#insights-body .bx-in-panel')
  if (card) {
    if (from === 'insights/sources') return 'Sources'
    return (card.querySelector(':scope > header h3')?.textContent || '').trim() || MODULE_NAME[from.split('/')[1]] || 'Market Insights'
  }
  const sec = from === 'home' ? a.closest('main section[id]') : null
  if (sec && sec.id !== 'top') return HOME_NAME[sec.id] || (sec.querySelector('h2')?.textContent || '').trim().slice(0, 40) || 'Home'
  return null
}

/** The trail: read every click before the site navigates; the route the site then shows decides whether a pill
 *  comes up (the jump it was for) or goes (anything else). */
export function useReturnTrail(routeKey) {
  const pending = useRef(null)
  const [ret, setRet] = useState(null)
  useEffect(() => {
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank') return
      // '#/insights' or, on bcx.market, its clean '/insights' (website/route.js)
      const page = nameOfHref(a.getAttribute('href'))
      if (!page) return
      const from = pageOf(here())
      const to = pageOf(page)
      if (to === from) return
      const name = originOf(a, from)
      if (name) pending.current = { name, to, t: performance.now() }
    }
    document.addEventListener('click', onClick, true)     // capture: before the site's own handler navigates
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  useEffect(() => {
    const p = pending.current
    pending.current = null
    setRet(p && p.to === routeKey.split('|')[0] && performance.now() - p.t < 4000 ? { name: p.name, id: p.t } : null)
  }, [routeKey])
  const clear = useCallback(() => setRet(null), [])
  return [ret, clear]
}

export function ReturnPill({ ret, onGone }) {
  const [stage, setStage] = useState('wait')            // wait → show → gone
  const [armed, setArmed] = useState(false)
  const hold = useRef(false)
  useEffect(() => {
    setStage('wait'); setArmed(false)
    const t1 = setTimeout(() => setStage('show'), WAIT)
    const t2 = setTimeout(() => setArmed(true), WAIT + 400)
    let t3
    const tick = () => { t3 = setTimeout(() => (hold.current ? tick() : setStage('gone')), LIFE) }
    const t0 = setTimeout(tick, WAIT)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [ret.id])
  useEffect(() => {
    if (stage !== 'gone') return undefined
    const t = setTimeout(onGone, 400)                     // after its exit
    return () => clearTimeout(t)
  }, [stage, onGone])
  const host = document.querySelector('.bx') || document.body
  const on = stage === 'show'
  return createPortal(
    <div className={`bx-ret${on ? ' show' : ''}${armed ? ' armed' : ''}`} aria-hidden={!on} inert={on ? undefined : ''}
      onPointerEnter={() => { hold.current = true }} onPointerLeave={() => { hold.current = false }}
      onFocus={() => { hold.current = true }} onBlur={() => { hold.current = false }}>
      <button type="button" className="go" onClick={() => { setStage('gone'); window.history.back() }}>
        <ChevronLeft aria-hidden="true" /><span>Back to <b>{ret.name}</b></span>
      </button>
      <button type="button" className="x" aria-label="Dismiss" onClick={() => setStage('gone')}><X aria-hidden="true" /></button>
    </div>, host)
}
