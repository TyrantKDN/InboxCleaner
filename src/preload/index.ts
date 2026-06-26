import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  connect: (provider: string) => ipcRenderer.invoke('account:connect', provider),
  restore: () => ipcRenderer.invoke('account:restore'),
  disconnect: () => ipcRenderer.invoke('account:disconnect'),
  scan: () => ipcRenderer.invoke('scan:run'),
  cached: (account: string) => ipcRenderer.invoke('scan:cached', account),
  onScanProgress: (cb: (p: { fetched: number; total: number }) => void) => {
    const handler = (_e: unknown, data: { fetched: number; total: number }) => cb(data)
    ipcRenderer.on('scan:progress', handler)
    return () => ipcRenderer.removeListener('scan:progress', handler)
  },
  onUpdateStatus: (cb: (s: unknown) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  unsubscribe: (info: unknown) => ipcRenderer.invoke('action:unsubscribe', info),
  block: (email: string) => ipcRenderer.invoke('action:block', email),
  deleteSender: (email: string) => ipcRenderer.invoke('action:delete', email),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
