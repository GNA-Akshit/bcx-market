// What the public site shows, in one place.
//
// DATA_CENTRE — OFF since 22 Oct'26, at management's request ("a lot of data we wouldn't
// want to show"). The code stays: DataCentre.jsx, SeriesPage.jsx and their tables are
// untouched. Off means: no link to it anywhere (header, footer, Market insights, Research,
// Sources, the chain's panels, a figure's tile), and an old #/explorer or #/data address
// opens Market insights instead. Set true to bring it all back.
export const DATA_CENTRE = false
// NEWSLETTER — LOCAL ONLY (27 Oct'26, THE USER'S STANDING INSTRUCTION). ON on the dev server
// (`vite`, localhost:5173), OFF in EVERY build that ships (`npm run build`: the CI deploy and
// scratch/dev/_ship_frontend.sh) — so "deploy" never takes the newsletter live. It goes live ONLY
// when the user says, in so many words, "deploy newsletter": then put VITE_NEWSLETTER=1 in
// frontend/.env.production (committed), update tests/website/test_newsletter_local_only.py, and
// say so in CLAUDE.md. Never flip this on any other request.
// Off means: no Newsletter in the header, the phone's menu, the hero's doors or the footer; no
// newsletter section on the home page; the coverage card points at Regulations; and an old
// #/newsletter address opens the home page. The code (Newsletters.jsx, the reader, the covers) stays.
export const NEWSLETTER = import.meta.env.DEV || import.meta.env.VITE_NEWSLETTER === '1'

// THE "WRITE TO US" FORM IS LIVE (20 Nov'26, the user: "deploy it"; local only from 18 Nov): every "Write to us" opens
// the form (website/ContactForm.jsx) - its API, POST /api/website/contact, and the two mails from no-reply@bcx.market
// live in libs/website/enquiries.py + mailroom.py. `false` puts every button back to the mailto link it was.
export const CONTACT_FORM = true

// A HOME-PAGE CHANGE OF 18 Nov'26, KEPT LOCAL (19 Nov'26, the user: the next deploy carries ONLY the photo credits on
// hover, the softer light bands of the dark site, the bands' lines removed and their bigger titles). ON on the dev server,
// OFF in every build that ships - there the coal chain stays as it is live:
//   HOME_REGULATIONS - "What's new in coal regulation" in the coal chain's place (Legal.LatestRegulations).
export const HOME_REGULATIONS = import.meta.env.DEV
// VISION_ONCE - the vision statement lit all at once when it comes into view (ui.FillText), not filled word by word with
// the scroll. SHIPPED 19 Nov'26 (pass 95, the user: "deploy … the text highlighting way we changed in the Our vision
// section"); `false` brings the scroll-linked fill back.
export const VISION_ONCE = true

// CAREERS - the openings page (#/jobs, #/jobs/<role>) and its application form with the CV and the ATS behind it
// (website/Jobs.jsx; API backend/app/routes/careers.py; the HR portal is its own page, frontend/hr/, on the console's
// host only). LOCAL ONLY - on the dev server, in NO build that ships (20 Nov'26, the user: "bcx.market has to have no
// career page right now ... i was only setting up the hr dashboard for future"). The HR portal and the careers API are
// deployed and wait for it; taking careers live is this one line (`true`), the guard test, and a /jobs line in
// bcx-website's web/scripts/routes.mjs - and only on the user's word.
export const CAREERS_PORTAL = import.meta.env.DEV
// PATH ADDRESSES — bcx.market/insights, not bcx.market/#/insights (16 Nov'26, website/route.js): on for the
// bcx-website build (VITE_ROUTES=path); off here, where the site is ONE file (/site/index.html) and keeps '#/…'
export const PATH_ROUTES = import.meta.env.VITE_ROUTES === 'path'
// BANDS — one page band for every inner page and the home page's colour rhythm (5 Nov'26, after
// globalCOAL's site; ADR-0045 passes 59–60): Market Insights, News, Regulations and the Newsletter
// reader open on ONE band of one height (352 px, phone 296) with the title on it (its look: BAND,
// below); the vision is a navy band whose statement fills in as it scrolls; the coverage list sits on
// a pale panel; the footer is a cool tint. On the dev server `?before` (…/site/?before#/news) shows the
// site as it was before the pass. A build is always ON; `false` here turns the whole pass off.
export const BANDS = !(import.meta.env.DEV && typeof location !== 'undefined'
  && new URLSearchParams(location.search).has('before'))
// PHONE_COMPACT — Market Insights' charts and tables MADE FOR THE PHONE (10 Nov'26, the user: "ek chart ne pura
// page leliya … graphs and tables abhi bhi bhot badly represented"): a chart card's frame shrinks (a one-line
// title, its date and source on one line under it, no footer), category charts run as horizontal bars, long
// tables become compact rows that open a sheet, rings sit beside their legend, and the coal map's side panel
// is a sheet that peeks over the map. Phone only (≤600px; the root carries `mc`); the desktop is untouched.
// The dev server shows the phone as it was with ?mc=0.
export const PHONE_COMPACT = !(import.meta.env.DEV && typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('mc') === '0')
// BAND — how the page band looks (5 Nov'26, after the warm orange one was turned down):
//   'photo'  the page's own photograph under a deep navy wash, the header solid white above it
//   'navy'   the navy band without a photograph, the header solid white above it
//   'slate'  a light cool blue-grey band the header sits on
// The BCX logo stays orange and black (the user's call), which is why a dark band never runs under
// the header. The dev server tries another with ?band=navy / ?band=slate; a build shows BAND_DEFAULT.
// THEME — the DARK THEME (5 Nov'26: "linear.app jaisa … dark hai but pitch black nahi"), a VISITOR'S CHOICE
// since pass 62 (the user: "include the dark theme toggle too"): the moon / sun button in the header and a
// row in the phone's menu (website/ThemeSwitch.jsx), remembered in this browser; ?theme=dark / ?theme=light
// sets it too. The site opens LIGHT. Dark = website-dark.gen.css (scripts/website/gen_dark_css.mjs) +
// website-dark.css under `.dk` on the site's root, loaded only for a dark reader (site-main.jsx); charts,
// the coal map's ramp and the logo read DARK, once, at load.
export const THEME = (() => {
  if (typeof location === 'undefined') return 'light'
  const q = new URLSearchParams(location.search).get('theme')
  if (q === 'dark' || q === 'light') { try { localStorage.setItem('bx-theme', q) } catch { /* private mode */ } return q }
  // THE SITE OPENS DARK (5 Nov'26, pass 63, the user: "landing page by default dark rahega, light mode me
  // jisko change karna ho wo kar lega") — only a reader who chose light gets light
  try { return localStorage.getItem('bx-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
})()
// THEME is only the theme a page OPENS in. Since pass 64 a switch is live and instant, so nothing reads a
// load-time constant: components use website/theme.js useTheme(), and the old `DARK` export is gone.
// HERO_CTA — how the hero's Market Insights button looks (5 Nov'26; navy and a pale cool tint were both
// turned down: "bhot zyada hi blue", then "ye bhi achha nahi"). The ask: it must look CLICKABLE on its
// own — colour optional. 'card' (an orange tile whose chart draws itself in, an arrow that moves),
// 'outline' (orange outline) or 'ink' (the headline's ink); the dev server tries them with ?cta=.
// (HERO_ART, 10 Nov'26, is gone with the try-out: the hero is the photograph — full bleed on a desktop, a
// banner on a phone, Hero.jsx; a drawn map, a grid and ten other phone variants were turned down.)
const HERO_CTA_DEFAULT = 'card'
export const HERO_CTA = (() => {
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const c = new URLSearchParams(location.search).get('cta')
    if (['card', 'outline', 'ink'].includes(c)) return c
  }
  return HERO_CTA_DEFAULT
})()
//   'light'  THE DEFAULT since 5 Nov'26 — the page's photograph under a WHITE wash with black words, and on
//            the dark theme the same band turned dark with light words: the heads follow the theme and carry
//            no blue ("blue utna achha nahi lag raha … light mode me black ka contrast, dark mode me light ka")
// …and then the other way round, the user's final call the same day: the band CONTRASTS with its page —
// CHARCOAL with white words on the light site, LIGHT with black words on the dark theme — so 'photo'
// (now under charcoal, not navy) is the default again; 'light' is kept for comparison
const BAND_DEFAULT = 'photo'
export const BAND = (() => {
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const b = new URLSearchParams(location.search).get('band')
    if (['light', 'photo', 'navy', 'slate'].includes(b)) return b
  }
  return BAND_DEFAULT
})()
// PAGE_PHOTOS — the photographs BEHIND things (19 Nov'26, the user: "remove all the images apart from the one which
// is here right now — Shaping the future of coal trading in India … instead of the images we can make the background
// colour gradually shifting from one end to another (not animation, just a gradient)"). Off: the page bands (Market
// Insights, News, Regulations, the Newsletter), Market Snapshot ("India's coal market, in public data.") and
// the Contact card are each a still gradient, cool at one end and warm at the other (website-bands.css `.flat`). Kept:
// the home hero's photograph and the coal chain's (India's coal industry, mine to plant). `true` brings every photo
// back; the dev server shows them with ?photos.
export const PAGE_PHOTOS = import.meta.env.DEV && typeof location !== 'undefined'
  && new URLSearchParams(location.search).has('photos')
