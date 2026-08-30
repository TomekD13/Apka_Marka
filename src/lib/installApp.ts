type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'ready' | 'ios' | 'installed' | 'unavailable'

let deferredPrompt: DeferredInstallPrompt | null = null
let initialized = false
const listeners = new Set<() => void>()

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  const agent = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function getInstallState(): InstallState {
  if (typeof window === 'undefined') return 'unavailable'
  if (isInstalled()) return 'installed'
  if (deferredPrompt) return 'ready'
  return isIos() ? 'ios' : 'unavailable'
}

export function initAppInstall() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as DeferredInstallPrompt
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function requestInstall() {
  if (!deferredPrompt) return 'unavailable'
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  notify()
  return outcome
}
