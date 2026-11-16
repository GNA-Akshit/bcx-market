// THE ADDRESS BAR (16 Nov'26, the user: "https://bcx.market/#/insights has this # in the link, which doesn't look
// clean — can we have https://bcx.market/insights and so on for all the pages").
// The site names every page by a '#/…' string — in its links, its router (Website.parse), the way back
// (ReturnTrail) — and THIS is the one place that turns that name into what the address bar shows, and back:
//   * PATH addresses (bcx.market — VITE_ROUTES=path): /insights/supply. GitHub Pages has no rewrites, so the
//     bcx-website build writes a copy of the page at every address it can name (web/scripts/routes.mjs) and a
//     404.html copy for the rest (a company's plants, /insights/stocks/<company>). An old '/#/…' link is turned into
//     its path on arrival, so links shared before 16 Nov'26 keep working.
//   * HASH addresses (the studio's /site/index.html — one file, which cannot answer /insights): #/insights/supply,
//     exactly as before.
// Links keep their '#/…' href in the source; on bcx.market cleanLinks() rewrites each to its path as it is drawn,
// so hovering, copying or opening one in a new tab shows the clean address.
import { PATH_ROUTES } from './flags.js'

// paths that are files, not pages: the router never takes them
const NOT_A_PAGE = /^\/(api|site|assets)\/|\.[a-z0-9]{2,5}$/i

/** The page on screen, by the site's name for it ('#/insights/supply'). */
export function here() {
  if (!PATH_ROUTES) return window.location.hash || '#/'
  const p = window.location.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '')
  return `#${p || '/'}`
}

/** What the address bar shows for a page name: '#/insights' → '/insights' on bcx.market (the query — ?theme= —
 *  stays, as it did when only the hash changed); the name itself where the site is one file. */
export function addressOf(name) {
  if (!PATH_ROUTES) return name
  return `${name.replace(/^#/, '') || '/'}${window.location.search}`
}

/** A link's page name, or null when it is not one of the site's pages ('/insights' and '#/insights' both name
 *  '#/insights'; a photograph under /site/, an API address, another site, a '#section' anchor are not pages). */
export function nameOfHref(href) {
  if (!href) return null
  if (href.startsWith('#/')) return href
  if (PATH_ROUTES && href.startsWith('/') && !href.startsWith('//') && !NOT_A_PAGE.test(href.split(/[?#]/)[0])) {
    return `#${href.split(/[?#]/)[0].replace(/\/+$/, '') || '/'}`
  }
  return null
}

/** On bcx.market, before anything reads the address: an old '/#/insights' link becomes '/insights', and a trailing
 *  slash ('/insights/' — GitHub Pages' answer for a folder) is dropped, so every page has ONE address. */
export function adoptAddress() {
  if (!PATH_ROUTES || typeof window === 'undefined') return
  const { hash, pathname, search } = window.location
  if (hash.startsWith('#/')) {
    window.history.replaceState(window.history.state, '', `${hash.slice(1) || '/'}${search}`)
    return
  }
  const clean = pathname.replace(/\/index\.html$/, '/').replace(/(.)\/+$/, '$1')
  if (clean !== pathname) window.history.replaceState(window.history.state, '', `${clean}${search}${hash}`)
}

/** On bcx.market: every link drawn with a '#/…' href gets its clean path instead — now, and whenever React draws
 *  or changes one (React writes an href only when its value changes, so the two never fight). */
export function cleanLinks() {
  if (!PATH_ROUTES || typeof MutationObserver === 'undefined') return
  const fix = a => { const h = a.getAttribute('href'); if (h && h.startsWith('#/')) a.setAttribute('href', h.slice(1) || '/') }
  const scan = root => {
    if (root.nodeType !== 1) return
    if (root.matches('a[href^="#/"]')) fix(root)
    for (const a of root.querySelectorAll('a[href^="#/"]')) fix(a)
  }
  scan(document.documentElement)
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'attributes') fix(m.target)
      else for (const n of m.addedNodes) scan(n)
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] })
}
