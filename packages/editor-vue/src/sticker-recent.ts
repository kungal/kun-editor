// "最近使用" for the sticker panel — the last few emoji / stickers this viewer
// inserted, kept in localStorage. Per viewer and best-effort: storage may be
// unavailable (private mode, blocked site data, SSR), so every access is
// guarded and the panel works the same without it.

/** What the sticker panel hands back on a pick. */
export type KunStickerPick =
  | { kind: 'emoji'; text: string }
  | { kind: 'sticker'; src: string; name: string }

const KEY = 'kun-editor:recent-stickers'
export const RECENT_LIMIT = 16

const valid = (item: unknown): item is KunStickerPick => {
  const it = item as Partial<KunStickerPick> | null
  return (
    !!it &&
    ((it.kind === 'emoji' && typeof (it as { text?: unknown }).text === 'string') ||
      (it.kind === 'sticker' &&
        typeof (it as { src?: unknown }).src === 'string' &&
        typeof (it as { name?: unknown }).name === 'string'))
  )
}

const same = (a: KunStickerPick, b: KunStickerPick) =>
  a.kind === 'emoji' && b.kind === 'emoji'
    ? a.text === b.text
    : a.kind === 'sticker' && b.kind === 'sticker' && a.src === b.src

/** The stored list, newest first; `[]` when there is none or no storage. */
export const readRecent = (): KunStickerPick[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(valid).slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

/** Put `item` first (once), keep the newest RECENT_LIMIT. */
export const pushRecent = (item: KunStickerPick): void => {
  try {
    const next = [item, ...readRecent().filter((it) => !same(it, item))]
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, RECENT_LIMIT)))
  } catch {
    // No storage: the panel just has no "recently used".
  }
}
