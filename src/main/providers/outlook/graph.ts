const BASE = 'https://graph.microsoft.com/v1.0'

export async function graph<T = unknown>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`Graph ${init?.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

export function relativeNext(nextLink?: string): string | undefined {
  if (!nextLink) return undefined
  return nextLink.startsWith(BASE) ? nextLink.slice(BASE.length) : nextLink
}
