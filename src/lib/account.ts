// Konto czytelnika: logowanie (Google albo link na e-mail) i synchronizacja
// notatek, dziennika modlitw, zakladek i ulubionych piesni przez Firestore.
// Ladowane leniwie przez lib/accountGate.ts. Opis: _PROPOZYCJA_konta-i-powiadomienia.md
//
// Zasada: localStorage zostaje glownym miejscem zapisu. Chmura dostaje kopie
// w tle i oddaje zmiany z innych urzadzen. Dane w Firestore: users/{uid}/lists/{lista},
// a reguly bezpieczenstwa wpuszczaja tylko wlasciciela.

import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  deleteUser,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'
import { markSignedIn } from './accountGate'
import {
  docIdOf,
  getKeyMeta,
  isSyncedKey,
  keyOfDoc,
  mergeList,
  onLocalChange,
  setKeyMeta,
  stableJson,
  type RemoteList,
} from './syncMeta'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
// notatki maja pola opcjonalne (ref, source) - Firestore nie przyjmuje undefined
const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

const EMAIL = 'zywe-slowo:sync:email'

/** Zdarzenie dla stron, ktore chca odswiezyc liste po zmianie z innego urzadzenia. */
export const SYNCED_EVENT = 'zywe-slowo:synced'

// --- stan dla interfejsu ----------------------------------------------------

export interface AccountUser {
  email: string
  name: string
  google: boolean
}
export interface AccountState {
  ready: boolean
  user: AccountUser | null
  sync: 'idle' | 'syncing' | 'ok' | 'error'
  lastSync?: number
}

let state: AccountState = { ready: false, user: null, sync: 'idle' }
const subs = new Set<(s: AccountState) => void>()

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch }
  for (const fn of subs) fn(state)
}
export const getState = () => state
export function subscribe(fn: (s: AccountState) => void): () => void {
  subs.add(fn)
  return () => subs.delete(fn)
}

const toUser = (u: User): AccountUser => ({
  email: u.email || '',
  name: u.displayName || '',
  google: u.providerData.some((p) => p.providerId === 'google.com'),
})

let started = false
export function start(): void {
  if (started) return
  started = true
  onAuthStateChanged(auth, (u) => {
    stopSync()
    markSignedIn(!!u)
    set({ ready: true, user: u ? toUser(u) : null, sync: u ? 'syncing' : 'idle' })
    if (u) startSync(u.uid)
  })
}

// --- synchronizacja -----------------------------------------------------------

const remote = new Map<string, RemoteList>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let stopSnap: Unsubscribe | null = null
let stopLocal: (() => void) | null = null

function localSyncedKeys(): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && isSyncedKey(k)) out.push(k)
    }
  } catch {
    /* brak dostepu do localStorage - nie ma czego wysylac */
  }
  return out
}

function readLocal(key: string): unknown[] {
  try {
    const x = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(x) ? x : []
  } catch {
    return []
  }
}

function mergeKey(uid: string, key: string) {
  const local = readLocal(key)
  const r = remote.get(key) ?? null
  const m = mergeList(key, local, getKeyMeta(key), r)

  if (stableJson(m.items) !== stableJson(local)) {
    try {
      // prosto do localStorage, z pominieciem writeList - to nie jest nowa zmiana czytelnika
      localStorage.setItem(key, JSON.stringify(m.items))
      window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: key }))
    } catch {
      /* brak miejsca - zostaje to, co bylo */
    }
  }
  setKeyMeta(key, m.meta)

  const empty = !Object.keys(m.remote.items).length && !Object.keys(m.remote.d).length
  if (!r && empty) return
  if (r && stableJson({ items: r.items || {}, d: r.d || {} }) === stableJson(m.remote)) return
  remote.set(key, m.remote)
  set({ sync: 'syncing' })
  setDoc(doc(db, 'users', uid, 'lists', docIdOf(key)), { ...m.remote, updated: serverTimestamp() })
    .then(() => set({ sync: 'ok', lastSync: Date.now() }))
    .catch(() => set({ sync: 'error' }))
}

function startSync(uid: string) {
  let first = true
  stopSnap = onSnapshot(
    collection(db, 'users', uid, 'lists'),
    (snap) => {
      const changed: string[] = []
      for (const ch of snap.docChanges()) {
        const key = keyOfDoc(ch.doc.id)
        if (!isSyncedKey(key)) continue
        if (ch.type === 'removed') remote.delete(key)
        else remote.set(key, ch.doc.data() as RemoteList)
        changed.push(key)
      }
      // za pierwszym razem scalamy wszystko: liste z chmury i liste z tego urzadzenia
      const keys = first ? new Set([...remote.keys(), ...localSyncedKeys()]) : new Set(changed)
      first = false
      for (const k of keys) mergeKey(uid, k)
      if (!snap.metadata.hasPendingWrites) set({ sync: 'ok', lastSync: Date.now() })
    },
    () => set({ sync: 'error' })
  )
  stopLocal = onLocalChange((key) => {
    clearTimeout(timers.get(key))
    timers.set(key, setTimeout(() => mergeKey(uid, key), 800))
  })
}

function stopSync() {
  stopSnap?.()
  stopLocal?.()
  stopSnap = stopLocal = null
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  remote.clear()
}

// --- logowanie ----------------------------------------------------------------

export const errorCode = (e: unknown) => String((e as { code?: string })?.code || (e as Error)?.message || e)

export async function signInGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(auth, provider)
}

/** Wysyla link logowania; adres zostaje w tej przegladarce, zeby nie pytac o niego drugi raz. */
export async function sendEmailLink(email: string, lang: string): Promise<void> {
  auth.languageCode = lang
  await sendSignInLinkToEmail(auth, email, {
    url: `${location.origin}${import.meta.env.BASE_URL}${lang}/konto`,
    handleCodeInApp: true,
  })
  try {
    localStorage.setItem(EMAIL, email)
  } catch {
    /* przy powrocie z linku zapytamy o adres */
  }
}

export const isEmailLink = (href: string) => isSignInWithEmailLink(auth, href)

export function storedEmail(): string {
  try {
    return localStorage.getItem(EMAIL) || ''
  } catch {
    return ''
  }
}

/** Konczy logowanie z linku. Link otwarty w innej przegladarce wymaga wpisania adresu. */
export async function finishEmailLink(href: string, email: string): Promise<void> {
  await signInWithEmailLink(auth, email, href)
  try {
    localStorage.removeItem(EMAIL)
  } catch {
    /* nic */
  }
}

/** Wylogowanie. Rzeczy zostaja na tym urzadzeniu - konto tylko przestaje je kopiowac. */
export async function signOut(): Promise<void> {
  stopSync()
  await fbSignOut(auth)
}

/**
 * Kasuje dane w chmurze i samo konto. Rzeczy na tym urzadzeniu zostaja.
 * Zwraca 'relogin', gdy Firebase wymaga swiezego logowania linkiem.
 */
export async function deleteAccount(): Promise<'done' | 'relogin'> {
  const u = auth.currentUser
  if (!u) return 'done'
  stopSync()
  const docs = await getDocs(collection(db, 'users', u.uid, 'lists'))
  await Promise.all(docs.docs.map((d) => deleteDoc(d.ref)))
  try {
    await deleteUser(u)
  } catch (e) {
    if (errorCode(e) !== 'auth/requires-recent-login') throw e
    if (!toUser(u).google) {
      await fbSignOut(auth)
      return 'relogin'
    }
    await reauthenticateWithPopup(u, new GoogleAuthProvider())
    await deleteUser(u)
  }
  return 'done'
}
