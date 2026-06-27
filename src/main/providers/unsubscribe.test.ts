import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shell } from 'electron'
import { lookup } from 'node:dns/promises'
import { unsubscribe } from './unsubscribe'

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }))
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

const openExternal = shell.openExternal as unknown as ReturnType<typeof vi.fn>
const mockLookup = lookup as unknown as ReturnType<typeof vi.fn>

describe('unsubscribe', () => {
  beforeEach(() => {
    openExternal.mockReset()
    openExternal.mockResolvedValue(undefined)
    mockLookup.mockReset()
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    vi.stubGlobal('fetch', vi.fn())
  })

  it('reports one-click success when a public https endpoint returns ok', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
    const r = await unsubscribe({ oneClick: true, url: 'https://example.com/u' })
    expect(r.method).toBe('one-click')
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('falls through to opening the page when one-click returns a non-ok status', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false })
    const r = await unsubscribe({ oneClick: true, url: 'https://example.com/u' })
    expect(r.method).toBe('opened-page')
    expect(openExternal).toHaveBeenCalledWith('https://example.com/u')
  })

  it('does not POST to a non-https one-click url', async () => {
    const r = await unsubscribe({ oneClick: true, url: 'http://example.com/u' })
    expect(fetch).not.toHaveBeenCalled()
    expect(r.method).toBe('opened-page')
  })

  it('does not POST when the host resolves to a private address', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])
    const r = await unsubscribe({ oneClick: true, url: 'https://internal.evil.test/u' })
    expect(fetch).not.toHaveBeenCalled()
    expect(r.method).toBe('opened-page')
  })

  it('opens a mailto link when there is no url', async () => {
    const r = await unsubscribe({ oneClick: false, mailto: 'mailto:x@example.com' })
    expect(r.method).toBe('opened-mail')
    expect(openExternal).toHaveBeenCalledWith('mailto:x@example.com')
  })

  it('returns none when there is no unsubscribe info', async () => {
    const r = await unsubscribe(undefined)
    expect(r.method).toBe('none')
  })
})
