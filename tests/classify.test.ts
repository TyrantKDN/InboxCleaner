import { describe, it, expect } from 'vitest'
import { classify } from '../src/main/scan/classify'
import type { SenderGroup } from '../src/main/scan/types'

const g = (over: Partial<SenderGroup>): SenderGroup => ({
  fromEmail: 'a@x.com', fromName: 'A', count: 10, openedCount: 0,
  hasListUnsubscribe: false, flags: [], ...over,
})

describe('classify', () => {
  it('flags newsletter when List-Unsubscribe present', () => {
    expect(classify(g({ hasListUnsubscribe: true }), {}).flags).toContain('newsletter')
  })

  it('flags never_opened for high-volume, zero-open senders', () => {
    expect(classify(g({ count: 10, openedCount: 0 }), {}).flags).toContain('never_opened')
  })

  it('does NOT flag never_opened when below threshold', () => {
    expect(classify(g({ count: 3, openedCount: 0 }), {}).flags).not.toContain('never_opened')
  })

  it('does NOT flag never_opened when some opened', () => {
    expect(classify(g({ count: 10, openedCount: 2 }), {}).flags).not.toContain('never_opened')
  })

  it('flags likely_spam when any message was labelled spam', () => {
    expect(classify(g({ count: 4 }), { spam: true }).flags).toContain('likely_spam')
  })
})
