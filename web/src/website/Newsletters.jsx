// The daily letter — the reader, and the home page's showcase.
//
// THE COAL LETTER ONLY. The public site publishes the India Coal Market Daily; the
// power edition goes to a named list and the API does not serve it here
// (routes/website.PUBLIC_EDITIONS).
//
// THE ISSUE IS THE PAGE, SHOWN WITH PRIDE. The reader is a masthead and the letter itself,
// laid on the page like a printed paper — no frame around it, no viewer toolbar over it.
// Two controls and only two: the date (older / newer either side of a picker) and Share.
// Contents, Print, Open and Copy link were cut on review: a row of tools in a box made the
// letter look like a file in a viewer rather than a publication we stand behind.
//
// THE PAGE SHOWS THE FRONT PAGE; THE WHOLE ISSUE OPENS OVER IT — the shape of the email,
// which carries page one and a button to the full letter. The front page lies on the page
// with the top of page two fading out under "Read the full issue", and the full issue opens
// in a large panel (ui.Sheet wide) over the reader — on a phone too, never a new tab: Back,
// Esc or the close button returns.
//
// Every issue is served from our own origin (/api/website/issues/coal/<date>), never
// from the bucket: the bucket is private and its presigned links die after seven days.
// Same-origin is also what lets the reader size the frame to the issue and scale a
// fixed-width letter down on a phone.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Link2, Mail,
         MessageCircle, Newspaper, Share2 } from 'lucide-react'
import { issueUrl } from './api.js'
import { IssueSkeleton, Sk, useNear } from './Skeleton.jsx'
import { PageBand, Sheet, usePhone } from './ui.jsx'
import { BANDS } from './flags.js'
import { PHOTOS } from './media.jsx'
import { day, dayLong, monthLong, MONTHS } from './format.js'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAILTO = 'mailto:data@gna.energy?subject=India%20Coal%20Market%20Daily'
const enc = encodeURIComponent

/** "Monday 19 October 2026" — the issue's date written out, as a masthead would. */
/** An issue's address, VERSIONED by when its copy was published (27 Oct'26). The route answers
 *  `private, max-age=3600` under one address per day, so a website edition re-published that day
 *  (the auction page added) stayed hidden behind the browser's own copy for an hour. `v` is the
 *  website edition's upload time (else the mailed copy's): a new copy is a new address, and an
 *  unchanged one is still served from the browser. */
function issueSrc(it, cover = false) {
  const q = new URLSearchParams()
  if (it.revisions > 1) q.set('key', it.key)
  const v = String(it.web_stamp || it.uploaded_at || '').replace(/\D/g, '')
  if (v) q.set('v', v)
  if (cover) q.set('cover', '1')                  // the issue reports its first sheet's size (routes/website)
  const qs = q.toString()
  return `${issueUrl('coal', it.date)}${qs ? `?${qs}` : ''}`
}

function fullDate(s) {
  const t = Date.parse(`${s}T00:00:00Z`)
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** UTC upload stamp -> "09:00 IST" — when the issue actually went out. */
function istTime(iso) {
  if (!iso) return null
  const t = Date.parse(/Z|\+/.test(iso) ? iso : iso + 'Z')
  if (Number.isNaN(t)) return null
  const d = new Date(t + 330 * 60000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`
}

/** Close a popover on an outside click or Escape. Esc is taken in the CAPTURE phase and
 *  marked handled, so a popover inside the full-issue panel closes alone, not the panel too. */
function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined
    const down = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false) } }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true) }
  }, [open, setOpen, ref])
}

// ------------------------------------------------------------------ the issue frame
// An issue is four 860px sheets on a grey desk of its own (body #F5F7FA, 18px margins),
// held in a print-layout table whose OUTER cell pads 6px — child combinators only, so the
// issue's own data tables keep their padding.
// Inside the reader the issue's desk is taken away, so its sheets lie directly on our page
// like printed paper; the column is 860px, so the date and Share sit on the sheets' edges.
// Presentation only, and only here: the issue file served and mailed is not touched.
const PAPER_CSS = `
  html, body { background: transparent !important; }
  body { padding: 0 0 72px !important; }
  body > .print-frame > tbody > tr > td { padding-left: 0 !important; padding-right: 0 !important; }
  .page { margin: 0 0 40px !important;
    box-shadow: 0 1px 2px rgba(16,24,40,.06), 0 28px 56px -28px rgba(16,24,40,.28), 0 70px 120px -60px rgba(27,58,99,.3) !important; }`

// how much of page two shows under the front page, in issue pixels — enough to read as
// "the letter continues", too little to read
const PEEK = 170

/** One issue, sized to its own document. `preview`: only the front page and the top of
 *  page two show, and `children` (the "read the full issue" fade) lies over the cut. */
// A WIDER READER (26 Oct'26, the user: "trim the sides on the newsletter page too"): the issue is
// an 860px document, so on a wide screen the reader scales it UP to its column, at most this much —
// the text grows with it, and the issue's charts are redrawn at the matching resolution (sharpen)
// 1.2 since 27 Oct'26 (the user: "bhot zoom hogaya hai") — at 1.5 the front page alone ran two
// screens tall and a 7,800px transformed frame was what the page scrolled over
const GROW_MAX = 1.2

/** Redraw the issue's Chart.js charts at the scale the reader shows them, so an issue scaled UP
 *  stays sharp (a canvas drawn at 1x and scaled 1.5x by a transform is blurred). */
function sharpen(frame, s) {
  const win = frame?.contentWindow
  const C = win?.Chart
  if (!C?.instances) return
  const dpr = (win.devicePixelRatio || 1) * Math.max(1, s)
  for (const ch of Object.values(C.instances)) {
    if (ch?.options && ch.options.devicePixelRatio !== dpr) { ch.options.devicePixelRatio = dpr; ch.resize() }
  }
}

function IssueFrame({ src, title, preview = false, grow = false, onPages, children }) {
  const wrap = useRef(null)
  const ref = useRef(null)
  const [geo, setGeo] = useState({ h: 1400, w: null, s: 1, cut: null })
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(false) }, [src])
  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument
    const W = wrap.current?.clientWidth
    if (!doc || !W) return
    const dw = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth || 0)
    const dh = Math.max(600, doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0)
    // the iframe is as tall as its document, so a sheet's viewport top IS its document top
    const second = preview ? doc.querySelectorAll('.page')[1] : null
    const cut = second ? Math.min(dh, second.getBoundingClientRect().top + PEEK) : null
    const pageW = doc.querySelector('.page')?.offsetWidth || 0
    if (dw > W + 4) setGeo({ w: dw, h: dh, s: W / dw, cut })                       // a phone: scale down
    else if (grow && pageW && W > pageW + 4) setGeo({ w: pageW, h: dh, s: Math.min(GROW_MAX, W / pageW), cut })   // a wide screen: up
    else setGeo({ w: null, h: dh, s: 1, cut })
  }, [preview, grow])
  useEffect(() => { if (ready && geo.s > 1) sharpen(ref.current, geo.s) }, [ready, geo.s])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); ref.current?._ro?.disconnect() }
  }, [measure])
  const onLoad = () => {
    const f = ref.current
    if (!f?.contentDocument) { setReady(true); return }
    const paper = f.contentDocument.createElement('style')
    paper.textContent = PAPER_CSS
    f.contentDocument.head?.appendChild(paper)
    measure()
    f._ro?.disconnect()
    try { f._ro = new ResizeObserver(measure); f._ro.observe(f.contentDocument.body) } catch { /* old browser */ }
    setTimeout(measure, 500)
    setTimeout(() => { measure(); setReady(true) }, 350)
    onPages?.(f.contentDocument.querySelectorAll('.page').length)
  }
  const shown = geo.cut ?? geo.h
  return (
    <div className={`bx-page${preview ? ' preview' : ''}`} ref={wrap} style={{ height: ready ? Math.ceil(shown * geo.s) : 1100 }}>
      <div className={`veil${ready ? ' gone' : ''}`}><IssueSkeleton /></div>
      <iframe ref={ref} src={src} title={title} onLoad={onLoad} tabIndex={preview ? -1 : undefined}
        style={{ height: geo.h, width: geo.w || '100%', transform: geo.s !== 1 ? `scale(${geo.s})` : undefined, transformOrigin: '0 0' }} />
      {ready && geo.cut != null && children}
    </div>
  )
}

// ------------------------------------------------------------------ the date picker
function DatePicker({ issues, current, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, setOpen, ref)
  const months = useMemo(() => {
    const g = []
    for (const it of issues) {
      const m = it.date.slice(0, 7)
      if (!g.length || g[g.length - 1].m !== m) g.push({ m, items: [] })
      g[g.length - 1].items.push(it)
    }
    return g
  }, [issues])
  return (
    <div className="bx-pop" ref={ref}>
      <button className="bx-date-btn" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={current ? `Issue of ${fullDate(current.date)} — choose another date` : 'Choose a date'}>
        <CalendarDays />
        {current ? <><span className="long">{fullDate(current.date)}</span><span className="short">{dayLong(current.date)}</span></> : 'Choose a date'}
        <ChevronDown />
      </button>
      {open && (
        <div className="bx-menu" role="dialog" aria-label="Choose an issue">
          {months.map(g => (
            <div key={g.m}>
              <h5>{monthLong(g.m)}</h5>
              <div className="days">
                {g.items.map(it => {
                  const d = new Date(it.date + 'T00:00:00Z')
                  return (
                    <button key={it.key} className={current?.key === it.key ? 'on' : ''} onClick={() => { onPick(it); setOpen(false) }}
                      aria-label={dayLong(it.date)}>
                      <b>{d.getUTCDate()}</b><span>{DOW[d.getUTCDay()]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// lucide carries no brand marks; this is LinkedIn's "in" drawn in the same 2px line style
const InMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 11v5M8 8v.01M12 16v-5M12 13.5a2.5 2.5 0 0 1 5 0V16" />
  </svg>
)

/** Share this issue. On a phone, the phone's own share sheet; elsewhere four plain choices.
 *  The link is the page's own address, so it opens on this issue. */
function ShareIssue({ title }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)
  useDismiss(open, setOpen, ref)
  const url = () => window.location.href
  const share = async () => {
    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share({ title, url: url() }) } catch { /* the reader cancelled */ }
      return
    }
    setOpen(o => !o)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1300)
    } catch { /* no clipboard: the address bar still has it */ }
  }
  return (
    <div className="bx-pop" ref={ref}>
      <button className="bx-btn secondary bx-share-btn" onClick={share} aria-haspopup="menu" aria-expanded={open}><Share2 /> Share</button>
      {open && (
        <div className="bx-menu right bx-share" role="menu" aria-label="Share this issue">
          <button role="menuitem" className={`item${copied ? ' done' : ''}`} onClick={copy}>{copied ? <Check /> : <Link2 />}{copied ? 'Link copied' : 'Copy link'}</button>
          <a role="menuitem" className="item" href={`mailto:?subject=${enc(title)}&body=${enc(url())}`}><Mail />Email</a>
          <a role="menuitem" className="item" href={`https://wa.me/?text=${enc(`${title} ${url()}`)}`} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>
          <a role="menuitem" className="item" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url())}`} target="_blank" rel="noreferrer"><InMark />LinkedIn</a>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ the reader page
/** The whole issue, in the wide panel over the reader. */
function FullIssue({ src, issue, pages }) {
  const title = `India Coal Market Daily — ${dayLong(issue.date)}`
  return (
    <div className="bx-issue-full">
      <div className="bx-issue-top">
        <span className="t"><b>India Coal Market Daily</b><small>{fullDate(issue.date)}{pages ? ` · ${pages} pages` : ''}</small></span>
        <ShareIssue title={title} />
      </div>
      <IssueFrame src={src} title={`India Coal Market Daily, ${day(issue.date)} — the full issue`} />
    </div>
  )
}

/** THE LAST SEVEN ISSUES, ONE TAP EACH (27 Oct'26): under the issue, after Older / Newer — a
 *  week's letters as dates, the open one marked. At the foot of the page, so the reader's two
 *  controls at the top stay two. */
const RECENT = 7
function RecentIssues({ list, current, onPick }) {
  const recent = list.slice(0, RECENT)
  if (recent.length < 2) return null
  return (
    <nav className="bx-rrecent" aria-label={`The last ${recent.length} issues`}>
      <span className="k">The last {recent.length} issues</span>
      <ol style={{ gridTemplateColumns: `repeat(${recent.length}, minmax(0, 1fr))` }}>
        {recent.map(it => {
          const d = new Date(`${it.date}T00:00:00`)
          const on = it.key === current.key
          return (
            <li key={it.key}>
              <button className={on ? 'on' : undefined} aria-current={on ? 'date' : undefined} onClick={() => onPick(it)} title={dayLong(it.date)}>
                <small>{d.toLocaleString('en-GB', { weekday: 'short' })}</small>
                <b>{d.getDate()}</b>
                <span>{d.toLocaleString('en-GB', { month: 'short' })}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Reader({ issues, date, onPick, error }) {
  const [full, setFull] = useState(false)
  const [pages, setPages] = useState(null)
  const list = issues || []
  const current = list.find(i => i.date === date) || list[0]
  const idx = current ? list.findIndex(i => i.key === current.key) : -1
  const newer = idx > 0 ? list[idx - 1] : null
  const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null

  useEffect(() => {          // a bare #/newsletter lands on the newest issue
    if (current && current.date !== date) onPick(current, true)
  }, [current, date, onPick])

  const go = it => { if (it) onPick(it) }      // navigate() opens the new issue at the top
  const src = current ? issueSrc(current) : null
  const first = list[list.length - 1]
  const sent = istTime(current?.uploaded_at)

  return (
    <div className={`bx-reader${BANDS ? ' v-band' : ''}`}>
      {/* the same band as Market Insights, News and Regulations (flags.BANDS, 5 Nov'26 — "news letter
          page se bhi standardize kardo"), and the SAME HEIGHT ("har ko same karo, news tab jitni"): the
          band holds only what News's does — the title and one line; the meta and the e-mail button
          open the page under it */}
      {BANDS ? (
        <PageBand crumb="Newsletter" title={<>India Coal Market <em>Daily</em></>} sheet="var(--bg-soft)" photo={PHOTOS.plantNight}
          sub="Production and despatch, stocks at the plants, power demand and the day’s coal news." />
      ) : (
      <header className="wrap bx-rmast">
        <span className="eyebrow">The newsletter</span>
        <h1>India Coal Market <em>Daily</em></h1>
        <p>Production and despatch, stocks at the plants, power demand and the day&rsquo;s coal news.</p>
        <div className="meta">
          <span><Clock3 />Mailed every morning at 09:00 IST</span>
          <span><Newspaper />{issues ? `${list.length} issues since ${day(first?.date)}` : <Sk w={160} h={12} />}</span>
        </div>
        <a className="bx-btn primary" href={MAILTO}><Mail /> Get it by email</a>
      </header>
      )}

      <div className="bx-rbody">
        {BANDS && (
          <div className="bx-reader-intro">
            <div className="bx-band-meta">
              <span><Clock3 />Mailed every morning at 09:00 IST</span>
              <span><Newspaper />{issues ? `${list.length} issues since ${day(first?.date)}` : <Sk w={160} h={12} />}</span>
            </div>
            <a className="bx-btn primary sm" href={MAILTO}><Mail /> Get it by email</a>
          </div>
        )}
        {error && !issues ? (
          <div className="bx-empty"><Newspaper /><h3>The archive could not be loaded</h3><p>{error}</p></div>
        ) : !issues ? (
          <>
            <div className="bx-issue-bar"><Sk w={320} h={44} r={12} /><span className="grow" /><Sk w={110} h={44} r={12} /></div>
            <div className="bx-page" style={{ padding: 34 }}><IssueSkeleton /></div>
          </>
        ) : !current ? (
          <div className="bx-empty"><Newspaper /><h3>No issues yet</h3><p>Issues appear here the morning they are mailed.</p></div>
        ) : (
          <>
            <div className="bx-issue-bar">
              <div className="bx-issue-date">
                <button className="bx-icon-btn" disabled={!older} onClick={() => go(older)} aria-label="Older issue" title="Older issue"><ChevronLeft /></button>
                <DatePicker issues={list} current={current} onPick={go} />
                <button className="bx-icon-btn" disabled={!newer} onClick={() => go(newer)} aria-label="Newer issue" title="Newer issue"><ChevronRight /></button>
              </div>
              {sent && <span className="sent">Sent at {sent}</span>}
              <span className="grow" />
              <ShareIssue title={`India Coal Market Daily — ${dayLong(current.date)}`} />
            </div>
            <IssueFrame key={src} src={src} title={`India Coal Market Daily, ${day(current.date)} — the front page`} preview grow onPages={setPages}>
              {/* THE FRONT PAGE IS THE DOOR TO THE ISSUE ON EVERY SCREEN (a phone since 23 Oct'26, every
                  screen since 27 Oct: the user found the page "did not scroll properly" — a wheel over the
                  issue went to its frame first, a scaled document with five live charts; over this layer
                  it scrolls the page itself, and a click opens the whole issue) */}
              <button type="button" className="bx-page-tap" onClick={() => setFull(true)} aria-haspopup="dialog"
                aria-label={`Open the ${day(current.date)} issue`} title="Read the full issue" />
              <div className="bx-more">
                {/* the full issue opens HERE, in the panel, on every screen (23 Oct'26 — on a phone it
                    used to open a new tab, the user's call: it must stay on the site). On a phone the
                    panel fits the issue to the width; the page pinches to zoom like any page */}
                <button className="bx-btn primary" onClick={() => setFull(true)} aria-haspopup="dialog">
                  <BookOpen /> Read the full issue{pages > 1 && <span className="n">{pages} pages</span>}
                </button>
              </div>
            </IssueFrame>
            <Sheet wide open={full} onClose={() => setFull(false)} label={`India Coal Market Daily, ${fullDate(current.date)}`}>
              <FullIssue src={src} issue={current} pages={pages} />
            </Sheet>
            <nav className="bx-rnav" aria-label="Other issues">
              <button disabled={!older} onClick={() => go(older)}><span>‹ Older issue</span><b>{older ? dayLong(older.date) : 'This is the first'}</b></button>
              <button disabled={!newer} onClick={() => go(newer)}><span>Newer issue ›</span><b>{newer ? dayLong(newer.date) : 'This is the latest'}</b></button>
            </nav>
            <RecentIssues list={list} current={current} onPick={go} />
          </>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ home showcase
// THE COVERS LOAD ONE AT A TIME, ONLY WHILE THE READER IS NOT SCROLLING (23 Oct'26). Each cover
// is a whole issue — a ~200 KB document that runs its own Chart.js — in a same-origin iframe,
// so it parses and draws on the page's own main thread. Loaded "when near", both landed in the
// middle of a scroll and were EVERY long task on the home page: 7–9 tasks, 1.2–1.4 s, the
// longest ~470 ms at 4× CPU throttle (scratch/dev/_probe_jank.py); with the covers blocked, 0.
// Now a cover is queued well before it is reached (2,000 px) and starts in an idle moment at
// least QUIET ms after the last scroll; the next waits for the previous one's load.
const QUIET = 800
const coverQueue = []
let coverBusy = false
let lastScroll = 0
if (typeof window !== 'undefined') window.addEventListener('scroll', () => { lastScroll = performance.now() }, { passive: true })
const whenIdle = cb => (window.requestIdleCallback ? window.requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 120))
function pumpCovers() {
  if (coverBusy || !coverQueue.length) return
  const calmFor = performance.now() - lastScroll
  if (calmFor < QUIET) { setTimeout(pumpCovers, QUIET - calmFor + 30); return }
  whenIdle(() => {
    if (coverBusy || !coverQueue.length) return
    if (performance.now() - lastScroll < QUIET) { setTimeout(pumpCovers, 200); return }
    coverBusy = true
    const job = coverQueue.shift()
    let released = false
    const release = () => { if (released) return; released = true; coverBusy = false; setTimeout(pumpCovers, 150) }
    setTimeout(release, 8000)                     // a cover that never loads must not hold the queue
    job(release)
  })
}
function queueCover(job) {
  coverQueue.push(job)
  pumpCovers()
  return () => { const i = coverQueue.indexOf(job); if (i >= 0) coverQueue.splice(i, 1) }
}

/** A cover PRE-RENDERED at publish time (libs/website/covers, 2 Nov'26): a picture of the issue's
 *  first sheet, so the home page draws an image instead of running the whole issue. The frame below
 *  is only the fallback for an issue published before covers existed. */
function Cover({ it, cls, label, onOpen }) {
  const [seen, setSeen] = useState(false)
  if (!it.cover) return <FrameCover it={it} cls={cls} label={label} onOpen={onOpen} />
  const v = String(it.web_stamp || it.uploaded_at || '').replace(/\D/g, '')
  return (
    <button className={`bx-cover ${cls}`} onClick={() => onOpen(it)} aria-label={`Read the ${day(it.date)} issue`}>
      {!seen && <div style={{ padding: 22 }}><IssueSkeleton /></div>}
      <img className={`pre${seen ? ' in' : ''}`} src={`${issueUrl('coal', it.date)}/cover.jpg${v ? `?v=${v}` : ''}`} alt=""
        loading="lazy" decoding="async" onLoad={() => setSeen(true)} />
      <span className="lbl">{label}</span>
    </button>
  )
}

function FrameCover({ it, cls, label, onOpen }) {
  const ref = useRef(null)
  const frame = useRef(null)
  const [src, setSrc] = useState(null)
  const [cw, setCw] = useState(0)
  // THE ISSUE'S FIRST SHEET, EDGE TO EDGE (27 Oct'26 — the user: "cut off"): the cover assumed an
  // 820px document and the sheet is wider, so its right edge ran out of the card. Once loaded the
  // sheet itself is measured (its width and where it sits in the document) and the frame is
  // scaled and shifted so the sheet's full width fills the card; its foot fades out (CSS).
  // the frame is laid out 1200px wide (CSS) so the sheet sits at its own width and never reflows
  const [fit, setFit] = useState(null)              // {w, x, y}: the sheet, in document px
  const done = useRef(null)
  const unqueue = useRef(null)
  useNear(ref, useCallback(() => {
    unqueue.current = queueCover(release => { done.current = release; setSrc(issueSrc(it, true)) })
  }, [it]), '2000px')
  useEffect(() => () => { unqueue.current?.(); done.current?.() }, [])
  // SANDBOXED, OFF THE PAGE'S THREAD (2 Nov'26): the cover frame has no same-origin access, so the
  // browser may run the issue (and its Chart.js) in a process of its own — same-origin it froze the
  // home page for 290–590 ms per cover. The page cannot measure inside it any more; the issue posts
  // its first sheet's box (routes/website _COVER_JS), and only a message from THIS frame counts.
  useEffect(() => {
    const on = e => {
      const d = e.data
      if (!d?.bcxCover || !frame.current || e.source !== frame.current.contentWindow || !(d.w > 0)) return
      setFit({ w: d.w, x: d.x, y: d.y })
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])
  useEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  const onLoad = () => { done.current?.() }
  const s = cw ? cw / (fit?.w || 820) : 0.5
  const style = fit
    ? { transform: `scale(${s}) translate(${-fit.x}px, ${-fit.y}px)` }
    : { transform: `scale(${s})` }
  return (
    <button ref={ref} className={`bx-cover ${cls}`} onClick={() => onOpen(it)} aria-label={`Read the ${day(it.date)} issue`}>
      {src ? <iframe ref={frame} src={src} title="" tabIndex={-1} style={style} onLoad={onLoad} sandbox="allow-scripts" /> : <div style={{ padding: 22 }}><IssueSkeleton /></div>}
      <span className="lbl">{label}</span>
    </button>
  )
}

export function LettersShowcase({ issues, onOpen, onArchive }) {
  const recent = (issues || []).slice(0, 5)
  // THE COVERS ON A PHONE TOO (27 Oct'26, the user's call — "ye design mujhe achha laga, phone pe bhi
  // aaye"): they had been left off a phone (an issue at under half its size, a whole document parsed
  // on the page's thread). They come back under the heading, before the list, still loaded one at a
  // time in an idle moment (queueCover), so a phone's scroll is not what pays for them.
  const phone = usePhone()
  const covers = (
    // on a phone they sit INSIDE the copy, which has already been revealed — a reveal of their own would
    // wait for an observer that set up before they existed, and stay invisible
    <div className={`bx-covers${phone ? '' : ' bx-reveal'}`} aria-label="Latest issues">
      {recent[1] && <Cover it={recent[1]} cls="a" label={day(recent[1].date)} onOpen={onOpen} />}
      {recent[0] && <Cover it={recent[0]} cls="b" label={`Latest · ${day(recent[0].date)}`} onOpen={onOpen} />}
      {!issues && <div className="bx-cover b" style={{ padding: 22 }}><IssueSkeleton /></div>}
    </div>
  )
  return (
    <section className="bx-sec warm" id="letter">
      <div className="wrap bx-letters">
        <div className="bx-letters-copy bx-reveal">
          <span className="eyebrow">The newsletter</span>
          <h2 className="h-sec">The coal market, in your inbox <em>by nine.</em></h2>
          <p className="lede">The India Coal Market Daily, every morning at 09:00 IST.</p>
          {phone && covers}
          <div className="bx-recent">
            {issues ? recent.map((it, i) => {
              const d = new Date(it.date + 'T00:00:00Z')
              return (
                <button key={it.key} onClick={() => onOpen(it)}>
                  <span className="d"><b>{d.getUTCDate()}</b><span>{MONTHS[d.getUTCMonth()]}</span></span>
                  <span><strong>{dayLong(it.date)}</strong><small>{i === 0 ? 'Latest issue' : 'Issue'}{istTime(it.uploaded_at) ? ` · sent ${istTime(it.uploaded_at)}` : ''}</small></span>
                  <ArrowRight />
                </button>
              )
            }) : Array.from({ length: 4 }, (_, i) => <div key={i} style={{ padding: 14, display: 'flex', gap: 12 }}><Sk w={44} h={44} r={12} /><div style={{ flex: 1, display: 'grid', gap: 6 }}><Sk w="55%" h={13} /><Sk w="35%" h={10} /></div></div>)}
          </div>
          <div className="bx-letters-ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="bx-btn primary" onClick={() => onOpen(recent[0])} disabled={!recent.length}>Read today&rsquo;s issue <ArrowRight /></button>
            <button className="bx-btn secondary" onClick={onArchive}>All {issues ? issues.length : ''} issues</button>
          </div>
        </div>
        {!phone && covers}
      </div>
    </section>
  )
}

