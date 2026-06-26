import { useState } from 'react'
import { api, type AccountInfo, type ProviderId } from '../api'

export function ConnectScreen({ onConnected }: { onConnected: (a: AccountInfo) => void }) {
  const [busy, setBusy] = useState<ProviderId | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function connect(provider: ProviderId): Promise<void> {
    setBusy(provider)
    setError(null)
    try {
      onConnected(await api.connect(provider))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="connect">
      <h1>Inbox Cleaner</h1>
      <p>Connect your email to find and clean up junk senders.</p>
      <div className="connect-btns">
        <button className="btn accent" disabled={!!busy} onClick={() => connect('gmail')}>
          {busy === 'gmail' ? 'Connecting…' : 'Connect Gmail'}
        </button>
        <button className="btn provider-ms" disabled={!!busy} onClick={() => connect('outlook')}>
          {busy === 'outlook' ? 'Connecting…' : 'Connect Outlook / Hotmail'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
