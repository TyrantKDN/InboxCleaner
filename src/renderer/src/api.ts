import type { ScanResult, ScanProgress, UnsubInfo, UnsubResult } from '../../main/scan/types'

export type { ScanProgress, UnsubInfo, UnsubResult }

export type ProviderId = 'gmail' | 'outlook'
export interface AccountInfo {
  provider: ProviderId
  account: string
}

export interface UpdateStatus {
  phase: 'checking' | 'available' | 'downloading' | 'installing' | 'uptodate' | 'error'
  message: string
  percent?: number
  detail?: string
}

export interface Api {
  connect: (provider: ProviderId) => Promise<AccountInfo>
  restore: () => Promise<AccountInfo | null>
  disconnect: () => Promise<void>
  scan: () => Promise<ScanResult>
  cached: (account: string) => Promise<ScanResult | null>
  onScanProgress: (cb: (p: ScanProgress) => void) => () => void
  onUpdateStatus: (cb: (s: UpdateStatus) => void) => () => void
  unsubscribe: (info: UnsubInfo) => Promise<UnsubResult>
  block: (email: string) => Promise<void>
  deleteSender: (email: string) => Promise<number>
}

declare global {
  interface Window {
    api: Api
  }
}
export const api: Api = window.api
