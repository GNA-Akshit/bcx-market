// Geography the coal map's module needs beside the map itself:
//   stateOf(lat, lon)  — which state a point lies in, tested against the SAME outlines the map
//                        draws (Survey of India, via DataMeet), so a mine counts in the state it
//                        is drawn in;
//   silhouette(...)    — a state's (or India's) outline as a small SVG path, for the rail's
//                        header, so the panel visibly IS the thing chosen on the map.
import states from '../mines/geo/states.json'
import india from '../mines/geo/india.json'

const polys = g => (g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [])
const FEATS = new Map()
const INDEX = []
for (const f of states.features) {
  const name = f.properties.ST_NM
  if (!FEATS.has(name)) FEATS.set(name, [])
  FEATS.get(name).push(f)
  for (const p of polys(f.geometry)) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90
    for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    INDEX.push({ name, p, box: [x0, y0, x1, y1] })
  }
}
export const featuresOf = name => FEATS.get(name) || []
// every state and union territory the map draws, A to Z — the state dropdown lists them all
export const STATE_NAMES = [...FEATS.keys()].sort()
export const INDIA_FEATURES = india.features || [india]

function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) inside = !inside
  }
  return inside
}

/** the state a point lies in, or null (at sea, or outside India) */
export function stateOf(lat, lon) {
  for (const { name, p, box } of INDEX) {
    if (lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) continue
    if (inRing(lon, lat, p[0]) && !p.slice(1).some(h => inRing(lon, lat, h))) return name
  }
  return null
}

/** the state whose outline passes nearest a point — for a mine's command-area centroid that falls just outside
 *  every outline (a coast, a river border): it was counted in no state at all (pass 79). Within `maxDeg` only. */
export function nearestState(lat, lon, maxDeg = 0.6) {
  let best = null, bd = maxDeg * maxDeg
  for (const { name, p, box } of INDEX) {
    if (lon < box[0] - maxDeg || lon > box[2] + maxDeg || lat < box[1] - maxDeg || lat > box[3] + maxDeg) continue
    for (const [x, y] of p[0]) {
      const d = (x - lon) ** 2 + (y - lat) ** 2
      if (d < bd) { bd = d; best = name }
    }
  }
  return best
}

/** features -> { d, w, h, at(lat, lon) } fitted into a size x size box. Points closer than
 *  0.7 px are dropped, so even India's outline stays a short path. */
export function silhouette(features, size = 72, pad = 3) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90
  for (const f of features) for (const p of polys(f.geometry || f)) for (const [x, y] of p[0]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  if (x0 > x1) return null
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const sw = (x1 - x0) * k, sh = y1 - y0
  const s = (size - pad * 2) / Math.max(sw, sh)
  const w = sw * s + pad * 2, h = sh * s + pad * 2
  const at = (lat, lon) => [pad + (lon - x0) * k * s, pad + (y1 - lat) * s]
  let d = ''
  for (const f of features) for (const p of polys(f.geometry || f)) for (const ring of p) {
    let last = null, seg = ''
    for (const [x, y] of ring) {
      const [px, py] = at(y, x)
      if (last && Math.hypot(px - last[0], py - last[1]) < 0.7) continue
      seg += `${seg ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`
      last = [px, py]
    }
    if (seg) d += `${seg}Z`
  }
  return { d, w, h, at }
}
