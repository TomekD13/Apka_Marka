/** Minimalne typy potrzebne wyłącznie testowi zasobu wbudowanego w aplikację. */
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array
  export function readFileSync(path: string, options: 'utf8'): string
}
