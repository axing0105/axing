function convert(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const maybeDecimal = value as { toFixed?: unknown; toNumber?: () => number; toString?: () => string }
    if (typeof maybeDecimal.toFixed === 'function') {
      if (typeof maybeDecimal.toNumber === 'function') return maybeDecimal.toNumber()
      return Number(maybeDecimal.toString?.() ?? value)
    }
    if (Array.isArray(value)) return value.map(convert)
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = convert(v)
    }
    return out
  }
  return value
}

/** Convert Prisma Decimal / Date values into JSON-friendly shapes */
export function serialize<T>(data: T): T {
  return convert(data) as T
}
