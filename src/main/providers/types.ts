import type { ScanResult, UnsubInfo, UnsubResult } from '../scan/types'

export interface MailProvider {
  connect(): Promise<string>
  restore(): Promise<string | null>
  scan(
    maxMessages?: number,
    onProgress?: (fetched: number, total: number) => void,
  ): Promise<ScanResult>
  unsubscribe(info: UnsubInfo): Promise<UnsubResult>
  block(email: string): Promise<void>
  deleteSender(email: string): Promise<number>
}
