import type { BibleNote } from '../types'
import { exportJson, newId, parseBackup, readList, writeList } from './localStore'

// Notatki nie opuszczaja urzadzenia - patrz lib/localStore.ts.
const KEY = 'zywe-slowo:notes:v1'

const read = () => readList<BibleNote>(KEY)
const write = (items: BibleNote[]) => writeList(KEY, items)

/** Notatki od najswiezszej. */
export function listNotes(): BibleNote[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getNote(id: string): BibleNote | undefined {
  return read().find((n) => n.id === id)
}


/** Zapisuje notatke (nowa gdy bez id) i zwraca zapisana wersje; null = zapis niemozliwy. */
export function saveNote(
  input: Partial<BibleNote> & { title: string; body: string }
): BibleNote | null {
  const notes = read()
  const now = new Date().toISOString()
  const i = input.id ? notes.findIndex((n) => n.id === input.id) : -1
  const note: BibleNote = {
    id: input.id || newId(),
    title: input.title.trim(),
    body: input.body,
    ref: input.ref?.trim() || undefined,
    source: input.source,
    createdAt: i >= 0 ? notes[i].createdAt : now,
    updatedAt: now,
  }
  if (i >= 0) notes[i] = note
  else notes.unshift(note)
  return write(notes) ? note : null
}

export function deleteNote(id: string): void {
  write(read().filter((n) => n.id !== id))
}

export const exportNotes = () => exportJson('notes', listNotes())

/** Dokłada notatki z kopii; te same id nadpisują istniejące. Zwraca liczbę wczytanych. */
export function importNotes(json: string): number {
  const incoming = parseBackup(json, 'notes') as Partial<BibleNote>[]
  const byId = new Map(read().map((n) => [n.id, n]))
  let n = 0
  for (const raw of incoming) {
    if (!raw || typeof raw.title !== 'string' || typeof raw.body !== 'string') continue
    const id = raw.id || newId()
    const now = new Date().toISOString()
    byId.set(id, {
      id,
      title: raw.title,
      body: raw.body,
      ref: raw.ref,
      source: raw.source,
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || now,
    })
    n++
  }
  write([...byId.values()])
  return n
}
