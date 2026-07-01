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
