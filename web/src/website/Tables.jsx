// The data centre's tables — PUBLISHED FIGURES ONLY.
//
// These numbers are other organisations' data. A table here prints what the source
// publishes (Coal India's dashboard publishes its year-to-date actual, target,
// achievement and growth; its e-auction summary publishes quantities and the premium)
// and computes nothing of its own. Columns we used to derive — a state's growth, its
// share of India, an allocation share — are gone. The glossary was a fourth tab; it is
// far taller than any table and the panel is as tall as its tallest tab, so it is now its
// own section of the data centre.
import { Chg } from './ui.jsx'
import { day, monthLong, num } from './format.js'
import { FREQ_WORD } from './seriesui.jsx'

const ORDER = ['CIL', 'BCCL', 'CCL', 'ECL', 'MCL', 'NCL', 'SECL', 'WCL', 'NEC', 'SCCL']
const ordered = cos => [...cos].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  .sort((a, b) => (b === 'CIL') - (a === 'CIL'))                                   // the total leads
const name = c => (c === 'CIL' ? 'Coal India (all)' : c)

function CompaniesTable({ board }) {
  const rows = (board?.rows || []).filter(r => r.measure === 'offtake')
  const by = Object.fromEntries(rows.map(r => [r.company, r]))
  return (
    <table className="bx-table bx-table-dc">
      <thead><tr><th>Company</th><th>Despatched since 1 April, MT</th><th>Target to date, MT</th><th>Achieved</th><th>On last year</th></tr></thead>
      <tbody>{ordered(Object.keys(by)).map(c => {
        const r = by[c]
        return (
          <tr key={c} className={c === 'CIL' ? 'total' : ''}>
            <td>{name(c)}</td><td>{num(r.ytd, 1)}</td><td>{num(r.ytd_target, 1)}</td><td>{num(r.achieved_pct, 1)}%</td>
            <td>{r.ytd_growth_pct == null ? <span className="na">—</span> : <Chg v={r.ytd_growth_pct} />}</td>
          </tr>
        )
      })}</tbody>
    </table>
  )
}

function AuctionsTable({ swma }) {
  const rows = swma?.rows || []
  const of = (c, p) => rows.find(r => r.company === c && r.period === p)
  const cells = r => (r ? [<td key="a">{num(r.offered_mt, 2)}</td>, <td key="b">{num(r.allocated_mt, 2)}</td>, <td key="c">+{num(r.premium_pct, 0)}%</td>]
    : [<td key="a">—</td>, <td key="b">—</td>, <td key="c">—</td>])
  return (
    <table className="bx-table bx-table-dc">
      <thead>
        <tr className="grp"><th /><th colSpan={3}>{monthLong(swma?.month?.slice(0, 7))}</th><th colSpan={3}>This fiscal year</th></tr>
        <tr><th>Company</th><th>Offered, MT</th><th>Sold, MT</th><th>Premium</th><th>Offered, MT</th><th>Sold, MT</th><th>Premium</th></tr>
      </thead>
      <tbody>{ordered([...new Set(rows.map(r => r.company))]).map(c => (
        <tr key={c} className={c === 'CIL' ? 'total' : ''}><td>{name(c)}</td>{cells(of(c, 'month'))}{cells(of(c, 'fytd'))}</tr>
      ))}</tbody>
    </table>
  )
}

function SourcesTable({ sources, titles }) {
  const stamp = r => (r.last_freq === 'D' ? day(r.last) : r.last_freq === 'M' ? monthLong(r.last.slice(0, 7)) : `FY ${r.last}`)
  return (
    <table className="bx-table bx-table-dc bx-src-t">
      <thead><tr><th>Publisher and report</th><th>What we show from it</th><th>How often</th><th>Latest</th></tr></thead>
      <tbody>{sources.map(r => (
        <tr key={r.source}>
          <td className="wrapcell">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.source}</a> : r.source}</td>
          <td className="wrapcell muted">{r.shown.map(id => titles[id]).join('; ')}</td>
          <td>{r.freqs.map(f => FREQ_WORD[f].toLowerCase()).join(', ')}</td>
          <td>{r.last ? stamp(r) : '—'}{!r.current && <small className={r.paused ? 'paused' : 'stale'}>{r.paused ? 'paused' : 'not updated since'}</small>}</td>
        </tr>))}</tbody>
    </table>
  )
}

/** [key, tab label, the sentence above the table, the table] for the tables the payload
 *  holds. `ids` are the coal series the data centre shows; the sources tab lists only
 *  the publishers behind those. */
export function tableTabs(data, ids) {
  const b = data.boards || {}
  const titles = Object.fromEntries(data.series.map(s => [s.id, s.title]))
  const sources = (data.sources || []).map(r => ({ ...r, shown: r.series.filter(id => ids.includes(id)) })).filter(r => r.shown.length)
  return [
    b.coyla && ['companies', 'Coal India by company', `Despatch since 1 April, as published on Coal India's daily dashboard (${day(b.coyla.as_of)}). Growth is shown where the dashboard's two growth figures agree.`, <CompaniesTable key="c" board={b.coyla} />],
    b.swma && ['auctions', 'E-auctions', 'Coal India\'s Single Window e-auctions, as published: what was offered, what sold, and the premium over the notified price.', <AuctionsTable key="a" swma={b.swma} />],
    sources.length > 0 && ['sources', 'Sources', 'Every figure in the data centre is reproduced from these public publishers, as they publish it.', <SourcesTable key="o" sources={sources} titles={titles} />],
  ].filter(Boolean)
}
