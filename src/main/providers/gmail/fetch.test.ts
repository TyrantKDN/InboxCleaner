import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { fetchHeaders } from './fetch'

vi.mock('googleapis', () => {
  const list = vi.fn()
  const get = vi.fn()
  return {
    google: {
      gmail: () => ({ users: { messages: { list, get } } }),
      __list: list,
      __get: get,
    },
  }
})

const list = (google as unknown as { __list: ReturnType<typeof vi.fn> }).__list
const get = (google as unknown as { __get: ReturnType<typeof vi.fn> }).__get
const auth = {} as OAuth2Client

const onePage = { data: { messages: [{ id: '1' }], resultSizeEstimate: 1 } }
const goodMsg = {
  data: { labelIds: ['INBOX'], payload: { headers: [{ name: 'From', value: 'a@b.com' }] } },
}

describe('fetchHeaders', () => {
  beforeEach(() => {
    list.mockReset()
    get.mockReset()
    list.mockResolvedValue(onePage)
  })
  afterEach(() => vi.useRealTimers())

  it('retries a transient error then succeeds', async () => {
    get
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { code: 429 }))
      .mockResolvedValueOnce(goodMsg)
    vi.useFakeTimers()
    const p = fetchHeaders(auth, 1)
    await vi.runAllTimersAsync()
    const out = await p
    expect(out).toHaveLength(1)
    expect(out[0].fromEmail).toBe('a@b.com')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('skips a non-transient per-message error instead of failing the scan', async () => {
    get.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 404 }))
    const out = await fetchHeaders(auth, 1)
    expect(out).toHaveLength(0)
    expect(get).toHaveBeenCalledOnce()
  })
})
