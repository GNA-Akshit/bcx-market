// The India coal map's engine (Market insights → Coal map). Leaflet with NO tile basemap:
// India and its states are drawn from the Survey of India outline (via DataMeet), because
// common tile basemaps do not draw India's boundary as the Survey of India does.
//
// FOUR LAYERS, each its own job:
//   * STATES — the land itself, a quiet coral choropleth of the chosen measure. A state
//     LIFTS like a tile under the pointer (raised, shadowed, outlined in navy); a click
//     flies to it and lets the others fall back;
//   * THERMAL PLANTS — navy discs sized by the measure; CEA's "critical" flag is a red ring;
//   * COAL MINES — the register and Coal India's flagship mines, grouped by zoom (cluster.js):
//     a group splits by sending its mines out from where it stood;
//   * COAL COMPANIES — one marker per subsidiary, where its mines are.
// ZOOM: double-click zooms in (Shift + double-click out), the + / − / India / full-screen
// buttons, Ctrl/⌘ + wheel or a pinch. A PLAIN wheel scrolls the page — except in full
// screen, where there is no page to scroll and the wheel zooms.
// Everything that moves stops under prefers-reduced-motion.
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import india from '../mines/geo/india.json'
import states from '../mines/geo/states.json'
import { Z_LOCAL, Z_NATIONAL, discSize, fan, group, groupSize, band, hull, placeBoxes, relax } from '../mines/cluster.js'

export const INDIA = [[6.5, 68.0], [35.8, 97.5]]
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// A TOUCH SCREEN HAS NO HOVER (10 Nov'26, the user on a phone: the hover cards and names "sab cover kar le
// rahe hain", and a tap on one state lit ANOTHER's border). A tap fires emulated mouseover/mouseout, so
// every hover behaviour — a state's outline, the floating card, a marker's name — fired on taps and stayed.
// On touch: no hover at all; a tap SELECTS, and the breadcrumb and the rail say what was chosen; names show
// for the selected mine only; every marker gets a finger-sized target (website.css).
const touch = () => !!window.matchMedia?.('(pointer: coarse)').matches
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
// A LABEL'S WIDTH, MEASURED AS TEXT (v88): the label's own font (read once, from the first label) on a canvas, plus its
// 6 px padding each side — what offsetWidth gave, without asking the page for a layout. The font is read again once
// the web fonts have loaded, so names measured against a fallback are not kept.
let labelCtx = null, labelFont = null
if (typeof document !== 'undefined') document.fonts?.ready?.then(() => { labelFont = null })
function labelWidth(el) {
  if (!el) return 60
  if (!labelCtx) labelCtx = document.createElement('canvas').getContext('2d')
  if (!labelFont) { const cs = getComputedStyle(el); labelFont = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}` }
  labelCtx.font = labelFont
  return Math.ceil(labelCtx.measureText(el.textContent || '').width) + 12
}
// a fit's margins — `inset` more at the foot where something covers the map there (the phone's sheet, 10 Nov'26)
let inset = 0
const fitPad = (p = 28) => ({ paddingTopLeft: [p, p], paddingBottomRight: [p, p + inset] })
// a plant's drawn size grows with the zoom, so a close look is not a crowd of dots
const zk = z => Math.max(0.72, Math.min(1.45, 0.72 + (z - 4.6) * 0.17))

// a PICKED flagship disc (a major-mines set chosen) is drawn smaller while all of India is in view, where 35 or
// 75 of them share the coal belt; from the national regime up it is its full size
const pickScale = z => (z < 4.5 ? 0.5 : z < 5.25 ? 0.66 : z < Z_NATIONAL ? 0.82 : 1)
const minePx = (p, z) => (p.flagship ? Math.round(discSize(p.flagship.ytd_actual_mt) * (p.pick ? pickScale(z) : 1)) : 9)

function mineHtml(g, z) {
  const ms = g.members
  if (ms.length > 1) {
    // with a major-mines set chosen the group is the REST of the register: it does not count flagship mines
    const flag = ms.every(p => p.dim) ? 0 : ms.filter(p => p.flagship).length
    const s = groupSize(ms.length)
    // "flagship" was our word; Coal India's report calls them its MAJOR mines (pass 79)
    return { size: s, body: `<span class="cm-c" style="width:${s}px;height:${s}px"><b>${ms.length}</b><small>${flag ? `${flag} major` : 'mines'}</small></span>` }
  }
  const p = ms[0]
  const label = `<em class="cm-label">${esc(p.short)}</em>`
  if (p.flagship) {
    const s = minePx(p, z)
    const pct = Math.max(0, Math.min(100, p.flagship.achieved_pct || 0))
    return { size: s, body: `<span class="cm-f b-${band(p.flagship.achieved_pct).key}" style="--s:${s}px;--p:${pct}"><i></i></span>${label}` }
  }
  return { size: 9, body: `<span class="cm-d st-${p.stage}"></span>${label}` }
}

/** Props
 *  fills      Map(state name -> colour | null)  — null = no plants reported (hatched)
 *  plants     [{id, name, short, lat, lon, px, critical}]  ([] when the layer is off)
 *  mines      [atlas points]                               ([] when the layer is off)
 *  companies  [{id, code, lat, lon, pct, txt}]             ([] when the layer is off)
 *  selected   {kind: 'state'|'plant'|'mine'|'company', id} | null
 *  onSelect, onHover({kind,id,x,y,r} | null), focus ({kind:'india'|'state'|'points', …, at}),
 *  zoomEl / readout (element refs the zoom and the cursor position are WRITTEN into — never
 *  React state, so neither a zoom nor a mouse move re-renders anything), onHint(), api (ref),
 *  freeWheel, bottomInset (px of the stage's foot something covers: every fit keeps clear of it),
 *  onDrill([n, …]) — the mine clusters opened, in order, each by its size (the crumb's trail back) */
export default function Engine({ fills, plants, mines, companies, selected, onSelect, onBackground, onHover, focus, zoomEl, readout, onHint, api, freeWheel, bottomInset = 0, onDrill }) {
  inset = bottomInset
  const el = useRef(null)
  const map = useRef(null)
  const L_ = useRef({})                   // layers
  const stateLayers = useRef(new Map())   // state name -> path layer(s)
  const plantMk = useRef(new Map())       // plant id -> { marker, p }
  const mineLive = useRef(new Map())      // group id -> { marker, members:Set, latlng }
  const coMk = useRef(new Map())
  const last = useRef({})
  const openRef = useRef(null)            // a clicked mine cluster: {ids opened, frozen: the other clusters as they stood}
  const clickZoom = useRef(false)         // the zoom under way is a cluster click's own flight
  const clickZoomT = useRef(0)
  const live = useRef({})
  // still showing all of India (not moved by the reader, not flown to a state): a resize then
  // re-fits India — the stage settles its size after the first fit, which left India off-centre
  const atIndia = useRef(true)
  // THE WAY BACK THROUGH THE CLUSTERS (13 Nov'26, pass 79, the user: "there is no way to go just back to the
  // first separation"): every cluster click records where the map stood before it — its view and which
  // clusters were open — so the crumb can step back one level, or to any level, instead of only to India
  const drill = useRef([])                // [{ n, from: { center, zoom, open } }]
  live.current = { fills, plants, mines, companies, selected, onSelect, onBackground, onHover, freeWheel, onDrill }

  // ------------------------------------------------------------------ the base map
  useEffect(() => {
    const motion = !reduced()
    const m = L.map(el.current, {
      zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 110, wheelDebounceTime: 30,
      // with the foot covered (inset) the view must reach further south, or the bounds pull India back under the cover
      minZoom: 3, maxZoom: 12, maxBounds: [[inset ? -32 : -2, 55], [44, 112]], maxBoundsViscosity: 0.85,
      // NO DOUBLE-CLICK ZOOM (pass 79): telling a click from the first half of a double-click held every state
      // click back 240 ms before anything moved — the "friction". A click selects at once; + / −, Ctrl/⌘ + wheel
      // and a pinch zoom
      fadeAnimation: motion, zoomAnimation: motion, markerZoomAnimation: motion, doubleClickZoom: false,
    })
    // THE PICTURE REACHES PAST THE FRAME (5 Nov'26, "spam clicks karta hu toh glitchy"). Leaflet draws each
    // vector pane over the view plus 10% each side, and a zoom OUT shows that picture SHRUNK until the zoom
    // ends: a run of "−" clicks left up to half the stage bare (_probe_map_spam2.py, 51% covered). Half a
    // view each side covers a whole 0.75-level step out; every pane's renderer is made here, so all get it.
    // A PHONE paints that picture at 3× its pixels, so it draws less past the frame (0.35 still covers a
    // 0.6-level pinch out) and re-projects a flight less often (below) — "coal map laggy on the phone"
    const coarse = touch()
    // ONE PRECISION ON EVERY SCREEN (16 Nov'26, the user on a phone: "the boundaries look vague"). A phone drew the outlines
    // simplified to 2 px (pass 82) — but each state is simplified ON ITS OWN, so two neighbours stopped sharing one border:
    // dark slivers and doubled, jagged edges between them, worst once zoomed in. The 1 px a desktop uses keeps them shared.
    // (Was: a phone draws the outlines simplified to 2 px (Leaflet's default 1): invisible on its small, dense screen, and
    // every re-projection and repaint of a glide is that much cheaper (pass 82).)
    const simplify = 1
    const makeRenderer = m._createRenderer.bind(m)
    m._createRenderer = o => makeRenderer({ ...o, padding: coarse ? 0.35 : 0.5 })
    // states 300 · the hover and selection outlines 340 (never catch the pointer) · coast 360
    for (const [name, z] of [['states', 300], ['hl', 340], ['coast', 360], ['spokes', 380]]) m.createPane(name).style.zIndex = z
    m.getPane('coast').style.pointerEvents = 'none'
    m.getPane('hl').style.pointerEvents = 'none'
    const hl = L.layerGroup().addTo(m)        // the hovered state's outline
    const sl = L.layerGroup().addTo(m)        // the selected state's outline
    const outline = (name, cls) => L.geoJSON({ type: 'FeatureCollection', features: features.get(name) || [] }, {
      pane: 'hl', interactive: false, smoothFactor: simplify,
      style: () => ({ className: cls, weight: cls.includes('halo') ? 6 : 1.7, color: '#1b3a63', opacity: 1, lineJoin: 'round',
        fill: cls.includes('halo'), fillColor: '#1b3a63', fillOpacity: cls.includes('halo') ? 0.06 : 0 }),
    })
    const features = new Map()
    // HOVER INTENT. The pointer has to rest on a state for a beat before it lights — so a
    // sweep across the map does not flash every state it crosses — and once something is lit,
    // the light passes straight to the next state. The state itself never moves or re-orders:
    // its outline is drawn on its own layer ABOVE it, so a neighbour is never covered.
    let inT = 0, outT = 0, lit = null, at = null
    const light = name => {
      if (lit === name) return
      hl.clearLayers()
      if (live.current.selected?.kind !== 'state' || live.current.selected.id !== name) {
        outline(name, 'cm-hl-halo').addTo(hl)
        outline(name, 'cm-hl').addTo(hl)
      }
      lit = name
      if (at) live.current.onHover?.({ kind: 'state', id: name, x: at.x, y: at.y, r: 0, follow: true })
    }
    const unlight = () => { hl.clearLayers(); lit = null; live.current.onHover?.(null) }
    // a state lit FROM THE PANEL (a row of its by-state list under the pointer): the outline only — no card, the
    // pointer is not on the map
    const railLight = name => {
      clearTimeout(inT); clearTimeout(outT)
      hl.clearLayers(); lit = null
      if (!name || (live.current.selected?.kind === 'state' && live.current.selected.id === name) || !features.has(name)) return
      outline(name, 'cm-hl-halo').addTo(hl)
      outline(name, 'cm-hl').addTo(hl)
      lit = name
    }
    // states: the land itself. A click selects AT ONCE (no double-click zoom to wait for, pass 79)
    let stateHit = 0
    const statesLayer = L.geoJSON(states, {
      pane: 'states', smoothFactor: simplify,
      style: () => ({ className: 'cm-state', weight: 0.8, color: '#ffffff', opacity: 1, fillOpacity: 1, fillColor: '#e9edf2' }),
      onEachFeature: (f, layer) => {
        const name = f.properties.ST_NM
        if (!stateLayers.current.has(name)) stateLayers.current.set(name, [])
        stateLayers.current.get(name).push(layer)
        if (!features.has(name)) features.set(name, [])
        features.get(name).push(f)
        if (!touch()) {
          layer.on('mouseover', e => {
            clearTimeout(outT); clearTimeout(inT)
            at = m.mouseEventToContainerPoint(e.originalEvent)
            inT = setTimeout(() => light(name), lit ? 80 : 180)
          })
          layer.on('mousemove', e => {
            at = m.mouseEventToContainerPoint(e.originalEvent)
            if (lit === name) live.current.onHover?.({ kind: 'state', id: name, x: at.x, y: at.y, r: 0, follow: true })
          })
          layer.on('mouseout', () => { clearTimeout(inT); outT = setTimeout(unlight, 130) })
        }
        layer.on('click', () => {
          stateHit = Date.now()
          live.current.onSelect({ kind: 'state', id: name })
        })
      },
    }).addTo(m)
    L_.current.outline = outline
    L_.current.sl = sl
    L_.current.unlight = () => { clearTimeout(inT); unlight() }
    L_.current.railLight = railLight
    // the coastline, drawn above the states and tracing itself in on load
    L.geoJSON(india, { pane: 'coast', interactive: false, smoothFactor: simplify, style: { className: 'cm-coast', weight: 1.3, fill: false } }).addTo(m)
    L_.current = { ...L_.current, states: statesLayer, spokes: L.layerGroup([], { pane: 'spokes' }).addTo(m),
      leaders: L.layerGroup([], { pane: 'spokes' }).addTo(m), hulls: L.layerGroup().addTo(m) }

    m.fitBounds(INDIA, { animate: false, ...fitPad() })
    m.on('dragstart', () => { atIndia.current = false })
    m.getContainer().addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) atIndia.current = false }, { passive: true })
    m.setMinZoom(Math.min(4.25, m.getZoom() - 0.25))
    // the coast traces itself in, in shares of the path (pathLength="1") — a pixel length
    // measured at India's zoom left gaps in the coast once the reader zoomed in (see .cm-sel)
    for (const path of el.current.querySelectorAll('.cm-coast')) {
      path.setAttribute('pathLength', '1')
      path.style.setProperty('--len', '1')
    }
    // the states rise in west to east
    const xs = []
    stateLayers.current.forEach(ls => ls.forEach(l => xs.push(l.getBounds().getCenter().lng)))
    const x0 = Math.min(...xs), span = Math.max(1, Math.max(...xs) - x0)
    stateLayers.current.forEach(ls => ls.forEach(l => l._path?.style.setProperty('--dl', `${Math.round(((l.getBounds().getCenter().lng - x0) / span) * 520)}ms`)))
    // "no plants reported" is a hatch, never the palest step of the ramp: its pattern lives in
    // the states' own <svg>
    const svg = m.getPane('states').querySelector('svg')
    if (svg && !svg.querySelector('#cm-hatch')) {
      const ns = 'http://www.w3.org/2000/svg'
      const defs = document.createElementNS(ns, 'defs')
      const pat = document.createElementNS(ns, 'pattern')
      for (const [k, v] of [['id', 'cm-hatch'], ['width', '6'], ['height', '6'], ['patternUnits', 'userSpaceOnUse'], ['patternTransform', 'rotate(45)']]) pat.setAttribute(k, v)
      const bg = document.createElementNS(ns, 'rect')
      for (const [k, v] of [['width', '6'], ['height', '6'], ['fill', '#eef1f5']]) bg.setAttribute(k, v)
      const ln = document.createElementNS(ns, 'line')
      for (const [k, v] of [['x1', '0'], ['y1', '0'], ['x2', '0'], ['y2', '6'], ['stroke', '#d3d9e1'], ['stroke-width', '2.2']]) ln.setAttribute(k, v)
      pat.append(bg, ln)
      defs.appendChild(pat)
      svg.insertBefore(defs, svg.firstChild)
    }
    map.current = m
    if (import.meta.env.DEV) window.__coalMap = m

    // KEEP THE MAP DRAWN DURING A FLIGHT (5 Nov'26, the user: "jaldi jaldi click karo toh map white ho
    // jata hai, un-even lines ban jati hai"). Leaflet re-projects its vector layers only when a move
    // ENDS; in between it stretches the last picture with a CSS scale. A click on another state
    // mid-flight cancels the flight before it ends, so a run of clicks kept ONE stretched picture for
    // seconds — every border, the coast and the selection outline 3–6× their width, and a flight that
    // zoomed OUT shrank the picture and left the stage bare. Re-projecting every pane takes 4–12 ms
    // (_probe_map_redraw_cost.py), so while the zoom changes frame by frame (a flight, a pinch) it is
    // done at most every 90 ms. A CSS zoom (wheel, buttons) is left to Leaflet: it redraws at its end.
    // what one re-projection has been costing, smoothed — it sets how often a glide can afford one
    let drawCost = coarse ? 16 : 4
    const redrawNow = () => {
      const t = performance.now()
      for (const r of Object.values(m._paneRenderers || {})) r._reset?.()
      drawCost = drawCost * 0.7 + (performance.now() - t) * 0.3
    }
    let lastDraw = 0, lastDrawZ = null
    const every = coarse ? 150 : 90                    // a phone's re-projection costs ~4× a desktop's
    m.on('zoom', () => {
      if (m._animatingZoom) return
      const now = performance.now(), z = m.getZoom()
      // A GLIDE IS REDRAWN AS OFTEN AS THE MACHINE AFFORDS (pass 79): every frame while a re-projection costs
      // under ~6 ms (a laptop, ~4 ms — _cm_redraw_cost.py), else about one frame in three. Redrawn every 90 ms, the
      // picture stretched — borders thickening — between redraws and snapped back at each: the "friction".
      // A PHONE REDRAWS BY DISTANCE, NOT TIME (pass 82, "on the phone it is still very slow"): at a phone's speed
      // every frame of a glide already took 60–100 ms (_cm_phone_perf.py, CPU 4x), and a 15–20 ms redraw in most of
      // them left ~8 frames for 0.6 s. It redraws once the zoom has moved half a level since the last redraw —
      // 3–4 crisp pictures a glide, the borders never more than ~1.4x their width in between.
      if (gl && coarse) {
        // every 0.3 of a level (16 Nov'26 — every 0.5 stretched the picture to 1.4x between redraws: soft, thick borders
        // mid-move, "the boundaries look vague"); 0.3 keeps it under 1.25x, at five or six redraws a glide
        if (lastDrawZ != null && Math.abs(z - lastDrawZ) < 0.3) return
      } else {
        const gap = gl ? (drawCost < 6 ? 0 : Math.min(60, drawCost * 3)) : every
        if (now - lastDraw < gap) return
      }
      lastDraw = now; lastDrawZ = z
      redrawNow()
    })
    L_.current.redraw = redrawNow

    // THE GLIDE (13 Nov'26, pass 79 — "the way it zooms into it is super slow looking … a lot of friction"). Leaflet's
    // flyTo draws a van Wijk arc: it zooms OUT before it zooms in, over a second, so a click on a state first
    // pulled India away and then crept in. A glide is the straight move instead — the zoom eased in and out,
    // the centre moving so the point that stays put on screen is the one a pinch would hold (the view's fixed
    // point) — in 0.6 s. Leaflet's own frame calls (_moveStart / _move / _moveEnd, as flyTo makes them), so
    // markers, renderers and every zoomstart / zoomend listener behave as for a flight. A new glide picks up
    // from wherever the last one is; a drag, a pinch or a Ctrl + wheel stops it where it stands.
    let gl = null, glRaf = 0
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
    const stopGlide = () => {
      if (!gl) return
      cancelAnimationFrame(glRaf); gl = null
      m._moveEnd(true)
    }
    const glideTo = (center, zoom, ms = 600) => {
      center = L.latLng(center)
      zoom = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), zoom))
      m._stop()                                      // Leaflet's own flight or pan, if one is running
      if (reduced() || !ms) { cancelAnimationFrame(glRaf); const was = !!gl; gl = null; if (was) m._moveEnd(true); m.setView(center, zoom, { animate: false }); L_.current.onGlideEnd?.(); return }
      const z0 = m.getZoom(), z1 = zoom
      // the same zoom is a PAN: _move only fires 'zoom' when the zoom changes, so frame by frame nothing would be
      // re-placed until the end — Leaflet's own pan animation moves the whole pane instead
      if (Math.abs(z1 - z0) < 0.01) {
        stopGlide()
        m.panTo(center, { animate: true, duration: ms / 1000, easeLinearity: 0.3 })
        m.once('moveend', () => L_.current.onGlideEnd?.())
        return
      }
      const chained = !!gl
      cancelAnimationFrame(glRaf)
      const c0 = m.project(m.getCenter(), z0), c1 = m.project(center, z0)
      const k1 = 2 ** (z1 - z0)
      const fixed = Math.abs(k1 - 1) > 1e-3 ? c0.subtract(c1.multiplyBy(k1)).divideBy(1 - k1) : null
      if (!chained) m._moveStart(true, false)
      lastDraw = 0; lastDrawZ = z0
      const t0 = performance.now()
      gl = { center, zoom }
      const frame = now => {
        if (!gl) return
        const t = Math.min(1, (now - t0) / ms), e = ease(t)
        if (t < 1) {
          const z = z0 + (z1 - z0) * e
          const c = fixed ? fixed.add(c0.subtract(fixed).divideBy(2 ** (z - z0))) : c0.add(c1.subtract(c0).multiplyBy(e))
          m._move(m.unproject(c, z0), z, { flyTo: true })
          glRaf = requestAnimationFrame(frame)
        } else {
          gl = null
          m._move(center, zoom)._moveEnd(true)
          L_.current.onGlideEnd?.()
        }
      }
      glRaf = requestAnimationFrame(frame)
    }
    L_.current.glideTo = glideTo
    L_.current.gliding = () => !!gl
    // the reader's own hand stops a glide where it stands — a DRAG, a two-finger pinch, a Ctrl + wheel. Not a press:
    // a second quick click on the same state stopped the glide half way, and left the map there
    const box0 = m.getContainer()
    const onDown = e => { if (e.touches?.length > 1) stopGlide() }
    const onCtlWheel = e => { if (e.ctrlKey || e.metaKey || live.current.freeWheel) stopGlide() }
    box0.addEventListener('touchstart', onDown, { passive: true })
    box0.addEventListener('wheel', onCtlWheel, { passive: true })
    m.on('dragstart', stopGlide)
    // the view that fits a bounds — Leaflet's own fitBounds arithmetic, without moving
    const viewOf = (b, opts) => m._getBoundsCenterZoom(L.latLngBounds(b), opts)
    // ALL OF INDIA, and A STATE WITH ITS NEIGHBOURS (pass 79, "it zooms in way too much in the state"): a state
    // used to fill the stage edge to edge (maxZoom 7.75, 44 px margins); it now sits in the middle ~60% of it,
    // its neighbours round it, and never more than 2¼ levels in from all of India
    const indiaView = () => viewOf(INDIA, fitPad())
    const stateView = b => {
      const s = m.getSize(), px = Math.round(s.x * 0.17) + 20, py = Math.round(s.y * 0.15) + 20
      const v = viewOf(b, { paddingTopLeft: [px, py], paddingBottomRight: [px, py + inset] })
      v.zoom = Math.min(v.zoom, indiaView().zoom + 2.25, 7.25)
      return v
    }
    L_.current.indiaView = indiaView
    L_.current.stateView = stateView
    L_.current.viewOf = viewOf

    // a zoom writes its readout straight into the DOM: a React update per zoom step re-rendered
    // the whole module, rail and tables included, and that was most of the lag
    const showZoom = () => { if (zoomEl?.current) zoomEl.current.textContent = `Zoom ${m.getZoom().toFixed(2)}` }
    showZoom()
    // a disc's size animates when the MEASURE changes, never when the zoom does: 185 discs
    // re-growing after every zoom step kept the map moving after the zoom had ended
    const box = m.getContainer()
    // THE MAP'S ENTRANCE PLAYS ONCE (pass 79, "it refreshes every time we click a state or close it"). The states'
    // west-to-east rise and the coast's trace were switched OFF while the map moved (.zooming) — and so switched
    // back ON when it stopped, which RESTARTED both: after every flight the whole of India faded in again. They
    // now live under .intro, which leaves the map once they have played.
    box.classList.add('intro')
    const introT = setTimeout(() => box.classList.remove('intro'), 2300)
    m.on('zoomstart', () => {
      box.classList.add('zooming')
      // a zoom the reader makes themselves lets go of a clicked cluster's frozen neighbours — and of the trail back
      if (!clickZoom.current) {
        openRef.current = null
        if (drill.current.length) { drill.current = []; live.current.onDrill?.([]) }
      }
    })
    // OUR REDRAW IS A TASK OF ITS OWN. At zoomend Leaflet re-projects every state outline; the
    // plants' re-placement (relax over 185 discs), the mines and the callouts used to run in
    // the same task, and together they crossed 50 ms — one dropped frame at the end of a zoom.
    // Leaflet's frame paints first; ours runs in the task after it.
    let redraw = 0, redrawT = 0
    m.on('zoomend', () => {
      clickZoom.current = false
      cancelAnimationFrame(redraw); clearTimeout(redrawT)
      redraw = requestAnimationFrame(() => {
        redrawT = setTimeout(() => {
          drawPlants(); drawMines(); drawCompanies(); showZoom()
          requestAnimationFrame(() => requestAnimationFrame(() => box.classList.remove('zooming')))
        }, 0)
      })
    })
    // A PAN BRINGS MINES INTO VIEW: they are drawn only near the view (drawMines), so a move that did not
    // change the zoom redraws them once it ends, in a task of its own. A zoom's own redraw is zoomend's.
    let panT = 0
    m.on('moveend', () => {
      if (last.current.z == null || Math.abs(m.getZoom() - last.current.z) > 1e-6) return
      cancelAnimationFrame(panT)
      panT = requestAnimationFrame(() => setTimeout(drawMines, 0))
    })
    m.on('zoomstart movestart', () => L_.current.unlight?.())
    // the pointer leaving the map takes the light and the card with it
    m.on('mouseout', () => L_.current.unlight?.())
    // a click on the sea or the margin (on no state, no marker) goes back to all of India, at once
    m.on('click', () => {
      if (Date.now() - stateHit < 300) return
      live.current.onBackground?.()
    })
    m.on('mousemove', e => {
      if (!readout?.current) return
      const { lat, lng } = e.latlng
      readout.current.textContent = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`
    })
    // a plain wheel belongs to the PAGE (outside full screen): stop it before Leaflet sees it
    const host = el.current.parentElement
    const onWheel = e => {
      if (live.current.freeWheel || e.ctrlKey || e.metaKey) return
      e.stopPropagation()
      onHint?.()
    }
    host.addEventListener('wheel', onWheel, { capture: true, passive: true })   // it never preventDefaults: a passive listener lets the page scroll without waiting on script
    // at most once a frame: while the page loads (fonts, data, the rail filling) the stage is
    // resized several times in a row, and each invalidateSize forces a layout of its own
    let roRaf = 0
    const ro = new ResizeObserver(() => {
      if (roRaf) return
      roRaf = requestAnimationFrame(() => { roRaf = 0; m.invalidateSize({ pan: false }); if (atIndia.current) m.fitBounds(INDIA, { animate: false, ...fitPad() }) })
    })
    ro.observe(el.current)
    // EVERY CLICK ON + / − COUNTS, AND THE MAP GLIDES. Leaflet IGNORES a zoom asked for while one is still
    // animating, so ten quick clicks moved the map three or four steps and dropped the rest; and its zoom
    // animation only stretches the old picture, so a catch-up of several steps out shrank it to a fifth of
    // the stage. Each click now moves the TARGET a step and the map flies to it from wherever it stands —
    // a flight is redrawn as it goes (above), so a run of clicks is one smooth zoom. A target older than a
    // second and a half is forgotten, so it never fights a wheel or a flight that came after it.
    // (pass 79) each click moves the TARGET and the map GLIDES to it from wherever it stands — a glide picks up
    // from the one before, so a run of clicks is one zoom
    let zGoal = null, zAt = 0, zWait = false
    const zoomGlide = () => {
      if (zGoal == null || map.current !== m) return
      if (m._animatingZoom) { zWait = true; return }   // a wheel zoom under way: its zoomend picks this up
      glideTo(m.getCenter(), zGoal, 320)
    }
    const stepZoom = dz => {
      atIndia.current = false
      const now = performance.now(), base = zGoal != null && now - zAt < 1500 ? zGoal : m.getZoom()
      zGoal = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), base + dz)); zAt = now
      zoomGlide()
    }
    m.on('zoomend', () => {
      if (!zWait) return
      zWait = false
      requestAnimationFrame(zoomGlide)
    })
    // back to a level of the trail: its view, and the clusters as they stood open then
    const drillTo = level => {
      const d = drill.current
      if (level < 0 || level >= d.length) return
      const { from } = d[level]
      drill.current = d.slice(0, level)
      live.current.onDrill?.(drill.current.map(x => x.n))
      openRef.current = from.open ? { ids: new Set(from.open.ids), frozen: from.open.frozen.slice() } : null
      clickZoom.current = true
      clearTimeout(clickZoomT.current)
      clickZoomT.current = setTimeout(() => { clickZoom.current = false }, 2500)
      atIndia.current = level === 0 && !from.open
      glideTo(from.center, from.zoom, 520)
    }
    if (api) api.current = {
      zoomIn: () => stepZoom(0.75), zoomOut: () => stepZoom(-0.75),
      india: () => { atIndia.current = true; const v = indiaView(); glideTo(v.center, v.zoom, 600) },
      zoom: () => m.getZoom(),
      drillTo, back: () => drillTo(drill.current.length - 1),
      light: name => L_.current.railLight?.(name),
      // A CHOSEN MARKER IS NEVER UNDER THE PHONE'S SELECTION CARD (16 Nov'26): a mine or plant chosen in the strip the
      // card takes at the map's foot is panned up just clear of it — the map does not otherwise move for a mine
      reveal: (lat, lon, bottom = 0) => {
        const pt = m.latLngToContainerPoint([lat, lon]), lim = m.getSize().y - bottom - 22
        if (pt.y > lim) m.panBy([0, pt.y - lim], { animate: !reduced(), duration: 0.35 })
      },
      // A CHOSEN MINE OR PLANT IS BROUGHT INTO VIEW, GENTLY (16 Nov'26, the user: "when I click a Super 35 mine it doesn't
      // zoom — tell me what is better"). Zoomed out (within ~1.2 levels of India's view, where the rings crowd) the map
      // glides in by 1.5 levels, centred on it in the clear part of the stage (`top` / `bottom`: what the crumb and the
      // phone's card cover). Already zoomed in, it does not zoom again: it only glides over when the point is near an
      // edge or under the card — a reader who chose their zoom keeps it.
      // A CHOSEN MINE ARRIVES IN THE MIDDLE IN ONE MOVE (16 Nov'26, the user: "after the zoom all the mines readjust so we
      // lose the track of exactly which mine we clicked"; "when I click one all the ones shuffle, it looks so goofy").
      // A wide view spreads the rings clear of each other, and the zoom gives them room again — so they WILL take new
      // places. They used to take them twice: once when the mine was chosen, and again, all at once, when the zoom
      // landed, the chosen ring jumping away from the middle. Now the rings are laid out ONCE, for the zoom the glide
      // lands at, before it starts; each slides from where it stands to that place over the glide itself (drawMines'
      // `ms`), and the glide centres the chosen ring's NEW place — so it travels to the middle with the camera and stays.
      // When the zoom lands, nothing is left to move. `mine`: the chosen mine's id.
      focus: (lat, lon, { top = 0, bottom = 0, mine = null } = {}) => {
        const z = m.getZoom(), india = indiaView().zoom, size = m.getSize()
        const v = mine ? [...mineLive.current.values()].find(x => x.members.size === 1 && x.members.has(mine)) : null
        let ll = v ? v.latlng : L.latLng(lat, lon)
        const zoomed = z < india + 1.2
        const target = zoomed ? Math.min(m.getMaxZoom(), z + 1.5) : z
        if (!zoomed) {
          const pt = m.latLngToContainerPoint(ll)
          const comfy = pt.x > size.x * 0.15 && pt.x < size.x * 0.85 && pt.y > top + 24 && pt.y < size.y - bottom - 24
          if (comfy) return
        }
        if (mine && Math.abs(target - z) > 0.01) {
          // this zoom lets go of a clicked cluster (as zoomstart would) — so the layout drawn now is the one it lands on
          openRef.current = null
          if (drill.current.length) { drill.current = []; live.current.onDrill?.([]) }
          const g = drawMines(target, reduced() ? 0 : 600)?.find(x => x.members.length === 1 && x.members[0].id === mine)
          if (g) ll = m.unproject([g.x, g.y], target)
        }
        const c = m.unproject(m.project(ll, target).add([0, (bottom - top) / 2]), target)
        atIndia.current = false
        glideTo(c, target, 600)
      },
    }
    // THE MARKER REFS DIE WITH THE MAP. React's development build mounts every effect twice
    // (StrictMode); the refs outlive that first unmount, so the second map inherited markers
    // that were still on the FIRST, removed map — drawPlants found each plant "already drawn",
    // moved a marker no map showed, and the dev site drew no plant at all while the
    // production build (mounted once) drew 185. Whatever a map owns is cleared with it.
    return () => {
      host.removeEventListener('wheel', onWheel, { capture: true }); ro.disconnect(); cancelAnimationFrame(roRaf)
      box0.removeEventListener('touchstart', onDown); box0.removeEventListener('wheel', onCtlWheel)
      cancelAnimationFrame(glRaf); gl = null; clearTimeout(introT); drill.current = []
      cancelAnimationFrame(redraw); clearTimeout(redrawT); cancelAnimationFrame(panT)
      m.off(); m.remove(); map.current = null
      stateLayers.current = new Map(); plantMk.current = new Map(); mineLive.current = new Map(); coMk.current = new Map()
      last.current = {}; L_.current = {}; openRef.current = null; clearTimeout(clickZoomT.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ states: colour + selection
  useEffect(() => {
    stateLayers.current.forEach((ls, name) => {
      const c = fills.get(name)
      for (const l of ls) {
        if (!l._path) continue
        l._path.style.fill = c || ''
        l._path.classList.toggle('no-data', !c)
      }
    })
  }, [fills])

  useEffect(() => {
    const m = map.current
    if (!m) return
    const selState = selected?.kind === 'state' ? selected.id : null
    m.getContainer().classList.toggle('has-sel', !!selState)
    stateLayers.current.forEach((ls, name) => ls.forEach(l => l._path?.classList.toggle('dim', !!selState && name !== selState)))
    // the selected state's outline draws itself in, on its own layer above the states
    const { sl, outline, unlight } = L_.current
    sl?.clearLayers()
    if (selState && outline) {
      unlight?.()
      outline(selState, 'cm-sel-halo').addTo(sl)
      outline(selState, 'cm-sel').addTo(sl)
      // THE TRACE IS IN SHARES OF THE PATH, NOT PIXELS (pathLength="1", 26 Oct'26). It used to be
      // the path's pixel length measured NOW, before the flight to the state; the flight's zoom
      // re-projects the path several times longer, and the dash stayed the old length — Odisha's
      // outline was drawn 505 px of 3,059 and stopped part of the way round.
      // THE OUTLINE IS THERE AT ONCE (pass 80): it used to trace itself in once the map had landed — "the state zooms
      // in, then the boundary forms". It now rides the glide in from its first frame, faded in over a quarter second
      // (.cm-sel, CSS), and is never traced again.
    }
    for (const [id, v] of plantMk.current) v.marker.getElement()?.classList.toggle('is-sel', selected?.kind === 'plant' && selected.id === id)
    // A CHOSEN MINE STANDS OUT, AND NOTHING MOVES (16 Nov'26): it is lifted above every other ring (its name with it —
    // the name was hidden under its neighbours) and the rest go quiet (.has-msel); a chosen STATE lights only its own
    // mines (.is-out on the rest). Classes only: no ring changes its place for a choice.
    m.getContainer().classList.toggle('has-msel', selected?.kind === 'mine')
    for (const [, v] of mineLive.current) {
      const el = v.marker.getElement()
      el?.classList.toggle('is-sel', selected?.kind === 'mine' && v.members.size === 1 && v.members.has(selected.id))
      el?.classList.toggle('is-out', !!selState && !v.sts.has(selState))
    }
    for (const [id, v] of coMk.current) v.marker.getElement()?.classList.toggle('is-sel', selected?.kind === 'company' && selected.id === id)
    placeLabels()
    drawHull()
  }, [selected])

  // ------------------------------------------------------------------ focus: where the map flies
  // A flight that starts while another is still under way (a reader clicking state after state) is
  // shorter, and the map is redrawn where it stands first, so the run of clicks settles quickly and
  // never starts from a stretched picture
  // A GLIDE, NOT A FLIGHT (pass 79): see glideTo. 0.6 s; a click that lands while one is under way picks up
  // from where the map stands and takes 0.45 s, so a run of clicks settles at once
  const lastFly = useRef(0)
  useEffect(() => {
    const m = map.current, G = L_.current
    if (!m || !focus || !G.glideTo) return
    const now = performance.now(), chained = now - lastFly.current < 650
    lastFly.current = now
    const ms = reduced() ? 0 : chained ? 450 : 600
    atIndia.current = focus.kind === 'india'
    // a new place lets go of the trail back through the clusters
    openRef.current = null
    if (drill.current.length) { drill.current = []; live.current.onDrill?.([]) }
    if (focus.kind === 'india') { const v = G.indiaView(); G.glideTo(v.center, v.zoom, ms); return }
    if (focus.kind === 'state') {
      const ls = stateLayers.current.get(focus.id)
      if (!ls) return
      const b = ls.reduce((acc, l) => acc.extend(l.getBounds()), L.latLngBounds(ls[0].getBounds().getSouthWest(), ls[0].getBounds().getNorthEast()))
      const v = G.stateView(b)
      G.glideTo(v.center, v.zoom, ms)
      return
    }
    if (focus.kind === 'point') {
      const target = L.latLng(focus.lat, focus.lon)
      if (m.getZoom() < (focus.zoom || 7.5) - 0.5) G.glideTo(target, focus.zoom || 7.5, ms + 100)
      else if (!m.getBounds().pad(-0.25).contains(target)) G.glideTo(target, m.getZoom(), ms)
      return
    }
    if (focus.kind === 'points' && focus.pts?.length) {
      const v = G.viewOf(L.latLngBounds(focus.pts.map(p => [p.lat, p.lon])).pad(0.2), { ...fitPad(44), maxZoom: focus.maxZoom || 8.5 })
      G.glideTo(v.center, v.zoom, ms)
    }
  }, [focus])

  // ------------------------------------------------------------------ thermal plants
  function drawPlants() {
    const m = map.current
    if (!m) return
    const z = m.getZoom(), k = zk(z)
    const ps = live.current.plants
    const keep = new Set(ps.map(p => p.id))
    for (const [id, v] of plantMk.current) if (!keep.has(id)) { v.marker.remove(); plantMk.current.delete(id) }
    const motion = !reduced()
    // positions: the true point, then pushed apart just enough that no two discs overlap
    const items = ps.map(p => { const xy = m.project([p.lat, p.lon], z); return { p, x: xy.x, y: xy.y, r: (p.px * k) / 2 + 1.5 } })
    relax(items, 24, 2)
    items.forEach((it, i) => {
      const { p } = it
      const ll = m.unproject([it.x, it.y], z)
      const s = Math.round(p.px * k)
      const was = plantMk.current.get(p.id)
      const cls = `cm-p${p.critical ? ' crit' : ''}${p.dim ? ' dim' : ''}`
      if (was) {
        was.marker.setLatLng(ll)
        const node = was.marker.getElement()?.querySelector('.cm-p')
        if (node) { node.className = cls; node.style.setProperty('--s', `${s}px`) }
        const lab = was.marker.getElement()?.querySelector('.cm-label')
        if (lab) lab.style.setProperty('--off', `${s / 2 + 5}px`)
        was.p = p; was.s = s
        return
      }
      const dl = motion ? Math.round(700 + (i % 40) * 14) : 0
      const icon = L.divIcon({
        className: `cm-mk cm-plant${live.current.selected?.kind === 'plant' && live.current.selected.id === p.id ? ' is-sel' : ''}`, iconSize: [0, 0], iconAnchor: [0, 0],
        html: `<span class="cm-in" style="--dl:${dl}ms"><span class="${cls}" style="--s:${s}px"></span><em class="cm-label" style="--off:${s / 2 + 5}px">${esc(p.short)}</em></span>`,
      })
      const mk = L.marker(ll, { icon, keyboard: true, alt: p.name, zIndexOffset: 500 + s, bubblingMouseEvents: false })
      mk.on('click', () => live.current.onSelect({ kind: 'plant', id: p.id }))
      const hov = intent(() => {
        const pt = m.latLngToContainerPoint(mk.getLatLng())
        const cur = plantMk.current.get(p.id)
        live.current.onHover?.({ kind: 'plant', id: p.id, x: pt.x, y: pt.y, r: (cur?.s || s) / 2 })
      }, () => live.current.onHover?.(null), 120, 90)
      if (!touch()) { mk.on('mouseover', () => { L_.current.unlight?.(); hov.in() }); mk.on('mouseout', hov.out) }
      mk.addTo(m)
      plantMk.current.set(p.id, { marker: mk, p, s, x: it.x, y: it.y })
    })
    for (const it of items) { const v = plantMk.current.get(it.p.id); if (v) { v.x = it.x; v.y = it.y; v.r = it.r } }
    m.getContainer().classList.toggle('labels', z >= 7)
    placeLabels()
  }

  // names at close zoom, placed greedily — the selected one first, then the biggest — only
  // where the name's box clears every other name and every other disc
  // NAMES THAT NEVER COLLIDE (13 Nov'26, pass 80 — the user, over the coal belt: "way too untidy"). Three faults made
  // the mess the probe counted (_cm_dense.py: 50 names, 41 over another name, 94 over a disc): mine names were
  // switched ON from zoom 7 (.labels) but only CHECKED from 9.5 (Z_LOCAL + 1), so in between every major mine was
  // named regardless; the check knew only the named discs, not the clusters and dots round them; and it assumed a
  // name centred beside its disc while the CSS drew it above the disc's top edge. Now every drawn disc is an
  // obstacle, each name tries the right of its disc, then the left, above and below, and is shown only where it fits
  // — the chosen one always; the biggest discs are named first.
  function placeLabels() {
    const m = map.current
    if (!m) return
    const z = m.getZoom()
    const sel = live.current.selected
    const isSel = c => sel && sel.kind === c.kind && sel.id === c.id
    const cands = [], discs = []
    for (const [id, v] of plantMk.current) {
      cands.push({ kind: 'plant', id, v, x: v.x, y: v.y, r: (v.s || 8) / 2, size: v.s || 8 })
      discs.push({ x: v.x, y: v.y, r: (v.s || 8) / 2 })
    }
    const { groups } = last.current
    for (const g of groups || []) {
      const v = mineLive.current.get(g.id)
      if (!v) continue                                   // not drawn: out of view
      discs.push({ x: g.x, y: g.y, r: g.r || 5 })
      const p = g.members.length === 1 ? g.members[0] : null
      if (p && (p.flagship || (sel?.kind === 'mine' && sel.id === p.id))) cands.push({ kind: 'mine', id: p.id, v, x: g.x, y: g.y, r: g.r || 5, size: (g.r || 5) * 2 })
    }
    const show = z >= 7 && !touch()                      // on a touch screen only the CHOSEN one is named
    if (!show && !cands.some(isSel)) {                    // a wide view shows no names: only writes, no reads
      for (const c of cands) c.v.marker.getElement()?.classList.add('no-label')
      return
    }
    // A name's width never changes, so it is measured once and kept — and measured as TEXT (a canvas's measureText at
    // the label's font), never offsetWidth: reading the box forced a layout of the page for every new marker (v88: on a
    // phone 50–70 ms of each tap, _cm_phone_prof_v88.py)
    for (const c of cands) {
      if (c.v.w == null) c.v.w = labelWidth(c.v.marker.getElement()?.querySelector('.cm-label'))
    }
    cands.sort((a, b) => isSel(b) - isSel(a) || b.size - a.size)
    const H = 18, taken = []
    const overlapsDisc = (d, b) => {                      // a circle against a box: its nearest point inside?
      const nx = Math.max(b.l, Math.min(d.x, b.r)), ny = Math.max(b.t, Math.min(d.y, b.b))
      return (nx - d.x) ** 2 + (ny - d.y) ** 2 < (d.r + 1) ** 2
    }
    for (const c of cands) {
      const node = c.v.marker.getElement()
      if (!node) continue
      const w = c.v.w + 4
      const at = {
        r: { l: c.x + c.r + 5, t: c.y - H / 2 }, l: { l: c.x - c.r - 5 - w, t: c.y - H / 2 },
        t: { l: c.x - w / 2, t: c.y - c.r - 4 - H }, b: { l: c.x - w / 2, t: c.y + c.r + 4 },
      }
      let pick = null
      if (show || isSel(c)) {
        for (const k of ['r', 'l', 't', 'b']) {
          const b = { l: at[k].l, t: at[k].t, r: at[k].l + w, b: at[k].t + H }
          if (taken.some(t => !(b.r < t.l || b.l > t.r || b.b < t.t || b.t > t.b))) continue
          if (discs.some(d => !(Math.abs(d.x - c.x) < 0.5 && Math.abs(d.y - c.y) < 0.5) && overlapsDisc(d, b))) continue
          pick = [k, b]; break
        }
        if (!pick && isSel(c)) pick = ['r', { l: at.r.l, t: at.r.t, r: at.r.l + w, b: at.r.t + H }]
      }
      if (pick) taken.push(pick[1])
      node.classList.toggle('no-label', !pick)
      node.dataset.lp = pick ? pick[0] : 'r'
    }
  }

  // ------------------------------------------------------------------ coal mines (clusters)
  // `zAt`: lay the rings out for that zoom instead of the map's own — api.focus, for the zoom its glide lands at;
  // `ms`: how long a ring slides to its new place (a glide's length). Returns the groups as laid out.
  function drawMines(zAt = null, ms = 420) {
    const m = map.current
    if (!m) return null
    const z = zAt ?? m.getZoom()
    const motion = !reduced()
    const all = live.current.mines
    // a set chosen (some mines dimmed): a class, not `.cm-map:has(.cm-mk.is-dim)` — a :has() over the markers was
    // re-tested on every marker's class change
    m.getContainer().classList.toggle('has-pick', all.some(p => p.dim))
    const allPts = all.map(p => { const xy = m.project([p.lat, p.lon], z); return { ...p, x: xy.x, y: xy.y, flag: !!p.flagship, px: minePx(p, z) } })
    // A CLICKED CLUSTER OPENS ALONE. After a cluster click, only the mines of the clusters
    // clicked are regrouped for the new zoom; every other cluster is drawn as it stood when the
    // first one was clicked (its members' centre, its count). A zoom the reader makes
    // themselves — wheel, buttons, "All India" — lets go of that (openRef is cleared).
    const open = openRef.current
    const pts = open ? allPts.filter(p => open.ids.has(p.id)) : allPts
    const localZ = z >= Z_LOCAL
    const spread = !pts.length ? null : localZ ? fan(pts) : z >= Z_NATIONAL ? fan(pts.filter(p => p.flag)) : null
    if (spread) for (const p of pts) { const o = spread.off.get(p.id); if (o && o.hub) { p.x += o.dx; p.y += o.dy } }
    const groups = pts.length ? group(pts, z) : []
    if (open) {
      const byId = new Map(allPts.map(p => [p.id, p]))
      for (const f of open.frozen) {
        const members = f.ids.map(id => byId.get(id)).filter(Boolean)
        if (!members.length) continue
        const xy = m.project([f.lat, f.lon], z)
        groups.push({ id: f.id, x: xy.x, y: xy.y, members })
      }
    }
    relax(groups.map(g => Object.assign(g, { r: (g.members.length > 1 ? groupSize(g.members.length) : g.members[0].px) / 2 })))
    const selState = live.current.selected?.kind === 'state' ? live.current.selected.id : null
    const at = g => m.unproject([g.x, g.y], z)
    const before = new Map()
    for (const [, v] of mineLive.current) for (const id of v.members) before.set(id, v.latlng)
    // ONLY WHAT CAN BE SEEN IS DRAWN (11 Nov'26, "coal map laggy … unoptimized for mobile"): at a local zoom
    // every one of the register's ~650 mines is its own marker, and all of them were put on the map — 554
    // markers with their own animations for the 40 on screen. The groups are still worked out for ALL mines
    // (so a cluster never changes as the map pans); only those within the view and a margin get a marker,
    // and a pan redraws (moveend, below).
    // (the view as it stands, at the zoom laid out for: for api.focus that holds all a zoom IN can show)
    const vb = m.getBounds(), pb = L.bounds(m.project(vb.getNorthWest(), z), m.project(vb.getSouthEast(), z)), sz = pb.getSize()
    const mx = sz.x * 0.2 + 40, my = sz.y * 0.2 + 40          // a short pan never shows an empty edge
    const inView = g => g.x > pb.min.x - mx && g.x < pb.max.x + mx && g.y > pb.min.y - my && g.y < pb.max.y + my
    const shown = groups.filter(inView)
    const next = new Set(shown.map(g => g.id))
    for (const [id, v] of mineLive.current) {
      if (next.has(id)) continue
      const firstMember = [...v.members][0]
      const dest = shown.find(g => g.members.some(p => p.id === firstMember))
      const node = v.marker.getElement()?.firstElementChild
      if (node?.animate && motion && dest) {
        // (the Web Animations API with the numbers written in: the GPU runs it — a CSS keyframe built on var() did not)
        const a = m.latLngToLayerPoint(v.latlng), b = m.latLngToLayerPoint(at(dest))
        node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(.6)` }],
          { duration: 190, easing: 'ease-in', fill: 'forwards' })
        setTimeout(() => v.marker.remove(), 200)
      } else v.marker.remove()
      mineLive.current.delete(id)
    }
    const sel = live.current.selected
    // A MARKER THAT MOVES SLIDES THERE (16 Nov'26): a ring that takes a new place used to jump to it. Leaflet places the
    // outer element; the inner one is animated from where it stood (`from`, at the map's zoom now) to none, scaled from
    // its old size when that changed — the Web Animations API, no reflow per marker. Over a glide (api.focus) the slide
    // takes the glide's length and easing, so the rings and the camera arrive together.
    const slide = (node, from, ll, k = 1) => {
      if (!motion || !ms || !node?.animate) return
      const a = m.latLngToLayerPoint(from), b = m.latLngToLayerPoint(ll), dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy)
      if ((d < 0.5 && k === 1) || d > 420) return
      node.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'translate(0, 0) scale(1)' }],
        { duration: ms, easing: ms === 420 ? 'cubic-bezier(.22, 1, .36, 1)' : 'cubic-bezier(.65, 0, .35, 1)' })
    }
    for (const g of shown) {
      const ll = at(g)
      let was = mineLive.current.get(g.id)
      const isSel = sel?.kind === 'mine' && g.members.length === 1 && g.members[0].id === sel.id
      const sts = new Set(g.members.map(p => p.st))
      const out = !!selState && !sts.has(selState)
      const h = mineHtml(g, z)
      if (was) {
        // A DISC THAT CHANGES SIZE IS RESIZED WHERE IT STANDS (v88, 16 Nov'26, "still super laggy on the phone"). A picked
        // disc changes size at each zoom regime, and its marker used to be thrown away and made again — every ring's
        // entrance and fill replayed after a zoom, and on a phone that was most of the lag (_cm_phone_prof_v88.py: style
        // recalculation 600–830 ms a tap at CPU 4x). Now its box and ring take the new size and it grows into it.
        let k = 1
        if (was.size !== h.size) {
          const el = was.marker.getElement(), s = h.size
          if (el) { el.style.width = el.style.height = `${s}px`; el.style.marginLeft = el.style.marginTop = `${-s / 2}px` }
          el?.querySelector('.cm-f')?.style.setProperty('--s', `${s}px`)
          const c = el?.querySelector('.cm-c')
          if (c) { c.style.width = c.style.height = `${s}px` }
          Object.assign(was.marker.options.icon.options, { iconSize: [s, s], iconAnchor: [s / 2, s / 2] })
          if (g.members.length === 1 && g.members[0].flagship) was.marker.setZIndexOffset(200 + s)
          k = was.size / s; was.size = s
        }
        if (!was.latlng.equals(ll) || k !== 1) slide(was.marker.getElement()?.firstElementChild, was.latlng, ll, k)
        was.marker.setLatLng(ll); was.latlng = ll; was.sts = sts
        const el = was.marker.getElement()
        el?.classList.toggle('is-sel', isSel); el?.classList.toggle('is-dim', g.members.every(p => p.dim)); el?.classList.toggle('is-out', out)
        continue
      }
      const from = before.get(g.members[0].id)
      let fx = 0, fy = 0
      if (motion && from && !from.equals(ll)) { const a = m.latLngToLayerPoint(from), b = m.latLngToLayerPoint(ll); fx = a.x - b.x; fy = a.y - b.y }
      const kind = g.members.length > 1 ? ' cm-group' : g.members[0].flagship ? ' cm-flag' : ''
      // a mine outside the chosen set is dimmed; a group is dimmed only when every member is
      const dim = g.members.every(p => p.dim)
      const icon = L.divIcon({
        className: `cm-mk cm-mine${kind}${isSel ? ' is-sel' : ''}${dim ? ' is-dim' : ''}${out ? ' is-out' : ''}`, iconSize: [h.size, h.size], iconAnchor: [h.size / 2, h.size / 2],
        html: `<span class="cm-in">${h.body}</span>`,
      })
      const mk = L.marker(ll, { icon, keyboard: true, alt: g.members.length > 1 ? `${g.members.length} mines` : g.members[0].name,
        zIndexOffset: g.members.length > 1 ? 300 : g.members[0].flagship ? 200 + h.size : 0, bubblingMouseEvents: false })
      mk.on('click', () => {
        if (g.members.length > 1) {
          // the trail back: where the map stands now, before this cluster opens (pass 79)
          const o = openRef.current
          drill.current.push({ n: g.members.length, from: { center: m.getCenter(), zoom: m.getZoom(),
            open: o ? { ids: new Set(o.ids), frozen: o.frozen.slice() } : null } })
          live.current.onDrill?.(drill.current.map(x => x.n))
          // open THIS cluster only: freeze every other one as it stands now (first click), or
          // take this one out of the frozen set (a later click on a frozen cluster)
          const ids = g.members.map(p => p.id)
          if (!openRef.current) {
            const frozen = (last.current.groups || []).filter(o => o.id !== g.id).map(o => ({
              id: o.id, ids: o.members.map(p => p.id),
              lat: o.members.reduce((s, p) => s + p.lat, 0) / o.members.length,
              lon: o.members.reduce((s, p) => s + p.lon, 0) / o.members.length }))
            openRef.current = { ids: new Set(ids), frozen }
          } else {
            openRef.current.frozen = openRef.current.frozen.filter(o => o.id !== g.id)
            for (const id of ids) openRef.current.ids.add(id)
          }
          clickZoom.current = true
          clearTimeout(clickZoomT.current)
          clickZoomT.current = setTimeout(() => { clickZoom.current = false }, 2500)   // a flight that does not zoom
          // A TAP ON A CLUSTER ALWAYS ZOOMS IN (10 Nov'26, the phone: "kisi cluster pe click karo toh wo kabhi
          // open hota hai kabhi nahi"). flyToBounds picked the zoom its members FIT at — on a phone's
          // narrow stage that is often the zoom the map is already at, or below it: the flight went
          // nowhere, nothing regrouped, and the cluster looked dead. The members' bounds still set the
          // centre; the zoom is at least a step up from here, and local once the members sit close.
          // ONE TAP OPENS IT (11 Nov'26): a step up was not enough — the 550-mine cluster took FIVE taps,
          // 550 → 341 → 238 → 215 → 89, each tap showing "another big cluster in the same place". The tap now
          // goes to the zoom where THIS cluster breaks apart: its members regrouped at each step up until no
          // piece holds more than 60% of them (or the local regime, where every mine stands alone) — and no
          // further in than the zoom its members fit at, unless it only breaks closer than that.
          const b = L.latLngBounds(g.members.map(p => [p.lat, p.lon]))
          atIndia.current = false
          const z0 = m.getZoom(), n = g.members.length
          const fitZ = m.getBoundsZoom(b.pad(0.15), false, L.point(40, 40 + inset))
          let splitZ = Z_LOCAL + 0.25
          for (let zz = z0 + 0.5; zz < Z_LOCAL; zz += 0.25) {
            const proj = g.members.map(p => { const xy = m.project([p.lat, p.lon], zz); return { ...p, x: xy.x, y: xy.y, flag: !!p.flagship } })
            const parts = group(proj, zz)
            if (parts.length >= 2 && Math.max(...parts.map(x => x.members.length)) <= n * 0.6) { splitZ = zz; break }
          }
          const z = Math.max(z0 + 0.75, splitZ, Math.min(fitZ, Z_LOCAL + 0.25))
          L_.current.glideTo(b.getCenter(), Math.min(z, m.getMaxZoom()), 560)
        } else live.current.onSelect({ kind: 'mine', id: g.members[0].id })
      })
      const hov = intent(() => {
        const pt = m.latLngToContainerPoint(mk.getLatLng())
        live.current.onHover?.({ kind: g.members.length > 1 ? 'mines' : 'mine', id: g.members.length > 1 ? null : g.members[0].id,
          n: g.members.length, flag: g.members.filter(p => p.flagship).length, x: pt.x, y: pt.y, r: h.size / 2 })
      }, () => live.current.onHover?.(null), 120, 90)
      if (!touch()) { mk.on('mouseover', () => { L_.current.unlight?.(); hov.in() }); mk.on('mouseout', hov.out) }
      mk.addTo(m)
      // it arrives from where its mines stood (a cluster opening flies its mines out of it) — the Web Animations API with
      // the numbers written in, so the GPU runs it (the CSS keyframe built on var(--fx) ran on the main thread)
      const inner = mk.getElement()?.firstElementChild
      if (motion && inner?.animate) {
        inner.animate([{ opacity: 0, transform: `translate(${fx}px, ${fy}px) scale(.6)` }, { opacity: 1, transform: 'none' }],
          { duration: 500, easing: 'cubic-bezier(.22, 1, .36, 1)' })
      }
      mineLive.current.set(g.id, { marker: mk, members: new Set(g.members.map(p => p.id)), latlng: ll, size: h.size, sts })
    }
    last.current = { groups, z }
    L_.current.spokes?.clearLayers()
    if (spread) {
      // the spokes of every hub in view are ONE path (a multi-line), not one SVG path per mine: 554 separate
      // paths were re-projected on every frame of a pinch
      const drawnAt = new Map(shown.filter(g => g.members.length === 1).map(g => [g.members[0].id, at(g)]))
      const byHub = new Map()
      for (const p of pts) {
        const o = spread.off.get(p.id)
        if (!o?.hub || !drawnAt.has(p.id)) continue
        if (!byHub.has(o.hub)) byHub.set(o.hub, [])
        byHub.get(o.hub).push(drawnAt.get(p.id))
      }
      const lines = []
      for (const hub of spread.hubs) {
        const ends = byHub.get(hub.k)
        if (!ends) continue
        for (const e of ends) lines.push([[hub.lat, hub.lon], e])
        L.circleMarker([hub.lat, hub.lon], { pane: 'spokes', radius: 2.5, weight: 1, interactive: false, className: 'cm-hub' }).addTo(L_.current.spokes)
      }
      if (lines.length) L.polyline(lines, { pane: 'spokes', weight: 1, interactive: false, className: 'cm-spoke' }).addTo(L_.current.spokes)
    }
    placeLabels()
    return groups
  }

  // ------------------------------------------------------------------ coal companies
  // Six of Coal India's subsidiaries mine the same belt, so their labels are CALLOUTS: each
  // starts above the centre of its mines, is pushed clear of every other label (placeBoxes),
  // and keeps a thin leader line back to a dot at that centre. None can cover another, so a
  // hover never hides a neighbour. Hovering (or choosing) a company shades the ground its
  // mines cover — their convex hull.
  const coHov = useRef(null)          // the hovered company (a ref: handlers outlive renders)
  const coT = useRef(0)               // its hover timer
  function drawHull() {
    const m = map.current, g = L_.current.hulls
    if (!m || !g) return
    g.clearLayers()
    const sel = live.current.selected
    const ids = new Set([coHov.current, sel?.kind === 'company' ? sel.id : null].filter(Boolean))
    for (const c of live.current.companies) {
      if (!ids.has(c.id) || !c.pts?.length) continue
      const h = hull(c.pts.map(([la, lo]) => [lo, la])).map(([lo, la]) => [la, lo])
      const style = { pane: 'hl', interactive: false, className: `cm-hull${c.id === coHov.current ? ' hov' : ''}`, weight: 1.4, color: '#d66c3c', fillColor: '#F1885B', fillOpacity: 0.1, dashArray: '4 4' }
      ;(h.length >= 3 ? L.polygon(h, style) : L.circle([c.lat, c.lon], { ...style, radius: 30000 })).addTo(g)
    }
  }
  function drawCompanies() {
    const m = map.current
    if (!m) return
    const cs = live.current.companies
    const z = m.getZoom()
    const keep = new Set(cs.map(c => c.id))
    for (const [id, v] of coMk.current) if (!keep.has(id)) { v.marker.remove(); coMk.current.delete(id) }
    L_.current.leaders?.clearLayers()
    if (!cs.length) { coHov.current = null; clearTimeout(coT.current); m.getContainer().classList.remove('co-hov'); drawHull(); return }
    for (const c of cs) {
      const was = coMk.current.get(c.id)
      // the figure for the period chosen (pass 79): a published % of target, or the day's tonnes
      const fig = c.txt ?? (c.pct == null ? '—' : `${c.pct.toFixed(1)}%`)
      const body = `<span class="cm-co b-${band(c.pct).key}"><b>${esc(c.code)}</b><em>${esc(fig)}</em></span>`
      if (was) { const n = was.marker.getElement()?.querySelector('.cm-in'); if (n && n.innerHTML !== body) { n.innerHTML = body; was.w = null } continue }
      const icon = L.divIcon({ className: `cm-mk cm-company${live.current.selected?.kind === 'company' && live.current.selected.id === c.id ? ' is-sel' : ''}`,
        iconSize: [0, 0], iconAnchor: [0, 0], html: `<span class="cm-in">${body}</span>` })
      const mk = L.marker([c.lat, c.lon], { icon, keyboard: true, alt: c.name || c.code, zIndexOffset: 900, bubblingMouseEvents: false })
      mk.on('click', () => live.current.onSelect({ kind: 'company', id: c.id }))
      // A COMPANY'S CARD NEVER COVERS THE OTHERS (pass 79, "when i hover on it it blocks the other companies, the hover
      // comes instantly"). The seven labels share the coal belt, and the card opened 140 ms after the pointer
      // arrived, over the labels around it. Now the pointer has to REST (320 ms) — then the card docks in the
      // map's top-left corner, its mines' ground is shaded, and the other labels step back; from one label to
      // the next the card follows at once
      const show = () => {
        coHov.current = c.id; drawHull()
        m.getContainer().classList.add('co-hov')
        for (const [id, v] of coMk.current) v.marker.getElement()?.classList.toggle('hov', id === c.id)
        live.current.onHover?.({ kind: 'company', id: c.id, dock: true })
      }
      const hide = () => {
        coHov.current = null; drawHull()
        m.getContainer().classList.remove('co-hov')
        for (const [, v] of coMk.current) v.marker.getElement()?.classList.remove('hov')
        live.current.onHover?.(null)
      }
      if (!touch()) {
        mk.on('mouseover', () => { clearTimeout(coT.current); coT.current = setTimeout(show, coHov.current ? 0 : 320) })
        mk.on('mouseout', () => { clearTimeout(coT.current); coT.current = setTimeout(() => { if (coHov.current) hide() }, 180) })
      }
      mk.addTo(m)
      coMk.current.set(c.id, { marker: mk, w: null, h: null })
    }
    // READ every label's size, then place them all, then WRITE positions
    const items = cs.map(c => {
      const v = coMk.current.get(c.id)
      if (v.w == null) {
        const n = v.marker.getElement()?.querySelector('.cm-co')
        v.w = n?.offsetWidth || 96; v.h = n?.offsetHeight || 30
      }
      const a = m.project([c.lat, c.lon], z)
      return { c, v, ax: a.x, ay: a.y - 30, x: a.x, y: a.y - 30, w: v.w, h: v.h }
    })
    placeBoxes(items)
    for (const it of items) {
      const ll = m.unproject([it.x, it.y], z)
      it.v.marker.setLatLng(ll)
      L.polyline([[it.c.lat, it.c.lon], ll], { pane: 'spokes', weight: 1.2, interactive: false, className: 'cm-leader' }).addTo(L_.current.leaders)
      L.circleMarker([it.c.lat, it.c.lon], { pane: 'spokes', radius: 3.5, weight: 2, interactive: false, className: 'cm-anchor' }).addTo(L_.current.leaders)
    }
    drawHull()
  }

  /** hover INTENT for a marker: act only once the pointer has rested on it, and let go a beat
   *  after it leaves — so a pass across a crowded patch does not flash every card it crosses */
  function intent(on, off, wait = 140, linger = 110) {
    let t = 0, lit = false
    return {
      in: () => { clearTimeout(t); t = setTimeout(() => { lit = true; on() }, lit ? 0 : wait) },
      out: () => { clearTimeout(t); t = setTimeout(() => { if (lit) { lit = false; off() } }, linger) },
    }
  }

  useEffect(() => { drawPlants() }, [plants]) // eslint-disable-line react-hooks/exhaustive-deps
  // A NEW LIST IS DRAWN THE FRAME AFTER (v88): React runs a tap's effects inside the tap itself, so choosing Super 35
  // laid out and drew every mine before the button could show it was pressed (~100 ms on a phone, CPU 4x)
  useEffect(() => {
    let t = 0
    const r = requestAnimationFrame(() => { t = setTimeout(drawMines, 0) })
    return () => { cancelAnimationFrame(r); clearTimeout(t) }
  }, [mines]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { drawCompanies() }, [companies]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="cm-map" role="application" aria-label="Map of India's coal: thermal plants, mines and coal companies" />
}
