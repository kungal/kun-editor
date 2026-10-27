// URL detection shared by every path that turns typed or pasted text into a
// link — autolink on input, and the entity plugin's paste / boundary handoff.
// One test decides for all of them: "is this exactly one link as the paste path
// would read it?", answered by the same markdown parser the paste path uses, so
// `www.…` and `a@b.c` behave the same everywhere.
import { parserCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import type { EditorState } from '@milkdown/kit/prose/state'

/** The word before the caret: a run of anything but whitespace and the caret
 * anchor the spoiler plugin parks after a spoiler (U+200B, which `\s` misses). */
const WORD_END = /[^\s\u200b]+$/

/** Could `text` be a GFM autolink at all? `handleTextInput` runs on every
 * keystroke, so this gate keeps the markdown parser off ordinary typing. */
const MAYBE_LINK = /^\S{4,}$/
const LINK_HINT = /:\/\/|www\.|@/i

/** The href pasting `text` would produce, or null when the paste path would
 * not make the whole of it one link. */
export const linkHrefOf = (ctx: Ctx, text: string): string | null => {
  if (!MAYBE_LINK.test(text) || !LINK_HINT.test(text)) {
    return null
  }
  const doc = ctx.get(parserCtx)(text)
  const block = doc?.childCount === 1 ? doc.firstChild : null
  // With the entity plugin on, the parser itself reads a bare entity URL as a
  // card (or a chip): that is still exactly one link, and its canonical URL is
  // the href.
  if (block?.type.name === 'entity_card') {
    return block.attrs.url as string
  }
  const only =
    block?.type.name === 'paragraph' && block.childCount === 1
      ? block.firstChild
      : null
  if (only?.type.name === 'entity_link') {
    return only.attrs.url as string
  }
  if (!only?.isText || only.text !== text) {
    return null
  }
  const mark = linkSchema.type(ctx).isInSet(only.marks)
  return mark ? (mark.attrs.href as string) : null
}

/** The whitespace-free word ending at `pos`, if it lies in one text node — a
 * word whose start sits in a differently-marked text node before it is part of
 * a longer word, and linking its tail would be wrong. */
export const wordBefore = (
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

/**
 * The link a typed word ENDS with, as the paste path reads it: the whole word,
 * or its tail when GFM starts a literal autolink mid-word. That happens after
 * CJK text — `看这个https://…` is one whitespace-free word, yet GFM links the
 * URL in it, so a space after it has to as well. Only after a non-ASCII
 * character (CJK text, full-width punctuation such as `：`): an ASCII prefix
 * (`x.https://a.com`, `abchttps://…`) means the word is something else that
 * merely contains a URL-ish tail, and is left alone. `offset` is where the
 * link starts in the word.
 */
export const linkAtEndOf = (
  ctx: Ctx,
  word: string
): { offset: number; href: string } | null => {
  const whole = linkHrefOf(ctx, word)
  if (whole) {
    return { offset: 0, href: whole }
  }
  if (!MAYBE_LINK.test(word) || !LINK_HINT.test(word)) {
    return null
  }
  const doc = ctx.get(parserCtx)(word)
  const block = doc?.childCount === 1 ? doc.firstChild : null
  const last = block?.lastChild
  if (block?.type.name !== 'paragraph' || block.childCount < 2 || !last) {
    return null
  }
  const linked =
    last.type.name === 'entity_link' ||
    (last.isText && !!linkSchema.type(ctx).isInSet(last.marks))
  if (!linked) {
    return null
  }
  let prefix = ''
  for (let index = 0; index < block.childCount - 1; index++) {
    const child = block.child(index)
    if (!child.isText || child.marks.length) {
      return null
    }
    prefix += child.text ?? ''
  }
  if (
    !prefix ||
    !word.startsWith(prefix) ||
    prefix.charCodeAt(prefix.length - 1) < 0x80
  ) {
    return null
  }
  const href = linkHrefOf(ctx, word.slice(prefix.length))
  return href ? { offset: prefix.length, href } : null
}
