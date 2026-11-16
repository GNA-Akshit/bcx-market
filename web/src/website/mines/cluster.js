// THE ATLAS'S ZOOM LOGIC — pure functions over projected points, no Leaflet in here.
//
// Three regimes, by zoom, so India never shows 658 dots at once:
//   NATIONAL  (z < 6.25)  — coalfield-sized groups (64px): a disc with its mine count and,
//                           when flagship mines are inside, their summed FYTD production.
//   REGIONAL  (z < 8.5)   — area-sized groups (40px); a flagship mine is never folded in,
//                           because its figures are the reason to look.
//   LOCAL     (z ≥ 8.5)   — every mine on its own. The register places mines at their
//                           command AREA's centroid, so up to 30 share one point: they are
//                           FANNED OUT round that point on rings, with a hub and spokes
//                           drawn so the spread never reads as surveyed positions.

export const Z_NATIONAL = 6.25
export const Z_LOCAL = 8.5

export const radiusAt = z => (z < Z_NATIONAL ? 64 : z < Z_LOCAL ? 40 : 0)

/** Greedy grid clustering in screen space. `pts` are {id, x, y, flag:boolean, pick?:boolean, ...};
 *  flagship points stay single from Z_NATIONAL up, and a PICKED point (a mine of the chosen major-mines
 *  set) stays single at every zoom. Returns groups of {id, x, y, members} — a group of one is a mine.
 *  Deterministic: same input, same groups. */
export function group(pts, z) {
  const r = radiusAt(z)
  if (!r) return pts.map(p => ({ id: p.id, x: p.x, y: p.y, members: [p] }))
  const keepFlag = z >= Z_NATIONAL
  const cells = new Map()
  const out = []
  for (const p of [...pts].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if ((keepFlag && p.flag) || p.pick) { out.push({ id: p.id, x: p.x, y: p.y, members: [p] }); continue }
    const k = `${Math.floor(p.x / r)}:${Math.floor(p.y / r)}`
    let g = cells.get(k)
    if (!g) { g = { members: [] }; cells.set(k, g) }
    g.members.push(p)
  }
  for (const g of cells.values()) {
    const n = g.members.length
    const x = g.members.reduce((s, p) => s + p.x, 0) / n
    const y = g.members.reduce((s, p) => s + p.y, 0) / n
    // a group's id is its members' — so the same group keeps its marker across pans
    out.push({ id: n === 1 ? g.members[0].id : `g:${g.members.map(p => p.id).sort()[0]}:${n}`, x, y, members: g.members })
  }
  return merge(out)
}

/** A group disc's diameter, by its mine count — the same formula the map draws with. */
export const groupSize = n => Math.round(Math.min(64, 30 + Math.sqrt(n) * 4.2))

/** Neighbouring grid cells can leave two groups close together; fold any two whose DISCS
 *  would touch (by their drawn sizes, not their centres) until none do, so a cell boundary
 *  never prints two discs on top of each other. */
function merge(groups) {
  const multi = groups.filter(g => g.members.length > 1 || !(g.members[0].flag || g.members[0].pick))
  const keep = groups.filter(g => !multi.includes(g))
  let changed = true
  while (changed) {
    changed = false
    outer: for (let i = 0; i < multi.length; i++) {
      for (let j = i + 1; j < multi.length; j++) {
        const a = multi[i], b = multi[j]
        const touch = (groupSize(a.members.length) + groupSize(b.members.length)) / 2 + 6
        if (Math.hypot(a.x - b.x, a.y - b.y) < touch) {
          const n = a.members.length + b.members.length
          a.x = (a.x * a.members.length + b.x * b.members.length) / n
          a.y = (a.y * a.members.length + b.y * b.members.length) / n
          a.members = a.members.concat(b.members)
          multi.splice(j, 1)
          changed = true
          break outer
        }
      }
    }
  }
  for (const a of multi) if (a.members.length > 1) a.id = `g:${a.members.map(p => p.id).sort()[0]}:${a.members.length}`
  return keep.concat(multi)
}

/** Mines sharing one point are placed on rings round it. Returns, per mine id, its offset
 *  {dx, dy} in screen pixels and its hub key; a mine alone gets no offset. Rings are packed
 *  by each mine's DRAWN diameter (`px`), so large flagship discs never overlap, and the
 *  biggest take the inner ring — the mines with figures sit closest to the true point. */
export function fan(pts) {
  const hubs = new Map()
  for (const p of pts) {
    const k = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`
    if (!hubs.has(k)) hubs.set(k, [])
    hubs.get(k).push(p)
  }
  const off = new Map()
  const GAP = 5
  for (const [k, ms] of hubs) {
    if (ms.length === 1) { off.set(ms[0].id, { dx: 0, dy: 0, hub: null }); continue }
    ms.sort((a, b) => (b.px || 0) - (a.px || 0) || (a.id < b.id ? -1 : 1))
    let i = 0, ring = 0, rad = Math.max(18, (ms[0].px || 9) / 2 + 12)
    while (i < ms.length) {
      // take mines onto this ring while their diameters fit round its circumference
      const circ = 2 * Math.PI * rad
      const onRing = []
      let used = 0
      while (i < ms.length && (onRing.length === 0 || used + (ms[i].px || 9) + GAP <= circ)) {
        used += (ms[i].px || 9) + GAP
        onRing.push(ms[i++])
      }
      // spread them round evenly; an inner ring of one or two still sits off the hub
      let a = -Math.PI / 2 + ring * 0.4
      const slack = (circ - used) / onRing.length
      for (const p of onRing) {
        const step = ((p.px || 9) + GAP + slack) / rad
        a += step / 2
        off.set(p.id, { dx: Math.cos(a) * rad, dy: Math.sin(a) * rad, hub: k })
        a += step / 2
      }
      const widest = Math.max(...onRing.map(p => p.px || 9))
      const next = ms[i]?.px || 9
      rad += widest / 2 + next / 2 + GAP + 2
      ring++
    }
  }
  return { off, hubs: [...hubs].filter(([, ms]) => ms.length > 1).map(([k, ms]) => ({ k, lat: ms[0].lat, lon: ms[0].lon, n: ms.length })) }
}

/** Nudge markers apart until no two drawn discs overlap (or `rounds` run out). `items` are
 *  {x, y, r} in screen pixels and are moved IN PLACE. The smaller of two touching discs
 *  moves more (by area), so a big flagship disc or a group barely shifts while a register
 *  dot steps aside. Fanning separates mines sharing ONE point; this separates neighbours. */
export function relax(items, rounds = 28, gap = 3) {
  // NEIGHBOURS ONLY (11 Nov'26, "coal map laggy on the phone"): every pair of 650 mines at a local zoom is
  // 211,000 pair checks a round, up to 28 rounds — 260–450 ms on a phone's CPU. Two discs can only touch
  // inside one cell of the largest disc's reach, so each round files the discs in a grid of that size and
  // compares each with the discs of its own and the eight cells round it. Same pairs that matter, same
  // order (i < j), still deterministic.
  const n = items.length
  if (!n) return items
  let maxR = 0
  for (const it of items) if (it.r > maxR) maxR = it.r
  const cell = Math.max(8, 2 * maxR + gap)
  const pair = (i, j) => {
    const a = items[i], b = items[j]
    let dx = b.x - a.x, dy = b.y - a.y
    const need = a.r + b.r + gap
    if (Math.abs(dx) >= need || Math.abs(dy) >= need) return false
    let d = Math.hypot(dx, dy)
    if (d >= need) return false
    if (d < 0.01) { dx = 0.5 + ((i * 7 + j * 13) % 10) / 10; dy = 0.3; d = Math.hypot(dx, dy) }   // deterministic, never random
    const push = (need - d) / 2
    const wa = (b.r * b.r) / (a.r * a.r + b.r * b.r)            // a moves more when b is bigger
    a.x -= (dx / d) * push * 2 * wa; a.y -= (dy / d) * push * 2 * wa
    b.x += (dx / d) * push * 2 * (1 - wa); b.y += (dy / d) * push * 2 * (1 - wa)
    return true
  }
  for (let k = 0; k < rounds; k++) {
    let moved = false
    if (n < 48) {                                       // a few discs: every pair is cheaper than a grid
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (pair(i, j)) moved = true
    } else {
      const grid = new Map()
      const key = (cx, cy) => cx * 1048576 + cy
      for (let i = 0; i < n; i++) {
        const kk = key(Math.floor(items[i].x / cell), Math.floor(items[i].y / cell))
        const l = grid.get(kk)
        if (l) l.push(i); else grid.set(kk, [i])
      }
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(items[i].x / cell), cy = Math.floor(items[i].y / cell)
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const l = grid.get(key(gx, gy))
            if (!l) continue
            for (const j of l) if (j > i && pair(i, j)) moved = true
          }
        }
      }
    }
    if (!moved) break
  }
  return items
}

/** A flagship mine's disc diameter, by FYTD production (area ∝ tonnes). */
export const discSize = mt => Math.round(12 + Math.sqrt(Math.max(0, mt || 0)) * 7)

/** The achievement band — a status, so it always travels with its words. */
export function band(pct) {
  if (pct == null) return { key: 'na', label: 'No figure' }
  if (pct >= 100) return { key: 'met', label: 'At or above target' }
  if (pct >= 90) return { key: 'near', label: 'Within 10% of target' }
  return { key: 'behind', label: 'More than 10% behind' }
}

/** Callout placement for LABELS that must never cover one another (the coal companies, whose
 *  mines crowd into one coal belt). Each item is a box {x, y, w, h} that starts at its anchor
 *  {ax, ay}. Overlapping boxes are pushed apart along the axis they overlap least on, while a
 *  weak spring pulls each back toward its anchor, so a label strays only as far as it must.
 *  Deterministic: coincident boxes are separated by their index, never by Math.random(). */
export function placeBoxes(items, rounds = 120, gap = 8, pull = 0.04) {
  for (let r = 0; r < rounds; r++) {
    let moved = false
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j]
        const ox = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x)
        const oy = (a.h + b.h) / 2 + gap - Math.abs(a.y - b.y)
        if (ox <= 0 || oy <= 0) continue
        moved = true
        if (ox < oy * 2.2) {                       // labels are wide: prefer a sideways step
          const s = (a.x === b.x ? (i < j ? -1 : 1) : Math.sign(a.x - b.x)) * ox / 2
          a.x += s; b.x -= s
        } else {
          const s = (a.y === b.y ? (i < j ? -1 : 1) : Math.sign(a.y - b.y)) * oy / 2
          a.y += s; b.y -= s
        }
      }
    }
    for (const it of items) { it.x += (it.ax - it.x) * pull; it.y += (it.ay - it.y) * pull }
    if (!moved && r > 8) break
  }
  return items
}

/** The convex hull of [x, y] points (monotone chain) — the ground a company's mines cover. */
export function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], up = []
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
