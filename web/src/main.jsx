// Entry point of the PUBLIC website (/site/). Unlike src/main.jsx it installs no login
// gate: nothing this page calls (/api/website/*) needs a session, and nothing it shows
// comes from ULIP. ADR-0045.
import React from 'react'
import ReactDOM from 'react-dom/client'
import Website from './Website.jsx'
import { getTheme, loadDarkCss } from './website/theme.js'

const render = () => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Website />
  </React.StrictMode>,
)

// A PHONE OPENS THE SITE AT ITS TRUE SIZE (11 Nov'26, "reload pe page fully zoomed in open hota hai, specially
// coal map"). A phone's browser keeps a page's zoom across a reload, and the page used to get zoomed without the
// reader meaning to: iOS zooms in on a quick double tap (the map's + / − pressed twice) and on focusing a text
// box under 16px. website.css "v72" stops both; this lets go of a zoom a reload brought back — a maximum
// scale of 1 for a moment snaps the page to 1, then the reader's own pinch zoom is given back.
const unzoom = () => {
  const vv = window.visualViewport, meta = document.querySelector('meta[name="viewport"]')
  if (!vv || !meta || vv.scale <= 1.01) return
  const was = meta.getAttribute('content')
  meta.setAttribute('content', `${was}, maximum-scale=1`)
  setTimeout(() => meta.setAttribute('content', was), 350)
}
window.addEventListener('pageshow', () => setTimeout(unzoom, 120))
window.addEventListener('load', () => setTimeout(unzoom, 250))

// THE SITE OPENS DARK (flags.THEME): for a dark reader the two dark stylesheets load BEFORE the first paint
// (index.html has already painted the page dark, so there is no white flash); a reader who chose light gets
// them only if they switch (website/theme.js).
if (getTheme() === 'dark') loadDarkCss().then(render, render)
else render()
