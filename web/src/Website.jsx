// THE PUBLIC WEBSITE — shell only (ADR-0045). Served as its own page at /site/ so it
// can be public while the console stays behind its login; the product lives in
// src/website/*. This file owns routing, the header, the scroll effects and identity.
//
// The landing page is BCX's company site (its approved copy from bcx.market, in
// website/content.js) with the market intelligence built in — not a market dashboard
// with a company page attached.
//
// THE HOME PAGE IS IN TWO PARTS, IN THIS ORDER. Part one is BCX: hero, about, vision and
// mission, principles, how the exchange will work, careers. Part two is India's coal
// industry in public data, opened by an unmistakable band (Industry.jsx) and tinted to the
// end: the coal chain, today's market, the daily letter. Contact closes the page. Do not
// slot an industry section into part one — reviewers read industry figures between
// "About" and "Vision" as BCX's own, and could not tell where the company story ended.
//
// Five views, by hash:
//   #/  #/<section>                 home
//   #/explorer  #/explorer/<id>     the data centre (#/data too), opened on a series
//   #/newsletter  #/newsletter/<d>  the daily letter (coal), one issue
//   #/news                          BCX in the press
//   #/legal  #/legal/<section>      legal & documents — nothing published yet, on purpose
// Older links keep working: #/newsletters/coal/<date>, and a leading "site/".
//
// NOTHING FROM ULIP APPEARS HERE. ULIP data may only be shown behind a login, and this
// page is public. tests/website/test_public_boundary.py enforces it.
//
// ONE WAY TO CHANGE PAGE: navigate(). Every link (`<a href="#/…">` is intercepted), button,
// Back and Forward goes through it, so every page change is the same gentle cross-fade
// (the View Transitions API where the browser has it, a CSS fade where it does not) and
// Back returns to the scroll position the reader left — not to the top, and never to a
// half-revealed page.
import '@fontsource-variable/outfit'
import '@fontsource-variable/plus-jakarta-sans'
import './website.css'
import './website-bands.css'          // the navy page bands + the home's colour rhythm (5 Nov'26, flags.BANDS)
import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowRight, ChartLine, Menu, Search, X } from 'lucide-react'
import CommandMenu from './website/CommandMenu.jsx'
import BcxLogo from './website/BrandLogo.jsx'      // the bcx.market logo (27 Oct'26); the studio keeps ./Logo.jsx
import { indexSeries, sendVisit, useIssues, useMarket } from './website/api.js'
import { day } from './website/format.js'
import { HeroSkeleton, InsightsSkeleton, useReveal } from './website/Skeleton.jsx'
import { BackToTop, ScrollProgress, SectionRail, isReload, useScrolledPast, useStackedTables } from './website/ui.jsx'
import Hero from './website/Hero.jsx'
import MobileMenu from './website/MobileMenu.jsx'
import { CONTACT } from './website/content.js'
import DataCentre from './website/DataCentre.jsx'
import SeriesPage from './website/SeriesPage.jsx'
import { About, Careers, Chain, Contact, Principles, VisionMission } from './website/Company.jsx'
import { IndustryOpener } from './website/Industry.jsx'
// THE COAL CHAIN IS OFF ON THE DEV SERVER (18 Nov'26, pass 92 — the VP could not see its use): in its place, the four
// newest regulations (Legal.LatestRegulations). A seller-to-buyer flow diagram was tried first and turned down
// ("extremely AI generated", too much animation). LOCAL ONLY (flags.HOME_REGULATIONS): a build that ships keeps the chain.
const SHOW_CHAIN = !HOME_REGULATIONS
import { LettersShowcase, Reader } from './website/Newsletters.jsx'
import { Coverage, Footer } from './website/About.jsx'
import { BAND, BANDS, CAREERS_PORTAL, CONTACT_FORM, DATA_CENTRE, HOME_EVENTS, HOME_REGULATIONS, NEWSLETTER, PHONE_COMPACT } from './website/flags.js'
import EventReel from './website/EventReel.jsx'      // BCX at the India Coal Conference 2026 (flags.HOME_EVENTS, live 26 Nov'26)
import Jobs from './website/Jobs.jsx'          // careers (LOCAL ONLY - flags.CAREERS_PORTAL)
import { useTheme } from './website/theme.js'               // the live theme (pass 64): a switch re-renders the root, no reload
import ThemeSwitch from './website/ThemeSwitch.jsx'      // the visitor's light / dark switch, bottom left (flags.THEME)
import { ReturnPill, pageOf, useReturnTrail } from './website/ReturnTrail.jsx'   // the way back after a card's link (pass 84)
import { addressOf, adoptAddress, cleanLinks, here as addressNow, nameOfHref } from './website/route.js'   // '#/…' names ↔ the address bar (path on bcx.market)
import Legal, { LatestRegulations } from './website/Legal.jsx'
import ContactDialog from './website/ContactForm.jsx'
import NewsPage from './website/NewsPage.jsx'
import Insights from './website/Insights.jsx'
import Research from './website/Research.jsx'
import Resources from './website/Resources.jsx'

// THE HEADER HAS TWO KINDS OF LINK, AND SAYS SO. The first group are the home page's OWN
// sections, in the page's order — BCX's three, then the industry part as one item; the
// second, past a divider, are separate pages. Without "Industry data" in the first group
// nothing lit while the reader was in the industry part, and the full-width progress line
// slid on under "Market insights" — the reader thought they had reached a page they were
// not on. The progress now runs under the first group only (ui.SectionRail).
// "HOME", NOT "ABOUT" (26 Oct'26, the user's call): the nav had About and About BCX side by side.
// The first item is the top of the home page; while the reader is in About, Vision or Principles
// it stays lit (PARENT), and "About BCX" is the coverage section, as before.
// CAREERS IS A PAGE (19 Nov'26, LOCAL ONLY - flags.CAREERS_PORTAL; the user: the openings were reached only through the
// home page's Careers section): with the portal on, Careers leaves the home sections and sits among the pages (below)
const NAV = CAREERS_PORTAL ? [['top', 'Home'], ['coverage', 'About BCX'], ['industry', 'Market Snapshot']]
  : [['top', 'Home'], ['coverage', 'About BCX'], ['careers', 'Careers'], ['industry', 'Market Snapshot']]
// the folded header's "Market Insights" door — OFF since 2 Nov'26 (a search field took its place); code kept
const SHOW_HEADER_DOOR = false
// the home sections the command menu offers (Home itself is a page there)
const CMD_SECTIONS = [...NAV.filter(([id]) => id !== 'top'), ['contact', 'Contact']]
// a section that is not in the nav still lights its nearest parent while you read it
const PARENT = { about: 'top', vision: 'top', principles: 'top', chain: 'industry', letter: 'industry',
  ...(CAREERS_PORTAL ? { careers: 'coverage' } : {}) }       // the home's Careers section, no longer a header link
// the pages that are industry data: the reading line is industry blue on them
const INDUSTRY_VIEWS = ['insights', 'explorer', 'letter', 'research', 'resources']

function parse(hash = addressNow()) {
  const p = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean)
  if (p[0] === 'site') p.shift()
  // the newsletter is switched off (flags.NEWSLETTER): its addresses open the home page
  if (!NEWSLETTER && ['newsletter', 'newsletters', 'research'].includes(p[0])) return { view: 'home', section: null, retired: '#/' }
  if (p[0] === 'newsletter') return { view: 'letter', date: p[1] || null }
  if (p[0] === 'newsletters') return { view: 'letter', date: p[2] || (/^\d{4}-/.test(p[1] || '') ? p[1] : null) }
  // the data centre is switched off (flags.DATA_CENTRE): an old address to it opens Market
  // insights, and the effect below puts that address in the bar
  if (p[0] === 'explorer' || p[0] === 'data') return DATA_CENTRE ? { view: 'explorer', series: p[1] || null } : { view: 'insights', section: null, retired: true }
  if (p[0] === 'exchange') return { view: 'home', section: 'coverage' }     // the section it replaced
  if (p[0] === 'legal') return { view: 'legal', section: p[1] || null }
  if (p[0] === 'news') return { view: 'news' }               // was a home section; now its own page
  // careers: the openings and one role (LOCAL ONLY - flags.CAREERS_PORTAL); off, the address opens the
  // home page's Careers section
  if (p[0] === 'jobs') return CAREERS_PORTAL ? { view: 'jobs', item: p[1] ? decodeURIComponent(p[1]) : null } : { view: 'home', section: 'careers' }
  // the Sources module is OFF (16 Nov'26): its address opens the Overview, and the effect below puts that in the bar
  if (p[0] === 'insights' && p[1] === 'sources') return { view: 'insights', section: null, retired: '#/insights' }
  // section = the module; item = what in it to open (#/insights/stocks/<company>, 27 Oct'26)
  if (p[0] === 'insights') return { view: 'insights', section: p[1] || null, item: p[2] ? decodeURIComponent(p[2]) : null }
  // RESEARCH & REPORTS IS OFF (26 Oct'26, management's call — Research.jsx is kept, unrouted): its
  // address opens the newsletter, the one report it described as live
  if (p[0] === 'research') return { view: 'letter', date: null, retired: '#/newsletter' }
  // Sources is a Market Insights module now (26 Oct'26): the old address opens it and the
  // effect below puts the new one in the bar
  // …and the Sources module is OFF too (16 Nov'26): the old address opens Market Insights' Overview
  if (p[0] === 'resources') return { view: 'insights', section: null, retired: '#/insights' }
  return { view: 'home', section: p[0] || null }
}

// set while the module loads, before the browser's own restore runs at the load event: set
// later (in an effect), a refresh had already been scrolled back to wherever the reader was
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
// bcx.market: an old '/#/…' link becomes its path, a trailing slash goes — before the first parse() reads the address
adoptAddress()

// pages with a sticky bar of their own (modules, tabs): moving within one keeps the bar in
// view — [the element the bar sits above, the header + bar height to leave above it]
const WITHIN = { insights: ['insights-body', 150], legal: ['lg-body', 140] }

const sameRoute = (a, b) => a.view === b.view && (a.series || null) === (b.series || null)
  && (a.date || null) === (b.date || null) && (a.section || null) === (b.section || null) && (a.item || null) === (b.item || null)
  // a retired address is a change of its own: from the home page to #/newsletter (switched off) the
  // view stays "home", and without this the address bar kept #/newsletter
  && (a.retired || null) === (b.retired || null)
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const canFade = () => typeof document !== 'undefined' && !!document.startViewTransition
// A PHONE, OR A HOP RIGHT AFTER ANOTHER, NAVIGATES LIGHT (5 Nov'26 — "jaldi jaldi ek page se dusre pe jau
// toh laggy"): the cross-fade renders the whole new page in ONE task inside the transition's callback —
// 160–200 ms on a phone-speed CPU (_probe_phone_perf.py), and quick hops stacked them. Light navigation
// skips the cross-fade and renders the new page with startTransition, in slices the browser can interrupt:
// taps stay live, an abandoned page is dropped, and the page fades in with a cheap opacity animation. The
// desktop keeps its cross-fade for a single, unhurried hop.
const LIGHT_NAV = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 760px), (pointer: coarse)').matches
let lastHop = 0
const quickHop = () => { const now = performance.now(), q = now - lastHop < 700; lastHop = now; return q }
const ENTER = !canFade() || LIGHT_NAV ? 'bx-enter' : undefined     // the new page's own fade-in, where no cross-fade runs

/** Run a page change inside a cross-fade where the browser supports one. A change that
 *  interrupts another skips the first fade — the browser still applies the change, and
 *  rejects that fade's promises, which are expected and silenced here. */
function fade(change, animate = true) {
  if (!(animate && canFade() && !calm())) { change(); return }
  const t = document.startViewTransition(change)
  for (const p of [t.ready, t.finished, t.updateCallbackDone]) p?.catch(() => {})
}

/** THE HOME PAGE, MEMOISED (2 Nov'26). The scroll spy lights the header as each section passes,
 *  and that state lives in Website — so every section boundary re-rendered the whole home page
 *  (hero, chain, photos, issue covers) to move one underline, a long task right where the reader
 *  was scrolling through the industry band. Its props are the data and stable callbacks, so a
 *  change of the lit section now re-renders the header alone. */
const HomeMain = memo(function HomeMain({ data, by, issueList, goSection, openExplorer, openIssue }) {
  return (
    <main className={ENTER}>
      {/* part one: BCX */}
      <Hero onGo={goSection} />
      <About />
      <VisionMission />
      <Principles />
      <Coverage />
      <Careers />
      {/* part two: India's coal industry, in public data. A TRAILER, not a dashboard:
          today's figures live on Market insights and the band's card links there — the
          "Today's market" section that used to sit here printed them a second time */}
      <IndustryOpener data={data} by={by} />
      <div className="bx-zone">
        {/* opened from an industry card's panel, the series page REPLACES the panel's own
            history entry, so Back returns to the card instead of re-opening the panel */}
        {HOME_EVENTS ? <EventReel />
          : SHOW_CHAIN ? <Chain data={data} onOpen={id => openExplorer(id, { replace: window.history.state?.bxSheet === true })} />
          : <LatestRegulations />}
        {NEWSLETTER && <LettersShowcase issues={issueList} onOpen={openIssue} onArchive={() => openIssue(null)} />}
      </div>
      <Contact />
    </main>
  )
})

export default function Website() {
  const [route, setRoute] = useState(() => parse())
  const [active, setActive] = useState(null)
  const [menu, setMenu] = useState(false)
  const [cmd, setCmd] = useState(false)                  // the command menu (website/CommandMenu)
  const theme = useTheme()                               // 'dark' | 'light', live (website/theme.js)
  // never the scroll position itself: this component is the whole site, and re-rendering
  // it every frame made the data centre's scrolling stutter (see ui.useOnScroll)
  const scrolled = useScrolledPast(40)
  // the page on screen, as the way back names pages ("insights/stocks", "home"), plus what in it is open: a pill
  // comes up for the jump a card's link made, and goes on any other move (website/ReturnTrail.jsx)
  const [ret, clearRet] = useReturnTrail(`${route.view === 'insights' ? pageOf(`#/insights/${route.section || ''}`) : route.view}|${route.item || ''}|${route.date || ''}|${route.series || ''}`)
  const market = useMarket()
  const issues = useIssues()
  const data = market.data
  const by = useMemo(() => indexSeries(data), [data])
  const issueList = issues.data?.issues
  const pageGroup = useRef(null)                           // the nav's own-sections group
  const here = useRef(addressNow())                        // the page on screen now, by its '#/…' name
  const scrolls = useRef(new Map())                        // hash -> where the reader left it
  const routeRef = useRef(route)
  routeRef.current = route
  useReveal()
  useStackedTables()      // a phone shows every table as cards (ui.labelTable), never a sideways scroll

  /** Show `next` (a parsed route), then put the page where it belongs: the remembered
   *  position on Back/Forward, the section for a home anchor, otherwise the top. */
  // a LIGHT navigation (LIGHT_NAV, above) renders in a transition; its scroll waits for the new page's commit
  const pendingScroll = useRef(null)
  useLayoutEffect(() => { const f = pendingScroll.current; if (f) { pendingScroll.current = null; f() } }, [route])
  const show = useCallback((hash, next, restore, within = false, light = false) => {
    here.current = hash
    const place = () => {
      const y = restore ? scrolls.current.get(hash) : undefined
      if (y != null) window.scrollTo(0, y)
      else if (within) {
        // one Market insights module, or one Legal tab, to another: keep the bar where the
        // reader is, never throw them back to the top of the page
        const [id, off] = WITHIN[next.view]
        const body = document.getElementById(id)
        const top = body ? body.getBoundingClientRect().top + window.scrollY - off : 0
        if (window.scrollY > top) window.scrollTo(0, top)
      }
      else if (next.view === 'home' && next.section) document.getElementById(next.section)?.scrollIntoView({ block: 'start' })
      else if (next.view === 'legal' && next.section) document.getElementById(`lg-${next.section}`)?.scrollIntoView({ block: 'start' })
      else window.scrollTo(0, 0)
    }
    if (!light) { flushSync(() => setRoute(r => (sameRoute(r, next) ? r : next))); place(); return }
    if (sameRoute(routeRef.current, next)) { place(); return }
    pendingScroll.current = place
    startTransition(() => setRoute(r => (sameRoute(r, next) ? r : next)))
  }, [])

  const navigate = useCallback((hash, { replace = false, animate = true } = {}) => {
    setMenu(false)
    scrolls.current.set(here.current, window.scrollY)
    const next = parse(hash)
    const within = routeRef.current.view === next.view && next.view in WITHIN
    const light = quickHop() || LIGHT_NAV
    if (light) {
      if (replace) window.history.replaceState(null, '', addressOf(hash)); else window.history.pushState(null, '', addressOf(hash))
      show(hash, next, false, within, true)
      return
    }
    fade(() => {
      if (replace) window.history.replaceState(null, '', addressOf(hash)); else window.history.pushState(null, '', addressOf(hash))
      show(hash, next, false, within)
    }, animate && !sameRoute(routeRef.current, next))
  }, [show])

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    // Back / Forward / an edited address: restore where the reader was on that page
    const onPop = () => {
      const hash = addressNow()
      if (hash === here.current) return             // a panel's own history entry, or the twin event
      scrolls.current.set(here.current, window.scrollY)
      const next = parse(hash)
      if (quickHop() || LIGHT_NAV) { show(hash, next, true, false, true); return }
      fade(() => show(hash, next, true), !sameRoute(routeRef.current, next))
    }
    // every in-site link goes through navigate(); a modified click still opens a new tab
    // a link is the site's own when it names a page: '#/insights', or on bcx.market its clean '/insights'
    // (website/route.js — cleanLinks() rewrites every '#/…' href to its path as it is drawn)
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const name = nameOfHref(a.getAttribute('href'))
      if (!name) return
      e.preventDefault()
      navigate(name)
    }
    cleanLinks()
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
      document.removeEventListener('click', onClick)
    }
  }, [navigate, show])
  useEffect(() => { sendVisit() }, [])                 // one visit per browser session (api.sendVisit)
  useEffect(() => {                                    // a retired address says where it went
    if (route.retired) {
      const to = typeof route.retired === 'string' ? route.retired : '#/insights'
      window.history.replaceState(null, '', addressOf(to)); here.current = to
    }
  }, [route])
  useEffect(() => {                                    // page identity
    const base = 'Bharat Coal Exchange'
    document.title = route.view === 'letter' ? `India Coal Market Daily${route.date ? ` · ${day(route.date)}` : ''} — ${base}`
      : route.view === 'explorer' ? `${by[route.series] ? `${by[route.series].title} — ` : ''}Data centre — ${base}`
      : route.view === 'legal' ? `Coal Exchange Regulations — ${base}`
      : route.view === 'news' ? `News & media — ${base}`
      : route.view === 'jobs' ? `Careers — ${base}`
      : route.view === 'insights' ? `${route.section === 'sources' ? 'Sources — ' : ''}Market Insights — ${base}`
      : route.view === 'research' ? `Research & reports — ${base}`
      : route.view === 'resources' ? `Sources — ${base}`
      : `${base} (BCX) — Shaping the future of coal trading in India`
  }, [route, by])

  // a deep link to a home section (#/about) can only land once the page has data to lay
  // out; after that, navigate() places every page itself. A RELOAD is not a deep link: the
  // section got into the address because the reader clicked About earlier, and a refresh
  // starts at the top (the address is put back to #/ so a second refresh agrees)
  useEffect(() => {
    const r = routeRef.current
    if (r.view !== 'home' || !r.section || !data) return
    if (isReload()) {
      window.history.replaceState(null, '', addressOf('#/'))
      here.current = '#/'
      setRoute({ view: 'home', section: null })
      window.scrollTo(0, 0)
      return
    }
    const el = document.getElementById(r.section)
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [data])

  // scroll spy over every home section
  useEffect(() => {
    if (route.view !== 'home' || !data) return undefined
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(PARENT[vis[0].target.id] || vis[0].target.id)
    }, { rootMargin: '-35% 0px -60% 0px' })
    for (const el of document.querySelectorAll('main section[id]')) io.observe(el)
    return () => io.disconnect()
  }, [route.view, data])

  // within the home page a section is a smooth scroll, not a page change
  const goSection = useCallback((id) => {
    setMenu(false)
    const to = id === 'top' ? '#/' : `#/${id}`          // Home is the page's top, at its own address
    if (routeRef.current.view !== 'home') { navigate(to); return }
    window.history.replaceState(null, '', addressOf(to))
    here.current = to
    if (id === 'top') window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' })
  }, [navigate])
  const openExplorer = useCallback((series, opts) => navigate(series ? `#/explorer/${series}` : '#/explorer', opts), [navigate])
  // the reader settles its own URL on the issue it opened (replace, no fade); a reader's
  // pick of another issue is a page change like any other
  const openIssue = useCallback((it, replace = false) => navigate(it ? `#/newsletter/${it.date}` : '#/newsletter', { replace, animate: !replace }), [navigate])
  const goTop = () => {
    if (routeRef.current.view !== 'home') { navigate('#/'); return }
    setMenu(false)
    window.history.replaceState(null, '', addressOf('#/'))
    here.current = '#/'
    window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' })
  }
  const closeMenu = useCallback(() => setMenu(false), [])
  const closeCmd = useCallback(() => setCmd(false), [])
  // Ctrl K / ⌘ K opens the search too — unadvertised (the user wants no shortcut hints on the site)
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const overHero = route.view === 'home' && !scrolled && !menu
  // a page that opens on a band (flags.BANDS): the header sits on it, transparent, ONLY when the band
  // is light ('slate') — the logo keeps its own orange and black (the user's call, 5 Nov'26), so over
  // a dark or photographic band the header stays solid white
  const overBand = BANDS && BAND === 'slate' && ['insights', 'news', 'legal', 'letter'].includes(route.view) && !scrolled && !menu
  const home = route.view === 'home'
  // Market insights' own pages need no door to it
  const inMarket = ['insights', 'resources', 'research'].includes(route.view)

  return (
    <div className={`bx${BANDS ? ' nb' : ''}${PHONE_COMPACT ? ' mc' : ''}${theme === 'dark' ? ' dk' : ''}`} data-theme={theme}>
      {/* its own key space: the page beside it is keyed by the same view name ("insights") */}
      <ScrollProgress key={`progress:${route.view}`} split={home ? 'industry' : null} tone={INDUSTRY_VIEWS.includes(route.view) ? 'industry' : 'bcx'} />
      <header className={`bx-head${overHero ? ' over' : overBand ? ' over band' : ' scrolled'}`}>
        <div className="wrap">
          <button className="bx-brand" onClick={goTop} aria-label="Bharat Coal Exchange — home"><BcxLogo /></button>
          {/* WITH THE NAV FOLDED (≤1200px) Market insights is one tap away from every page: a real
              door beside the logo, not the old "Industry data" label, which read as the only data
              there was (23 Oct'26, the user's call) */}
          {SHOW_HEADER_DOOR && !inMarket && <a className="bx-door" href="#/insights"><ChartLine aria-hidden="true" /><span>Market Insights</span><ArrowRight aria-hidden="true" /></a>}
          {/* SEARCH IN THE DOOR'S PLACE (2 Nov'26, the user's call): with the nav folded the header said
              "Market Insights" and so did the hero beside "Discover BCX". A search field reaches every
              page, module, company and plant (website/CommandMenu); Market Insights is in the hero, the
              hero's doors and the menu */}
          <button className="bx-search-pill" onClick={() => setCmd(true)} aria-label="Search the site"><Search aria-hidden="true" /><span>Search</span></button>
          <nav className={`bx-nav${menu ? ' open' : ''}`} aria-label="Sections">
            <span className={`grp${home ? ' home' : ''}`} ref={pageGroup}>
              {NAV.map(([id, l]) => (
                <button key={id} data-sec={id} className={`${home && active === id ? 'on' : ''}${id === 'industry' ? ' ind' : ''}`.trim()}
                  aria-current={home && active === id ? 'location' : undefined} onClick={() => goSection(id)}>{l}</button>
              ))}
              {home && <SectionRail group={pageGroup} ids={NAV.map(([id]) => id)} end="contact" />}
            </span>
            <span className="sep" aria-hidden="true" />
            {/* Sources and Research & reports are Market insights' own pages (its "Where the figures come
                from" opens Sources): the header keeps you placed under it on them */}
            <button className={['insights', 'resources', 'research'].includes(route.view) ? 'on' : ''} onClick={() => navigate('#/insights')}>Market Insights</button>
            {DATA_CENTRE && <button className={route.view === 'explorer' ? 'on' : ''} onClick={() => openExplorer()}>Data centre</button>}
            {NEWSLETTER && <button className={route.view === 'letter' ? 'on' : ''} onClick={() => openIssue(null)}>Newsletter</button>}
            <button className={route.view === 'news' ? 'on' : ''} onClick={() => navigate('#/news')}>News</button>
            <button className={route.view === 'legal' ? 'on' : ''} onClick={() => navigate('#/legal')}>Regulations</button>
            {CAREERS_PORTAL && <button className={route.view === 'jobs' ? 'on' : ''} onClick={() => navigate('#/jobs')}>Careers</button>}
          </nav>
          <div className="bx-head-cta">
            <button className="bx-cmd-btn" onClick={() => setCmd(true)} aria-label="Search the site">
              <Search aria-hidden="true" /><span>Search</span>
            </button>
            <button className="bx-btn primary sm" onClick={() => goSection('contact')}>Contact us</button>
          </div>
          <button className="bx-menu-btn" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
        </div>
      </header>

      {/* the phone's menu: a panel from the left over a blurred page (website/MobileMenu) */}
      <MobileMenu open={menu} onClose={closeMenu} email={CONTACT.email}
        sections={[...NAV.map(([id, l]) => ({ key: id, label: l, on: home && active === id, onGo: () => goSection(id) })),
          { key: 'contact', label: 'Contact', on: home && active === 'contact', onGo: () => goSection('contact') }]}
        pages={[
          { key: 'insights', label: 'Market Insights',
            on:['insights', 'resources', 'research'].includes(route.view), onGo: () => navigate('#/insights') },
          ...(NEWSLETTER ? [{ key: 'letter', label: 'Newsletter', on: route.view === 'letter', onGo: () => openIssue(null) }] : []),
          { key: 'news', label: 'News', on: route.view === 'news', onGo: () => navigate('#/news') },
          { key: 'legal', label: 'Regulations', on: route.view === 'legal', onGo: () => navigate('#/legal') },
          ...(CAREERS_PORTAL ? [{ key: 'jobs', label: 'Careers', on: route.view === 'jobs', onGo: () => navigate('#/jobs') }] : []),
          { key: 'search', label: 'Search', on: false, onGo: () => setCmd(true) },
        ]} />
      <CommandMenu open={cmd} onClose={closeCmd} onGo={navigate} onSection={goSection} data={data} sections={CMD_SECTIONS} />

      {data?.snapshot && (
        <div className="bx-banner"><div className="wrap">Showing the last saved market data, built {data.generated_at?.replace('T', ' ')} — the live build is unavailable right now.</div></div>
      )}

      {route.view === 'letter' && NEWSLETTER ? (
        <Reader issues={issueList} date={route.date} onPick={openIssue} error={issues.error} />
      ) : route.view === 'legal' ? (
        <main key="legal" className={ENTER}><Legal key={route.section || ''} section={route.section} /></main>
      ) : route.view === 'news' ? (
        <main key="news" className={ENTER}><NewsPage /></main>
      ) : CAREERS_PORTAL && route.view === 'jobs' ? (
        <main key={`jobs:${route.item || ''}`} className={ENTER}><Jobs slug={route.item} /></main>
      ) : route.view === 'research' ? (
        <main key="research" className={ENTER}><Research issues={issueList} /></main>
      ) : !data ? (
        market.error ? (
          <div className="wrap bx-empty" style={{ minHeight: '60vh', alignContent: 'center' }}>
            <h3>Market data is unavailable right now</h3><p>{market.error}</p>
            <button className="bx-btn primary" onClick={() => market.reload()}>Try again</button>
          </div>
        ) : <main>{['insights', 'resources'].includes(route.view) ? <InsightsSkeleton /> : <HeroSkeleton />}</main>
      ) : route.view === 'insights' ? (
        // one key for every module: the page, and the Daily / MTD / FYTD choice, stay put
        <main key="insights" className={ENTER}><Insights data={data} module={route.section} item={route.item} /></main>
      ) : route.view === 'resources' ? (
        <main key="resources" className={ENTER}><Resources data={data} /></main>
      ) : route.view === 'explorer' ? (
        <main key={`x:${route.series || ''}`} className={ENTER}>
          {route.series ? <SeriesPage key={route.series} data={data} id={route.series} />
            : <DataCentre data={data} onOpen={openExplorer} onLetters={() => openIssue(null)} />}
        </main>
      ) : (
        <HomeMain key="home" data={data} by={by} issueList={issueList} goSection={goSection} openExplorer={openExplorer} openIssue={openIssue} />
      )}
      <Footer data={data} onNav={CAREERS_PORTAL ? (k => (k === 'careers' ? navigate('#/jobs') : goSection(k))) : goSection} onLetters={() => openIssue(null)} onExplore={openExplorer}
        showVisits={route.view === 'legal'} />
      <BackToTop />
      {ret && <ReturnPill key={ret.id} ret={ret} onGone={clearRet} />}
      {/* light / dark, the visitor's choice (5 Nov'26, pass 62): a pill in the bottom-left corner */}
      <ThemeSwitch />
      {/* the "Write to us" form (18 Nov'26): one dialog for the whole site, opened by openContact() — local only
          (flags.CONTACT_FORM), so a build that ships mounts none */}
      {CONTACT_FORM && <ContactDialog />}
    </div>
  )
}
