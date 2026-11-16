// Data hooks for the public website. Two endpoints, both read-only:
//   /api/website/market  — every series, tile and board (libs/website/payload.py)
//   /api/website/issues  — the newsletter archive (libs/website/archive.py)
import { useCallback, useEffect, useState } from 'react'
import { here } from './route.js'

// STALE-WHILE-REVALIDATE (2 Nov'26). A return visit used to wait on a ~1 MB payload before showing a
// single figure. The last good answer of each endpoint is now kept in the browser's Cache Storage:
// the page draws it at once (every figure still carries its own date, so it never pretends to be
// today's) and swaps in the fresh answer when it lands. Where Cache Storage is missing (an http://
// address other than localhost, a locked-down browser) it is simply skipped.
// WHERE THE API IS (16 Nov'26, the site's own repository): empty = this page's own server (the studio's /site/, the
// dev server's proxy); the bcx.market build sets VITE_API_BASE to the API's address (it answers any origin: CORS *)
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
export const apiUrl = path => `${API_BASE}${path}`

const SWR = 'bx-swr-v1'
const inflight = new Map()                  // url -> the request in flight, shared by a prefetch and the hook
async function cacheRead(url) {
  try {
    if (!('caches' in window)) return null
    const hit = await (await caches.open(SWR)).match(url)
    return hit ? await hit.json() : null
  } catch { return null }
}
async function cacheWrite(url, body) {
  try {
    if ('caches' in window) await (await caches.open(SWR)).put(url, new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))
  } catch { /* quota, private mode: the next visit just waits for the network */ }
}

/** GET a JSON endpoint once: a prefetch and the hook that needs it share one request. */
export function fetchJson(url, refresh = false) {
  const key = refresh ? `${url}?refresh=1` : url
  if (!refresh && inflight.has(key)) return inflight.get(key)
  const p = (async () => {
    const r = await fetch(key, { credentials: 'same-origin' })
    const body = await r.json().catch(() => null)
    if (!r.ok) throw new Error((body && (body.detail || body.error)) || `HTTP ${r.status}`)
    cacheWrite(url, body)
    return body
  })()
  if (!refresh) {
    inflight.set(key, p)
    p.catch(() => {}).finally(() => setTimeout(() => inflight.delete(key), 30000))
  }
  return p
}

/** PREFETCH ON INTENT: start a heavy payload when the reader points at its door (or the page goes
 *  idle), so the page it opens draws at once instead of starting its request on arrival. */
export const prefetchJson = url => { fetchJson(url).catch(() => {}) }

function useJson(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true, stale: false })
  const load = useCallback(async (refresh = false) => {
    setState(s => ({ ...s, loading: true }))
    try {
      const body = await fetchJson(url, refresh)
      setState({ data: body, error: null, loading: false, stale: false })
    } catch (e) {
      setState(s => ({ data: s.data, error: e.message || String(e), loading: false, stale: s.stale }))
    }
  }, [url])
  useEffect(() => {
    let live = true
    // the cached answer only fills an EMPTY page: it never overwrites a fresh one that won the race
    cacheRead(url).then(body => { if (live && body) setState(s => (s.data ? s : { ...s, data: body, stale: true })) })
    load()
    return () => { live = false }
  }, [load, url])
  return { ...state, reload: load }
}

export const useMarket = () => useJson(apiUrl('/api/website/market'))
//   /api/website/coalmap — the coal map: CEA's plants (monthly + the last week of daily), the
//                          mine layer and the coal companies (libs/website/coalmap.py)
export const useCoalmap = () => useJson(apiUrl('/api/website/coalmap'))
export const useIssues = () => useJson(apiUrl('/api/website/issues'))

export const issueUrl = (edition, date) => apiUrl(`/api/website/issues/${edition}/${date}`)

// THE VISIT COUNTER (28 Oct'26, the user's call). ONE beacon per browser session (sessionStorage),
// from PRODUCTION BUILDS ONLY - the dev server never counts - carrying a random id this browser keeps
// (localStorage, no personal data) so the server can drop repeats. The server stores the visit with
// the visitor's IP (libs/website/visits.py) and the page shows only the total, in the Sources
// module's footer. Storage that is blocked (private windows) still sends once per page load; the
// server's 30-minute repeat guard absorbs that.
// ONE promise for this page's beacon, so the counter can wait for it (30 Oct'26): the Footer's effect
// runs BEFORE Website's (a child's effects run first), so both call sendVisit() and share this promise -
// whoever calls first sends, the other waits on the same request.
let visitSent = null

export function sendVisit() {
  if (visitSent) return visitSent
  visitSent = Promise.resolve()
  if (import.meta.env.DEV) return visitSent
  try {
    if (sessionStorage.getItem('bx-visit')) return visitSent
    sessionStorage.setItem('bx-visit', '1')
  } catch { /* storage blocked */ }
  let visitor = null
  try {
    visitor = localStorage.getItem('bx-vid')
    if (!visitor) {
      visitor = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem('bx-vid', visitor)
    }
  } catch { /* storage blocked */ }
  try {
    visitSent = fetch(apiUrl('/api/website/visit'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, credentials: 'same-origin',
      body: JSON.stringify({ visitor, path: here(), ref: document.referrer || '' }),
    }).catch(() => {})
  } catch { /* never let counting break the page */ }
  return visitSent
}

/** The visit total, read only where it is shown (the Sources module's footer) - AFTER this page's own
 *  visit is recorded and never from the browser's cache, so a visitor sees a total that counts them. */
export function useVisits(on) {
  const [n, setN] = useState(null)
  useEffect(() => {
    if (!on) return undefined
    let live = true
    sendVisit().then(() => fetch(apiUrl('/api/website/visits'), { credentials: 'same-origin', cache: 'no-store' }))
      .then(r => r.json()).then(d => {
        if (live && typeof d?.visits === 'number') setN(d.visits)
      }).catch(() => {})
    return () => { live = false }
  }, [on])
  return n
}

/** series id -> series, built once per payload. */
export function indexSeries(data) {
  const by = {}
  for (const s of data?.series || []) by[s.id] = s
  return by
}

/** [[iso, v]] -> [[epoch ms, v]] for a time axis. */
export const toTime = (points) => (points || []).map(([d, v]) => [Date.parse(d + 'T00:00:00Z'), v])
