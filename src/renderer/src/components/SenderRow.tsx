import type { SenderGroup, FlagKind } from '../../../main/scan/types'

const TAG_LABEL: Record<FlagKind, string> = {
  never_opened: 'Never opened',
  newsletter: 'Subscription',
  likely_spam: 'Likely spam',
}

const TAG_TONE: Record<FlagKind, string> = {
  never_opened: 'red',
  newsletter: 'gray',
  likely_spam: 'red',
}

function iconTone(flags: FlagKind[]): string {
  if (flags.includes('likely_spam')) return 'r'
  if (flags.includes('newsletter')) return 'y'
  if (flags.includes('never_opened')) return 'o'
  return 'o'
}

interface Props {
  s: SenderGroup
  selected: boolean
  busy?: boolean
  note?: string
  onToggle: (s: SenderGroup) => void
  onUnsubscribe: (s: SenderGroup) => void
  onBlock: (s: SenderGroup) => void
  onDelete: (s: SenderGroup) => void
}

export function SenderRow({ s, selected, busy, note, onToggle, onUnsubscribe, onBlock, onDelete }: Props) {
  const initial = (s.fromName || s.fromEmail).charAt(0).toUpperCase()
  const canUnsub = !!s.unsubscribe

  return (
    <div className={`card ${selected ? 'sel' : ''}`}>
      <div
        className={`chk ${selected ? 'on' : ''}`}
        onClick={() => onToggle(s)}
        role="checkbox"
        aria-checked={selected}
      />
      <div className={`ic ${iconTone(s.flags)}`}>{initial}</div>
      <div className="m">
        <div className="n">{s.fromName}</div>
        <div className="d">
          {s.fromEmail}
          {s.openedCount === 0 ? ' · never opened' : ` · opened ${s.openedCount} of ${s.count}`}
        </div>
      </div>
      <div className="tags">
        {s.flags.map((f) => (
          <span key={f} className={`tag ${TAG_TONE[f]}`}>
            {TAG_LABEL[f]}
          </span>
        ))}
      </div>
      <div className="count">{s.count}</div>
      <div className="acts">
        {note ? (
          <span className="row-note">{note}</span>
        ) : busy ? (
          <span className="row-note">Working…</span>
        ) : (
          <>
            <button
              className="btn accent"
              disabled={!canUnsub}
              title={canUnsub ? 'Unsubscribe from this sender' : 'This sender has no unsubscribe option'}
              onClick={() => onUnsubscribe(s)}
            >
              Unsubscribe
            </button>
            <button className="btn" onClick={() => onBlock(s)}>
              Block
            </button>
            <button className="btn danger" onClick={() => onDelete(s)}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
