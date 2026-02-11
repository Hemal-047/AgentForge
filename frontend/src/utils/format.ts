export const decoder = new TextDecoder()

export function decodeBytes(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return decoder.decode(value)
  if (Array.isArray(value)) return decoder.decode(new Uint8Array(value))
  return String(value ?? '')
}

export function formatMist(mist: number | string): string {
  const num = typeof mist === 'string' ? Number(mist) : mist
  if (!Number.isFinite(num)) return '0'
  return (num / 1_000_000_000).toFixed(4)
}

export function formatTimestamp(ms: number | string): string {
  const num = typeof ms === 'string' ? Number(ms) : ms
  if (!Number.isFinite(num)) return '—'
  return new Date(num).toLocaleString()
}
