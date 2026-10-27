// "最近使用" for the sticker panel — the last few emoji, and separately the
// last few stickers, this viewer inserted, kept in localStorage. Per viewer
// and best-effort: storage may be unavailable (private mode, blocked site
// data, SSR), so every access is guarded and the panel works the same without
// it.

/** What the sticker panel hands back on a pick. */
export type KunStickerPick =
  | { kind: 'emoji'; text: string }
  | { kind: 'sticker'; src: string; name: string }

type Kind = KunStickerPick['kind']

const KEYS: Record<Kind, string> = {
  emoji: 'kun-editor:recent-emoji',
  sticker: 'kun-editor:recent-stickers'
}
export const RECENT_LIMIT = 16

const valid = (kind: Kind, item: unknown): item is KunStickerPick => {
  const it = item as Record<string, unknown> | null
  return (
    !!it &&
    it.kind === kind &&
    (kind === 'emoji'
      ? typeof it.text === 'string'
      : typeof it.src === 'string' && typeof it.name === 'string')
  )
}

const same = (a: KunStickerPick, b: KunStickerPick) =>
  a.kind === 'emoji' && b.kind === 'emoji'
    ? a.text === b.text
    : a.kind === 'sticker' && b.kind === 'sticker' && a.src === b.src

/** The stored list of one kind, newest first; `[]` without storage. */
export const readRecent = <K extends Kind>(
  kind: K
): Extract<KunStickerPick, { kind: K }>[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEYS[kind]) ?? '[]')
    return Array.isArray(parsed)
      ? (parsed.filter((item) => valid(kind, item)).slice(0, RECENT_LIMIT) as Extract<
          KunStickerPick,
          { kind: K }
        >[])
      : []
  } catch {
    return []
  }
}

/** Put `item` first (once) in its kind's list, keep the newest RECENT_LIMIT. */
export const pushRecent = (item: KunStickerPick): void => {
  try {
    const next = [item, ...readRecent(item.kind).filter((it) => !same(it, item))]
    localStorage.setItem(KEYS[item.kind], JSON.stringify(next.slice(0, RECENT_LIMIT)))
  } catch {
    // No storage: the panel just has no "recently used".
  }
}
