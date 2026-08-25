// Po buildzie: tworzy dist/<lang>/index.html z lokalnymi meta (Open Graph) per jezyk,
// zeby podglad linku (WhatsApp/FB/Telegram) byl inny dla kazdego jezyka.
// Roboty NIE uruchamiaja JS, wiec meta musza byc w statycznym HTML -> udostepniaj
// link z kodem jezyka, np. https://pastormarek.github.io/aplikacja/pl/
// Link glowny (.../aplikacja/) pokazuje wersje domyslna z index.html.
// Strony powstaja tylko dla jezykow wlaczonych w public/content/langs.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const SITE = 'https://pastormarek.github.io/aplikacja/'
const DIST = resolve('dist')

// Teksty podgladu per jezyk (title = pogrubiona linia, desc = szara linia).
const L = {
  en: { title: "Study Bible - Know God's heart", desc: 'A free Bible study course in 8 languages. Read online or offline.', site: 'Study Bible', locale: 'en_US' },
  pl: { title: '#JestNadzieja', desc: 'Cały tekst Pisma, studia biblijne, śpiewniki i czytanki. Czytaj online albo offline.', site: '#JestNadzieja', locale: 'pl_PL' },
  es: { title: 'Estudia la Biblia - conoce el corazón de Dios', desc: 'Curso gratuito de estudio de la Biblia en 8 idiomas. En línea o sin conexión.', site: 'Estudia la Biblia', locale: 'es_ES' },
  pt: { title: 'Estude a Bíblia - conheça o coração de Deus', desc: 'Curso gratuito de estudo da Bíblia em 8 idiomas. Online ou offline.', site: 'Estude a Bíblia', locale: 'pt_BR' },
  de: { title: 'Die Bibel entdecken - Gottes Herz kennenlernen', desc: 'Kostenloser Bibelkurs in 8 Sprachen. Online oder offline lesen.', site: 'Bibel entdecken', locale: 'de_DE' },
  fr: { title: 'Étudier la Bible - découvrir le cœur de Dieu', desc: "Cours d'étude biblique gratuit en 8 langues. En ligne ou hors ligne.", site: 'Étudier la Bible', locale: 'fr_FR' },
  sw: { title: 'Jifunze Biblia - umjue Mungu', desc: 'Kozi ya bure ya kujifunza Biblia kwa lugha 8. Mtandaoni au nje ya mtandao.', site: 'Jifunze Biblia', locale: 'sw_TZ' },
  uk: { title: 'Вивчай Біблію - пізнавай серце Бога', desc: 'Безкоштовний курс вивчення Біблії 8 мовами. Онлайн або офлайн.', site: 'Вивчай Біблію', locale: 'uk_UA' },
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function setMeta(html, attr, key, val) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  return html.replace(re, (_m, p1, p2) => p1 + esc(val) + p2)
}
function setRe(html, re, val) {
  return html.replace(re, (_m, p1, p2) => p1 + esc(val) + p2)
}

const tplPath = join(DIST, 'index.html')
if (!existsSync(tplPath)) {
  console.error('gen_og_pages: brak dist/index.html – najpierw build'); process.exit(1)
}
const tpl = readFileSync(tplPath, 'utf8')

// jezyki wlaczone w aplikacji – zeby dist nie dostawal stron dla wylaczonych modulow
const enabled = new Set(
  JSON.parse(readFileSync(resolve('public/content/langs.json'), 'utf8')).languages.map((l) => l.code)
)

let n = 0
for (const [lang, d] of Object.entries(L)) {
  if (!enabled.has(lang)) continue
  const url = SITE + lang + '/'
  let h = tpl
  h = setRe(h, /(<html lang=")[^"]*(")/, lang)
  h = h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(d.title)}</title>`)
  h = setMeta(h, 'name', 'description', d.desc)
  h = setMeta(h, 'property', 'og:title', d.title)
  h = setMeta(h, 'property', 'og:description', d.desc)
  h = setMeta(h, 'property', 'og:site_name', d.site)
  h = setMeta(h, 'property', 'og:url', url)
  h = setMeta(h, 'property', 'og:locale', d.locale)
  h = setMeta(h, 'name', 'twitter:title', d.title)
  h = setMeta(h, 'name', 'twitter:description', d.desc)
  h = setRe(h, /(<link rel="canonical" href=")[^"]*(")/, url)
  const dir = join(DIST, lang)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), h, 'utf8')
  n++
}
console.log(`gen_og_pages: utworzono ${n} stron jezykowych (dist/<lang>/index.html)`)
