// BCX's own words — the approved copy from bcx.market (the BCX company site), kept here
// as data so the landing page has ONE place it says who BCX is. Reviewers signed off on
// this content; edit it here, not inline in the components. Captured 16 Oct'26.
//
// One discrepancy is carried as-is and should be settled by BCX, not by us: the About
// block says "₹50 Cr+ initial investment", while three of the four press pieces report
// ₹100 crore committed. Both can be true; the site prints the approved figure.

// 22 Oct'26: the hero, About, Vision, Mission, Principles and Careers copy below was replaced
// line for line from BCX's own "BCX_webpage changes" document (language before → after).
// Headings keep the site's sentence case; the words are the document's.
export const HERO = {
  // NO PARENT COMPANY ON THE SITE (16 Nov'26, the user: "remove the details about gna energy … from the home page and
  // the link of gna energy in the footer"): the hero's "An initiative by GNA Energy" pill is off while org is null
  pill: 'An initiative by',
  org: null,
  orgUrl: null,
  title: ['Shaping the future of ', 'coal trading in India'],
  lede: 'Bharat Coal Exchange (BCX) is shaping the future of coal trading in India through a transparent, efficient and technology-driven marketplace.',
}

export const ABOUT = {
  title: ['Redefining the ', 'coal ecosystem'],
  stats: [['₹50 Cr+', 'Initial investment'], ['Screen-based', 'Digital marketplace']],
  body: [
    'Designed as a technology-driven marketplace, Bharat Coal Exchange (BCX) aims to introduce greater transparency, efficiency and credible price discovery to India’s coal market by bringing buyers and sellers together through a secure, screen-based trading platform.',
    // "As an initiative of GNA Energy," dropped (16 Nov'26, the user) — the rest of the document's sentence stands
    'Bharat Coal Exchange (BCX) draws on extensive expertise in energy markets and technology-driven solutions to develop a transparent, accessible and scalable digital marketplace for coal trading in India.',
  ],
}

export const VISION = {
  statement: 'To establish Bharat Coal Exchange (BCX) as a trusted, transparent and technology-driven coal exchange, setting new standards in fair price discovery, market efficiency and integrity while contributing to the development of an organised and competitive coal market in India.',
  pillars: [
    ['Market integrity', 'Promoting transparency, fair competition and regulatory compliance.'],
    ['Digital innovation', 'Enabling efficient trading through secure, technology-driven market infrastructure.'],
    ['National impact', 'Supporting India’s energy security through an organised and efficient coal market.'],
  ],
}

// [heading, what it means]
export const MISSION = [
  ['Establish a transparent and technology-driven coal marketplace',
    'Develop a secure, regulated and screen-based platform for efficient trading of standardised, delivery-based coal contracts.'],
  ['Enable fair and competitive price discovery',
    'Promote transparent pricing and fair market participation through standardised contracts and approved trading mechanisms.'],
  ['Simplify coal trading and strengthen transaction confidence',
    'Facilitate efficient trading, clearing and settlement, independent quality verification and structured post-trade processes.'],
  ['Connect India’s coal market participants',
    'Bring together coal producers, buyers, sellers and traders through an accessible, neutral and integrated digital marketplace.'],
  ['Promote market transparency and informed decision-making',
    'Provide relevant coal market intelligence, research, analytics and logistics-related information to support better commercial decisions.'],
  ['Uphold market integrity and regulatory compliance',
    'Build trust through robust governance, market surveillance, risk management and secure digital infrastructure.'],
  ['Support India’s energy security and Viksit Bharat vision',
    'Contribute to the development of an organised, competitive and efficient coal market through modern market infrastructure and digital innovation.'],
]

export const PRINCIPLES = [
  ['Transparency', 'Promoting fair and competitive price discovery through standardised contracts, transparent trading mechanisms and access to reliable market information.'],
  ['Efficiency', 'Facilitating seamless coal trading through streamlined digital processes, efficient clearing and settlement, and structured post-trade mechanisms.'],
  ['Innovation', 'Leveraging advanced technology, market intelligence and digital solutions to modernise coal trading and support informed decision-making.'],
  ['Trust', 'Building confidence through strong governance, secure infrastructure, independent quality verification and robust regulatory compliance.'],
]

// `date` is the publisher's own, read from the article on 19 Oct'26 (its published-time tag,
// or the date printed on it). Moneycontrol refuses automated readers, so its story carries
// no date rather than a guessed one — add it here if someone reads it off the page.
export const NEWS = [
  { outlet: 'Moneycontrol', headline: 'GNA Energy to invest Rs 100 crore in coal exchange venture, sets up new subsidiary',
    summary: 'GNA Energy has set up a wholly owned subsidiary, Bharat Coal Exchange, to enter India’s coal trading sector. The Gurugram-based power trading firm will commit an initial ₹100 crore to build the exchange.',
    url: 'https://www.moneycontrol.com/news/business/gna-energy-to-invest-rs-100-crore-in-coal-exchange-venture-sets-up-new-subsidiary-13891530.html' },
  { outlet: 'ET EnergyWorld', date: '2026-04-17', headline: 'GNA Energy invests ₹100 crore in Bharat Coal Exchange',
    summary: 'The company confirms MCA approval for its new coal exchange entity and outlines plans for a transparent, technology-driven marketplace. BCX marks GNA Energy’s expansion into commodity market infrastructure.',
    url: 'https://energy.economictimes.indiatimes.com/news/coal/gna-energy-invests-100-crore-in-bharat-coal-exchange/130324060' },
  { outlet: 'Energetica India', date: '2026-04-18', headline: 'GNA Energy enters coal exchange market, commits INR 100 crore to BCX launch',
    summary: 'GNA Energy enters the coal exchange segment through its subsidiary BCX, aiming to enhance transparency and digital trading in India’s coal market.',
    url: 'https://www.energetica-india.net/news/gna-energy-enters-coal-exchange-market-commits-inr-100-crore-to-bcx-launch' },
  { outlet: 'FinTech BizNews', date: '2026-04-17', headline: 'GNA Energy launches BCX',
    summary: 'BCX is being built to create the infrastructure, technology, and institutional partnerships for a coal exchange serving domestic and global participants.',
    url: 'https://www.fintechbiznews.com/exchanges-capital/gna-energy-launches-bcx' },
]

export const CAREERS = {
  title: 'Build what’s next',
  intro: 'At Bharat Coal Exchange, we’re building more than a digital platform — we’re shaping the future of coal markets in India.',
  // [heading, line] — four cards, as the changes document suggests; the first line's
  // "one of India's most ambitious commodity market platforms" became the document's wording
  reasons: [
    ['Be part of a new beginning', 'Work on India’s emerging regulated coal exchange ecosystem'],
    ['Make a meaningful impact', 'Solve real-world challenges at the intersection of technology and energy'],
    ['Collaborate with industry experts', 'Collaborate with experts across technology and energy markets'],
    ['Innovate and grow', 'Grow in an environment that values innovation, ownership, and continuous learning'],
  ],
  note: 'As we continue to build our platform, new career opportunities will be posted here.',
}

// LATEST REGULATIONS (#/legal/regulations) — the law BCX works under, as its issuers publish
// it. Every entry was checked against the issuer's own copy on REG_CHECKED: `title` is the
// issuer's title (or, for an untitled notification, says what it does in its own words),
// `ref` is the reference printed on the document, `url` is the issuer's own file. A `note`
// states only what the document itself says — no reading of it. Nothing here is hosted by
// BCX: each link opens the official copy, so an amendment is never stale on our page.
// To add one: read the issuer's file first, then add it newest-first in its group.
export const REG_CHECKED = '2026-10-22'

// 22 Oct'26, at management's request: the coal-exchange registration notices (the Authority's
// appointment, the 2025 draft rules), the draft Colliery Control amendment and the power-market
// group are no longer listed; the MMDR Act as amended in 2025 is.
export const REG_GROUPS = [
  ['exchange', 'The coal exchange'],
  ['coal', 'Coal mining & supply'],
]

export const REGULATIONS = [
  { group: 'exchange', date: '2026-07-27', kind: 'Notice', issuer: 'Ministry of Coal',
    title: 'Empanelment of TPAs for Collection, Preparation, Analysis and Documentation of Samples of Coal or its Processed Form for Coal Traded through Coal Exchange',
    url: 'https://coal.gov.in/sites/default/files/2026-07/27-07-2026a-wn.pdf', file: 'PDF' },
  { group: 'exchange', date: '2026-06-04', kind: 'Rules', status: 'In force', issuer: 'Ministry of Coal', ref: 'G.S.R. 442(E)',
    title: 'Coal Exchange Rules, 2026',
    note: 'Made under section 18B of the Mines and Minerals (Development and Regulation) Act, 1957. In force from their publication in the Gazette of India.',
    url: 'https://coal.gov.in/sites/default/files/2026-06/09-06-2026a-wn.pdf', file: 'PDF' },
  { group: 'exchange', date: '2025-11-20', kind: 'Act', status: 'In force', issuer: 'Ministry of Mines', ref: 'Act No. 67 of 1957, as amended by Act 28 of 2025',
    title: 'The Mines and Minerals (Development and Regulation) Act, 1957 — as amended up to 20 November 2025',
    note: 'Includes the Mines and Minerals (Development and Regulation) Amendment Act, 2025 (28 of 2025), in force from 1 September 2025: section 3(af) defines a mineral exchange, and section 18B provides for the development of a market for minerals through mineral exchanges.',
    url: 'https://ibm.gov.in/writereaddata/files/177132272469943d64d720dMMDR_Act_1957_as_amended_upto_20.11.2025.pdf', file: 'PDF' },
  { group: 'coal', date: '2026-08-10', kind: 'Rules', status: 'Notified', issuer: 'Ministry of Coal',
    title: 'Colliery Control (Amendment) Rules, 2026',
    url: 'https://coal.gov.in/sites/default/files/2026-08/10-08-2026a-wn.pdf', file: 'PDF' },
  { group: 'coal', date: '2025-05-07', kind: 'Policy', status: 'Approved', issuer: 'Ministry of Coal', ref: 'Cabinet Committee on Economic Affairs',
    title: 'Revised SHAKTI (Scheme for Harnessing and Allocating Koyala Transparently in India) Policy for Coal Allocation to Power Sector',
    note: 'Coal linkages for power plants through two windows: at the notified price, and at a premium above it by auction.',
    url: 'https://www.coal.gov.in/sites/default/files/2025-05/PIB2127409.pdf', file: 'PDF' },
]

// where each issuer lists everything it publishes
export const REG_SOURCES = [
  ['Ministry of Coal — every notification', 'https://coal.gov.in/whats-new'],
]

export const CONTACT = {
  title: 'We’d love to hear from you.',
  lede: 'Reach out to us for any inquiries regarding partnerships or platform access.',
  company: 'Bharat Coal Exchange Private Limited',
  // the office, in full (16 Nov'26, the user's)
  address: '7007, The Palm Spring Plaza, Golf Course Rd, DLF Phase 5, Sector 54, Gurugram, Haryana 122009',
  email: 'info@bcx.market',
  // 16 Nov'26, the user's: the phone is a card of the Contact section (a tap dials it on a phone), and connect@ is the
  // footer's address — info@ stays the address for enquiries (the section's button and its Enquiries card)
  phone: '+91 97737 93575',
  phoneHref: 'tel:+919773793575',
  connect: 'connect@bcx.market',
  tagline: 'Shaping the future of coal trading in India',
  // BCX's company page (27 Oct'26, the user's link, its tracking parameter dropped)
  linkedin: 'https://www.linkedin.com/company/bharat-coal-exchange-bcx/',
}
