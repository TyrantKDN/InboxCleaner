import { describe, it, expect } from 'vitest'
import { groupBySender } from '../src/main/scan/group'
import type { RawHeader } from '../src/main/scan/types'

const h = (over: Partial<RawHeader>): RawHeader => ({
  id: '1', fromName: 'A', fromEmail: 'a@x.com',
  hasListUnsubscribe: false, labels: [], isRead: false, ...over,
})

describe('groupBySender', () => {
  it('groups messages by lowercased email and counts them', () => {
    const groups = groupBySender([
      h({ id: '1', fromEmail: 'Deals@Shop.com', isRead: false }),
      h({ id: '2', fromEmail: 'deals@shop.com', isRead: true }),
      h({ id: '3', fromEmail: 'other@x.com', isRead: false }),
    ])
    const deals = groups.find((g) => g.fromEmail === 'deals@shop.com')!
    expect(deals.count).toBe(2)
    expect(deals.openedCount).toBe(1)
    expect(groups).toHaveLength(2)
  })

  it('marks hasListUnsubscribe if any message from the sender had it', () => {
    const groups = groupBySender([
      h({ id: '1', fromEmail: 'n@x.com', hasListUnsubscribe: false }),
      h({ id: '2', fromEmail: 'n@x.com', hasListUnsubscribe: true }),
    ])
    expect(groups[0].hasListUnsubscribe).toBe(true)
  })

  it('sorts senders by count descending', () => {
    const groups = groupBySender([
      h({ id: '1', fromEmail: 'small@x.com' }),
      h({ id: '2', fromEmail: 'big@x.com' }),
      h({ id: '3', fromEmail: 'big@x.com' }),
    ])
    expect(groups[0].fromEmail).toBe('big@x.com')
  })
})
