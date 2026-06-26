import type { OAuth2Client } from 'google-auth-library'
import type { MailProvider } from '../types'
import type { ScanResult, UnsubInfo, UnsubResult } from '../../scan/types'
import { connectGmail, restoreGmail } from './auth'
import { fetchHeaders } from './fetch'
import { blockSender, deleteFromSender } from './actions'
import { unsubscribe as doUnsubscribe } from '../unsubscribe'
import { groupBySender } from '../../scan/group'
import { classify } from '../../scan/classify'
import { loadSession } from '../../store/tokens'

export class GmailProvider implements MailProvider {
  private auth: OAuth2Client | null = null

  async connect(): Promise<string> {
    this.auth = await connectGmail()
    return loadSession()?.account ?? 'unknown'
  }

  async restore(): Promise<string | null> {
    this.auth = await restoreGmail()
    return this.auth ? (loadSession()?.account ?? null) : null
  }

  async scan(
    maxMessages = 500,
    onProgress?: (fetched: number, total: number) => void,
  ): Promise<ScanResult> {
    if (!this.auth) throw new Error('Not connected')
    const headers = await fetchHeaders(this.auth, maxMessages, onProgress)
    const spamByEmail = new Set(
      headers.filter((h) => h.labels.includes('spam')).map((h) => h.fromEmail),
    )
    const groups = groupBySender(headers).map((gp) =>
      classify(gp, { spam: spamByEmail.has(gp.fromEmail) }),
    )
    console.log(
      `[scan] ${groups.length} senders, ${groups.filter((g) => g.unsubscribe).length} with unsubscribe`,
    )
    return {
      account: loadSession()?.account ?? 'unknown',
      scannedCount: headers.length,
      senders: groups,
    }
  }

  async unsubscribe(info: UnsubInfo): Promise<UnsubResult> {
    return doUnsubscribe(info)
  }

  async block(email: string): Promise<void> {
    if (!this.auth) throw new Error('Not connected')
    await blockSender(this.auth, email)
  }

  async deleteSender(email: string): Promise<number> {
    if (!this.auth) throw new Error('Not connected')
    return deleteFromSender(this.auth, email)
  }
}
