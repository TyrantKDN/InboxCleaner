import { useEffect, useState } from 'react'
import { api, type AccountInfo } from '../api'
import type { ScanResult, ScanProgress, FlagKind, SenderGroup } from '../../../main/scan/types'
import { SenderRow } from './SenderRow'

type Filter = 'all' | 'subscriptions' | 'never_opened' | 'likely_spam'

const TABS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'never_opened', label: 'Never opened' },
  { key: 'likely_spam', label: 'Likely spam' },
]

const matches = (s: SenderGroup, f: Filter): boolean =>
  f === 'all' ? true : f === 'subscriptions' ? s.hasListUnsubscribe : s.flags.includes(f as FlagKind)

type RowState = { busy?: boolean; note?: string }
type Confirm =
  | { scope: 'one'; type: 'block' | 'delete'; sender: SenderGroup }
  | { scope: 'bulk'; type: 'block' | 'delete' }

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`

export function ResultsList({
  account,
  onDisconnect,
}: {
  account: AccountInfo
  onDisconnect: () => void
}) {
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => api.onScanProgress(setProgress), [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  async function runScan() {
    setBusy(true)
    setError(null)
    setRows({})
    setSelected(new Set())
    setProgress({ fetched: 0, total: 0 })
    try {
      setScan(await api.scan())
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const setRow = (email: string, v: RowState): void =>
    setRows((r) => ({ ...r, [email]: { ...r[email], ...v } }))
  const removeSender = (email: string): void => {
    setScan((prev) => (prev ? { ...prev, senders: prev.senders.filter((s) => s.fromEmail !== email) } : prev))
    setSelected((prev) => {
      const n = new Set(prev)
      n.delete(email)
      return n
    })
  }

  async function handleUnsubscribe(sender: SenderGroup): Promise<void> {
    if (!sender.unsubscribe) return
    setRow(sender.fromEmail, { busy: true })
    try {
      const r = await api.unsubscribe(sender.unsubscribe)
      const note =
        r.method === 'one-click'
          ? 'Unsubscribed'
          : r.method === 'opened-page'
            ? 'Opened page'
            : r.method === 'opened-mail'
              ? 'Opened email'
              : 'No option'
      setRow(sender.fromEmail, { busy: false, note })
    } catch (e) {
      setRow(sender.fromEmail, { busy: false, note: 'Failed' })
      setToast(`Unsubscribe failed: ${errMsg(e)}`)
    }
  }

  async function doConfirm(): Promise<void> {
    if (!confirm) return
    const c = confirm
    setConfirm(null)
    if (c.scope === 'one') {
      const { type, sender } = c
      setRow(sender.fromEmail, { busy: true })
      try {
        if (type === 'block') {
          await api.block(sender.fromEmail)
          removeSender(sender.fromEmail)
          setToast(`Blocked ${sender.fromName} - future mail will skip the inbox`)
        } else {
          const n = await api.deleteSender(sender.fromEmail)
          removeSender(sender.fromEmail)
          setToast(`Moved ${plural(n, 'email')} from ${sender.fromName} to Trash`)
        }
      } catch (e) {
        setRow(sender.fromEmail, { busy: false })
        setToast(`${type === 'block' ? 'Block' : 'Delete'} failed: ${errMsg(e)}`)
      }
    } else {
      await runBulk(c.type)
    }
  }

  const selectedSenders = (): SenderGroup[] =>
    (scan?.senders ?? []).filter((s) => selected.has(s.fromEmail))

  async function runBulk(type: 'block' | 'delete'): Promise<void> {
    const targets = selectedSenders()
    setBulkBusy(true)
    setBulkProgress({ done: 0, total: targets.length })
    let ok = 0
    let fail = 0
    let trashed = 0
    for (const s of targets) {
      try {
        if (type === 'block') {
          await api.block(s.fromEmail)
        } else {
          trashed += await api.deleteSender(s.fromEmail)
        }
        removeSender(s.fromEmail)
        ok++
      } catch {
        fail++
      }
      setBulkProgress({ done: ok + fail, total: targets.length })
    }
    setBulkBusy(false)
    setBulkProgress(null)
    setSelected(new Set())
    setToast(
      type === 'block'
        ? `Blocked ${plural(ok, 'sender')}${fail ? `, ${fail} failed` : ''}`
        : `Moved ${plural(trashed, 'email')} to Trash from ${plural(ok, 'sender')}${fail ? `, ${fail} failed` : ''}`,
    )
  }

  async function bulkUnsubscribe(): Promise<void> {
    const targets = selectedSenders().filter((s) => s.unsubscribe)
    if (targets.length === 0) {
      setToast('None of the selected senders have an unsubscribe option')
      return
    }
    setBulkBusy(true)
    setBulkProgress({ done: 0, total: targets.length })
    let ok = 0
    let fail = 0
    for (const s of targets) {
      try {
        await api.unsubscribe(s.unsubscribe!)
        setRow(s.fromEmail, { note: 'Unsubscribed' })
        ok++
      } catch {
        fail++
      }
      setBulkProgress({ done: ok + fail, total: targets.length })
    }
    setBulkBusy(false)
    setBulkProgress(null)
    setSelected(new Set())
    setToast(`Unsubscribed from ${ok}${fail ? `, ${fail} failed` : ''}`)
  }

  const senders = scan?.senders ?? []
  const countFor = (f: Filter): number => senders.filter((s) => matches(s, f)).length
  const shown = senders.filter((s) => matches(s, filter))
  const flagged = senders.filter((s) => s.flags.length > 0)
  const junkEmails = flagged.reduce((n, s) => n + s.count, 0)

  const allShownSelected = shown.length > 0 && shown.every((s) => selected.has(s.fromEmail))
  function toggleAllShown(): void {
    setSelected((prev) => {
      const n = new Set(prev)
      if (allShownSelected) shown.forEach((s) => n.delete(s.fromEmail))
      else shown.forEach((s) => n.add(s.fromEmail))
      return n
    })
  }
  function toggle(s: SenderGroup): void {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(s.fromEmail)) n.delete(s.fromEmail)
      else n.add(s.fromEmail)
      return n
    })
  }

  const selectedEmailCount = selectedSenders().reduce((n, s) => n + s.count, 0)

  return (
    <div className="window-body">
      <div className="topbar">
        <div>
          <h1>{scan ? `${flagged.length} senders worth cleaning up` : 'Ready to scan'}</h1>
          <div className="s">
            {scan
              ? `Scanned ${scan.scannedCount.toLocaleString()} emails · ${junkEmails.toLocaleString()} from senders worth reviewing`
              : 'Click "Scan inbox" to find the senders cluttering your mailbox'}
          </div>
        </div>
        <div className="acct-wrap">
          <button className="acct" onClick={() => setMenuOpen((o) => !o)}>
            <span className={account.provider === 'gmail' ? 'g' : 'h'}>
              {account.provider === 'gmail' ? 'G' : 'H'}
            </span>{' '}
            {account.account} <span className="caret">▾</span>
          </button>
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="acct-menu">
                <button onClick={onDisconnect}>Switch account</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="controls">
        {scan && !busy && (
          <div className="seg">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={filter === t.key ? 'on' : ''}
                onClick={() => setFilter(t.key)}
              >
                {t.label} <span className="seg-n">{countFor(t.key)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
        {scan && !busy && shown.length > 0 && (
          <button className="selectall" onClick={toggleAllShown}>
            {allShownSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
        <button className="rescan" onClick={runScan} disabled={busy}>
          {busy ? 'Scanning…' : 'Scan inbox'}
        </button>
      </div>

      {error && <div className="banner error">Scan failed: {error}</div>}
      {toast && <div className="banner toast">{toast}</div>}

      {busy ? (
        <div className="scanning">
          <div className="spinner" />
          <div className="scan-title">Reading your inbox…</div>
          <div className="scan-sub">
            {progress && progress.fetched > 0
              ? `${progress.fetched.toLocaleString()} emails read so far`
              : 'Connecting to your mailbox…'}
          </div>
          <div className="bar">
            <div className="bar-stripe" />
          </div>
        </div>
      ) : (
        <div className="list">
          {!scan && <div className="empty">Your scan results will appear here.</div>}
          {scan && shown.length === 0 && (
            <div className="empty">No senders in this category.</div>
          )}
          {shown.map((s) => (
            <SenderRow
              key={s.fromEmail}
              s={s}
              selected={selected.has(s.fromEmail)}
              busy={rows[s.fromEmail]?.busy}
              note={rows[s.fromEmail]?.note}
              onToggle={toggle}
              onUnsubscribe={handleUnsubscribe}
              onBlock={(sender) => setConfirm({ scope: 'one', type: 'block', sender })}
              onDelete={(sender) => setConfirm({ scope: 'one', type: 'delete', sender })}
            />
          ))}
        </div>
      )}

      {selected.size > 0 && !busy && (
        <div className="bulkbar">
          <b>{plural(selected.size, 'sender')} selected</b> · {selectedEmailCount.toLocaleString()} emails
          {bulkProgress && (
            <span className="bulk-prog">
              Working… {bulkProgress.done}/{bulkProgress.total}
            </span>
          )}
          <div className="right">
            <button className="btn" disabled={bulkBusy} onClick={bulkUnsubscribe}>
              Unsubscribe
            </button>
            <button
              className="btn"
              disabled={bulkBusy}
              onClick={() => setConfirm({ scope: 'bulk', type: 'block' })}
            >
              Block
            </button>
            <button
              className="btn danger"
              disabled={bulkBusy}
              onClick={() => setConfirm({ scope: 'bulk', type: 'delete' })}
            >
              Delete
            </button>
            <button className="btn" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {confirm.type === 'block' ? 'Block ' : 'Move to Trash'}
              {confirm.type === 'block'
                ? confirm.scope === 'bulk'
                  ? `${selected.size} senders?`
                  : 'this sender?'
                : ''}
            </h3>
            {confirm.type === 'block' ? (
              <p>
                {confirm.scope === 'bulk' ? (
                  <>
                    Future mail from the <b>{selected.size}</b> selected senders will skip your
                    inbox. Existing mail stays where it is.
                  </>
                ) : (
                  <>
                    Future mail from <b>{confirm.sender.fromName}</b> will skip your inbox. Existing
                    mail stays where it is.
                  </>
                )}
              </p>
            ) : (
              <p>
                {confirm.scope === 'bulk' ? (
                  <>
                    Move mail from the <b>{selected.size}</b> selected senders (about{' '}
                    {selectedEmailCount.toLocaleString()} in this scan) to Trash? You can restore it
                    for 30 days.
                  </>
                ) : (
                  <>
                    Move mail from <b>{confirm.sender.fromName}</b> (about{' '}
                    {confirm.sender.count.toLocaleString()} in this scan) to Trash? You can restore
                    it for 30 days.
                  </>
                )}
              </p>
            )}
            <div className="modal-acts">
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={confirm.type === 'delete' ? 'btn danger' : 'btn accent'}
                onClick={doConfirm}
              >
                {confirm.type === 'block' ? 'Block' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
