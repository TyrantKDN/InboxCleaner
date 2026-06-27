import { describe, it, expect, vi, beforeEach } from 'vitest'
import { graph } from './graph'
import { blockSenderOutlook } from './actions'

vi.mock('./graph', () => ({ graph: vi.fn(), relativeNext: vi.fn() }))

const mockGraph = graph as unknown as ReturnType<typeof vi.fn>

describe('blockSenderOutlook', () => {
  beforeEach(() => mockGraph.mockReset())

  it('creates a rule with a unique sequence when none exists', async () => {
    mockGraph.mockResolvedValueOnce({ value: [{ id: '1', displayName: 'Other', sequence: 3 }] })
    mockGraph.mockResolvedValueOnce(null)
    await blockSenderOutlook('tok', 'spam@example.com')
    expect(mockGraph).toHaveBeenCalledTimes(2)
    const post = mockGraph.mock.calls[1]
    expect(post[1]).toBe('/me/mailFolders/inbox/messageRules')
    const body = JSON.parse(post[2].body)
    expect(body.displayName).toBe('Inbox Cleaner: spam@example.com')
    expect(body.sequence).toBe(4)
    expect(body.conditions.senderContains).toEqual(['spam@example.com'])
  })

  it('does not create a duplicate rule when one already exists', async () => {
    mockGraph.mockResolvedValueOnce({
      value: [{ id: '1', displayName: 'Inbox Cleaner: spam@example.com', sequence: 1 }],
    })
    await blockSenderOutlook('tok', 'spam@example.com')
    expect(mockGraph).toHaveBeenCalledOnce()
  })

  it('uses sequence 1 for the first rule', async () => {
    mockGraph.mockResolvedValueOnce({ value: [] })
    mockGraph.mockResolvedValueOnce(null)
    await blockSenderOutlook('tok', 'a@b.com')
    const body = JSON.parse(mockGraph.mock.calls[1][2].body)
    expect(body.sequence).toBe(1)
  })
})
