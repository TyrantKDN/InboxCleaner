import { ipcMain } from 'electron'
import { GmailProvider } from './providers/gmail'
import { OutlookProvider } from './providers/outlook'
import type { MailProvider } from './providers/types'
import { loadSession, clearSession, type ProviderId } from './store/tokens'
import { saveScan, loadScan } from './store/cache'
import type { ScanResult, UnsubInfo } from './scan/types'

const providers: Record<ProviderId, MailProvider> = {
  gmail: new GmailProvider(),
  outlook: new OutlookProvider(),
}
let active: MailProvider | null = null

function requireActive(): MailProvider {
  if (!active) throw new Error('No account connected')
  return active
}

export function registerIpc(now: () => number): void {
  ipcMain.handle('account:connect', async (_e, providerId: ProviderId) => {
    const account = await providers[providerId].connect()
    active = providers[providerId]
    return { provider: providerId, account }
  })

  ipcMain.handle('account:restore', async () => {
    const saved = loadSession()
    if (!saved) return null
    const account = await providers[saved.provider].restore()
    if (!account) return null
    active = providers[saved.provider]
    return { provider: saved.provider, account }
  })

  ipcMain.handle('scan:run', async (event): Promise<ScanResult> => {
    const result = await requireActive().scan(500, (fetched, total) => {
      event.sender.send('scan:progress', { fetched, total })
    })
    saveScan(result, now())
    return result
  })
  ipcMain.handle('account:disconnect', async () => {
    clearSession()
    active = null
  })
  ipcMain.handle('scan:cached', async (_e, account: string) => loadScan(account))

  ipcMain.handle('action:unsubscribe', async (_e, info: UnsubInfo) =>
    requireActive().unsubscribe(info),
  )
  ipcMain.handle('action:block', async (_e, email: string) => requireActive().block(email))
  ipcMain.handle('action:delete', async (_e, email: string) => requireActive().deleteSender(email))
}
