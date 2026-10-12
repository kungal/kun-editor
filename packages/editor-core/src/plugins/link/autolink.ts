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
// During IME composition the mark waits for `compositionend` (as the input
// rules do): restyling the text an IME is still composing tears the composition
// apart. Pure: no host policy.
import { parserCtx } from '@milkdown/kit/core'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { closeHistory } from '@milkdown/kit/prose/history'
import type { MarkType, Node as ProseNode } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'

/** Inserted text waiting for its composition to end before it is linked. */
interface PendingLink {
  from: number
  to: number
  text: string
  href: string
  /** The input's `composition` meta. Linking under the same id is what makes
   * history fold the mark into the input's own undo event. */
  composition?: number
}

/** A typed word that a space / Enter is about to end. */
type BoundaryWord = Omit<PendingLink, 'composition'>

const autolinkKey = new PluginKey<PendingLink | null>('KUN_AUTOLINK_INPUT')

/** The word before the caret: a run of anything but whitespace and the caret
 * anchor the spoiler plugin parks after a spoiler (U+200B, which `\s` misses). */
const WORD_END = /[^\s\u200b]+$/

/** Could `text` be a GFM autolink at all? `handleTextInput` runs on every
 * keystroke, so this gate keeps the markdown parser off ordinary typing. */
const MAYBE_LINK = /^\S{4,}$/
const LINK_HINT = /:\/\/|www\.|@/i

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

/** The whitespace-free word ending at `pos`, if it lies in one text node — a
 * word whose start sits in a differently-marked text node before it is part of
 * a longer word, and linking its tail would be wrong. */
const wordBefore = (
  state: EditorState,
  pos: number
): { from: number; to: number; text: string } | null => {
  const $pos = state.doc.resolve(pos)
  const before = $pos.nodeBefore
  const match = before?.isText ? WORD_END.exec(before.text ?? '') : null
  if (!before || !match) {
    return null
  }
  if (match.index === 0) {
    const previous = state.doc.resolve(pos - before.nodeSize).nodeBefore
    if (previous?.isText && WORD_END.test(previous.text ?? '')) {
      return null
    }
  }
  return { from: pos - match[0].length, to: pos, text: match[0] }
}

/** Whether the word now ends at a boundary: whitespace (a hard break reads as
 * `\n`) or the end of its block (Enter split it there). */
const endsAtBoundary = (doc: ProseNode, to: number): boolean => {
  const $to = doc.resolve(to)
  return to === $to.end() || /^\s$/.test(doc.textBetween(to, to + 1))
}

/** The autolink-on-input ProseMirror plugin. */
export const autolinkInputPlugin = $prose((ctx) => {
  /** The href pasting `text` would produce, or null when the paste path would
   * not make the whole of it one link. */
  const hrefOf = (text: string): string | null => {
    if (!MAYBE_LINK.test(text) || !LINK_HINT.test(text)) {
      return null
    }
    const doc = ctx.get(parserCtx)(text)
    const block = doc?.childCount === 1 ? doc.firstChild : null
    const only =
      block?.type.name === 'paragraph' && block.childCount === 1
        ? block.firstChild
        : null
    if (!only?.isText || only.text !== text) {
      return null
    }
    const mark = linkSchema.type(ctx).isInSet(only.marks)
    return mark ? (mark.attrs.href as string) : null
  }

  /** The word a space / Enter at the (empty) selection is about to end, if it
   * is a link — set before the boundary is inserted, applied once it is. */
  let armed: BoundaryWord | null = null
  /** An armed word whose boundary arrived mid-composition. */
  let afterComposition: BoundaryWord | null = null

  const arm = (state: EditorState) => {
    const { empty, from } = state.selection
    const word = empty ? wordBefore(state, from) : null
    const href = word ? hrefOf(word.text) : null
    const link = linkSchema.type(ctx)
    armed =
      word && href && linkable(state.doc, word.from, word.to, link)
        ? { ...word, href }
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
            arm(view.state)
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
            arm(view.state)
          }
          return false
        },
        beforeinput: (view, event) => {
          if (
            event.inputType === 'insertParagraph' ||
            event.inputType === 'insertLineBreak'
          ) {
            arm(view.state)
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
