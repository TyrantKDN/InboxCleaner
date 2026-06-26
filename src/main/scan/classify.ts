import type { SenderGroup, FlagKind } from './types'

export interface ClassifyOpts {
  spam?: boolean
}

const NEVER_OPENED_MIN = 5

export function classify(group: SenderGroup, opts: ClassifyOpts = {}): SenderGroup {
  const flags: FlagKind[] = []
  if (group.hasListUnsubscribe) flags.push('newsletter')
  if (group.count >= NEVER_OPENED_MIN && group.openedCount === 0) flags.push('never_opened')
  if (opts.spam) flags.push('likely_spam')
  return { ...group, flags }
}
