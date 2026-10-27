// Autolink on input — a URL becomes a link the moment it is complete: when ONE
// input inserts it whole (as pasting it would), or when a space / Enter ends a
// URL typed by hand.
//
// A paste goes through Milkdown's clipboard plugin, which reads the text as
// markdown, so GFM's autolink literal turns `https://…` into a link. Anything
// else left a URL plain — an Android keyboard's clipboard strip (Gboard, Sogou,
// Baidu…), which commits the clip like a typed word and never fires a paste, and
// any URL typed key by key. Plain is worse than "not blue while editing": the
// serializer escapes a plain URL (`https\://…`) precisely so it can NOT become a
// link later, so the published post showed a dead URL too.
//
// Two moments, one test — "is this exactly one link as the paste path would
// read it?" (the same parser decides, so `www.…` and `a@b.c` behave as on paste):
//   - WHOLE INPUT: one input inserts text that is a link → it is linked in that
//     same input (one undo takes both).
//   - BOUNDARY: a space or Enter right after a word that is a link → the word is
//     linked, as its OWN undo step: the undo right after it takes the link back
//     and keeps the text, for whoever wanted it plain (GitHub, Discord, Notion
//     all behave this way). A half-typed URL is never linked: there is no
//     boundary yet, and a single keystroke is never a whole link.
// Never in a code block or inline code (text there is literal), never where the
// text is already linked, never inside a spoiler (it holds plain text).
//
// An ENTITY URL (the entity plugin's resolver accepts it) is not linked: a bare
// link to one IS a chip, so the URL becomes the entity instead, by the entity
// plugin's one rule — and always as its own undo step, so the first undo gives
// back plain text. A whole input in an empty paragraph, or an Enter after a URL
// that is all its paragraph holds, makes a card; a space keeps a chip (the line
// is still being written). A URL whose conversion an undo declined stays plain.
//
// During IME composition the mark waits for `compositionend` (as the input
// rules do): restyling the text an IME is still composing tears the composition
// apart. Pure: no host policy.
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { closeHistory } from '@milkdown/kit/prose/history'
import type { MarkType, Node as ProseNode } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'

import type { EntityRef } from '../../types'
import {
  convertToEntity,
  entityDeclined,
  entityResolverOf
} from '../entity'
import { linkAtEndOf, linkHrefOf, wordBefore } from './detect'

/** Inserted text waiting for its composition to end before it is linked. */
interface PendingLink {
  from: number
  to: number
  text: string
  href: string
  /** The input's `composition` meta. Linking under the same id is what makes
   * history fold the mark into the input's own undo event. */
  composition?: number
  /** Set when the URL is an entity: it becomes one once the composition ends. */
  entity?: EntityRef
}

/** A typed word that a space / Enter is about to end. */
type BoundaryWord = Omit<PendingLink, 'composition' | 'entity'> & {
  /** Ended by Enter (a card is possible) rather than a space. */
  enter: boolean
}

const autolinkKey = new PluginKey<PendingLink | null>('KUN_AUTOLINK_INPUT')

/** Whether `from`–`to` in `doc` may take a link: not literal text, not linked. */
const linkable = (
  doc: ProseNode,
  from: number,
  to: number,
  link: MarkType
): boolean => {
  const parent = doc.resolve(from).parent
  if (parent.type.spec.code || !parent.type.allowsMarkType(link)) {
    return false
  }
  let ok = true
  doc.nodesBetween(from, to, (node) => {
    if (node.marks.some((mark) => mark.type === link || mark.type.spec.code)) {
      ok = false
    }
  })
  return ok
}

/** Link `from`–`to`, and let the next keystroke start unlinked text: the link
 * mark is inclusive, so without this whatever is typed next joins the URL
 * (the same thing insertLinkCommand does). */
const addLink = (
  tr: Transaction,
  { from, to, href }: PendingLink,
  link: MarkType
): Transaction =>
  tr.addMark(from, to, link.create({ href })).removeStoredMark(link)

/** Whether the word now ends at a boundary: whitespace (a hard break reads as
 * `\n`) or the end of its block (Enter split it there). */
const endsAtBoundary = (doc: ProseNode, to: number): boolean => {
  const $to = doc.resolve(to)
  return to === $to.end() || /^\s$/.test(doc.textBetween(to, to + 1))
}

/** The autolink-on-input ProseMirror plugin. */
export const autolinkInputPlugin = $prose((ctx) => {
  const hrefOf = (text: string): string | null => linkHrefOf(ctx, text)

  /** The word a space / Enter at the (empty) selection is about to end, if it
   * is a link — set before the boundary is inserted, applied once it is. */
  let armed: BoundaryWord | null = null
  /** An armed word whose boundary arrived mid-composition. */
  let afterComposition: BoundaryWord | null = null

  const arm = (state: EditorState, enter: boolean) => {
    const { empty, from } = state.selection
    const word = empty ? wordBefore(state, from) : null
    const found = word ? linkAtEndOf(ctx, word.text) : null
    const link = linkSchema.type(ctx)
    if (!word || !found) {
      armed = null
      return
    }
    // The link may start mid-word, right after CJK text (see linkAtEndOf).
    const start = word.from + found.offset
    armed = linkable(state.doc, start, word.to, link)
      ? {
          from: start,
          to: word.to,
          text: word.text.slice(found.offset),
          href: found.href,
          enter
        }
      : null
  }

  /** Link a word a boundary ended — its own undo step, so the undo right after
   * takes the link back and leaves the text. Re-checked against the document:
   * whatever moved in between, a word that is no longer exactly there, or no
   * longer ends at a boundary, stays as it is. */
  const linkBoundaryWord = (view: EditorView, word: BoundaryWord) => {
    if (view.isDestroyed) {
      return
    }
    const { doc } = view.state
    const link = linkSchema.type(ctx)
    if (
      word.to > doc.content.size ||
      doc.textBetween(word.from, word.to) !== word.text ||
      !endsAtBoundary(doc, word.to) ||
      !linkable(doc, word.from, word.to, link)
    ) {
      return
    }
    const ref = entityResolverOf(view.state)?.(word.href)
    if (ref) {
      if (!entityDeclined(view.state, word.from, word.to)) {
        convertToEntity(view, word.from, word.to, ref, {
          allowCard: word.enter,
          offer: false
        })
      }
      return
    }
    view.dispatch(
      closeHistory(view.state.tr).addMark(
        word.from,
        word.to,
        link.create({ href: word.href })
      )
    )
  }

  return new Plugin<PendingLink | null>({
    key: autolinkKey,
    state: {
      init: () => null,
      apply: (tr, pending) => {
        const meta = tr.getMeta(autolinkKey) as PendingLink | null | undefined
        if (meta !== undefined) {
          return meta
        }
        if (!pending || !tr.docChanged) {
          return pending
        }
        const from = tr.mapping.mapResult(pending.from, 1)
        const to = tr.mapping.mapResult(pending.to, -1)
        return from.deleted || to.deleted || from.pos >= to.pos
          ? null
          : { ...pending, from: from.pos, to: to.pos }
      }
    },
    view: () => ({
      // The boundary is in the document now (or the input went elsewhere — the
      // re-check sorts that out). Link after this update, not inside it.
      update: (view, prev) => {
        if (!armed) {
          return
        }
        if (view.state.doc === prev.doc) {
          if (!view.state.selection.eq(prev.selection)) {
            armed = null
          }
          return
        }
        const word = armed
        armed = null
        if (view.composing) {
          afterComposition = word
        } else {
          queueMicrotask(() => linkBoundaryWord(view, word))
        }
      }
    }),
    props: {
      handleTextInput: (view, from, to, text, deflt) => {
        // A space typed after a word: arm, and let the space go in as usual.
        if (/^\s+$/.test(text)) {
          if (from === to) {
            arm(view.state, false)
          }
          return false
        }
        // A keyboard may put a space after the clip; the URL is what gets linked.
        const url = text.trim()
        const href = url ? hrefOf(url) : null
        if (!href) {
          return false
        }
        // The transaction ProseMirror would dispatch anyway; this only adds to it.
        const tr = deflt()
        const start = from + text.indexOf(url)
        const pending: PendingLink = {
          from: start,
          to: start + url.length,
          text: url,
          href,
          composition: tr.getMeta('composition') as number | undefined
        }
        const link = linkSchema.type(ctx)
        if (!linkable(tr.doc, pending.from, pending.to, link)) {
          return false
        }
        const entity = entityResolverOf(view.state)?.(href)
        if (entity) {
          // Plain text in this input (undo step 1), the entity in the next
          // (step 2) — or, mid-composition, once the composition ends.
          if (view.composing) {
            view.dispatch(tr.setMeta(autolinkKey, { ...pending, entity }))
          } else {
            view.dispatch(closeHistory(tr))
            convertToEntity(view, pending.from, pending.to, entity, {
              allowCard: true,
              offer: true
            })
          }
          return true
        }
        view.dispatch(
          view.composing
            ? tr.setMeta(autolinkKey, pending)
            : addLink(tr, pending, link)
        )
        return true
      },
      handleDOMEvents: {
        // Enter. A hardware / desktop Enter is a keydown the keymap turns into
        // a split; a virtual keyboard's often arrives as keyCode 229 and only
        // `beforeinput` names it. Arm on either; the split itself is untouched.
        keydown: (view, event) => {
          if (
            event.key === 'Enter' &&
            !event.isComposing &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            arm(view.state, !event.shiftKey)
          }
          return false
        },
        beforeinput: (view, event) => {
          if (
            event.inputType === 'insertParagraph' ||
            event.inputType === 'insertLineBreak'
          ) {
            arm(view.state, event.inputType === 'insertParagraph')
          }
          return false
        },
        compositionend: (view) => {
          // After ProseMirror has read the composition's last DOM change.
          setTimeout(() => {
            const boundary = afterComposition
            afterComposition = null
            if (boundary && !view.composing) {
              linkBoundaryWord(view, boundary)
            }
            const pending = view.isDestroyed
              ? null
              : autolinkKey.getState(view.state)
            if (!pending || view.composing) {
              return
            }
            const link = linkSchema.type(ctx)
            const tr = view.state.tr.setMeta(autolinkKey, null)
            const { doc } = view.state
            if (pending.entity) {
              view.dispatch(tr)
              if (doc.textBetween(pending.from, pending.to) === pending.text) {
                convertToEntity(view, pending.from, pending.to, pending.entity, {
                  allowCard: true,
                  offer: true
                })
              }
              return
            }
            // The composition may have rewritten the text since; link it only
            // if it is still exactly what was inserted.
            if (
              doc.textBetween(pending.from, pending.to) === pending.text &&
              linkable(doc, pending.from, pending.to, link)
            ) {
              addLink(tr, pending, link)
              // A mark step maps no positions, so history never counts it as
              // adjacent to the insert; the shared composition id is what puts
              // both in one undo event.
              if (pending.composition !== undefined) {
                tr.setMeta('composition', pending.composition)
              }
            }
            view.dispatch(tr)
          })
          return false
        }
      }
    }
  })
})
