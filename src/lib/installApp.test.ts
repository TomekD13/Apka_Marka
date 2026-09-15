import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
const DIAGNOSTICS_STORAGE_KEY = 'zywe-slowo:install-diagnostics:v1'

function setServiceWorker(value: ServiceWorkerContainer | undefined) {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value })
}

function installPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    platforms: string[]
  }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome, platform: 'web' })
  event.platforms = ['web']
  return event
}

describe('diagnostyka instalacji PWA', () => {
  beforeEach(() => {
    vi.resetModules()
    sessionStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    setServiceWorker(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
    if (originalServiceWorker) Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    else Reflect.deleteProperty(navigator, 'serviceWorker')
    vi.unstubAllGlobals()
  })

  it('rejestruje monit, jego wynik i powiadamia subskrybentów', async () => {
    const install = await import('./installApp')
    install.initAppInstall()
    const listener = vi.fn()
    const unsubscribe = install.subscribeInstallDiagnostics(listener)
    const event = installPrompt('accepted')

    window.dispatchEvent(event)
    expect(install.getInstallState()).toBe('ready')
    expect(await install.requestInstall()).toBe('accepted')
    expect(event.prompt).toHaveBeenCalledOnce()

    const names = install.getInstallDiagnostics().map((entry) => entry.event)
    expect(names).toContain('install.beforeinstallprompt')
    expect(names).toContain('install.prompt-called')
    expect(names).toContain('install.user-choice')
    expect(listener).toHaveBeenCalled()

    unsubscribe()
    const calls = listener.mock.calls.length
    window.dispatchEvent(new Event('appinstalled'))
    expect(listener).toHaveBeenCalledTimes(calls)
  })

  it('odtwarza zwalidowane wpisy z sessionStorage po ponownym zaladowaniu modulu', async () => {
    const firstLoad = await import('./installApp')
    firstLoad.initAppInstall()
    const event = installPrompt('dismissed')
    window.dispatchEvent(event)
    expect(await firstLoad.requestInstall()).toBe('dismissed')

    const beforeReload = firstLoad.getInstallDiagnostics()
    expect(beforeReload.map((entry) => entry.event)).toContain('install.user-choice')
    expect(JSON.parse(sessionStorage.getItem(DIAGNOSTICS_STORAGE_KEY) ?? '[]')).toEqual(beforeReload)

    vi.resetModules()
    const afterReload = await import('./installApp')
    expect(afterReload.getInstallDiagnostics()).toEqual(beforeReload)
  })

  it('pomija uszkodzone wpisy i dziala, gdy sessionStorage rzuca wyjatki', async () => {
    const validEntry = {
      timestamp: '2026-09-07T16:47:57.732Z',
      event: 'install.prompt-called',
    }
    sessionStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify([
      validEntry,
      null,
      { timestamp: 'nie-data', event: 'install.prompt-called' },
      { ...validEntry, details: { content: 'tresc uzytkownika' } },
      { ...validEntry, details: { scope: 'https://example.test/app/?token=sekret#fragment' } },
    ]))

    const install = await import('./installApp')
    expect(install.getInstallDiagnostics()).toEqual([validEntry])

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage blocked')
    })
    vi.resetModules()
    const withoutStorage = await import('./installApp')
    expect(withoutStorage.getInstallDiagnostics()).toEqual([])
    expect(() => withoutStorage.initAppInstall()).not.toThrow()
  })

  it('zbiera bezpieczny stan service workera i usuwa parametry z adresów', async () => {
    const worker = {
      state: 'activated',
      scriptURL: 'https://example.test/aplikacja/sw.js?token=sekret#fragment',
      addEventListener: vi.fn(),
    } as unknown as ServiceWorker
    const registration = {
      scope: 'https://example.test/aplikacja/?token=sekret#fragment',
      active: worker,
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
    } as unknown as ServiceWorkerRegistration
    const container = {
      controller: worker,
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
      addEventListener: vi.fn(),
    } as unknown as ServiceWorkerContainer
    setServiceWorker(container)

    const install = await import('./installApp')
    install.initAppInstall()
    await Promise.resolve()
    await Promise.resolve()

    const report = JSON.stringify(install.getInstallDiagnostics())
    expect(report).toContain('service-worker.ready')
    expect(report).toContain('https://example.test/aplikacja/')
    expect(report).not.toContain('sekret')
    expect(report).not.toContain('#fragment')
  })

  it('ogranicza bufor do 50 najnowszych wpisów i zapisuje wyjątek promptu', async () => {
    const install = await import('./installApp')
    install.initAppInstall()
    for (let i = 0; i < 55; i += 1) window.dispatchEvent(new Event('beforeinstallprompt'))

    const event = installPrompt()
    event.prompt.mockRejectedValue(new Error('Blad https://example.test/aplikacja/?token=sekret'))
    window.dispatchEvent(event)
    expect(await install.requestInstall()).toBe('unavailable')

    const diagnostics = install.getInstallDiagnostics()
    expect(diagnostics).toHaveLength(50)
    expect(diagnostics[diagnostics.length - 1]?.event).toBe('install.prompt-error')
    expect(JSON.stringify(diagnostics)).not.toContain('sekret')
  })
})
