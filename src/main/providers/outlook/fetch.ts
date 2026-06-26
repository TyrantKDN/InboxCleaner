import type { RawHeader } from '../../scan/types'
import { parseUnsub } from '../../scan/unsub'
import { graph, relativeNext } from './graph'

interface GraphHeader {
  name?: string
  value?: string
}
interface GraphMessage {
  id: string
  isRead?: boolean
  from?: { emailAddress?: { name?: string; address?: string } }
  internetMessageHeaders?: GraphHeader[]
}
interface GraphPage {
  value?: GraphMessage[]
  '@odata.nextLink'?: string
}

function headerValue(headers: GraphHeader[], name: string): string | undefined {
  const lower = name.toLowerCase()
  return headers.find((h) => h.name?.toLowerCase() === lower)?.value ?? undefined
}

export async function fetchOutlookHeaders(
  token: string,
  max = 500,
  onProgress?: (fetched: number, total: number) => void,
): Promise<RawHeader[]> {
  const out: RawHeader[] = []
  let path: string | undefined =
    '/me/messages?$select=from,isRead,internetMessageHeaders&$top=50'

  while (path && out.length < max) {
    const page: GraphPage = await graph(token, path)
    for (const m of page.value ?? []) {
      const addr = (m.from?.emailAddress?.address ?? 'unknown').toLowerCase()
      const name = m.from?.emailAddress?.name ?? addr
      const headers = m.internetMessageHeaders ?? []
      const unsubscribe = parseUnsub(
        headerValue(headers, 'List-Unsubscribe'),
        headerValue(headers, 'List-Unsubscribe-Post'),
      )
      out.push({
        id: m.id,
        fromName: name,
        fromEmail: addr,
        hasListUnsubscribe: !!unsubscribe,
        unsubscribe,
        labels: [],
        isRead: !!m.isRead,
      })
      onProgress?.(out.length, max)
      if (out.length >= max) break
    }
    path = relativeNext(page['@odata.nextLink'])
  }
  return out
}
