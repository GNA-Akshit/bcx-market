// THE SITE SEARCH (2 Nov'26): one box that goes anywhere on the site — a page, a Market Insights module,
// a home section, a power company's plants or one plant. Opened by the header's "Search" (a field when the
// nav is folded) and the phone menu's "Search" row; Ctrl K / ⌘ K opens it too, unadvertised.
// PLAIN, ON THE USER'S CALL (2 Nov'26): no keyboard hints anywhere — no Esc / ↵ / ↑↓ legend, no module
// numbers, no "Ctrl K" label ("overkill nahi krna"): a search box and what it finds, tapped or clicked.
// The list never scrolls inside itself (the site's rule): it shows the best matches only.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Search } from 'lucide-react'
import { SHOWN_MODULES } from './Insights.jsx'
import { pretty } from './coalmap/names.js'
import { CAREERS_PORTAL, NEWSLETTER } from './flags.js'


function catalogue(data, sections) {
  const out = [{ group: 'Pages', label: 'Home', hash: '#/', rank: 0 }]
  SHOWN_MODULES.forEach(([k, l]) => out.push({ group: 'Market Insights', label: l, rank: 0,
    hash: k === 'overview' ? '#/insights' : `#/insights/${k}` }))
  if (NEWSLETTER) out.push({ group: 'Pages', label: 'Newsletter', hash: '#/newsletter', rank: 0 })
  out.push({ group: 'Pages', label: 'News', hash: '#/news', rank: 0 }, { group: 'Pages', label: 'Regulations', hash: '#/legal', rank: 0 })
  if (CAREERS_PORTAL) out.push({ group: 'Pages', label: 'Careers', hash: '#/jobs', rank: 0 })      // LOCAL ONLY (flags.CAREERS_PORTAL)
  sections.forEach(([id, l]) => out.push({ group: 'On the home page', label: l, section: id, rank: 0 }))
  const plants = data?.boards?.plant_stocks?.plants || []
  const count = {}
  plants.forEach(p => { if (p.genco) count[p.genco] = (count[p.genco] || 0) + 1 })
  Object.keys(count).sort().forEach(g => out.push({ group: 'Power companies', label: g, rank: 1,
    hint: `${count[g]} ${count[g] === 1 ? 'plant' : 'plants'}`, hash: `#/insights/stocks/${encodeURIComponent(g)}` }))
  plants.forEach(p => p.genco && out.push({ group: 'Power plants', label: pretty(p.plant), rank: 2,
    hint: [p.state, p.genco].filter(Boolean).join(' · '), terms: p.plant, hash: `#/insights/stocks/${encodeURIComponent(p.genco)}` }))
  return out
}

/** Every word typed must appear; a label that STARTS with the query ranks first. A phone shows six:
 *  with its keyboard up, a ninth row would sit under the keys and could not be reached (no inner scroll). */
function search(all, q) {
  const MAX = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 600px)').matches ? 6 : 9
  const t = q.trim().toLowerCase()
  if (!t) return all.filter(x => x.rank === 0).slice(0, MAX)
  const words = t.split(/\s+/)
  return all
    .map(x => {
      const label = x.label.toLowerCase()
      const hay = `${label} ${(x.hint || '').toLowerCase()} ${(x.terms || '').toLowerCase()}`
      if (!words.every(w => hay.includes(w))) return null
      return { x, s: (label.startsWith(t) ? 0 : label.includes(t) ? 1 : 2) * 10 + x.rank }
    })
    .filter(Boolean)
    .sort((a, b) => a.s - b.s)
    .slice(0, MAX)
    .map(r => r.x)
}

export default function CommandMenu({ open, onClose, onGo, onSection, data, sections }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef(null)
  const all = useMemo(() => catalogue(data, sections), [data, sections])
  const shown = useMemo(() => search(all, q), [all, q])
  useEffect(() => {
    if (!open) return undefined
    setQ(''); setAt(0)
    const back = document.activeElement
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = 'hidden'
    const t = setTimeout(() => input.current?.focus(), 20)
    return () => { clearTimeout(t); html.style.overflow = was; if (back && document.contains(back)) back.focus({ preventScroll: true }) }
  }, [open])
  useEffect(() => setAt(0), [q])
  if (!open) return null
  const pick = it => { onClose(); if (it.section) onSection(it.section); else onGo(it.hash) }
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAt(a => Math.min(shown.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[at]) pick(shown[at]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'Tab') e.preventDefault()          // focus stays in the box
  }
  let lastGroup = null
  return createPortal(
    <div className="bx-cmd" role="dialog" aria-modal="true" aria-label="Search the site">
      <div className="bx-cmd-bg" onClick={onClose} />
      <div className="bx-cmd-panel">
        <label className="bx-cmd-in">
          <Search aria-hidden="true" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search pages, companies and plants"
            aria-label="Search the site" role="combobox" aria-expanded="true" aria-controls="bx-cmd-list"
            aria-activedescendant={shown[at] ? `bx-cmd-${at}` : undefined} autoComplete="off" spellCheck="false" enterKeyHint="go" />
          {/* a phone has no Esc: a plain Cancel, as a phone's own search fields have */}
          <button type="button" className="x" onClick={onClose}>Cancel</button>
        </label>
        <ul className="bx-cmd-list" id="bx-cmd-list" role="listbox">
          {shown.map((it, i) => {
            const head = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={`${it.group}|${it.label}|${it.hint || ''}|${i}`} role="presentation">
                {head && <span className="g">{head}</span>}
                <button id={`bx-cmd-${i}`} role="option" aria-selected={i === at} className={i === at ? 'on' : ''}
                  onMouseMove={() => setAt(i)} onClick={() => pick(it)}>
                  <span className="l">{it.label}{it.hint && <small>{it.hint}</small>}</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </li>
            )
          })}
          {!shown.length && <li className="none">Nothing on the site matches &ldquo;{q}&rdquo;.</li>}
        </ul>
      </div>
    </div>,
    document.querySelector('.bx') || document.body,
  )
}
