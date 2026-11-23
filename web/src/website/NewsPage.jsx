// NEWS & MEDIA (#/news) — BCX in the press, as a page of its own.
//
// The home page used to carry a strip of outlet names ("Moneycontrol · ET EnergyWorld …")
// that said nothing until clicked, and a news block in the middle of the company story.
// Here every story is a card with its outlet, its date, its headline and summary, and the
// whole card opens the story on the publisher's own site. Newest first; dates are the
// publishers' own (content.js), and a story whose date could not be read shows none.
//
// A PHONE READS THE STORIES FIRST (23 Oct'26): the media-enquiries card sat between the title
// and the first story; on a phone it follows the stories. The note about BCX's own notices
// points into the register, so it is shown only when the register is (Legal.SHOW_REGISTER).
import { ArrowUpRight, ChevronRight, Mail, ScrollText } from 'lucide-react'
import { CONTACT, NEWS } from './content.js'
import { openContact } from './ContactForm.jsx'
import { SHOW_REGISTER } from './Legal.jsx'
import { PageBand, usePhone } from './ui.jsx'
import { BANDS, CONTACT_FORM } from './flags.js'
import { PHOTOS } from './media.jsx'

const longDate = s => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
// newest first; a story without a date goes last (sort is stable, so same-day stories keep their order)
const STORIES = [...NEWS].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

// THE MEDIA-ENQUIRIES CARD IS OFF (23 Nov'26, the user: "remove the write to us from Media enquiries"); `true` brings it
// back, form and mailto twin with it
export const SHOW_MEDIA = false

const Media = () => (
  <aside className="bx-nw-media">
    <span className="k">Media enquiries</span>
    <p>For interviews, statements or information about BCX, write to us.</p>
    {/* the form, open on Media and press (18 Nov'26 — a form, not a mailto); local only (flags.CONTACT_FORM) */}
    {CONTACT_FORM
      ? <button type="button" className="bx-btn primary" onClick={() => openContact('media')}><Mail /> Write to us</button>
      : <a className="bx-btn primary" href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Media enquiry')}`}><Mail /> {CONTACT.email}</a>}
  </aside>
)

export default function NewsPage() {
  const phone = usePhone()
  // the navy band (flags.BANDS): the title alone on the band, the media card after the stories
  const mediaAfter = SHOW_MEDIA && (BANDS || phone)
  return (
    <div className={`bx-newsroom${BANDS ? ' v-band' : ''}`}>
      {BANDS ? (
        // the band's line under the title went (19 Nov'26, the user)
        <PageBand crumb="News" title={<>BCX <em>in the news</em></>} photo={PHOTOS.newsCoalWagons} />
      ) : (
      <section className="bx-nw-hero">
        <div className="wrap in">
          <div className="t">
            <nav className="bx-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><ChevronRight /><span>News</span></nav>
            <span className="eyebrow">News &amp; media</span>
            <h1>BCX <em>in the news</em></h1>
            <p className="lede">Coverage of Bharat Coal Exchange in the press.</p>
          </div>
          {SHOW_MEDIA && !phone && <Media />}
        </div>
      </section>
      )}

      <section className="bx-nw-list">
        <div className="wrap">
          <div className="bx-nw-grid bx-reveal">
            {STORIES.map(n => (
              <a key={n.url} className="bx-nw-card" href={n.url} target="_blank" rel="noreferrer">
                <span className="top">
                  <span className="outlet">{n.outlet}</span>
                  {n.date && <time dateTime={n.date}>{longDate(n.date)}</time>}
                </span>
                <h2>{n.headline}</h2>
                <p>{n.summary}</p>
                <span className="bx-link">Read on {n.outlet} <ArrowUpRight /></span>
              </a>
            ))}
          </div>
          {mediaAfter && <Media />}
          {SHOW_REGISTER && (
            <p className="bx-nw-note"><ScrollText />BCX&rsquo;s own announcements will be published under{' '}
              <a href="#/legal/notices">Legal &amp; documents → Public notices</a> once BCX opens.</p>
          )}
        </div>
      </section>
    </div>
  )
}
