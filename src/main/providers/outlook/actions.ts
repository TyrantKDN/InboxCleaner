import { graph, relativeNext } from './graph'

export async function blockSenderOutlook(token: string, email: string): Promise<void> {
  await graph(token, '/me/mailFolders/inbox/messageRules', {
    method: 'POST',
    body: JSON.stringify({
      displayName: `Inbox Cleaner: ${email}`,
      sequence: 1,
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
  const filter = encodeURIComponent(`from/emailAddress/address eq '${email}'`)
  let path: string | undefined = `/me/messages?$filter=${filter}&$select=id&$top=100`

  while (path) {
    const page: IdPage = await graph(token, path)
    for (const m of page.value ?? []) ids.push(m.id)
    path = relativeNext(page['@odata.nextLink'])
  }

  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    await graph(token, '/$batch', {
      method: 'POST',
      body: JSON.stringify({
        requests: chunk.map((id, idx) => ({
          id: String(idx + 1),
          method: 'DELETE',
          url: `/me/messages/${id}`,
        })),
      }),
    })
  }
  return ids.length
}
