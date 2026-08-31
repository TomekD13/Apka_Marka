// Rozpakowanie ZIP-a w przegladarce - moduly z repozytoriow (ph4.org, mysword.info)
// pobiera sie wlasnie jako `.zip`, a czytelnik nie ma na telefonie czym ich otworzyc.
//
// Robimy tylko tyle, ile trzeba: znajdujemy pliki w spisie na koncu archiwum i wyjmujemy
// ten jeden, ktory nas interesuje. Rozpakowanie robi `DecompressionStream('deflate-raw')`,
// czyli sama przegladarka - zadnej biblioteki. Pliki nieskompresowane (metoda 0) i
// skompresowane deflate (metoda 8) to caly zakres, jakiego uzywaja moduly.

export interface ZipEntry {
  name: string
  size: number
  read: () => Promise<ArrayBuffer>
}

const SIGNATURE_END = 0x06054b50 // koniec spisu centralnego
const SIGNATURE_FILE = 0x02014b50 // wpis w spisie centralnym

/** Spis plikow w archiwum; rzuca 'bad-zip', gdy to nie jest ZIP. */
export function listZip(buffer: ArrayBuffer): ZipEntry[] {
  const data = new Uint8Array(buffer)
  const view = new DataView(buffer)

  // stopka stoi na koncu, ale moze byc za nia komentarz - szukamy wstecz
  let end = -1
  for (let i = data.length - 22; i >= 0 && i > data.length - 66000; i--) {
    if (view.getUint32(i, true) === SIGNATURE_END) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('bad-zip')

  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const out: ZipEntry[] = []

  for (let i = 0; i < count && at + 46 <= data.length; i++) {
    if (view.getUint32(at, true) !== SIGNATURE_FILE) break
    const method = view.getUint16(at + 10, true)
    const compressed = view.getUint32(at + 20, true)
    const size = view.getUint32(at + 24, true)
    const nameLen = view.getUint16(at + 28, true)
    const extraLen = view.getUint16(at + 30, true)
    const commentLen = view.getUint16(at + 32, true)
    const localAt = view.getUint32(at + 42, true)
    const name = new TextDecoder('utf-8').decode(data.subarray(at + 46, at + 46 + nameLen))
    at += 46 + nameLen + extraLen + commentLen

    out.push({
      name,
      size,
      read: async () => {
        // naglowek lokalny ma wlasne dlugosci nazwy i pola dodatkowego
        const nl = view.getUint16(localAt + 26, true)
        const el = view.getUint16(localAt + 28, true)
        const start = localAt + 30 + nl + el
        const body = data.subarray(start, start + compressed)
        if (method === 0) return body.slice().buffer
        if (method !== 8) throw new Error('bad-zip')
        if (typeof DecompressionStream === 'undefined') throw new Error('bad-zip')
        // `Blob.stream()` nie jest dostępne w części przeglądarek mobilnych,
        // choć obsługują już DecompressionStream. Response daje ten sam strumień
        // danych i działa szerzej, więc moduł da się rozpakować także na telefonie.
        const source = new Response(body).body
        if (!source) throw new Error('bad-zip')
        const stream = source.pipeThrough(new DecompressionStream('deflate-raw'))
        return new Response(stream).arrayBuffer()
      },
    })
  }
  return out
}

/**
 * Wyjmuje z archiwum pierwszy plik o jednym ze wskazanych rozszerzen.
 * Zwraca null, gdy w srodku nie ma niczego pasujacego.
 */
export async function pickFromZip(
  buffer: ArrayBuffer,
  extensions: string[]
): Promise<{ name: string; data: ArrayBuffer } | null> {
  const entries = listZip(buffer)
    .filter((e) => !e.name.endsWith('/') && !e.name.startsWith('__MACOSX/'))
    // najwiekszy plik pierwszy - modul zawsze jest najciezszy w paczce
    .sort((a, b) => b.size - a.size)
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (extensions.some((ext) => lower.endsWith(ext))) {
      return { name: entry.name, data: await entry.read() }
    }
  }
  return null
}
