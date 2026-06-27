import { shell } from 'electron'
import type { UnsubInfo, UnsubResult } from '../scan/types'

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export async function unsubscribe(info: UnsubInfo | undefined): Promise<UnsubResult> {
  if (!info) return { method: 'none' }

  if (info.oneClick && info.url && isHttps(info.url)) {
    try {
      const res = await fetch(info.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) return { method: 'one-click' }
    } catch {
    }
  }
  if (info.url) {
    await shell.openExternal(info.url)
    return { method: 'opened-page' }
  }
  if (info.mailto) {
    await shell.openExternal(info.mailto)
    return { method: 'opened-mail' }
  }
  return { method: 'none' }
}
