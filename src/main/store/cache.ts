import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { ScanResult } from '../scan/types'

const file = (): string => join(app.getPath('userData'), 'scan-cache.json')

type CacheShape = Record<string, { result: ScanResult; ts: number }>

function readAll(): CacheShape {
  if (!existsSync(file())) return {}
  try {
    return JSON.parse(readFileSync(file(), 'utf8')) as CacheShape
  } catch {
    return {}
  }
}

export function saveScan(result: ScanResult, ts: number): void {
  const all = readAll()
  all[result.account] = { result, ts }
  writeFileSync(file(), JSON.stringify(all))
}

export function loadScan(account: string): ScanResult | null {
  return readAll()[account]?.result ?? null
}
