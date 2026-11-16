// Photographs of India's coal chain, self-hosted under public/site/img/.
//
// Every one is freely licensed on Wikimedia Commons and fetched by
// scratch/dev/_site_images.py, which also wrote public/site/img/credits.json. Most are
// CC BY-SA, which REQUIRES the credit to be shown — every photograph the site shows carries
// its own (`Credit` below, 27 Oct'26). Do not add a photograph without its author, licence and
// source here, nor show one without its Credit.
//
// ONE GRADE: every photograph is passed through scripts/site_photo_grade.py, so photos
// by different people in different light read as one set. A new photograph goes through
// it too (it grades from the untouched original, so it is safe to re-run). Grading is a
// change, which these licences require us to say: each credit's title says "colour
// adjusted".
import { PLACEHOLDER } from './placeholders.js'

const IMG = '/site/img'

// a licence never breaks across two lines ("CC BY-SA" / "4.0" read as two things on a phone)
const P = (file, alt, author, license, licenseUrl, source, pos = '50% 50%') => ({
  src: `${IMG}/${file}.webp`, srcSm: `${IMG}/${file}-sm.webp`, alt, author, license: license.replace(/ /g, ' ').replace(/-/g, '‑'), licenseUrl, source, pos,
  srcSet: `${IMG}/${file}-sm.webp 900w, ${IMG}/${file}.webp 1800w`,
  ph: PLACEHOLDER[file],                     // its 20px preview (placeholders.js), painted under it while it loads
})

const BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0'

export const PHOTOS = {
  heroMine: P('hero-mine', 'The open-cast pit at Northern Coalfields’ Dudhichua mine, Singrauli, seen from the rim',
    'Rosehubwiki, Ramkesh Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Panaromic_View_of_Dudhichua_Coal_Mine_of_NCL.jpg', '50% 55%'),
  mineShovel: P('mine-shovel', 'A shovel loading a dumper with coal at the Dudhichua mine, Singrauli',
    'Rosehubwiki, Kuber Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Shovel_dumper_combination_at_Dudhichua_Coal_Mine_Singrauli.jpg'),
  mineDragline: P('mine-dragline', 'A walking dragline removing overburden at the Dudhichua mine',
    'Rosehubwiki, Kuber Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Dragline_at_Dudhichua_Coal_Mine_Singrauli.jpg'),
  railSilo: P('rail-silo', 'A rake being loaded under the coal silo at NCL’s Amlohri mine',
    'Rosehubwiki, Kuber Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Silo_rake_loading_at_NCL_Amlohri_Coal_Mine_at_Singrauli.jpg', '50% 60%'),
  railTrain: P('rail-train', 'Twin WAG-7 and WAG-9 locomotives hauling a loaded coal train',
    '4-RAZOR 01', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/',
    'https://commons.wikimedia.org/wiki/File:WAG7_and_WAG9_twin_with_heavy_coal_train.jpg'),
  railChp: P('rail-chp', 'BOXN wagons under the coal handling plant at the Dudhichua mine',
    'Rosehubwiki, Kuber Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Coal_Handling_Plant_Dudhichua_Coal_Mine_Singrauli.jpg'),
  plantRajpura: P('plant-rajpura', 'Cooling towers of the Rajpura thermal power plant beyond a sunflower field',
    'Npl-User1234', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Rajpura_Thermal_Power_Plant.jpg', '50% 45%'),
  plantRamagundam: P('plant-ramagundam', 'NTPC’s Ramagundam super thermal power station',
    'Getsuhas08', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0',
    'https://commons.wikimedia.org/wiki/File:NTPC_Ramagundam.jpg'),
  portParadip: P('port-paradip', 'Bulk carriers at Paradip port on the Odisha coast',
    'Jnanaranjan sahu', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Paradeep_Port.jpg', '60% 50%'),
  plantNight: P('plant-night', 'A thermal power station at night, Singrauli',
    'Rosehubwiki, Kuber Patel', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:POWER_Plant_at_Night_in_Singrauli.jpg'),
  plantBathinda: P('plant-bathinda', 'Cooling towers of the Bathinda power plant, Punjab',
    'Giridhar Appaji Nag Y', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0',
    'https://commons.wikimedia.org/wiki/File:Bathinda_power_plant_Punjab_India.jpg'),
  // the News page's band (5 Nov'26, the user's call): India's coal on the move — BOXN wagons heaped
  // with coal, Central Railway's "म रे" on the side. It replaced a soft locomotive photo, then a
  // stock business-newspaper photo that "did not say India"
  newsCoalWagons: P('news-coal-wagons', 'BOXN wagons heaped with coal on Central Railway',
    'Salil Kumar Mukherjee', 'CC BY-SA 4.0', BYSA4,
    'https://commons.wikimedia.org/wiki/File:Coal_transportation_in_wagons_03.jpg', '32% 38%'),
}

/** A PHOTOGRAPH'S CREDIT, ON THE PHOTOGRAPH (27 Oct'26). CC BY-SA asks for the author, the licence
 *  and the source to be shown, and the Sources module's credits card is off (the user's call), so
 *  every photograph the site shows carries its own — the author and the licence, the source a
 *  click away. A link, except inside a photo that is itself a link (an <a> in an <a> is not
 *  HTML): there it is text with the whole credit in its title, and the panel the card opens
 *  carries the link. */
export function Credit({ p, link = true, className = '' }) {
  const text = `${p.author} · ${p.license}`
  const title = `${p.alt} — ${p.author}, ${p.license}, via Wikimedia Commons; colour adjusted`
  return link
    ? <a className={`bx-credit ${className}`} href={p.source} target="_blank" rel="noreferrer" title={title}>{text}</a>
    : <span className={`bx-credit ${className}`} title={title}>{text}</span>
}

/** A responsive, lazily loaded photograph. `eager` for the one above the fold. */
/** BLURRED PLACEHOLDER (2 Nov'26): the photo's own 20px preview is the img's background, so a slow
 *  network shows its colours, softly blurred by the upscale, instead of an empty grey box; the
 *  photograph paints over it when it lands. No wrapper element: every layout that holds a Photo
 *  stays exactly as it was. */
export function Photo({ p, eager = false, sizes = '(max-width: 1020px) 100vw, 60vw', className, style }) {
  const ph = p.ph ? { backgroundImage: `url("${p.ph}")`, backgroundSize: 'cover', backgroundPosition: p.pos } : null
  return (
    <img src={p.src} srcSet={p.srcSet} sizes={sizes} alt={p.alt} loading={eager ? 'eager' : 'lazy'}
      decoding="async" fetchpriority={eager ? 'high' : undefined} className={className}
      style={{ objectPosition: p.pos, ...ph, ...style }} />
  )
}
