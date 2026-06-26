import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'

export type ProviderId = 'gmail' | 'outlook'

export interface StoredSession {
  provider: ProviderId
  account: string
  data: unknown
}

const file = (): string => join(app.getPath('userData'), 'session.bin')

export function saveSession(session: StoredSession): void {
  writeFileSync(file(), safeStorage.encryptString(JSON.stringify(session)))
}

export function loadSession(): StoredSession | null {
  if (!existsSync(file())) return null
  try {
    return JSON.parse(safeStorage.decryptString(readFileSync(file()))) as StoredSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (existsSync(file())) rmSync(file())
}
