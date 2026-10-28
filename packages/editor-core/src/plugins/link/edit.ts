// Editing a link as text + URL — the model behind the one link editor every
// entry point opens (the selection bubble, the toolbar, Mod-K, a click on a
// link): what to prefill it with, and how to apply `[文本](链接)` in ONE
// transaction (one undo).
//
// - A selection: 文本 is the selected text; editing it replaces that text.
// - A caret on a link (or a selection inside one): the whole link — its text
//   and href — is what is edited, and it can be removed.
// - Nothing: both empty; the link goes in at the caret, its text falling back
//   to the URL.
// The URL is normalized as everywhere else (`normalizeLinkHref`). When 文本
// IS the URL and the URL is an entity's, the result is a bare entity link —
// so it becomes the chip / card the entity rule says, in the same step.
import type { MarkType, Mark, Node as ProseNode, ResolvedPos } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'

import { normalizeLinkHref } from '../../href'
import { entityResolverOf } from '../entity'
import { placeEntity } from '../entity/model'

/** What a link editor opens with. */
export interface LinkDraft {
  /** The link text: the selection's, or the existing link's. */
  text: string
  /** The existing link's href ('' when there is none). */
  href: string
  /** Whether an existing link is being edited (so it can be removed). */
  editing: boolean
  /** Whether 文本 may be changed: the target is plain text inside one block. */
  textEditable: boolean
  /** The range the link covers (from === to: insert at the caret). */
  from: number
  to: number
}

/** The link mark's full extent around `$pos` — the run of sibling text nodes
 * carrying the same link — or null. `side` picks the node to start from:
 * after the position (1), before it (-1). */
const linkRangeAt = (
  $pos: ResolvedPos,
  link: MarkType,
  side: -1 | 1
): { from: number; to: number; mark: Mark } | null => {
  const parent = $pos.parent
  const index = side > 0 ? $pos.index() : $pos.index() - (($pos.textOffset ? 0 : 1))
  const start = parent.maybeChild(index)
  const mark = start ? link.isInSet(start.marks) : undefined
  if (!start || !mark) {
    return null
  }
  let first = index
  let last = index
  while (first > 0 && mark.isInSet(parent.child(first - 1).marks)) first--
  while (last < parent.childCount - 1 && mark.isInSet(parent.child(last + 1).marks)) last++
  let from = $pos.start()
  for (let i = 0; i < first; i++) from += parent.child(i).nodeSize
  let to = from
  for (let i = first; i <= last; i++) to += parent.child(i).nodeSize
  return { from, to, mark }
}

/**
 * The link at the selection, if it sits on one: a caret strictly inside a
 * link's text (`strict`), or touching it on either side; a selection lying
 * within one link. Null otherwise.
 */
export const linkAtSelection = (
  state: EditorState,
  strict = false
): { from: number; to: number; href: string } | null => {
  const link = state.schema.marks.link
  if (!link) return null
  const { $from, $to, empty } = state.selection
  if (!$from.parent.isTextblock) return null
  const after = linkRangeAt($from, link, 1)
  const before = linkRangeAt($from, link, -1)
  let range = after ?? before
  if (empty && strict) {
    range = after && before && after.mark.eq(before.mark) ? after : null
  }
  if (!range || (!empty && ($to.pos > range.to || $from.pos < range.from))) {
    return null
  }
  return { from: range.from, to: range.to, href: String(range.mark.attrs.href ?? '') }
}

/** Plain text only, within one textblock — what 文本 may replace. */
const plainTextRange = (doc: ProseNode, from: number, to: number): boolean => {
  const $from = doc.resolve(from)
  if (!$from.parent.isTextblock || doc.resolve(to).parent !== $from.parent) {
    return false
  }
  let plain = true
  doc.nodesBetween(from, to, (node) => {
    if (node.isInline && !node.isText) plain = false
  })
  return plain
}

/** What a link editor opens with, for the current selection. */
export const linkDraft = (state: EditorState): LinkDraft => {
  const existing = linkAtSelection(state)
  const { from, to } = existing ?? state.selection
  return {
    text: state.doc.textBetween(from, to, ' ', ' '),
    href: existing?.href ?? '',
    editing: !!existing,
    textEditable: plainTextRange(state.doc, from, to),
    from,
    to
  }
}

/**
 * Apply `[text](href)` to the draft's range in `tr` (the state's own draft by
 * default): one transaction, so one undo. Returns false for an empty href.
 * The caret ends after the link, with the link mark not carried on.
 */
export const applyLink = (
  tr: Transaction,
  state: EditorState,
  payload: { text?: string; href: string }
): boolean => {
  const link = state.schema.marks.link
  const href = normalizeLinkHref(payload.href ?? '')
  if (!link || !href) {
    return false
  }
  const draft = linkDraft(state)
  const { from, to } = draft
  const typed = payload.text ?? draft.text
  const text = typed.trim() ? typed : href
  const mark = link.create({ href })
  let end = to
  if (from === to) {
    const marks = (tr.storedMarks ?? tr.doc.resolve(from).marks()).filter((m) => m.type !== link)
    tr.insert(from, state.schema.text(text, mark.addToSet(marks)))
    end = from + text.length
  } else if (draft.textEditable && text !== draft.text) {
    const marks = (tr.doc.nodeAt(from)?.marks ?? []).filter((m) => m.type !== link)
    tr.replaceWith(from, to, state.schema.text(text, mark.addToSet(marks)))
    end = from + text.length
  } else {
    tr.removeMark(from, to, link).addMark(from, to, mark)
  }
  tr.setSelection(TextSelection.create(tr.doc, end))
  // A bare link to an entity IS an entity (the shared contract): make it the
  // chip / card in this same step.
  const ref = text === href ? entityResolverOf(state)?.(href) : null
  if (ref && tr.doc.textBetween(from, end) === href) {
    placeEntity(tr, from, end, ref, { allowCard: true })
  }
  tr.removeStoredMark(link)
  return true
}

/** Remove the link at the selection (the whole link). */
export const removeLink = (tr: Transaction, state: EditorState): boolean => {
  const link = state.schema.marks.link
  const existing = linkAtSelection(state)
  if (!link || !existing) {
    return false
  }
  tr.removeMark(existing.from, existing.to, link)
  return true
}
