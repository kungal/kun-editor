// Entity references — block cards and inline chips for host entities (a topic,
// a galgame, a user…), referenced by their canonical URL.
//
// Mechanism vs policy, as with mentions: the editor owns the two nodes, the
// markdown round-trip, the insertion rule and its undo semantics; the HOST
// decides which URLs are entities (`entityFromUrl`), how to search them, and
// what a card / chip looks like (a render-layer node view). See ./model for the
// markdown contract.
//
// One rule, every path (paste, autolink, the `/` menu, the toolbar picker): a
// URL that is all its paragraph holds becomes a CARD, anything else a CHIP.
//
// Paste and a committed clip (an Android keyboard's clipboard strip) insert the
// URL as plain text first and convert it in a SECOND undo step, so the first
// Ctrl+Z gives back the plain URL and the second removes the paste. Not a plain
// link: a bare link to an entity IS a chip by the contract, so it would turn
// back into one on save. Plain text saves escaped and stays text — and once an
// undo has declined a conversion, ending that URL with a space or Enter leaves
// it alone (`entityDeclined`).
//
// After a paste the plugin state carries an OFFER (the new node's position):
// the render layer anchors its 卡片 / 行内 / 链接 popover there. Any edit or
// selection change that is not the plugin's own withdraws it.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Ctx } from '@milkdown/kit/ctx'
import { editorViewOptionsCtx } from '@milkdown/kit/core'
import { gapCursor } from '@milkdown/kit/prose/gapcursor'
import { closeHistory, isHistoryTransaction } from '@milkdown/kit/prose/history'
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection
} from '@milkdown/kit/prose/state'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { $command, $prose } from '@milkdown/kit/utils'

import type {
  EntityDisplay,
  EntityFromUrl,
  EntityPrompt,
  EntityRef
} from '../../types'
import { linkAtEndOf, linkHrefOf } from '../link/detect'
import {
  deleteEntity,
  entityAt,
  entityDisplayAt,
  entityCardId,
  entityForbiddenAt,
  entityLinkId,
  insertEntity,
  listItemAcceptsCard,
  makeEntityCardSchema,
  makeEntityLinkSchema,
  makeRemarkEntity,
  placeEntity,
  replaceRangeWithEntity,
  safeEntityResolver,
  setEntityDisplay
} from './model'
import type { EntityAt, EntityResolver } from './model'

export {
  entityAt,
  entityDisplayAt,
  entityCardId,
  entityLinkId,
  entityLinkFallbackText,
  entityForbiddenAt,
  placeEntity,
  insertEntity,
  replaceRangeWithEntity,
  setEntityDisplay,
  deleteEntity,
  safeEntityResolver
} from './model'
export type { EntityAt, PlaceEntityOptions } from './model'

interface DeclinedRange {
  from: number
  to: number
}

/** A range held while a host prompt is open (see `withEntityAnchor`). */
export interface EntityAnchor {
  from: number
  to: number
}

/** The entity plugin's state. */
export interface EntityPluginState {
  /** Position of the entity a paste just made: the render layer's popover
   * anchor. `null` once anything else happens. */
  offer: number | null
  /** URLs an undo turned back into plain text — never converted again by a
   * boundary. Mapped through every change; checked against the text on use. */
  declined: DeclinedRange[]
  /** Where a host prompt's answer goes: the selection when it opened, mapped
   * through every change since. `null` once its text is gone. */
  anchor: EntityAnchor | null
}

interface EntityMeta {
  offer?: number | null
  anchor?: EntityAnchor | null
}

export const entityPluginKey = new PluginKey<EntityPluginState>('KUN_ENTITY')

/** The resolver the entity plugin was set up with, or null when the feature is
 * off — how the autolink plugin (always on) asks whether a URL is an entity. */
export const entityResolverOf = (state: EditorState): EntityResolver | null =>
  (entityPluginKey.get(state)?.spec as { resolve?: EntityResolver } | undefined)
    ?.resolve ?? null

/** The entity a paste just made, while its popover is on offer. */
export const entityOffer = (state: EditorState): EntityAt | null => {
  const offer = entityPluginKey.getState(state)?.offer
  return offer == null ? null : entityAt(state.doc, offer)
}

/** The entity under a node selection, if any. */
export const selectedEntity = (state: EditorState): EntityAt | null =>
  state.selection instanceof NodeSelection
    ? entityAt(state.doc, state.selection.from)
    : null

/** Whether an undo declined converting the URL at exactly `from`–`to`. */
export const entityDeclined = (
  state: EditorState,
  from: number,
  to: number
): boolean =>
  !!entityPluginKey
    .getState(state)
    ?.declined.some((range) => range.from === from && range.to === to)

/** Tag a transaction with a new offer (`null` withdraws it). */
export const withEntityOffer = (tr: Transaction, offer: number | null) =>
  tr.setMeta(entityPluginKey, { offer } satisfies EntityMeta)

/** Hold `anchor` (or release it with `null`) — the insertion point of a host
 * prompt (`entityPrompt`) that is still open. */
export const withEntityAnchor = (
  tr: Transaction,
  anchor: EntityAnchor | null
) => tr.setMeta(entityPluginKey, { anchor } satisfies EntityMeta)

/** The held insertion point, mapped to the current document. */
export const entityAnchor = (state: EditorState): EntityAnchor | null =>
  entityPluginKey.getState(state)?.anchor ?? null

/**
 * Convert the URL text at `from`–`to` into an entity as its OWN undo step,
 * right now. The paste / committed-clip / boundary paths all end here. With
 * `offer`, the popover is offered at the new node. Returns whether it did.
 */
export const convertToEntity = (
  view: EditorView,
  from: number,
  to: number,
  ref: EntityRef,
  options: { allowCard: boolean; offer: boolean }
): boolean => {
  const tr = closeHistory(view.state.tr)
  const pos = placeEntity(tr, from, to, ref, { allowCard: options.allowCard })
  if (pos === null) {
    return false
  }
  if (options.offer) {
    withEntityOffer(tr, pos)
  }
  view.dispatch(tr.scrollIntoView())
  return true
}

/** Plain-text URLs inside `from`–`to` of `state` that the resolver accepts —
 * what an undo just restored where an entity was. */
const restoredUrls = (
  ctx: Ctx,
  state: EditorState,
  from: number,
  to: number,
  resolve: EntityResolver
): DeclinedRange[] => {
  const found: DeclinedRange[] = []
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || node.marks.some((mark) => mark.type.name === 'link')) {
      return
    }
    for (const match of (node.text ?? '').matchAll(/[^\s\u200b]+/g)) {
      // The URL may start mid-word, right after CJK text (see linkAtEndOf) —
      // the same range a boundary would later arm.
      const link = linkAtEndOf(ctx, match[0])
      if (link && resolve(link.href)) {
        const end = pos + (match.index ?? 0) + match[0].length
        found.push({ from: end - match[0].length + link.offset, to: end })
      }
    }
  })
  return found
}

/** Text pasted that, as a whole, is one entity URL — `<…>` allowed around it. */
const pastedEntity = (
  ctx: Ctx,
  text: string,
  resolve: EntityResolver
): { url: string; ref: EntityRef } | null => {
  const trimmed = text.trim()
  const url = /^<[^<>\s]+>$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
  if (!url || /\s/.test(url)) {
    return null
  }
  const href = linkHrefOf(ctx, url)
  const ref = href ? resolve(href) : null
  return ref ? { url, ref } : null
}

const makeEntityPlugin = (resolve: EntityResolver) =>
  $prose((ctx) => {
    /** Paste of one entity URL: plain text first (undo step 1), then the
     * entity (undo step 2), then the offer. Copied cards / chips carry their
     * data-* in text/html and go through the ordinary paste path instead. */
    const handlePaste = (view: EditorView, event: ClipboardEvent): boolean => {
      const data = event.clipboardData
      if (!data || !view.editable) {
        return false
      }
      if (data.getData('text/html').includes('data-kun-entity')) {
        return false
      }
      const pasted = pastedEntity(ctx, data.getData('text/plain'), resolve)
      const { state } = view
      if (!pasted || entityForbiddenAt(state.selection.$from)) {
        return false
      }
      const { from, to } = state.selection
      const insert = closeHistory(state.tr).insertText(pasted.url, from, to)
      const start = insert.mapping.map(from, -1)
      const end = start + pasted.url.length
      const link = state.schema.marks.link
      if (link) {
        insert.removeMark(start, end, link)
      }
      view.dispatch(insert)
      if (
        !convertToEntity(view, start, end, pasted.ref, {
          allowCard: true,
          offer: true
        }) &&
        link
      ) {
        // Nowhere an entity may stand after all: link it, as a paste would.
        view.dispatch(
          view.state.tr.addMark(start, end, link.create({ href: pasted.url }))
        )
      }
      return true
    }

    /** Enter on a selected card opens a paragraph AFTER it (the base keymap
     * would put it before a card that is its container's first child); on a
     * selected chip it splits after the chip instead of deleting it. A phone
     * keyboard's input (keyCode 229) moves the caret past the selected entity
     * first, so the IME never composes over it. */
    const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
      const entity = selectedEntity(view.state)
      if (!entity || !view.editable) {
        return false
      }
      const plainEnter =
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.isComposing
      if (plainEnter && entity.display === 'card') {
        const tr = view.state.tr
        const end = entity.pos + entity.node.nodeSize
        const { paragraph } = view.state.schema.nodes
        const $end = tr.doc.resolve(end)
        if (!paragraph || !$end.parent.canReplaceWith($end.index(), $end.index(), paragraph)) {
          return false
        }
        tr.insert(end, paragraph.create())
        tr.setSelection(TextSelection.create(tr.doc, end + 1))
        view.dispatch(tr.scrollIntoView())
        return true
      }
      if (plainEnter || event.keyCode === 229) {
        moveCaretPast(view, entity)
      }
      return false
    }

    /** Typing with an entity selected goes AFTER it, never over it: a stray
     * key (or a tap that selected a card on a phone) must not delete one. */
    const handleTextInput = (
      view: EditorView,
      _from: number,
      _to: number,
      text: string
    ): boolean => {
      const entity = selectedEntity(view.state)
      if (!entity) {
        return false
      }
      moveCaretPast(view, entity)
      view.dispatch(view.state.tr.insertText(text).scrollIntoView())
      return true
    }

    // View props run before every plugin's, so the paste of an entity URL is
    // decided here — ahead of the clipboard plugin, which would parse it as
    // markdown and drop a block card into the middle of a paragraph.
    ctx.update(editorViewOptionsCtx, (prev) => ({
      ...prev,
      handlePaste: (view, event, slice) =>
        handlePaste(view, event) ||
        (prev.handlePaste?.(view, event, slice) ?? false),
      handleKeyDown: (view, event) =>
        handleKeyDown(view, event) ||
        (prev.handleKeyDown?.(view, event) ?? false),
      handleTextInput: (view, from, to, text, deflt) =>
        handleTextInput(view, from, to, text) ||
        (prev.handleTextInput?.(view, from, to, text, deflt) ?? false),
      // Copying one card / chip puts the URL itself in text/plain — what a
      // chat box or an address bar wants — not the markdown `<url>`. text/html
      // still carries the data-* attributes, so pasting it back here makes the
      // same node.
      clipboardTextSerializer: (slice, view) => {
        const only = slice.content.childCount === 1 ? slice.content.firstChild : null
        const inner =
          only?.type.name === 'paragraph' && only.childCount === 1
            ? only.firstChild
            : only
        const name = inner?.type.name
        if (name === entityCardId || name === entityLinkId) {
          return String(inner!.attrs.url)
        }
        return prev.clipboardTextSerializer?.(slice, view) ?? ''
      }
    }))

    return new Plugin<EntityPluginState>({
      key: entityPluginKey,
      // Read by `entityResolverOf` (the autolink handoff).
      resolve,
      state: {
        init: () => ({ offer: null, declined: [], anchor: null }),
        apply: (tr, value, _old, next) => {
          const meta = tr.getMeta(entityPluginKey) as EntityMeta | undefined
          let offer = value.offer
          if (meta?.offer !== undefined) {
            offer = meta.offer
          } else if (offer !== null) {
            // Typing on, clicking away, anything — the offer is gone. Only a
            // plugin's appended housekeeping (the trailing paragraph) keeps it.
            if (tr.getMeta('appendedTransaction')) {
              const mapped = tr.mapping.mapResult(offer, 1)
              offer = mapped.deleted ? null : mapped.pos
            } else if (tr.docChanged || tr.selectionSet) {
              offer = null
            }
          }
          let declined = value.declined
          if (tr.docChanged && declined.length) {
            declined = declined.flatMap((range) => {
              const from = tr.mapping.mapResult(range.from, 1)
              const to = tr.mapping.mapResult(range.to, -1)
              return from.deleted || to.deleted || from.pos >= to.pos
                ? []
                : [{ from: from.pos, to: to.pos }]
            })
          }
          if (tr.docChanged && isHistoryTransaction(tr)) {
            // Whatever an undo restored as plain URL text is a declined
            // conversion. Look only where this transaction changed things.
            const found: DeclinedRange[] = []
            tr.mapping.maps.forEach((map, index) => {
              map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                const rest = tr.mapping.slice(index + 1)
                const from = rest.map(newStart, -1)
                const to = rest.map(newEnd, 1)
                found.push(...restoredUrls(ctx, next, from, to, resolve))
              })
            })
            if (found.length) {
              declined = [...declined, ...found].slice(-8)
            }
          }
          let anchor = value.anchor
          if (meta?.anchor !== undefined) {
            anchor = meta.anchor
          } else if (anchor && tr.docChanged) {
            // An insertion point whose surroundings were deleted outright has
            // nowhere sensible to go: the answer is dropped, not misplaced.
            const from = tr.mapping.mapResult(anchor.from, -1)
            const to = tr.mapping.mapResult(anchor.to, 1)
            anchor =
              from.deletedAcross || to.deletedAcross
                ? null
                : { from: from.pos, to: Math.max(from.pos, to.pos) }
          }
          return offer === value.offer &&
            declined === value.declined &&
            anchor === value.anchor
            ? value
            : { offer, declined, anchor }
        }
      }
    })
  })

/** Move the caret just past `entity`: after a chip, or into an empty paragraph
 * after a card — reused when one is there, never the start of the next
 * paragraph's text (what is typed there belongs to neither). */
const moveCaretPast = (view: EditorView, entity: EntityAt) => {
  const tr = view.state.tr
  const end = entity.pos + entity.node.nodeSize
  if (entity.display === 'chip') {
    tr.setSelection(TextSelection.create(tr.doc, end))
  } else {
    const { paragraph } = view.state.schema.nodes
    const next = tr.doc.nodeAt(end)
    const $end = tr.doc.resolve(end)
    if (next && next.type === paragraph && next.content.size === 0) {
      tr.setSelection(TextSelection.create(tr.doc, end + 1))
    } else if (
      paragraph &&
      $end.parent.canReplaceWith($end.index(), $end.index(), paragraph)
    ) {
      tr.insert(end, paragraph.create())
      tr.setSelection(TextSelection.create(tr.doc, end + 1))
    }
  }
  view.dispatch(tr)
}

// ── Host prompt ─────────────────────────────────────────────────────────────

/** Views with a host prompt open — one at a time per editor. */
const prompting = new WeakSet<EditorView>()

/**
 * Hand the choice of an entity to the host (`entityPrompt`, its own modal) and
 * insert the answer where the user was.
 *
 * `range` is text to remove first — the `/query` a menu consumed — and goes in
 * the same step as holding the insertion point, so a cancel leaves exactly
 * that removed and nothing else. The insertion point (the selection then) is
 * held in plugin state and mapped through whatever happens while the modal is
 * open; if it is deleted outright the answer is dropped rather than put
 * somewhere surprising. A reference this editor's `entityFromUrl` does not
 * accept is dropped too — it would not survive a save. Either way focus (and
 * the selection) come back to the editor. Resolves whether it inserted.
 */
export const promptForEntity = async (
  view: EditorView,
  prompt: EntityPrompt,
  type: string,
  range?: { from: number; to: number }
): Promise<boolean> => {
  if (prompting.has(view) || !view.editable) {
    return false
  }
  const open = view.state.tr
  if (range && range.to > range.from) {
    open.delete(range.from, range.to)
  }
  const { from, to } = open.selection
  const display = entityDisplayAt(
    to > from ? open.doc.cut(0).replace(from, to, open.doc.slice(0, 0)) : open.doc,
    from
  )
  view.dispatch(withEntityAnchor(open, { from, to }))
  prompting.add(view)
  let ref: EntityRef | null = null
  try {
    ref = await prompt({ type, display })
  } catch {
    ref = null
  } finally {
    prompting.delete(view)
  }
  if (view.isDestroyed) {
    return false
  }
  const anchor = entityAnchor(view.state)
  const tr = withEntityAnchor(view.state.tr, null)
  const resolve = entityResolverOf(view.state)
  const accepted = ref?.url && resolve ? resolve(ref.url) : null
  let inserted = false
  if (anchor) {
    tr.setSelection(
      TextSelection.between(tr.doc.resolve(anchor.from), tr.doc.resolve(anchor.to))
    )
    if (accepted) {
      inserted = insertEntity(tr, accepted, display)
    }
  }
  view.dispatch(tr.scrollIntoView())
  view.focus()
  return inserted
}

// ── Commands ────────────────────────────────────────────────────────────────

/** Insert an entity at the selection. `card` falls back to a chip where a card
 * cannot stand (a heading, a table cell); `auto` (default) is a card in an
 * empty paragraph, a chip anywhere else. */
export const insertEntityCommand = $command(
  'InsertKunEntity',
  () =>
    (payload?: { ref: EntityRef; display?: 'card' | 'chip' | 'auto' }) =>
    (state, dispatch) => {
      if (!payload?.ref?.url || !state.schema.nodes[entityCardId]) {
        return false
      }
      const tr = state.tr
      if (!insertEntity(tr, payload.ref, payload.display)) {
        return false
      }
      dispatch?.(tr.scrollIntoView())
      return true
    }
)

/** Replace `from`–`to` (the `/query` a menu consumed) with an entity: a card
 * when that empties the paragraph, otherwise a chip. */
export const replaceWithEntityCommand = $command(
  'ReplaceWithKunEntity',
  () =>
    (payload?: { from: number; to: number; ref: EntityRef }) =>
    (state, dispatch) => {
      if (!payload?.ref?.url || !state.schema.nodes[entityCardId]) {
        return false
      }
      const tr = state.tr
      if (!replaceRangeWithEntity(tr, payload.from, payload.to, payload.ref)) {
        return false
      }
      dispatch?.(tr.scrollIntoView())
      return true
    }
)

/** Turn the entity at `pos` (default: the selected one) into a card, a chip,
 * or an ordinary `[text](url)` link (`text` required for `link`). `caret`:
 * `select` (default) keeps the entity selected, `after` puts the caret past it. */
export const setEntityDisplayCommand = $command(
  'SetKunEntityDisplay',
  () =>
    (payload?: {
      pos?: number
      display: EntityDisplay
      text?: string
      caret?: 'select' | 'after'
    }) =>
    (state, dispatch) => {
      const pos = payload?.pos ?? selectedEntity(state)?.pos
      if (!payload || pos === undefined) {
        return false
      }
      const tr = withEntityOffer(state.tr, null)
      if (
        !setEntityDisplay(tr, pos, payload.display, payload.text, payload.caret)
      ) {
        return false
      }
      dispatch?.(tr.scrollIntoView())
      return true
    }
)

/** Delete the entity at `pos` (default: the selected one). */
export const deleteEntityCommand = $command(
  'DeleteKunEntity',
  () =>
    (payload?: { pos?: number }) =>
    (state, dispatch) => {
      const pos = payload?.pos ?? selectedEntity(state)?.pos
      if (pos === undefined) {
        return false
      }
      const tr = withEntityOffer(state.tr, null)
      if (!deleteEntity(tr, pos)) {
        return false
      }
      dispatch?.(tr.scrollIntoView())
      return true
    }
)

/** Gap cursor: a caret between two cards, or before a card that opens the
 * document / a blockquote, where no textblock offers one. */
const entityGapCursor = $prose(() => gapCursor())

/**
 * The entity plugin bundle. `fromUrl` is the host's `entityFromUrl`; it is
 * wrapped so a throw or a malformed answer reads as "not an entity". Must be
 * used after the commonmark + gfm presets (it widens their list item).
 */
export const createEntityPlugin = (fromUrl: EntityFromUrl): MilkdownPlugin[] => {
  const resolve = safeEntityResolver(fromUrl)
  return [
    makeEntityCardSchema(resolve),
    makeEntityLinkSchema(resolve),
    listItemAcceptsCard,
    makeRemarkEntity(resolve),
    makeEntityPlugin(resolve),
    entityGapCursor,
    insertEntityCommand,
    replaceWithEntityCommand,
    setEntityDisplayCommand,
    deleteEntityCommand
  ].flat()
}
