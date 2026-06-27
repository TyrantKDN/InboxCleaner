import { describe, it, expect, vi, beforeEach } from 'vitest'
import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { blockSender } from './actions'

vi.mock('googleapis', () => {
  const create = vi.fn()
  return {
    google: {
      gmail: () => ({ users: { settings: { filters: { create } } } }),
      __create: create,
    },
  }
})

const create = (google as unknown as { __create: ReturnType<typeof vi.fn> }).__create
const auth = {} as OAuth2Client

describe('blockSender', () => {
  beforeEach(() => create.mockReset())

  it('creates a filter for the sender', async () => {
    create.mockResolvedValueOnce({})
    await blockSender(auth, 'spam@example.com')
    expect(create).toHaveBeenCalledOnce()
    expect(create.mock.calls[0][0].requestBody.criteria.from).toBe('spam@example.com')
  })

  it('treats an already-existing filter as success (idempotent)', async () => {
    create.mockImplementationOnce(() => {
      throw Object.assign(new Error('Filter already exists'), { status: 409 })
    })
    await expect(blockSender(auth, 'spam@example.com')).resolves.toBeUndefined()
  })

  it('rethrows unrelated errors', async () => {
    create.mockImplementationOnce(() => {
      throw Object.assign(new Error('Backend error'), { status: 500 })
    })
    await expect(blockSender(auth, 'spam@example.com')).rejects.toThrow('Backend error')
  })
})
