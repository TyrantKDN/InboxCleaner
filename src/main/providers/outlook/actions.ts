import { graph, relativeNext } from './graph'

interface MessageRule {
  id: string
  displayName?: string
  sequence?: number
}

export async function blockSenderOutlook(token: string, email: string): Promise<void> {
  const displayName = `Inbox Cleaner: ${email}`
  const existing = await graph<{ value?: MessageRule[] }>(
    token,
    '/me/mailFolders/inbox/messageRules',
  )
  const rules = existing.value ?? []
  if (rules.some((r) => r.displayName === displayName)) return
  const sequence = rules.reduce((max, r) => Math.max(max, r.sequence ?? 0), 0) + 1
  await graph(token, '/me/mailFolders/inbox/messageRules', {
    method: 'POST',
    body: JSON.stringify({
      displayName,
      sequence,
      isEnabled: true,
      conditions: { senderContains: [email] },
      actions: { markAsRead: true, moveToFolder: 'archive', stopProcessingRules: true },
    }),
  })
}

interface IdPage {
  value?: { id: string }[]
  '@odata.nextLink'?: string
}

export async function deleteFromSenderOutlook(token: string, email: string): Promise<number> {
  const ids: string[] = []
  const escaped = email.replace(/'/g, "''")
  const filter = encodeURIComponent(`from/emailAddress/address eq '${escaped}'`)
  let path: string | undefined = `/me/messages?$filter=${filter}&$select=id&$top=100`

  while (path) {
    const page: IdPage = await graph(token, path)
    for (const m of page.value ?? []) ids.push(m.id)
    path = relativeNext(page['@odata.nextLink'])
  }

  let deleted = 0
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    const res = await graph<{ responses?: { status: number }[] }>(token, '/$batch', {
      method: 'POST',
      body: JSON.stringify({
        requests: chunk.map((id, idx) => ({
          id: String(idx + 1),
          method: 'DELETE',
          url: `/me/messages/${encodeURIComponent(id)}`,
        })),
      }),
    })
    for (const r of res.responses ?? []) if (r.status >= 200 && r.status < 300) deleted++
  }
  return deleted
}
