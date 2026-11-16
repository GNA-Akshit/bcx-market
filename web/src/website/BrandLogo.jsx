// THE BCX LOGO AS bcx.market DRAWS IT (27 Oct'26, the user's call — "BCX-logo-vector (1).svg"):
// the same geometry and colours — the brand orange #F1885B on "B" and "BHARAT", the brand black
// #1A1A18 — set in Montserrat (self-hosted, like the site's other faces). Drawn inline rather
// than as an <img>, because an SVG in an <img> cannot use the page's fonts and falls back to
// whatever the reader's machine has. The studio keeps its own mark (../Logo.jsx).
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import { useTheme } from './theme.js'

export const BRAND_ORANGE = '#F1885B'
export const BRAND_BLACK = '#1A1A18'
const FACE = "Montserrat, 'Gotham', 'Proxima Nova', 'Helvetica Neue', Arial, sans-serif"

// ON THE DARK THEME "CX", the rule and "COAL EXCHANGE" turn white (5 Nov'26 — the user has permission for
// that, on dark only); "B" and "BHARAT" stay orange. The light site keeps the brand black.
export default function BrandLogo({ dark, className = 'bcx-logo' }) {
  const theme = useTheme()                        // live: a theme switch repaints the logo (website/theme.js)
  const ink = (dark ?? theme === 'dark') ? '#fff' : BRAND_BLACK
  return (
    <svg className={className} viewBox="24 46 718 160" role="img" aria-label="BCX — Bharat Coal Exchange">
      <text x="30" y="195" fontFamily={FACE} fontSize="170" fontWeight="900" letterSpacing="-4">
        <tspan fill={BRAND_ORANGE}>B</tspan><tspan fill={ink}>CX</tspan>
      </text>
      <line x1="450" y1="55" x2="450" y2="198" stroke={ink} strokeWidth="6" strokeLinecap="square" />
      <text x="480" y="88" fontFamily={FACE} fontSize="42" fontWeight="800" letterSpacing="0.5" fill={BRAND_ORANGE}>BHARAT</text>
      <text x="480" y="142" fontFamily={FACE} fontSize="42" fontWeight="800" letterSpacing="0.5" fill={ink}>COAL</text>
      <text x="480" y="196" fontFamily={FACE} fontSize="42" fontWeight="800" letterSpacing="0.5" fill={ink}>EXCHANGE</text>
    </svg>
  )
}
