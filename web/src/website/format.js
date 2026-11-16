// Formatting for the public website. PRESENTATION ONLY — no comparison is computed in
// the browser; every change, window and FYTD figure arrives finished from
// libs/website/compare.py, so the page and the API can never print two answers.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const nf = {}
const fmt = (d) => (nf[d] ||= new Intl.NumberFormat('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }))

/** Indian digit grouping (1,23,456) at a fixed number of decimals. */
export function num(v, d = 0) {
  if (v == null || Number.isNaN(v)) return '—'
  return fmt(d).format(v)
}

/** Decimals that keep a figure readable at its own magnitude. */
export function autoDec(v, base = 1) {
  const a = Math.abs(v ?? 0)
  if (a >= 1000) return 0
  if (a >= 100) return Math.min(base, 1)
  return base
}

export function pct(v, d = 1) {
  if (v == null || Number.isNaN(v)) return '—'
  if (Math.abs(v) < 0.05 && d === 1) return v === 0 ? '0.0%' : 'within 0.1%'
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(d).format(Math.abs(v))}%`
}

export function dir(v) {
  if (v == null || Math.abs(v) < 0.05) return 'flat'
  return v > 0 ? 'up' : 'down'
}

export const arrow = (v) => (v == null || Math.abs(v) < 0.05 ? '■' : v > 0 ? '▲' : '▼')

export function parseISO(s) {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

/** 16 Oct'26 — the convention both letters print. */
export function day(s) {
  const t = parseISO(s)
  if (!t) return '—'
  return `${t.getUTCDate()} ${MON[t.getUTCMonth()]}'${String(t.getUTCFullYear()).slice(2)}`
}

/** Thu 16 Oct 2026 */
export function dayLong(s) {
  const t = parseISO(s)
  if (!t) return '—'
  return `${DOW[t.getUTCDay()]} ${t.getUTCDate()} ${MON[t.getUTCMonth()]} ${t.getUTCFullYear()}`
}

export function dayShort(s) {
  const t = parseISO(s)
  return t ? `${t.getUTCDate()} ${MON[t.getUTCMonth()]}` : '—'
}

/** '2026-07' or '2026-07-01' -> Jul'26 */
export function month(s) {
  if (!s) return '—'
  const [y, m] = String(s).split('-').map(Number)
  return `${MON[m - 1]}'${String(y).slice(2)}`
}

export function monthLong(s) {
  if (!s) return '—'
  const [y, m] = String(s).split('-').map(Number)
  return `${MON[m - 1]} ${y}`
}

export const MONTHS = MON
export const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

/** A series' date for its own grain: a day, a month, or a fiscal year. */
export function stampFor(freq, s) {
  if (!s) return '—'
  if (freq === 'A') return `FY ${s}`
  if (freq === 'M') return month(s)
  return day(s)
}

/** Value + unit, with the unit placed the way the trade writes it. */
export function withUnit(v, unit, d) {
  if (v == null) return '—'
  const n = num(v, d)
  if (unit === '%') return `${n}%`
  if (unit === '$/t') return `$${n}/t`
  if (unit === '₹/MWh') return `₹${n}/MWh`
  if (unit === '₹ cr') return `₹${n} cr`
  return `${n} ${unit}`
}

export function unitLabel(unit) {
  // "thousand t" beside "million t" (12 Nov'26, the data review): the day's figures are thousands of tonnes and the
  // month's and year's millions, and the two units read as a pair
  return { 'kt': 'thousand t', 'MT': 'million t', 'rakes': 'rakes', 'GW': 'GW', 'MU': 'MU',
           'GWh': 'GWh', 'days': 'days', 'plants': 'plants', 'TWh': 'TWh' }[unit] || unit
}

/** How old the stamp is, in words that name the date rather than "X ago" (the
 *  fleet demo learned that relative stamps read stale under a live badge). */
export function asOfLine(freq, asOf) {
  return freq === 'M' ? `Month of ${monthLong(asOf)}` : freq === 'A' ? `FY ${asOf}` : `As on ${day(asOf)}`
}
