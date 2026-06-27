import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

function isAlreadyExists(err: unknown): boolean {
  const e = err as { status?: number; code?: number | string; message?: string }
  return e?.status === 409 || e?.code === 409 || /already exists/i.test(e?.message ?? '')
}

export async function blockSender(auth: OAuth2Client, email: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth })
  try {
    await gmail.users.settings.filters.create({
      userId: 'me',
      requestBody: {
        criteria: { from: email },
        action: { removeLabelIds: ['INBOX', 'UNREAD'] },
      },
    })
  } catch (err) {
    if (!isAlreadyExists(err)) throw err
  }
}

export async function deleteFromSender(auth: OAuth2Client, email: string): Promise<number> {
  const gmail = google.gmail({ version: 'v1', auth })
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${email}`,
      includeSpamTrash: false,
      maxResults: 500,
      pageToken,
    })
    for (const m of res.data.messages ?? []) if (m.id) ids.push(m.id)
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  for (let i = 0; i < ids.length; i += 1000) {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: ids.slice(i, i + 1000),
        addLabelIds: ['TRASH'],
        removeLabelIds: ['INBOX'],
      },
    })
  }
  return ids.length
}
