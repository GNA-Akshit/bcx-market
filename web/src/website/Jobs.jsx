// CAREERS - THE OPENINGS AND THE APPLICATION (19 Nov'26, LOCAL ONLY: flags.CAREERS_PORTAL). #/jobs lists the published
// openings; #/jobs/<role> is one role - its description and an Apply button that opens the application over the
// blurred page (ui.Sheet `center`, the "Write to us" form's frame and fields). The application goes to
// POST /api/website/careers/apply with the CV (PDF or .docx, up to 5 MB); the server checks everything again, scores
// the CV against the role's rubric (libs/website/ats.py), stores it and mails the applicant a thank-you. Nothing is
// mailed to HR: HR reads the applications, ranked, in the HR portal (frontend/hr/).
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, Check, ChevronDown, Clock3, Download, ExternalLink, FileText, Mail, Upload } from 'lucide-react'
import { apiUrl } from './api.js'
import { CAREERS, CONTACT } from './content.js'
import { openContact } from './ContactForm.jsx'
import { CONTACT_FORM } from './flags.js'
import { PHOTOS } from './media.jsx'
import { HRail, PageBand, Sheet, usePhone } from './ui.jsx'

const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days']
const MAX = { name: 80, email: 254, phone: 20, location: 80, current_company: 120, current_role: 120, linkedin: 300,
  portfolio: 300, cover_note: 1500 }
const CV_MAX = 5 * 1024 * 1024
const EMPTY = { name: '', email: '', phone: '', location: '', experience_years: '', current_company: '', current_role: '',
  notice: '', linkedin: '', portfolio: '', cover_note: '' }
const NAME_BAD = /[\d<>{}[\]()@#$%^&*=_+|\\/;:"!?~`,]/
const kb = n => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** A small fetch of our own (the payloads are a few KB): { data, error } */
function useApi(path) {
  const [s, setS] = useState({ data: null, error: null })
  useEffect(() => {
    let live = true
    setS({ data: null, error: null })
    fetch(apiUrl(path), { credentials: 'omit' })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (live) setS(ok ? { data: d, error: null } : { data: null, error: d?.error || 'unavailable' }) })
      .catch(() => { if (live) setS({ data: null, error: 'unavailable' }) })
    return () => { live = false }
  }, [path])
  return s
}

export default function Jobs({ slug }) {
  return slug ? <Role key={slug} slug={slug} /> : <JobList />
}

/** THE CAREERS PAGE (19 Nov'26, pass 97 - LOCAL ONLY): Careers is a page of its own, in the header beside the other
 *  pages (the user: the openings were reached only through the home page's Careers section). It opens on the open
 *  positions - what a visitor comes for - then why join BCX (the approved copy, content.CAREERS) and a way to write in
 *  when no role fits; the page ends on that card, clear of the footer.
 *  23 Nov'26 (the user): the openings are FILTERED BY THE KIND OF WORK (a role's `category`, careers.CATEGORIES - "when
 *  we have more roles … segregations based on genre of job"); no department or place line on a card; no "new roles
 *  will be posted here" note; no "How we hire / After you apply" ("it is obvious how people hire"). */
function JobList() {
  const { data, error } = useApi('/api/website/careers/jobs')
  const jobs = data?.jobs || []
  const phone = usePhone()
  const [cat, setCat] = useState('all')
  const cats = [...new Set(jobs.map(j => j.category).filter(Boolean))]
  const shown = cat === 'all' ? jobs : jobs.filter(j => j.category === cat)
  const write = CONTACT_FORM
    ? <button type="button" className="bx-btn white" onClick={() => openContact('careers')}><Mail aria-hidden="true" /> Write to us</button>
    : <a className="bx-btn white" href={`mailto:${CONTACT.email}?subject=Careers%20at%20BCX`}><Mail aria-hidden="true" /> Write to us</a>
  return (
    <div className="bx-careers-pg v-band">
      <PageBand crumb="Careers" title={<>Careers at <em>BCX</em></>} photo={PHOTOS.mineDragline} />

      <section className="bx-cp-sec bx-cp-open" id="positions" aria-labelledby="cp-open">
        <div className="wrap">
          <div className="bx-cp-hd">
            <div>
              <span className="eyebrow">Open positions</span>
              <h2 className="h-sec" id="cp-open">Roles we are hiring for<em>.</em></h2>
            </div>
          </div>
          {/* the kind of work (careers.CATEGORIES): a job board's toolbar - how many roles are open, then ONE labelled
              dropdown of the teams that have one (pills read as "unprofessional", the user, 23 Nov'26) */}
          {jobs.length > 0 && (
            <div className="bx-cp-bar">
              <p className="bx-cp-count" aria-live="polite">
                <b>{shown.length}</b> open position{shown.length === 1 ? '' : 's'}{cat !== 'all' && <> in {cat}</>}
              </p>
              <label className="bx-cp-filter" htmlFor="cp-team">
                <span>Team</span>
                <span className="sel">
                  <select id="cp-team" value={cat} onChange={e => setCat(e.target.value)}>
                    <option value="all">All teams ({jobs.length})</option>
                    {cats.map(c => <option key={c} value={c}>{c} ({jobs.filter(j => j.category === c).length})</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </span>
              </label>
            </div>
          )}
          {!data && !error && <div className="bx-jobs-skel" aria-hidden="true"><i /><i /></div>}
          {error && <p className="bx-cp-empty">The openings could not be loaded just now. Please try again in a moment.</p>}
          {data && !jobs.length && <p className="bx-cp-empty">There are no open positions right now.</p>}
          <ul className="bx-cp-roles">
            {shown.map(j => (
              <li key={j.slug}>
                <a className="bx-cp-role" href={`#/jobs/${j.slug}`}>
                  <span className="tx">
                    <b>{j.title}</b>
                    {j.summary && <span className="sum">{j.summary}</span>}
                    <span className="facts">
                      {j.employment && <span><Briefcase aria-hidden="true" />{j.employment}</span>}
                      {j.experience && <span><Clock3 aria-hidden="true" />{j.experience}</span>}
                    </span>
                  </span>
                  <span className="go">View role <ArrowRight aria-hidden="true" /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bx-cp-sec soft" aria-labelledby="cp-why">
        <div className="wrap bx-cp-why">
          <div className="tx">
            <span className="eyebrow">Why join BCX</span>
            <h2 className="h-sec" id="cp-why">{CAREERS.title}<em>.</em></h2>
            <p className="lede">{CAREERS.intro}</p>
          </div>
          {phone ? (
            <HRail bleed label="Why join BCX">
              {CAREERS.reasons.map(([t, p]) => <div key={t} className="bx-why-card"><b>{t}</b><span>{p}</span></div>)}
            </HRail>
          ) : (
            <ul className="cards">{CAREERS.reasons.map(([t, p]) => <li key={t}><b>{t}</b><span>{p}</span></li>)}</ul>
          )}
        </div>
      </section>

      <section className="bx-cp-sec" aria-label="Write to us">
        <div className="wrap">
          <div className="bx-cp-cta">
            <div>
              <h3>Don’t see the right role?</h3>
              <p>Tell us about yourself and the work you would like to do at BCX.</p>
            </div>
            {write}
          </div>
        </div>
      </section>
    </div>
  )
}

function Role({ slug }) {
  const { data, error } = useApi(`/api/website/careers/jobs/${encodeURIComponent(slug)}`)
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(0)
  const j = data?.job
  // THE FORM'S TOKEN (26 Nov'26, careers.form_token): the role's page hands one out and the application must carry it,
  // so a script that never opened the page cannot post applications. It lasts 6 hours; a page left open longer
  // fetches a new one when the form is sent
  const tok = useRef({ v: null, at: 0 })
  useEffect(() => { if (data?.form_token) tok.current = { v: data.form_token, at: Date.now() } }, [data])
  const formToken = async () => {
    if (tok.current.v && Date.now() - tok.current.at < 5 * 3600e3) return tok.current.v
    const r = await fetch(apiUrl(`/api/website/careers/jobs/${encodeURIComponent(slug)}`), { credentials: 'omit' })
    const d = await r.json().catch(() => ({}))
    tok.current = { v: d.form_token || null, at: Date.now() }
    return tok.current.v
  }
  if (error) {
    return (
      <div className="bx-careers-pg v-band">
        <PageBand crumb="Careers" title={<>Careers at <em>BCX</em></>} photo={PHOTOS.mineDragline} />
        <section className="wrap bx-jobs"><p className="empty">This opening is no longer listed. <a href="#/jobs">See all open positions</a>.</p></section>
      </div>
    )
  }
  // THE ROLE'S TITLE IS IN THE PAGE, NOT THE BAND (23 Nov'26, the user: as the band's heading it read as the page's
  // name, not a job): the band stays "Careers at BCX", and the title opens the description - large, on an accent rule
  return (
    <div className="bx-careers-pg v-band">
      <PageBand crumb="Careers" title={<>Careers at <em>BCX</em></>} photo={PHOTOS.mineDragline} />
      <section className="wrap bx-role">
        <article className="jd">
          <a className="back" href="#/jobs"><ArrowLeft aria-hidden="true" /> All open positions</a>
          <header className="bx-role-title">
            <span className="k">Open position</span>
            <h1>{j ? j.title : ' '}</h1>
          </header>
          {j?.summary && <p className="lede">{j.summary}</p>}
          {(j?.sections || []).map(s => (
            <section key={s.title}>
              <h3>{s.title}</h3>
              {s.body && s.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              {s.items && <ul>{s.items.map(it => <li key={it}>{it}</li>)}</ul>}
              {/* a section in parts (the JD's Key Responsibilities): a sub-heading and its points each */}
              {(s.groups || []).map(g => (
                <div key={g.title} className="grp">
                  <h4>{g.title}</h4>
                  <ul>{g.items.map(it => <li key={it}>{it}</li>)}</ul>
                </div>
              ))}
            </section>
          ))}
        </article>
        <aside className="card">
          <span className="eyebrow">The role</span>
          {j && (
            <dl>
              {[['Department', j.team], ['Location', j.location], ['Employment', j.employment], ['Experience', j.experience]]
                .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
          <button type="button" className="bx-btn primary" disabled={!j} onClick={() => { setN(x => x + 1); setOpen(true) }}>
            Apply for this role <ArrowRight aria-hidden="true" />
          </button>
          <p className="note">PDF or Word CV, up to 5 MB. You will get a confirmation by email.</p>
          {/* THE JD DOCUMENT (19 Nov'26): the job description as BCX wrote it - opened as a PDF, or the Word original */}
          {j?.jd && (
            <div className="jdoc">
              <span className="lab">Job description</span>
              {j.jd.pdf && (
                <a href={apiUrl(`/api/website/careers/jobs/${encodeURIComponent(j.slug)}/jd.pdf`)} target="_blank" rel="noopener">
                  <FileText aria-hidden="true" /><span><b>Open the job description</b>PDF · opens in a new tab</span><ExternalLink className="go" aria-hidden="true" />
                </a>
              )}
              {j.jd.docx && (
                <a href={apiUrl(`/api/website/careers/jobs/${encodeURIComponent(j.slug)}/jd.docx`)} download>
                  <FileText aria-hidden="true" /><span><b>Download as Word</b>.docx · the original document</span><Download className="go" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </aside>
      </section>
      <Sheet open={open} onClose={() => setOpen(false)} label={j ? `Apply: ${j.title}` : 'Apply'} center>
        {close => j && <ApplyForm key={n} job={j} close={close} formToken={formToken} />}
      </Sheet>
    </div>
  )
}

function check(v, consent, file) {
  const e = {}
  const name = v.name.trim()
  if (name.length < 2) e.name = 'Enter your name.'
  else if (NAME_BAD.test(name) || !/\p{L}/u.test(name)) e.name = 'Use letters only — spaces, full stops, hyphens and apostrophes are fine.'
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,24}$/.test(v.email.trim())) e.email = 'Enter a valid email address.'
  const digits = v.phone.replace(/\D/g, '')
  if (!/^\+?[0-9 ()-]+$/.test(v.phone.trim()) || digits.length < 7 || digits.length > 15) e.phone = 'Enter a valid phone number (7 to 15 digits).'
  if (v.location.trim().length < 2) e.location = 'Enter your current city.'
  const y = Number(v.experience_years)
  if (v.experience_years === '' || !(y >= 0 && y <= 50)) e.experience_years = 'Enter your total experience in years.'
  if (!NOTICE.includes(v.notice)) e.notice = 'Choose your notice period.'
  if (v.linkedin.trim() && !/^https?:\/\/[^\s]*linkedin\.com\//i.test(v.linkedin.trim())) e.linkedin = 'Enter your LinkedIn profile’s link.'
  if (v.portfolio.trim() && !/^https?:\/\/\S{4,}$/i.test(v.portfolio.trim())) e.portfolio = 'Enter a full link starting with https://'
  if (!file) e.cv = 'Attach your CV (PDF or Word .docx, up to 5 MB).'
  else if (!/\.(pdf|docx)$/i.test(file.name)) e.cv = 'Your CV must be a PDF or a Word (.docx) file.'
  else if (file.size > CV_MAX) e.cv = 'Your CV is larger than 5 MB.'
  if (!consent) e.consent = 'Please agree so that we can consider your application.'
  return e
}

function Field({ id, label, optional = false, error, children, hint }) {
  return (
    <div className={`fld${error ? ' bad' : ''}`}>
      <label htmlFor={id}>{label}{optional ? <small> (optional)</small> : <i aria-hidden="true"> *</i>}</label>
      {children}
      <p className="msg" id={`${id}-err`} role={error ? 'alert' : undefined}>{error || hint || ''}</p>
    </div>
  )
}

function ApplyForm({ job, close, formToken }) {
  const [v, setV] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [hp, setHp] = useState('')
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [drag, setDrag] = useState(false)
  const [state, setState] = useState({ step: 'form' })
  const opened = useRef(Date.now())
  const fileInput = useRef(null)
  const recheck = (nv = v, nc = consent, nf = file) => { if (tried) setErrors(check(nv, nc, nf)) }
  const set = k => e => { const nv = { ...v, [k]: e.target.value }; setV(nv); recheck(nv) }
  const aria = k => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': `ap-${k}-err` })
  const pick = f => { setFile(f || null); recheck(v, consent, f || null) }

  const send = async e => {
    e.preventDefault()
    setTried(true)
    const errs = check(v, consent, file)
    setErrors(errs)
    if (Object.keys(errs).length) { document.getElementById(`ap-${Object.keys(errs)[0]}`)?.focus(); return }
    setState({ step: 'sending' })
    const ft = await formToken().catch(() => null)
    const fd = new FormData()
    Object.entries(v).forEach(([k, val]) => fd.append(k, val.trim()))
    fd.append('job', job.slug)
    fd.append('consent', 'on')
    fd.append('website', hp)
    fd.append('elapsed', String(Date.now() - opened.current))
    fd.append('ft', ft || '')
    fd.append('cv', file)
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 45000)
    try {
      const r = await fetch(apiUrl('/api/website/careers/apply'), { method: 'POST', body: fd, credentials: 'omit', signal: ctl.signal })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.ok) setState({ step: 'sent', ref: d.ref || null })
      else if (r.status === 400 && d.errors) { setErrors(d.errors); setState({ step: 'form' }) }
      else if (r.status === 409) setState({ step: 'already' })
      else if (r.status === 429 && d.error === 'reused') setState({ step: 'failed', why: 'This CV has already been sent with other email addresses. Please apply with your own email address.' })
      else if (r.status === 429) setState({ step: 'failed', why: 'You have sent several applications today. Please try again tomorrow.' })
      else if (r.status === 413) setState({ step: 'failed', why: 'Your CV is too large to send. Please attach a file under 5 MB.' })
      else if (r.status === 503 && d.error === 'busy') setState({ step: 'failed', why: 'We are receiving a lot of applications right now. Please try again in a few minutes.' })
      else setState({ step: 'failed', why: 'We could not send your application just now. Please try again in a moment.' })
    } catch {
      setState({ step: 'failed', why: 'We could not reach our server. Please check your connection and try again.' })
    } finally {
      clearTimeout(timer)
    }
  }

  if (state.step === 'sent') {
    return (
      <div className="bx-cform done" aria-live="polite">
        <span className="ok" aria-hidden="true"><Check /></span>
        <h2>Thank you, {v.name.trim().split(/\s+/)[0]}.</h2>
        <p>Your application for <b>{job.title}</b> has reached us.<br />A confirmation is on its way to <b>{v.email.trim()}</b>.</p>
        {state.ref && <p className="ref">Your reference: <b>{state.ref}</b></p>}
        <button type="button" className="bx-btn primary" onClick={close}>Close</button>
      </div>
    )
  }
  // THE SAME ROLE TWICE (26 Nov'26, the user: "just a short message that your application is under review"): not an
  // error - the first application stands, and nothing new was stored
  if (state.step === 'already') {
    return (
      <div className="bx-cform done" aria-live="polite">
        <span className="ok wait" aria-hidden="true"><Clock3 /></span>
        <h2>You have already applied</h2>
        <p>We have your application for <b>{job.title}</b> from <b>{v.email.trim()}</b>.<br />It is under review, and we will be in touch.</p>
        <button type="button" className="bx-btn primary" onClick={close}>Close</button>
      </div>
    )
  }
  const sending = state.step === 'sending'
  return (
    <div className="bx-cform bx-apply">
      <form className="f" noValidate onSubmit={send}>
        <span className="eyebrow">Apply</span>
        <h2>{job.title}</h2>
        <p className="lede">Tell us about yourself and attach your CV. Fields marked * are required.</p>
        <div className="two">
          <Field id="ap-name" label="Full name" error={errors.name}>
            <input id="ap-name" type="text" autoComplete="name" maxLength={MAX.name} value={v.name} onChange={set('name')} {...aria('name')} />
          </Field>
          <Field id="ap-email" label="Email" error={errors.email}>
            <input id="ap-email" type="email" inputMode="email" autoComplete="email" maxLength={MAX.email} value={v.email} onChange={set('email')} {...aria('email')} />
          </Field>
        </div>
        <div className="two">
          <Field id="ap-phone" label="Mobile number" error={errors.phone}>
            <input id="ap-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={MAX.phone} value={v.phone} onChange={set('phone')} {...aria('phone')} />
          </Field>
          <Field id="ap-location" label="Current city" error={errors.location}>
            <input id="ap-location" type="text" autoComplete="address-level2" maxLength={MAX.location} value={v.location} onChange={set('location')} {...aria('location')} />
          </Field>
        </div>
        <div className="two">
          <Field id="ap-current_company" label="Current company" optional error={errors.current_company}>
            <input id="ap-current_company" type="text" autoComplete="organization" maxLength={MAX.current_company} value={v.current_company} onChange={set('current_company')} {...aria('current_company')} />
          </Field>
          <Field id="ap-current_role" label="Current role" optional error={errors.current_role}>
            <input id="ap-current_role" type="text" autoComplete="organization-title" maxLength={MAX.current_role} value={v.current_role} onChange={set('current_role')} {...aria('current_role')} />
          </Field>
        </div>
        <div className="two">
          <Field id="ap-experience_years" label="Total experience (years)" error={errors.experience_years}>
            <input id="ap-experience_years" type="number" inputMode="decimal" min="0" max="50" step="0.5" value={v.experience_years} onChange={set('experience_years')} {...aria('experience_years')} />
          </Field>
          <Field id="ap-notice" label="Notice period" error={errors.notice}>
            <select id="ap-notice" value={v.notice} onChange={set('notice')} {...aria('notice')}>
              <option value="" disabled>Choose</option>
              {NOTICE.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <div className="two">
          <Field id="ap-linkedin" label="LinkedIn profile" optional error={errors.linkedin}>
            <input id="ap-linkedin" type="url" inputMode="url" maxLength={MAX.linkedin} placeholder="https://www.linkedin.com/in/…" value={v.linkedin} onChange={set('linkedin')} {...aria('linkedin')} />
          </Field>
          <Field id="ap-portfolio" label="Portfolio or website" optional error={errors.portfolio}>
            <input id="ap-portfolio" type="url" inputMode="url" maxLength={MAX.portfolio} placeholder="https://" value={v.portfolio} onChange={set('portfolio')} {...aria('portfolio')} />
          </Field>
        </div>
        <Field id="ap-cv" label="CV" error={errors.cv} hint="PDF or Word (.docx), up to 5 MB">
          <label className={`bx-drop${drag ? ' over' : ''}${file ? ' has' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}>
            <input id="ap-cv" ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => pick(e.target.files?.[0])} {...aria('cv')} />
            {file
              ? <><FileText aria-hidden="true" /><span><b>{file.name}</b><span>{kb(file.size)} · <u>Change file</u></span></span></>
              : <><Upload aria-hidden="true" /><span><b>Drop your CV here</b><span>or <u>choose a file</u></span></span></>}
          </label>
        </Field>
        <Field id="ap-cover_note" label="Anything you would like to add" optional error={errors.cover_note}>
          <textarea id="ap-cover_note" rows={4} maxLength={MAX.cover_note} value={v.cover_note} onChange={set('cover_note')} {...aria('cover_note')} />
        </Field>
        <div className="hp" aria-hidden="true">
          <label htmlFor="ap-website">Leave this empty</label>
          <input id="ap-website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} />
        </div>
        <div className={`consent${errors.consent ? ' bad' : ''}`}>
          <label>
            <input id="ap-consent" type="checkbox" checked={consent} {...aria('consent')}
              onChange={e => { setConsent(e.target.checked); recheck(v, e.target.checked) }} />
            <span>I agree that Bharat Coal Exchange may store and use these details and my CV to consider my application.</span>
          </label>
          <p className="msg" id="ap-consent-err" role={errors.consent ? 'alert' : undefined}>{errors.consent || ''}</p>
        </div>
        {errors.form && <p className="fail" role="alert">{errors.form}</p>}
        {errors.job && <p className="fail" role="alert">{errors.job}</p>}
        {state.step === 'failed' && <p className="fail" role="alert">{state.why}</p>}
        <button type="submit" className="bx-btn primary send" disabled={sending}>{sending ? 'Sending…' : 'Submit application'}</button>
      </form>
    </div>
  )
}
