import { shell } from 'electron'
import type { UnsubInfo, UnsubResult } from '../scan/types'

export async function unsubscribe(info: UnsubInfo | undefined): Promise<UnsubResult> {
  if (!info) return { method: 'none' }

  if (info.oneClick && info.url) {
    try {
      await fetch(info.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      })
      return { method: 'one-click' }
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
