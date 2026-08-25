// Udostepnianie tresci: natywny share sheet (mobile: WhatsApp/Messenger/SMS...),
// z fallbackiem do skopiowania do schowka. Bez sledzenia, bez zewnetrznych SDK.
export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareContent(data: { title?: string; text: string; url?: string }): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e: any) {
      if (e && e.name === 'AbortError') return 'failed' // uzytkownik anulowal okno
      // inny blad -> probujemy schowka ponizej
    }
  }
  try {
    const full = [data.text, data.url].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(full)
    return 'copied'
  } catch {
    return 'failed'
  }
}
