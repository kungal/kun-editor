// Mock host-policy adapters for the docs demos — the fake backend a real app
// would replace with its own. Shared by the playground + plugin pages.
import type { KunEditorAdapters } from '@kungal/editor-core'

export const mockSearchMentionUsers: NonNullable<
  KunEditorAdapters['searchMentionUsers']
> = async (q) => {
  const all = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Alicia' },
    { id: 3, name: 'Bob' },
    { id: 42, name: 'Kun' }
  ]
  return all.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
}

const dot = (color: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><circle cx='32' cy='32' r='28' fill='${color}'/></svg>`

export const mockStickerSource: NonNullable<
  KunEditorAdapters['stickerSource']
> = () => [
  {
    name: 'Demo',
    stickers: [
      { src: dot('%23f43f5e'), name: 'red' },
      { src: dot('%233b82f6'), name: 'blue' },
      { src: dot('%2322c55e'), name: 'green' },
      { src: dot('%23eab308'), name: 'yellow' },
      { src: dot('%23a855f7'), name: 'purple' }
    ]
  }
]

// Reads the picked file as a data URL — a real host POSTs it and returns a URL.
export const mockUploadImage: NonNullable<
  KunEditorAdapters['uploadImage']
> = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })

export const mockNotify: NonNullable<KunEditorAdapters['notify']> = (
  message,
  level
) => {
  // eslint-disable-next-line no-console
  console.log(`[KunEditor notify:${level}] ${message}`)
}

// Entity references — the forum's rules, as a host adapter would write them:
// www.kungal.com / kungal.com (or root-relative), /topic/{id}, /galgame/{id},
// /galgame/resource/{id}, /user/{id}, optional trailing slash; any query or
// fragment → not an entity. Always answers with the canonical absolute URL.
const ENTITY_KINDS: [RegExp, string, string][] = [
  [/^\/topic\/(\d+)\/?$/, 'topic', 'topic'],
  [/^\/galgame\/resource\/(\d+)\/?$/, 'galgame_resource', 'galgame/resource'],
  [/^\/galgame\/(\d+)\/?$/, 'work', 'galgame'],
  [/^\/user\/(\d+)\/?$/, 'user', 'user']
]

export const mockEntityFromUrl: NonNullable<
  KunEditorAdapters['entityFromUrl']
> = (url) => {
  let parsed: URL
  try {
    parsed = new URL(url, 'https://www.kungal.com')
  } catch {
    return null
  }
  if (
    !/^https?:$/.test(parsed.protocol) ||
    !/^(www\.)?kungal\.com$/.test(parsed.hostname) ||
    url.includes('?') ||
    url.includes('#')
  ) {
    return null
  }
  for (const [pattern, type, path] of ENTITY_KINDS) {
    const match = pattern.exec(parsed.pathname)
    if (match) {
      return { type, id: match[1]!, url: `https://www.kungal.com/${path}/${match[1]}` }
    }
  }
  return null
}

const ENTITY_TITLES: Record<string, string[]> = {
  topic: ['新人报到帖', '本季度 Galgame 汉化进度汇总', '求推荐纯爱向作品'],
  work: ['魔女的夜宴', '千恋＊万花', '星光咏叹调'],
  user: ['Alice', 'Kun', 'Bob']
}

export const mockEntityTypes: NonNullable<KunEditorAdapters['entityTypes']> = [
  { type: 'topic', label: '话题' },
  { type: 'work', label: 'Galgame' },
  { type: 'user', label: '用户' }
]

export const mockSearchEntities: NonNullable<
  KunEditorAdapters['searchEntities']
> = async (type, query, signal) => {
  await new Promise((resolve) => setTimeout(resolve, 150))
  if (signal.aborted) {
    throw new DOMException('aborted', 'AbortError')
  }
  const path = type === 'work' ? 'galgame' : type
  return (ENTITY_TITLES[type] ?? [])
    .map((title, index) => ({ title, id: String(index + 1) }))
    .filter(({ title }) => title.toLowerCase().includes(query.toLowerCase()))
    .map(({ title, id }) => ({
      ref: mockEntityFromUrl(`https://www.kungal.com/${path}/${id}`)!,
      title,
      subtitle: `${type} #${id}`
    }))
}

export const mockEntityTitle: NonNullable<KunEditorAdapters['entityTitle']> =
  async (ref) => ENTITY_TITLES[ref.type]?.[Number(ref.id) - 1] ?? null

export const mockEntityAdapters: KunEditorAdapters = {
  entityFromUrl: mockEntityFromUrl,
  searchEntities: mockSearchEntities,
  entityTypes: mockEntityTypes,
  entityTitle: mockEntityTitle
}

/** A fake preview lookup for the demo card / chip (a real host batches and
 * caches these against its API). */
export const mockEntityPreview = (type: string, id: string) =>
  new Promise<{ title: string; subtitle: string }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          title: ENTITY_TITLES[type]?.[Number(id) - 1] ?? `${type} #${id}`,
          subtitle: `${type} #${id}`
        }),
      400
    )
  )
