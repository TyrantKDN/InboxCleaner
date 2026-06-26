import { useEffect, useState } from 'react'
import { api, type AccountInfo } from './api'
import { ConnectScreen } from './components/ConnectScreen'
import { ResultsList } from './components/ResultsList'

export default function App() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  useEffect(() => {
    api.restore().then((a) => a && setAccount(a))
  }, [])

  async function disconnect(): Promise<void> {
    await api.disconnect()
    setAccount(null)
  }

  return (
    <div className="window">
      {account ? (
        <ResultsList account={account} onDisconnect={disconnect} />
      ) : (
        <ConnectScreen onConnected={setAccount} />
      )}
    </div>
  )
}
