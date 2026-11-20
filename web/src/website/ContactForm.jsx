// THE "WRITE TO US" FORM (18 Nov'26 — the VP: "Write to us should open a web-form instead of prompting to open Outlook").
// A dialog over the blurred page (ui.Sheet `center`; a bottom sheet on a phone): the form on the left, BCX's office and
// direct addresses on the right. It posts to /api/website/contact, which checks every field again, stores the message
// (web_enquiry) and mails it to BCX from the data mailbox (libs/website/enquiries.py). The checks here are for the
// reader's sake — what a field needs, said before sending; the server's are the ones that count.
//
// Opened from anywhere with openContact(topic): the page mounts ONE <ContactDialog /> (Website.jsx).
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Mail, MapPin, Phone } from 'lucide-react'
import { apiUrl } from './api.js'
import { CONTACT } from './content.js'
import LinkedInIcon from './LinkedIn.jsx'
import { Sheet } from './ui.jsx'

// the server's own list (enquiries.TOPICS): the key is sent, never the label. No "Platform access" (20 Nov'26, the user:
// there is no platform yet - "what are we giving access to?"); no topic is chosen for the reader, they pick one.
export const TOPICS = [
  ['partnership', 'Partnerships'], ['data', 'Market data and insights'],
  ['careers', 'Careers'], ['media', 'Media and press'], ['other', 'Something else'],
]
// each the server's limit and the column's length
const MAX = { name: 80, organisation: 120, email: 254, phone: 20, message: 2000 }
const MESSAGE_MIN = 10
const NAME_BAD = /[\d<>{}[\]()@#$%^&*=_+|\\/;:"!?~`,]/
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,24}$/
const PHONE_OK = /^\+?[0-9 ()-]+$/
const EMPTY = { name: '', organisation: '', phone: '', email: '', message: '' }

/** Open the form, its topic chosen where the button knows it (a careers button opens it on Careers), else none. */
export function openContact(topic = '') {
  window.dispatchEvent(new CustomEvent('bx-contact', { detail: { topic } }))
}

function check(v, consent, topic) {
  const e = {}
  if (!TOPICS.some(([k]) => k === topic)) e.topic = 'Choose what you are writing about.'
  const name = v.name.trim()
  if (name.length < 2) e.name = 'Enter your name.'
  else if (NAME_BAD.test(name) || !/\p{L}/u.test(name)) e.name = 'Use letters only — spaces, full stops, hyphens and apostrophes are fine.'
  if (v.organisation.trim() && /[<>{}[\]\\`|^~]/.test(v.organisation)) e.organisation = 'This field contains characters we cannot accept.'
  const digits = v.phone.replace(/\D/g, '')
  if (!PHONE_OK.test(v.phone.trim()) || digits.length < 7 || digits.length > 15) e.phone = 'Enter a valid phone number (7 to 15 digits).'
  if (!EMAIL_OK.test(v.email.trim())) e.email = 'Enter a valid email address.'
  const msg = v.message.trim()
  if (msg.length < MESSAGE_MIN) e.message = `Tell us a little more (${MESSAGE_MIN} characters at least).`
  if (!consent) e.consent = 'Please agree so that we can reply to you.'
  return e
}

function Field({ id, label, optional = false, error, children }) {
  return (
    <div className={`fld${error ? ' bad' : ''}`}>
      <label htmlFor={id}>{label}{optional ? <small> (optional)</small> : <i aria-hidden="true"> *</i>}</label>
      {children}
      <p className="msg" id={`${id}-err`} role={error ? 'alert' : undefined}>{error || ''}</p>
    </div>
  )
}

function ContactForm({ topic: topic0, close }) {
  const [v, setV] = useState(EMPTY)
  const [topic, setTopic] = useState(topic0)
  const [consent, setConsent] = useState(false)
  const [hp, setHp] = useState('')                  // the honeypot: hidden from people, filled by bots
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [state, setState] = useState({ step: 'form' })      // form | sending | sent | failed
  const opened = useRef(Date.now())
  const set = k => e => {
    const nv = { ...v, [k]: e.target.value }
    setV(nv)
    if (tried) setErrors(check(nv, consent, topic))
  }
  const aria = k => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': `cf-${k}-err` })

  const send = async e => {
    e.preventDefault()
    setTried(true)
    const errs = check(v, consent, topic)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(`cf-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    setState({ step: 'sending' })
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 15000)
    try {
      const r = await fetch(apiUrl('/api/website/contact'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', signal: ctl.signal,
        body: JSON.stringify({ ...v, topic, consent, website: hp, elapsed: Date.now() - opened.current }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.ok) setState({ step: 'sent', ref: d.ref || null })
      else if (r.status === 400 && d.errors) { setErrors(d.errors); setState({ step: 'form' }) }
      else if (r.status === 429) setState({ step: 'failed', why: 'You have sent several messages in a short time. Please try again later.' })
      else setState({ step: 'failed', why: 'We could not send your message just now. Please try again in a moment.' })
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
        <p>Your message has reached us. We will reply to <b>{v.email.trim()}</b>,<br />and a confirmation is on its way there now.</p>
        {state.ref && <p className="ref">Your reference: <b>{state.ref}</b></p>}
        <button type="button" className="bx-btn primary" onClick={close}>Close</button>
      </div>
    )
  }
  const sending = state.step === 'sending'
  return (
    <div className="bx-cform">
      <form className="f" noValidate onSubmit={send}>
        <span className="eyebrow">Contact</span>
        <h2>Write to us</h2>
        <p className="lede">Tell us who you are and what you need. We reply by email.</p>
        <div className="two">
          <Field id="cf-name" label="Your name" error={errors.name}>
            <input id="cf-name" type="text" autoComplete="name" maxLength={MAX.name} value={v.name} onChange={set('name')} {...aria('name')} />
          </Field>
          <Field id="cf-organisation" label="Organisation" optional error={errors.organisation}>
            <input id="cf-organisation" type="text" autoComplete="organization" maxLength={MAX.organisation} value={v.organisation} onChange={set('organisation')} {...aria('organisation')} />
          </Field>
        </div>
        <div className="two">
          <Field id="cf-phone" label="Mobile number" error={errors.phone}>
            <input id="cf-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={MAX.phone} value={v.phone} onChange={set('phone')} {...aria('phone')} />
          </Field>
          <Field id="cf-email" label="Email" error={errors.email}>
            <input id="cf-email" type="email" inputMode="email" autoComplete="email" maxLength={MAX.email} value={v.email} onChange={set('email')} {...aria('email')} />
          </Field>
        </div>
        <Field id="cf-topic" label="I’m writing about" error={errors.topic}>
          <select id="cf-topic" className={topic ? undefined : 'unset'} value={topic}
            onChange={e => { setTopic(e.target.value); if (tried) setErrors(check(v, consent, e.target.value)) }} {...aria('topic')}>
            <option value="" disabled>Choose a topic</option>
            {TOPICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field id="cf-message" label="How can we help?" error={errors.message}>
          <textarea id="cf-message" rows={5} maxLength={MAX.message} value={v.message} onChange={set('message')}
            placeholder="A little context helps us answer faster: your organisation’s role in the coal market, and your question." {...aria('message')} />
          <span className="count" aria-hidden="true">{v.message.length} / {MAX.message}</span>
        </Field>
        {/* the honeypot: off screen, out of the tab order, never filled by a person — a bot that fills it is told
            it succeeded and nothing is kept (enquiries.validate) */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="cf-website">Leave this empty</label>
          <input id="cf-website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} />
        </div>
        <div className={`consent${errors.consent ? ' bad' : ''}`}>
          <label>
            <input id="cf-consent" type="checkbox" checked={consent} {...aria('consent')}
              onChange={e => { setConsent(e.target.checked); if (tried) setErrors(check(v, e.target.checked, topic)) }} />
            <span>I agree that Bharat Coal Exchange may use these details to reply to this enquiry.</span>
          </label>
          <p className="msg" id="cf-consent-err" role={errors.consent ? 'alert' : undefined}>{errors.consent || ''}</p>
        </div>
        {errors.form && <p className="fail" role="alert">{errors.form}</p>}
        {state.step === 'failed' && (
          <p className="fail" role="alert">{state.why} You can also write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
        )}
        <button type="submit" className="bx-btn primary send" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
      </form>
      <aside className="side">
        <div className="blk office">
          <span className="eyebrow">Office</span>
          <p className="addr"><MapPin aria-hidden="true" /><span><b>{CONTACT.company}</b>{CONTACT.address}</span></p>
        </div>
        <div className="blk direct">
          <span className="eyebrow">Direct</span>
          {/* each value in its own element, so a phone can show the three as a row of chips (website.css v98) */}
          <a className="ln" href={`mailto:${CONTACT.email}`} title={CONTACT.email}><Mail aria-hidden="true" /><span><b>Email</b><i className="val">{CONTACT.email}</i></span></a>
          {CONTACT.phone && <a className="ln" href={CONTACT.phoneHref} title={CONTACT.phone}><Phone aria-hidden="true" /><span><b>Phone</b><i className="val">{CONTACT.phone}</i></span></a>}
          {CONTACT.linkedin && (
            <a className="ln" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
              <LinkedInIcon aria-hidden="true" /><span><b>LinkedIn</b><i className="val">Bharat Coal Exchange (BCX)</i></span><ArrowUpRight className="go" aria-hidden="true" />
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

/** The one dialog the page mounts; openContact() opens it. A fresh form each time it opens. */
export default function ContactDialog() {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => {
    const on = e => { setTopic(e.detail?.topic || ''); setN(x => x + 1); setOpen(true) }
    window.addEventListener('bx-contact', on)
    return () => window.removeEventListener('bx-contact', on)
  }, [])
  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Write to us" center>
      {close => <ContactForm key={n} topic={topic} close={close} />}
    </Sheet>
  )
}
