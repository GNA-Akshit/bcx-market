// ONE SHORT NAME PER SOURCE, EVERYWHERE A FIGURE OR A CHART NAMES ITS SOURCE (13 Nov'26, the user: a tile said
// "Source: CEA daily report" while the chart under it said "Central Electricity Authority — daily coal stock
// report" — "it should have been exactly like the metrics card … a simple short source is nice"). Tiles, chart
// footers, a phone's cards and sheets all print shortSource(); the full name rides along as the link's title, and
// the Sources tab (Sources.jsx) and the coal map's credits keep the full names — that is where they explain.
// A new source: add its line here, publisher first, the way it is known ("CEA", "CMPDI", "Coal India").
const SHORT = [
  [/^Central Electricity Authority — daily/i, 'CEA daily report'],
  [/^CEA — Daily/i, 'CEA daily report'],
  [/^Central Electricity Authority — monthly/i, 'CEA monthly report'],
  [/^CEA — Monthly/i, 'CEA monthly report'],
  [/^Ministry of Coal — national coal dashboard|^CMPDI — national coal dashboard/i, 'CMPDI dashboard'],
  [/^Ministry of Coal — Monthly Statistics at a Glance/i, 'Ministry of Coal, MSG'],
  [/^Ministry of Coal — Koyla Shakti/i, 'Koyla Shakti, Ministry of Coal'],
  [/^Ministry of Coal — commercial coal mine auctions/i, 'Ministry of Coal auctions'],
  [/^Coal Controller.s Organisation, via/i, 'CCO, via Koyla Shakti'],
  [/^Coal Controller.s Organisation — Provisional/i, 'CCO statistics'],
  [/^Coal Controller.s Organisation · Ministry of Coal/i, 'CCO · Ministry of Coal'],
  [/^Coal India — daily production|^Coal India — company coal production/i, 'Coal India daily dashboard'],
  [/^Coal India — daily rake/i, 'Coal India rake report'],
  [/^Coal India — Single Window/i, 'Coal India e-auction report'],
  [/^Coal India — FOIS/i, 'Coal India FOIS dashboard'],
  [/^Coal India — major coal mines/i, 'Coal India major mines'],
  [/^Grid Controller of India — 15-minute/i, 'Grid-India 15-minute data'],
  [/^Grid Controller of India — daily power supply/i, 'Grid-India daily report'],
  [/^Indian Energy Exchange/i, 'IEX'],
  [/^Multi Commodity Exchange/i, 'MCX'],
  [/^ICE Futures/i, 'ICE Futures'],
  [/^SGX/i, 'SGX'],
  [/^World Bank/i, 'World Bank Pink Sheet'],
  [/^Ember/i, 'Ember'],
]

/** The short name of a source, from its full name ("Central Electricity Authority — daily coal stock report" →
 *  "CEA daily report"). A name that is already short passes through; an unknown full one becomes its publisher. */
export function shortSource(s) {
  if (!s) return ''
  const t = String(s).trim()
  const hit = SHORT.find(([re]) => re.test(t))
  if (hit) return hit[1]
  return /\s[—–]\s/.test(t) ? t.split(/\s[—–]\s/)[0].trim() : t
}
