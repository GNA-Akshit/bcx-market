// THE THEME, LIVE (5 Nov'26, pass 64 — the user: "theme change pe reload kyu ho raha hai? instantly hona
// chahiye with a smooth transition"). Pass 62 read the theme ONCE, at load, and a switch reloaded the page;
// now the switch is instant:
//  * the theme is a small store; the site's root (Website.jsx), the logo and the coal map's ramp subscribe
//    to it (useTheme) and re-render when it changes;
//  * the CHARTS keep their light colours as SVG attributes and the dark stylesheet repaints them by
//    attribute (website-dark.css, "the charts' colours") — so no chart re-renders on a switch;
//  * the dark stylesheets load the first time anyone needs them, BEFORE the switch shows, then stay (inert
//    without `.dk`), so later switches cost nothing;
//  * the change is a cross-fade (the View Transitions API), or a short colour fade where that is missing;
//    nothing moves under reduced motion.
// The choice is kept in this browser (localStorage 'bx-theme'); the site opens DARK (flags.THEME).
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { THEME } from './flags.js'

let current = THEME
const subs = new Set()
let darkCss = null

/** The two dark stylesheets, the generated layer FIRST and the hand-written one over it — once. */
export function loadDarkCss() {
  if (!darkCss) darkCss = import('../website-dark.gen.css').then(() => import('../website-dark.css'))
  return darkCss
}

export const getTheme = () => current
const subscribe = f => { subs.add(f); return () => subs.delete(f) }
export function useTheme() { return useSyncExternalStore(subscribe, getTheme, getTheme) }

function paint(t) {
  const d = document.documentElement
  d.style.background = t === 'dark' ? '#0f1114' : ''
  d.style.colorScheme = t === 'dark' ? 'dark' : ''
}

export async function setTheme(next) {
  if (next === current) return
  if (next === 'dark') { try { await loadDarkCss() } catch { /* offline: switch anyway, the tokens still apply */ } }
  try { localStorage.setItem('bx-theme', next) } catch { /* private mode: this page only */ }
  // a ?theme= in the address would undo the choice on the next load
  const u = new URL(location.href)
  if (u.searchParams.has('theme')) { u.searchParams.delete('theme'); history.replaceState(history.state, '', u) }
  const apply = () => { current = next; paint(next); flushSync(() => subs.forEach(f => f())) }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) { apply(); return }
  if (document.startViewTransition) { document.startViewTransition(apply); return }
  const root = document.querySelector('.bx')
  root?.classList.add('bx-theming')
  apply()
  setTimeout(() => root?.classList.remove('bx-theming'), 450)
}

export const toggleTheme = () => setTheme(current === 'dark' ? 'light' : 'dark')
