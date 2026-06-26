import { PublicClientApplication, type AccountInfo } from '@azure/msal-node'
import { app, BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { saveSession, loadSession } from '../../store/tokens'

export const SCOPES = ['Mail.ReadWrite', 'MailboxSettings.ReadWrite', 'User.Read', 'offline_access']
const REDIRECT = 'http://localhost:42814'
const AUTHORITY = 'https://login.microsoftonline.com/common'

function clientId(): string {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'microsoft-credentials.json')
    : join(process.cwd(), 'resources', 'microsoft-credentials.json')
  return JSON.parse(readFileSync(path, 'utf8')).clientId
}

export function makePca(): PublicClientApplication {
  return new PublicClientApplication({ auth: { clientId: clientId(), authority: AUTHORITY } })
}

function interceptCode(authUrl: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const win = new BrowserWindow({ width: 520, height: 700, autoHideMenuBar: true })
    win.loadURL(authUrl)
    win.webContents.on('will-redirect', (_e, redirectUrl) => {
      if (redirectUrl.startsWith(REDIRECT)) {
        const code = new URL(redirectUrl).searchParams.get('code')
        win.close()
        code ? resolve(code) : reject(new Error('No auth code returned'))
      }
    })
    win.on('closed', () => reject(new Error('Window closed before sign-in completed')))
  })
}

export async function connectOutlook(): Promise<{ pca: PublicClientApplication; account: AccountInfo }> {
  const pca = makePca()
  const authUrl = await pca.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: REDIRECT,
    prompt: 'select_account',
  })
  const code = await interceptCode(authUrl)
  const result = await pca.acquireTokenByCode({ code, scopes: SCOPES, redirectUri: REDIRECT })
  if (!result.account) throw new Error('No account returned from Microsoft')
  saveSession({
    provider: 'outlook',
    account: result.account.username,
    data: pca.getTokenCache().serialize(),
  })
  return { pca, account: result.account }
}

export async function restoreOutlook(): Promise<{ pca: PublicClientApplication; account: AccountInfo } | null> {
  const saved = loadSession()
  if (!saved || saved.provider !== 'outlook') return null
  const pca = makePca()
  pca.getTokenCache().deserialize(saved.data as string)
  const accounts = await pca.getTokenCache().getAllAccounts()
  if (!accounts.length) return null
  return { pca, account: accounts[0] }
}
