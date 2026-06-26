import { google } from 'googleapis'
import { app, BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { saveSession, loadSession } from '../../store/tokens'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/userinfo.email',
]
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
]
const REDIRECT = 'http://localhost:42813'

function hasRequiredScopes(scope?: string): boolean {
  if (!scope) return false
  const granted = scope.split(/\s+/)
  return REQUIRED_SCOPES.every((s) => granted.includes(s))
}

function credentialsPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'google-credentials.json')
    : join(process.cwd(), 'resources', 'google-credentials.json')
}

function makeClient() {
  const { installed } = JSON.parse(readFileSync(credentialsPath(), 'utf8'))
  return new google.auth.OAuth2(installed.client_id, installed.client_secret, REDIRECT)
}

export async function connectGmail(): Promise<import('google-auth-library').OAuth2Client> {
  const oAuth2Client = makeClient()
  const url = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' })

  const code = await new Promise<string>((resolve, reject) => {
    const win = new BrowserWindow({ width: 520, height: 680, autoHideMenuBar: true })
    win.loadURL(url)
    win.webContents.on('will-redirect', (_e, redirectUrl) => {
      if (redirectUrl.startsWith(REDIRECT)) {
        const c = new URL(redirectUrl).searchParams.get('code')
        win.close()
        c ? resolve(c) : reject(new Error('No auth code returned'))
      }
    })
    win.on('closed', () => reject(new Error('Window closed before auth completed')))
  })

  const { tokens } = await oAuth2Client.getToken(code)
  oAuth2Client.setCredentials(tokens)
  const me = await google.oauth2({ version: 'v2', auth: oAuth2Client }).userinfo.get()
  saveSession({ provider: 'gmail', account: me.data.email ?? 'unknown', data: tokens })
  return oAuth2Client
}

export async function restoreGmail(): Promise<import('google-auth-library').OAuth2Client | null> {
  const saved = loadSession()
  if (!saved || saved.provider !== 'gmail') return null
  const tokens = saved.data as { scope?: string }
  if (!hasRequiredScopes(tokens.scope)) return null
  const oAuth2Client = makeClient()
  oAuth2Client.setCredentials(tokens)
  return oAuth2Client
}
