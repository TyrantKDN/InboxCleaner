import type { UnsubInfo } from './types'

export function parseUnsub(listUnsub?: string, post?: string): UnsubInfo | undefined {
  if (!listUnsub) return undefined
  const bracketed = [...listUnsub.matchAll(/<([^>]+)>/g)].map((m) => m[1].trim())
  const targets = bracketed.length ? bracketed : listUnsub.split(',').map((t) => t.trim())
  const url = targets.find((t) => /^https?:/i.test(t))
  const mailto = targets.find((t) => /^mailto:/i.test(t))
  if (!url && !mailto) return undefined
  const oneClick = !!url && !!post && /one-click/i.test(post)
  return { url, mailto, oneClick }
}
