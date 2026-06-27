import { shell } from 'electron'
import { lookup } from 'node:dns/promises'
import type { UnsubInfo, UnsubResult } from '../scan/types'

function isPrivateV4(ip: string): boolean {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true
  const [a, b] = p
  if (a === 0 || a === 127 || a === 10) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateIp(ip: string, family: number): boolean {
  if (family === 4) return isPrivateV4(ip)
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (/^fe[89ab]/.test(lower)) return true
  if (/^f[cd]/.test(lower)) return true
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateV4(mapped[1])
  return false
}

async function isPublicHttps(url: string): Promise<boolean> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  try {
    const addrs = await lookup(u.hostname, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address, a.family))
  } catch {
    return false
  }
}

export async function unsubscribe(info: UnsubInfo | undefined): Promise<UnsubResult> {
  if (!info) return { method: 'none' }

  if (info.oneClick && info.url && (await isPublicHttps(info.url))) {
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
