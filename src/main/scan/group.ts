import type { RawHeader, SenderGroup } from './types'

export function groupBySender(headers: RawHeader[]): SenderGroup[] {
  const map = new Map<string, SenderGroup>()
  for (const h of headers) {
    const key = h.fromEmail.trim().toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if (h.isRead) existing.openedCount += 1
      if (h.hasListUnsubscribe) existing.hasListUnsubscribe = true
      if (!existing.unsubscribe && h.unsubscribe) existing.unsubscribe = h.unsubscribe
    } else {
      map.set(key, {
        fromEmail: key,
        fromName: h.fromName || key,
        count: 1,
        openedCount: h.isRead ? 1 : 0,
        hasListUnsubscribe: h.hasListUnsubscribe,
        unsubscribe: h.unsubscribe,
        flags: [],
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
