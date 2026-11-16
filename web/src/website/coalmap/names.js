// Names as the sources print them, made readable: "ANPARA C TPS" -> "Anpara C TPS",
// "BINA OC MINE, MP" -> "Bina OC, MP", "Dr. N.TATA RAO TPS" -> "Dr. N.Tata Rao TPS".
// Plant-type and mine-type codes and company acronyms keep their capitals; a short word
// with no vowel is an acronym too (TPS, STPS, JSW, DSPM, SGPL).
const KEEP_UPPER = new Set([
  'OC', 'OCP', 'OCM', 'UG', 'UGP', 'II', 'III', 'IV', 'VI', 'VII', 'NTST', 'KBP', 'MP', 'UP', 'SDOCM', 'LBL',
  'TPS', 'TPP', 'STPS', 'STPP', 'UMTPP', 'TP', 'NTPC', 'OP', 'OPG', 'ITPCL', 'NEC', 'IB', 'GH', 'NCTPP', 'DVC',
  'JSW', 'SGPL', 'NTPL', 'TCP', 'SVPL', 'GEPL', 'GMR', 'DSPM', 'DPL', 'BALCO', 'SBU',
])
const VOWEL = /[AEIOU]/
const acronym = c => KEEP_UPPER.has(c) || (c.length <= 4 && !VOWEL.test(c))

// title-case each dotted, hyphenated or bracketed part: "N.TATA" -> "N.Tata",
// "CHHABRA-II" -> "Chhabra-II", "(NCTPP)" -> "(NCTPP)"
const word = w => w.split(/([.\-()])/).map(part => {
  const c = part.toUpperCase().replace(/[^A-Z]/g, '')
  if (!c) return part
  return acronym(c) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
}).join('')

export function pretty(name) {
  return (name || '').replace(/\s+/g, ' ').replace(/\bMINES?\b/gi, '').replace(/\s+,/g, ',').trim()
    .split(' ').filter(Boolean).map(word).join(' ')
}
