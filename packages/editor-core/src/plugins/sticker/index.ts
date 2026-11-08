// Sticker — a sticker is a plain commonmark image (`![name](src)`), so the
// markdown never says "this is a sticker". The host's renderer decides that
// from the src (the forum matches the image-service hash), and sizes it as a
// small inline picture. In the editor the same image would otherwise render
// like any other image — full width, picking up the host prose layer's figure
// styles. This plugin closes that gap WITHOUT touching the schema or the
// markdown: a node DECORATION adds `class="kun-sticker"` to every image the
// editor knows is a sticker; the size lives in the host stylesheet (the
// reference rule is in @kungal/editor-nuxt/editor.css).
//
// An image is a sticker when either
// - it was inserted from the sticker picker in this editor session
//   (`insertStickerCommand` remembers its src), or
// - the host's `isSticker(src)` adapter says so — the only way to recognize
//   stickers in markdown loaded from elsewhere (editing an old post), where the
//   src may be in a different form than the picker's (the forum stores a token
//   `/image/<hash>_320`, the picker hands out the CDN URL).
// `isSticker` is called per image on every doc change, so it must be pure and
// fast; a throw counts as "not a sticker". When the host's answer changes
// without an edit (its sticker list finished loading), run
// `refreshStickersCommand` to re-evaluate.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { imageSchema } from '@milkdown/kit/preset/commonmark'
import { $command, $prose } from '@milkdown/kit/utils'

/** The class a sticker image carries in the editor DOM. */
export const STICKER_CLASS = 'kun-sticker'

/** Host predicate: is the image at `src` a sticker? See `KunEditorAdapters.isSticker`. */
export type IsSticker = (src: string) => boolean

interface StickerState {
  /** Srcs inserted from the picker in this session. */
  picked: ReadonlySet<string>
  decorations: DecorationSet
}

type StickerMeta = { add: string } | { refresh: true }

export const stickerPluginKey = new PluginKey<StickerState>('KUN_STICKER')

const buildDecorations = (
  doc: Node,
  picked: ReadonlySet<string>,
  isSticker: IsSticker | undefined
): DecorationSet => {
  const test = (src: string) => {
    if (picked.has(src)) return true
    if (!isSticker) return false
    try {
      return isSticker(src) === true
    } catch {
      return false
    }
  }
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'image') {
      return !node.isLeaf
    }
    const src = node.attrs.src
    if (typeof src === 'string' && src && test(src)) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: STICKER_CLASS }))
    }
    return false
  })
  return DecorationSet.create(doc, decorations)
}

export interface InsertStickerPayload {
  /** Image URL to embed. */
  src: string
  /** Alt text + title (the sticker's display name). */
  name?: string
}

/**
 * Insert a sticker at the selection: the same image node (and markdown) as
 * commonmark's `insertImageCommand` with `alt` + `title` = name, but the src is
 * remembered as a sticker so it renders sticker-sized right away — even when
 * the host has no `isSticker` adapter. What the picker panels call.
 */
export const insertStickerCommand = $command(
  'InsertKunSticker',
  (ctx) =>
    (payload?: InsertStickerPayload) =>
    (state, dispatch) => {
      const src = payload?.src
      if (!src) {
        return false
      }
      const name = payload?.name ?? ''
      const node = imageSchema.type(ctx).create({ src, alt: name, title: name })
      const meta: StickerMeta = { add: src }
      dispatch?.(state.tr.replaceSelectionWith(node).setMeta(stickerPluginKey, meta).scrollIntoView())
      return true
    }
)

/** Re-run `isSticker` over the document (e.g. after the host's sticker list loaded). */
export const refreshStickersCommand = $command(
  'RefreshKunStickers',
  () => () => (state, dispatch) => {
    const meta: StickerMeta = { refresh: true }
    dispatch?.(state.tr.setMeta(stickerPluginKey, meta))
    return true
  }
)

/** The sticker plugin: the decoration + the insert / refresh commands. */
export const createStickerPlugin = (isSticker?: IsSticker): MilkdownPlugin[] => {
  const plugin = $prose(
    () =>
      new Plugin<StickerState>({
        key: stickerPluginKey,
        state: {
          init: (_, state) => ({
            picked: new Set(),
            decorations: buildDecorations(state.doc, new Set(), isSticker)
          }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(stickerPluginKey) as StickerMeta | undefined
            let picked = prev.picked
            if (meta && 'add' in meta && !picked.has(meta.add)) {
              picked = new Set(picked).add(meta.add)
            }
            if (!tr.docChanged && !meta) {
              return prev
            }
            return { picked, decorations: buildDecorations(tr.doc, picked, isSticker) }
          }
        },
        props: {
          decorations: (state) => stickerPluginKey.getState(state)?.decorations ?? null
        }
      })
  )

  return [insertStickerCommand, refreshStickersCommand, plugin].flat()
}
