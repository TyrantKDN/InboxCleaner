import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import type { RawHeader } from '../../scan/types'
import { parseUnsub } from '../../scan/unsub'

const HEADERS = ['From', 'List-Unsubscribe', 'List-Unsubscribe-Post']

function parseFrom(value: string): { name: string; email: string } {
  const m = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  return { name: value.trim(), email: value.trim().toLowerCase() }
}

function headerValue(
  headers: { name?: string | null; value?: string | null }[],
  name: string,
): string | undefined {
  const lower = name.toLowerCase()
  return headers.find((h) => h.name?.toLowerCase() === lower)?.value ?? undefined
}

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: number; code?: number }
  if (typeof e?.status === 'number') return e.status
  if (typeof e?.code === 'number') return e.code
  return undefined
}

function isTransient(err: unknown): boolean {
  const s = statusOf(err)
  return s === 429 || (typeof s === 'number' && s >= 500 && s < 600)
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let delay = 500
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (err) {
      if (!isTransient(err) || i >= attempts - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2
    }
  }
}

export async function fetchHeaders(
  auth: OAuth2Client,
  max = 500,
  onProgress?: (fetched: number, total: number) => void,
): Promise<RawHeader[]> {
  const gmail = google.gmail({ version: 'v1', auth })
  const out: RawHeader[] = []
  let pageToken: string | undefined
  let total = max
  while (out.length < max) {
    const list = await gmail.users.messages.list({
      userId: 'me', maxResults: Math.min(100, max - out.length), pageToken,
      includeSpamTrash: true,
    })
    if (typeof list.data.resultSizeEstimate === 'number') {
      total = Math.min(max, Math.max(out.length, list.data.resultSizeEstimate))
    }
    const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean)
    for (const id of ids) {
      let msg
      try {
        msg = await withRetry(() =>
          gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: HEADERS }),
        )
      } catch (err) {
        if (isTransient(err)) throw err
        continue
      }
      const labels = (msg.data.labelIds ?? []).map((l) => l.toLowerCase())
      if (labels.includes('trash')) continue
      const headers = msg.data.payload?.headers ?? []
      const from = headerValue(headers, 'From') ?? 'unknown'
      const { name, email } = parseFrom(from)
      const unsubscribe = parseUnsub(
        headerValue(headers, 'List-Unsubscribe'),
        headerValue(headers, 'List-Unsubscribe-Post'),
      )
      out.push({
        id,
        fromName: name,
        fromEmail: email,
        hasListUnsubscribe: !!unsubscribe,
        unsubscribe,
        labels,
        isRead: !labels.includes('unread'),
      })
      onProgress?.(out.length, total)
    }
    pageToken = list.data.nextPageToken ?? undefined
    if (!pageToken) break
  }
  return out
}
