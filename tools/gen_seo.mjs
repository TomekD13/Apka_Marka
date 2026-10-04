// Po buildzie (po gen_og_pages): strony dla wyszukiwarek, mapa strony i robots.txt.
//
// Aplikacja to SPA - bez uruchomienia JS kazda podstrona byla pusta, miala tytul
// „#JestNadzieja” i adres kanoniczny strony glownej, wiec Google traktowal ja jak
// duplikat (test 2026-10-04). Tu dla kazdej waznej podstrony powstaje
// dist/<sciezka>/index.html z wlasnym tytulem, opisem, adresem kanonicznym
// i krotkim tekstem w <div id="root">. React i tak zastepuje te tresc po starcie,
// wiec czytelnik nie widzi roznicy; robot dostaje strone, ktora da sie zaindeksowac.
//
// Tylko dla wydania pod adresem glownym (base = '/'). Bety i kopii na GitHub Pages
// nie indeksujemy.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const SITE = 'https://jestnadzieja.adwent.pl'
const DIST = resolve('dist')
const CONTENT = resolve('public/content/pl')
const BRAND = '#JestNadzieja'

const base = process.env.VITE_BASE || '/'
if (base !== '/') {
  console.log(`gen_seo: base ${base} - wydanie poza adresem glownym, pomijam strony dla wyszukiwarek`)
  process.exit(0)
}

const tplPath = join(DIST, 'index.html')
if (!existsSync(tplPath)) {
  console.error('gen_seo: brak dist/index.html - najpierw build')
  process.exit(1)
}
const tpl = readFileSync(tplPath, 'utf8')
const json = (p) => JSON.parse(readFileSync(join(CONTENT, p), 'utf8'))
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// opis do wynikow wyszukiwania: bez znacznikow markdowna, najwyzej ~160 znakow
const plain = (s) => String(s ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
function short(s, n = 160) {
  const t = plain(s)
  if (t.length <= n) return t
  const cut = t.slice(0, n)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + '…'
}

function setMeta(html, attr, key, val) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  return html.replace(re, (_m, a, b) => a + esc(val) + b)
}

const pages = [] // { path, title, desc, body: [akapity], links?: [{href, text}] }
const add = (p) => pages.push(p)

// --- dzialy ------------------------------------------------------------------
const ui = json('ui.json')
const lead = (desc) => [desc]
add({ path: '/pl/', title: BRAND, desc: 'Cały tekst Pisma, studia biblijne, śpiewniki i czytanki. Czytaj online albo offline.', body: lead('Cały tekst Pisma, studia biblijne, śpiewniki i czytanki. Czytaj online albo offline.') })
const sections = [
  ['/pl/biblia/', 'Biblia', 'Biblia, plany czytania, lekcje biblijne, notatki i teksty na różne okazje.'],
  ['/pl/biblia/czytaj/', 'Biblia – czytaj online', 'Pełny tekst Pisma Świętego: księgi, rozdziały, wyszukiwanie i zakładki.'],
  ['/pl/biblia/plany/', 'Plany czytania Biblii', 'Cała Biblia, Nowy Testament, Psalmy i inne plany czytania – w twoim tempie: miesiąc, pół roku, rok albo dwa lata.'],
  ['/pl/poznaj-boga-i-biblie/', 'Lekcje Biblijne', 'Serie lekcji biblijnych do samodzielnego studiowania.'],
  ['/pl/lekcje-biblijne/', 'Szkoła Biblijna', 'Bieżąca lekcja Szkoły Sobotniej.'],
  ['/pl/modlitwa/', 'Modlitwa', 'Dziennik modlitw, 40 dni modlitwy i teksty do modlitwy.'],
  ['/pl/modlitwa/teksty/', 'Teksty do modlitwy', 'Uwielbienie, skrucha, prośby i wdzięczność – fragmenty Biblii do modlitwy.'],
  ['/pl/40-dni/', '40 dni modlitwy', 'Czterdzieści biblijnych historii nadziei – codzienna czytanka i pytania na każdy dzień.'],
  ['/pl/jest-nadzieja/', BRAND, 'Czytania, modlitwa i materiały, które pomagają dzielić się nadzieją.'],
  ['/pl/edukacja/', 'Człowiek Nadziei', 'Codzienne teksty o tym, jak Bóg nas stworzył, jak myślimy, rozmawiamy i podejmujemy decyzje.'],
  ['/pl/grupy-nadziei/', 'Grupy Nadziei', 'Gotowe spotkania dla grup domowych – fragment Biblii, rozmowa i pytania na trzech poziomach.'],
  ['/pl/piesni/', 'Pieśni', 'Śpiewnik „Śpiewajmy Panu” i pieśni młodzieżowe z tekstami i akordami.'],
  ['/pl/spiewnik/', 'Śpiewnik', 'Pieśni ze śpiewnika „Śpiewajmy Panu”.'],
  ['/pl/piesni-mlodziezowe/', 'Pieśni młodzieżowe', 'Pieśni z obozów i zjazdów młodzieżowych.'],
  ['/pl/okazje/', 'Teksty na różne okazje', 'Fragment Pisma dobrany do konkretnej sytuacji.'],
  ['/pl/fiszki/', 'Ucz się wersetów na pamięć', 'Fiszki i powtórki ważnych tekstów Biblii.'],
]
for (const [path, title, desc] of sections) add({ path, title, desc, body: [desc] })

// --- 40 dni modlitwy -------------------------------------------------------------
const pray40 = json('pray40/index.json')
for (const d of pray40.days) {
  const day = json(`pray40/${String(d.day).padStart(2, '0')}.json`)
  const v = day.versions.short || day.versions.long
  const paras = v.sections.flatMap((s) => s.paragraphs).slice(0, 3)
  add({
    path: `/pl/40-dni/${d.day}/`,
    title: `Dzień ${d.day}: ${d.title} – 40 dni modlitwy`,
    desc: short(d.lead || paras[0]),
    body: [d.ref, ...paras].filter(Boolean),
  })
}

// --- Czlowiek Nadziei --------------------------------------------------------------
const edu = json('edu/index.json')
for (const it of edu.items) {
  const item = json(`edu/${String(it.nr).padStart(2, '0')}.json`)
  const v = item.versions.short || item.versions.long
  const paras = v.sections.flatMap((s) => s.paragraphs).slice(0, 3)
  add({ path: `/pl/edukacja/${it.nr}/`, title: `${it.title} – Człowiek Nadziei`, desc: short(paras[0]), body: paras })
}

// --- Grupy Nadziei -----------------------------------------------------------------
const groups = json('groups/index.json')
for (const s of groups.serie) {
  for (const g of s.items) {
    add({
      path: `/pl/grupy-nadziei/${g.id}/`,
      title: `${g.tytul} – Grupy Nadziei`,
      desc: short(g.opis || g.zdanie),
      body: [s.tytul || s.nazwa || '', g.opis, g.zdanie, g.teksty ? `Teksty: ${g.teksty}` : ''].filter(Boolean),
    })
  }
}

// --- Lekcje Biblijne (studia) ------------------------------------------------------
const index = json('index.json')
for (const st of index.studies) {
  add({ path: `/pl/s/${st.id}/`, title: `${st.title} – Lekcje Biblijne`, desc: short(st.summary), body: [st.summary] })
}

// --- piesni: sam tytul (tekstow nie wystawiamy w HTML dla robotow) -------------------
for (const [file, path, label] of [['songs.json', 'spiewnik', 'Śpiewnik'], ['songs-youth.json', 'piesni-mlodziezowe', 'Pieśni młodzieżowe']]) {
  for (const s of json(file).songs) {
    add({ path: `/pl/${path}/${s.nr}/`, title: `${s.nr}. ${s.title} – ${label}`, desc: `${s.title} – pieśń nr ${s.nr}, ${label}. Tekst z akordami w aplikacji ${BRAND}.`, body: [] })
  }
}

// --- zapis -----------------------------------------------------------------------
let n = 0
for (const p of pages) {
  const url = SITE + p.path
  let h = tpl
  h = h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(p.title)}</title>`)
  h = setMeta(h, 'name', 'description', p.desc)
  h = setMeta(h, 'property', 'og:title', p.title)
  h = setMeta(h, 'property', 'og:description', p.desc)
  h = setMeta(h, 'property', 'og:url', url)
  h = setMeta(h, 'name', 'twitter:title', p.title)
  h = setMeta(h, 'name', 'twitter:description', p.desc)
  h = h.replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${url}" />`)
  const h1 = p.title.split(' – ')[0]
  const body = [`<h1>${esc(h1)}</h1>`, ...p.body.map((t) => `<p>${esc(plain(t))}</p>`), `<p><a href="/pl/">${BRAND}</a></p>`].join('')
  h = h.replace('<div id="root"></div>', () => `<div id="root"><main style="max-width:42rem;margin:0 auto;padding:1.5rem 1rem">${body}</main></div>`)
  const dir = join(DIST, ...p.path.split('/').filter(Boolean))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), h, 'utf8')
  n++
}

// strona glowna-bramka (/) przekierowuje do /pl/ - nie zglaszamy jej osobno, a jej
// kanoniczny adres wskazuje strone polska, zeby nie bylo dwoch wersji tej samej tresci
let root = tpl.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${SITE}/pl/" />`)
writeFileSync(tplPath, root, 'utf8')

const today = new Date().toISOString().slice(0, 10)
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  '\n</urlset>\n'
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nDisallow: /stat/\nDisallow: /beta/\n\nSitemap: ${SITE}/sitemap.xml\n`,
  'utf8'
)
console.log(`gen_seo: ${n} stron dla wyszukiwarek + sitemap.xml + robots.txt`)
