// Po buildzie: usuwa z dist/content katalogi jezykow, ktorych nie ma w langs.json.
// Vite kopiuje cale public/, wiec bez tego na serwer leci tresc siedmiu wylaczonych
// jezykow (~7,6 MB) - pliki zostaja w repo, tylko nie ida do publikacji.
// Wlaczenie jezyka z powrotem = wpis w public/content/langs.json, nic wiecej.
import { readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const DIST = resolve('dist', 'content')
const langs = JSON.parse(readFileSync(resolve('public/content/langs.json'), 'utf8'))
const keep = new Set(langs.languages.map((l) => l.code))

function dirSize(p) {
  let total = 0
  for (const entry of readdirSync(p, { withFileTypes: true })) {
    const full = join(p, entry.name)
    total += entry.isDirectory() ? dirSize(full) : statSync(full).size
  }
  return total
}

let freed = 0
const removed = []
for (const entry of readdirSync(DIST, { withFileTypes: true })) {
  if (!entry.isDirectory() || keep.has(entry.name)) continue
  const full = join(DIST, entry.name)
  freed += dirSize(full)
  rmSync(full, { recursive: true, force: true })
  removed.push(entry.name)
}

console.log(
  removed.length
    ? `prune_dist_langs: usunieto ${removed.join(', ')} (${Math.round(freed / 1024)} KB); zostaje: ${[...keep].join(', ')}`
    : `prune_dist_langs: nic do usuniecia (jezyki: ${[...keep].join(', ')})`
)
