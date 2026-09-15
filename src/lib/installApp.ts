type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
  platforms?: string[]
}

export type InstallState = 'ready' | 'ios' | 'installed' | 'unavailable'

export type InstallDiagnostic = {
  timestamp: string
  event: string
  details?: Record<string, string | number | boolean | null>
}

const MAX_DIAGNOSTICS = 50
const DIAGNOSTICS_STORAGE_KEY = 'zywe-slowo:install-diagnostics:v1'
const DIAGNOSTIC_EVENTS = new Set([
  'install.init',
  'install.beforeinstallprompt',
  'install.appinstalled',
  'install.prompt-unavailable',
  'install.prompt-called',
  'install.prompt-resolved',
  'install.user-choice',
  'install.prompt-error',
  'service-worker.status',
  'service-worker.worker',
  'service-worker.statechange',
  'service-worker.error',
  'service-worker.registration',
  'service-worker.updatefound',
  'service-worker.controllerchange',
  'service-worker.messageerror',
  'service-worker.registration-error',
  'service-worker.ready',
  'service-worker.ready-error',
])
const DIAGNOSTIC_DETAIL_KEYS = new Set([
  'secureContext',
  'installed',
  'supported',
  'controller',
  'ready',
  'controllerState',
  'role',
  'state',
  'script',
  'message',
  'source',
  'scope',
  'active',
  'waiting',
  'installing',
  'name',
  'platforms',
  'outcome',
  'platform',
])

let deferredPrompt: DeferredInstallPrompt | null = null
let initialized = false
const listeners = new Set<() => void>()
const diagnosticListeners = new Set<() => void>()
const diagnostics: InstallDiagnostic[] = restoreDiagnostics()
const observedWorkers = new WeakSet<ServiceWorker>()

function isInstalled() {
  const standaloneDisplay = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches
  return standaloneDisplay || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  const agent = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)
}

function notify() {
  listeners.forEach((listener) => listener())
}

function notifyDiagnostics() {
  diagnosticListeners.forEach((listener) => listener())
}

function safeUrl(value: string) {
  try {
    const url = new URL(value, window.location.href)
    return `${url.origin}${url.pathname}`
  } catch {
    return 'nieprawidlowy-adres'
  }
}

function safeText(value: string) {
  const withoutUrlParameters = value.replace(/https?:\/\/[^\s)'"<>]+/gi, (rawUrl) => safeUrl(rawUrl))
  return withoutUrlParameters.slice(0, 300)
}

function errorDetails(error: unknown) {
  if (error instanceof Error || error instanceof DOMException) {
    return { name: safeText(error.name || 'Error'), message: safeText(error.message || 'brak opisu') }
  }
  return { name: 'UnknownError', message: 'Przegladarka nie udostepnila szczegolow bledu.' }
}

function isDiagnosticDetails(value: unknown): value is NonNullable<InstallDiagnostic['details']> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const entries = Object.entries(value)
  return entries.length <= DIAGNOSTIC_DETAIL_KEYS.size && entries.every(([key, detail]) => {
    if (!DIAGNOSTIC_DETAIL_KEYS.has(key)) return false
    if (detail === null || typeof detail === 'boolean') return true
    if (typeof detail === 'number') return Number.isFinite(detail)
    return typeof detail === 'string' && detail.length <= 300 && safeText(detail) === detail
  })
}

function isInstallDiagnostic(value: unknown): value is InstallDiagnostic {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const entry = value as Record<string, unknown>
  if (Object.keys(entry).some((key) => key !== 'timestamp' && key !== 'event' && key !== 'details')) return false
  if (typeof entry.timestamp !== 'string' || typeof entry.event !== 'string') return false

  const parsedTimestamp = Date.parse(entry.timestamp)
  if (!Number.isFinite(parsedTimestamp) || new Date(parsedTimestamp).toISOString() !== entry.timestamp) return false
  if (!DIAGNOSTIC_EVENTS.has(entry.event)) return false
  return entry.details === undefined || isDiagnosticDetails(entry.details)
}

function restoreDiagnostics(): InstallDiagnostic[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.sessionStorage.getItem(DIAGNOSTICS_STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isInstallDiagnostic).slice(-MAX_DIAGNOSTICS)
  } catch {
    return []
  }
}

function persistDiagnostics() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(diagnostics))
  } catch {
    // sessionStorage moze byc niedostepny (np. przez polityke prywatnosci).
  }
}

function addDiagnostic(event: string, details?: InstallDiagnostic['details']) {
  diagnostics.push({ timestamp: new Date().toISOString(), event, ...(details ? { details } : {}) })
  if (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS)
  persistDiagnostics()
  notifyDiagnostics()
}

function workerDetails(worker: ServiceWorker) {
  return { state: worker.state, script: safeUrl(worker.scriptURL) }
}

function observeWorker(worker: ServiceWorker | null, role: string) {
  if (!worker || observedWorkers.has(worker)) return
  observedWorkers.add(worker)
  addDiagnostic('service-worker.worker', { role, ...workerDetails(worker) })
  worker.addEventListener('statechange', () => {
    addDiagnostic('service-worker.statechange', { role, ...workerDetails(worker) })
  })
  worker.addEventListener('error', () => {
    addDiagnostic('service-worker.error', { role, message: 'Przegladarka zglosila blad workera bez szczegolow.' })
  })
}

function recordRegistration(registration: ServiceWorkerRegistration, source: string) {
  addDiagnostic('service-worker.registration', {
    source,
    scope: safeUrl(registration.scope),
    active: registration.active?.state ?? null,
    waiting: registration.waiting?.state ?? null,
    installing: registration.installing?.state ?? null,
  })
  observeWorker(registration.active, 'active')
  observeWorker(registration.waiting, 'waiting')
  observeWorker(registration.installing, 'installing')
  registration.addEventListener('updatefound', () => {
    addDiagnostic('service-worker.updatefound', { scope: safeUrl(registration.scope) })
    observeWorker(registration.installing, 'installing')
  }, { once: true })
}

function inspectServiceWorker() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
    addDiagnostic('service-worker.status', { supported: false, controller: false, ready: false })
    return
  }

  const container = navigator.serviceWorker
  addDiagnostic('service-worker.status', {
    supported: true,
    controller: Boolean(container.controller),
    ready: false,
    controllerState: container.controller?.state ?? null,
  })
  observeWorker(container.controller, 'controller')

  container.addEventListener('controllerchange', () => {
    addDiagnostic('service-worker.controllerchange', {
      controller: Boolean(container.controller),
      controllerState: container.controller?.state ?? null,
    })
    observeWorker(container.controller, 'controller')
  })
  container.addEventListener('messageerror', () => {
    addDiagnostic('service-worker.messageerror', { message: 'Nie udalo sie odczytac wiadomosci service workera.' })
  })

  container.getRegistration()
    .then((registration) => {
      if (registration) recordRegistration(registration, 'getRegistration')
      else addDiagnostic('service-worker.registration', { source: 'getRegistration', scope: null })
    })
    .catch((error: unknown) => addDiagnostic('service-worker.registration-error', errorDetails(error)))

  container.ready
    .then((registration) => {
      addDiagnostic('service-worker.ready', { ready: true, scope: safeUrl(registration.scope) })
      recordRegistration(registration, 'ready')
    })
    .catch((error: unknown) => addDiagnostic('service-worker.ready-error', errorDetails(error)))
}

export function getInstallState(): InstallState {
  if (typeof window === 'undefined') return 'unavailable'
  if (isInstalled()) return 'installed'
  if (deferredPrompt) return 'ready'
  return isIos() ? 'ios' : 'unavailable'
}

export function getInstallDiagnostics(): InstallDiagnostic[] {
  return diagnostics.map((entry) => ({
    ...entry,
    ...(entry.details ? { details: { ...entry.details } } : {}),
  }))
}

export function initAppInstall() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  addDiagnostic('install.init', {
    secureContext: window.isSecureContext,
    installed: isInstalled(),
  })
  inspectServiceWorker()

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as DeferredInstallPrompt
    const platforms = deferredPrompt.platforms?.filter((platform) => /^[a-z0-9_-]+$/i.test(platform)).join(', ')
    addDiagnostic('install.beforeinstallprompt', { platforms: platforms || 'brak danych' })
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    addDiagnostic('install.appinstalled')
    notify()
  })
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function subscribeInstallDiagnostics(listener: () => void) {
  diagnosticListeners.add(listener)
  return () => {
    diagnosticListeners.delete(listener)
  }
}

export async function requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    addDiagnostic('install.prompt-unavailable')
    return 'unavailable'
  }

  const prompt = deferredPrompt
  addDiagnostic('install.prompt-called')
  try {
    await prompt.prompt()
    addDiagnostic('install.prompt-resolved')
    const { outcome, platform } = await prompt.userChoice
    addDiagnostic('install.user-choice', {
      outcome,
      platform: platform && /^[a-z0-9_-]+$/i.test(platform) ? platform : 'brak danych',
    })
    return outcome
  } catch (error: unknown) {
    addDiagnostic('install.prompt-error', errorDetails(error))
    return 'unavailable'
  } finally {
    if (deferredPrompt === prompt) deferredPrompt = null
    notify()
  }
}
