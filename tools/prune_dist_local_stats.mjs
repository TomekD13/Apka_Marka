import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

// Lokalne bazy statystyk sa w public/stat dla lokalnego podgladu,
// ale Vite kopiuje public/ do dist/. Usuwamy je przed publikacja buildu.
const statsDir = join(process.cwd(), 'dist', 'stat')

try {
  const files = await readdir(statsDir, { withFileTypes: true })
  const localDatabases = files
    .filter((entry) => entry.isFile() && /^dane.*\.sqlite(?:[-.].*)?$/i.test(entry.name))

  for (const entry of localDatabases) {
    await rm(join(statsDir, entry.name))
    console.log(`Usunieto lokalna baze z buildu: dist/stat/${entry.name}`)
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
