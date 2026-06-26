import { app } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

export interface UpdateStatus {
  phase: 'checking' | 'available' | 'downloading' | 'installing' | 'uptodate' | 'error'
  message: string
  percent?: number
  detail?: string
}

type Send = (status: UpdateStatus) => void

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function runUpdateFlow(send: Send, onProceed: () => void): void {
  if (!app.isPackaged) {
    simulate(send, onProceed)
    return
  }

  let proceeded = false
  const proceed = (): void => {
    if (!proceeded) {
      proceeded = true
      onProceed()
    }
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () =>
    send({ phase: 'checking', message: 'Checking for updates…' }),
  )
  autoUpdater.on('update-available', (info) =>
    send({ phase: 'available', message: `Update v${info.version} found - downloading…`, percent: 0 }),
  )
  autoUpdater.on('update-not-available', () => {
    send({ phase: 'uptodate', message: "You're up to date" })
    setTimeout(proceed, 500)
  })
  autoUpdater.on('download-progress', (p) =>
    send({
      phase: 'downloading',
      message: `Downloading update… ${Math.round(p.percent)}%`,
      percent: p.percent,
      detail: `${mb(p.transferred)} of ${mb(p.total)} · ${mb(p.bytesPerSecond)}/s`,
    }),
  )
  autoUpdater.on('update-downloaded', (info) => {
    send({ phase: 'installing', message: `Installing v${info.version}…`, percent: 100 })
    setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500)
  })
  autoUpdater.on('error', (err) => {
    send({
      phase: 'error',
      message: "Couldn't check for updates - starting anyway",
      detail: String(err?.message ?? err),
    })
    setTimeout(proceed, 1500)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    send({
      phase: 'error',
      message: "Couldn't check for updates - starting anyway",
      detail: String(err?.message ?? err),
    })
    setTimeout(proceed, 1500)
  })
}

function simulate(send: Send, onProceed: () => void): void {
  send({ phase: 'checking', message: 'Checking for updates…' })
  setTimeout(() => {
    send({ phase: 'available', message: 'Update v1.0.1 found - downloading…', percent: 0 })
    let pct = 0
    const timer = setInterval(() => {
      pct += 7
      if (pct >= 100) {
        clearInterval(timer)
        send({ phase: 'installing', message: 'Installing v1.0.1…', percent: 100 })
        setTimeout(onProceed, 1300)
        return
      }
      send({
        phase: 'downloading',
        message: `Downloading update… ${pct}%`,
        percent: pct,
        detail: `${(pct * 0.12).toFixed(1)} MB of 12.0 MB · 2.4 MB/s`,
      })
    }, 220)
  }, 900)
}
