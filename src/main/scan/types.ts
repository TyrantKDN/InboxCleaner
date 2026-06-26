export interface UnsubInfo {
  url?: string
  mailto?: string
  oneClick: boolean
}

export type UnsubMethod = 'one-click' | 'opened-page' | 'opened-mail' | 'none'

export interface UnsubResult {
  method: UnsubMethod
}

export interface RawHeader {
  id: string
  fromName: string
  fromEmail: string
  hasListUnsubscribe: boolean
  unsubscribe?: UnsubInfo
  labels: string[]
  isRead: boolean
}

export type FlagKind = 'never_opened' | 'newsletter' | 'likely_spam'

export interface SenderGroup {
  fromEmail: string
  fromName: string
  count: number
  openedCount: number
  hasListUnsubscribe: boolean
  unsubscribe?: UnsubInfo
  flags: FlagKind[]
}

export interface ScanResult {
  account: string
  scannedCount: number
  senders: SenderGroup[]
}

export interface ScanProgress {
  fetched: number
  total: number
}
