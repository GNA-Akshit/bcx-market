// THE PHONE'S MENU (23 Oct'26): a panel that slides in from the left over a blurred page, the
// way the better product sites do it — the site's two kinds of link as two groups (the home
// page's sections, then its pages), each in large type that arrives a beat after the panel, the
// open one marked; Contact as the one button at the foot. Esc, a tap on the page, the close
// button and any link close it; the page behind does not scroll while it is open.
import { useEffect, useRef } from 'react'
import { ArrowRight, Mail, X } from 'lucide-react'
import BcxLogo from './BrandLogo.jsx'      // the bcx.market logo (27 Oct'26)

export default function MobileMenu({ open, onClose, sections, pages, email }) {
  const panel = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panel.current?.querySelector('button.close')?.focus({ preventScroll: true }), 60)
    return () => { root.style.overflow = prev; window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open, onClose])
  const go = fn => () => { onClose(); fn() }
  let i = 0                                       // the stagger runs through both groups in order
  const item = ({ key, label, sub, on, onGo }) => (
    <li key={key} style={{ '--i': i++ }}>
      <button className={`${on ? 'on' : ''}${sub ? ' has-sub' : ''}`.trim() || undefined} aria-current={on ? 'page' : undefined} onClick={go(onGo)}>
        <span><b>{label}</b>{sub && <small>{sub}</small>}</span><ArrowRight aria-hidden="true" />
      </button>
    </li>
  )
  return (
    <div className={`bx-drawer${open ? ' open' : ''}`} aria-hidden={!open} inert={open ? undefined : ''}>
      <div className="bx-drawer-bg" onClick={onClose} />
      <aside className="bx-drawer-panel" ref={panel} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="top">
          <BcxLogo />
          <button className="close" onClick={onClose} aria-label="Close the menu"><X /></button>
        </div>
        <nav aria-label="Menu">
          <p className="grp">Bharat Coal Exchange</p>
          <ul>{sections.map(item)}</ul>
          <p className="grp">Market data</p>
          <ul>{pages.map(item)}</ul>
        </nav>
        <div className="foot" style={{ '--i': i }}>
          <button className="bx-btn primary" onClick={go(() => sections.find(s => s.key === 'contact')?.onGo?.())}>
            Contact us <ArrowRight />
          </button>
          {email && <a href={`mailto:${email}`}><Mail aria-hidden="true" />{email}</a>}
        </div>
      </aside>
    </div>
  )
}
