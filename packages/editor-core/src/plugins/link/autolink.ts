// Autolink on input — a whole URL arriving in ONE input becomes a link, exactly
// as pasting it does.
//
// A paste goes through Milkdown's clipboard plugin, which reads the text as
// markdown, so GFM's autolink literal turns `https://…` into a link. An Android
// keyboard's clipboard strip (Gboard, Sogou, Baidu…) never fires a paste: it
// commits the clip like a typed word, and the text stayed plain. Plain is worse
// than "not blue while editing": the serializer escapes a plain URL
// (`https\://…`) precisely so it can NOT become a link later, so the published
// post showed a dead URL too.
//
// The rule: when ONE input inserts text that is exactly one link as the paste
// path would read it — the same parser decides, so `www.…` and `a@b.c` behave as
// they do on paste — that text gets the link. Never:
//   - in a code block or inline code, where text is literal;
//   - where the text is already linked;
//   - for a URL typed key by key: every keystroke is its own input, and a few
//     characters are never a whole link, so a half-typed URL never turns blue.
//
// During IME composition the mark waits for `compositionend` (as the input
// rules do): restyling the text an IME is still composing tears the composition
// apart. Pure: no host policy.
import { parserCtx } from '@milkdown/kit/core'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import type { MarkType, Node as ProseNode } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { Transaction } from '@milkdown/kit/prose/state'
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

const autolinkKey = new PluginKey<PendingLink | null>('KUN_AUTOLINK_INPUT')

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
    props: {
      handleTextInput: (view, from, _to, text, deflt) => {
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
        compositionend: (view) => {
          // After ProseMirror has read the composition's last DOM change.
          setTimeout(() => {
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
