import type { AccountInfo, PublicClientApplication } from '@azure/msal-node'
import type { MailProvider } from '../types'
import type { ScanResult, UnsubInfo, UnsubResult } from '../../scan/types'
import { connectOutlook, restoreOutlook, SCOPES } from './auth'
import { fetchOutlookHeaders } from './fetch'
import { blockSenderOutlook, deleteFromSenderOutlook } from './actions'
import { unsubscribe as doUnsubscribe } from '../unsubscribe'
import { groupBySender } from '../../scan/group'
import { classify } from '../../scan/classify'
import { saveSession } from '../../store/tokens'

export class OutlookProvider implements MailProvider {
  private pca: PublicClientApplication | null = null
  private account: AccountInfo | null = null

  async connect(): Promise<string> {
    const { pca, account } = await connectOutlook()
    this.pca = pca
    this.account = account
    return account.username
  }

  async restore(): Promise<string | null> {
    const r = await restoreOutlook()
    if (!r) return null
    this.pca = r.pca
    this.account = r.account
    return r.account.username
  }

  private async token(): Promise<string> {
    if (!this.pca || !this.account) throw new Error('Not connected')
    const res = await this.pca.acquireTokenSilent({ account: this.account, scopes: SCOPES })
    saveSession({
      provider: 'outlook',
      account: this.account.username,
      data: this.pca.getTokenCache().serialize(),
    })
    return res.accessToken
  }

  async scan(
    maxMessages = 500,
    onProgress?: (fetched: number, total: number) => void,
  ): Promise<ScanResult> {
    const token = await this.token()
    const headers = await fetchOutlookHeaders(token, maxMessages, onProgress)
    const groups = groupBySender(headers).map((gp) => classify(gp, {}))
    console.log(
      `[scan] ${groups.length} senders, ${groups.filter((g) => g.unsubscribe).length} with unsubscribe`,
    )
    return {
      account: this.account?.username ?? 'unknown',
      scannedCount: headers.length,
      senders: groups,
    }
  }

  async unsubscribe(info: UnsubInfo): Promise<UnsubResult> {
    return doUnsubscribe(info)
  }

  async block(email: string): Promise<void> {
    await blockSenderOutlook(await this.token(), email)
  }

  async deleteSender(email: string): Promise<number> {
    return deleteFromSenderOutlook(await this.token(), email)
  }
}
