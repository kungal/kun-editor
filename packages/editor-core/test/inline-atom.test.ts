// The inline-atom plugin: Backspace / Delete beside a non-editable inline atom
// (@mention, #floor quote, …) deletes that node in ONE transaction from the
// `beforeinput` event — the path a phone's virtual keyboard takes, where no
// keydown reaches ProseMirror. Locks down: the exact node goes, nothing else;
// text beside the caret is left to the browser; block nodes are left to the
// base keymap; an input rule that just fired is undone first, like the base
// Backspace chain does.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { getMarkdown } from '@milkdown/kit/utils'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { createKunEditorPlugins } from '../src/preset'
import { deleteInlineAtom } from '../src/plugins/inline-atom'

const withEditor = async (
  markdown: string,
  run: (view: EditorView) => void
): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    // No code-block plugin: its CodeMirror view needs layout jsdom lacks.
    .use(createKunEditorPlugins({}, { codeBlock: false, quote: true }))
    .create()
  editor.action((ctx) => run(ctx.get(editorViewCtx)))
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

/** Fire the `beforeinput` a Backspace (or Delete) produces on the editor DOM,
 * the way a virtual keyboard does, and report whether the plugin took it. */
const fire = (view: EditorView, inputType: string): boolean => {
  const event = new InputEvent('beforeinput', {
    inputType,
    bubbles: true,
    cancelable: true
  })
  view.dom.dispatchEvent(event)
  return event.defaultPrevented
}

const caret = (view: EditorView, pos: number) =>
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, pos))
  )

const inline = (view: EditorView) =>
  view.state.doc.firstChild!.content.content.map((n) =>
    n.isText ? JSON.stringify(n.text) : n.type.name
  )

// `@Alice #1 ` — what 「引用」 inserts: two chips, each with its trailing space.
// The parser trims the final space, so it goes in by hand.
const QUOTE_DRAFT = '[@Alice](kungal-user:1) [#1](kungal-reply:101)'
const withDraft = (run: (view: EditorView) => void) =>
  withEditor(QUOTE_DRAFT, (view) => {
    const end = view.state.doc.content.size - 1
    view.dispatch(view.state.tr.insertText(' ', end))
    caret(view, view.state.doc.content.size - 1)
    run(view)
  })

describe('inline-atom: Backspace from beforeinput', () => {
  it('four presses take "@Alice #1 " apart one unit at a time', async () => {
    const steps: string[][] = []
    const handled: boolean[] = []
    const out = await withDraft((view) => {
      for (let i = 0; i < 4; i++) {
        const took = fire(view, 'deleteContentBackward')
        handled.push(took)
        if (!took) {
          // The browser deletes a plain character itself; stand in for it.
          const { $cursor } = view.state.selection as TextSelection
          view.dispatch(view.state.tr.delete($cursor!.pos - 1, $cursor!.pos))
        }
        steps.push(inline(view))
      }
    })
    expect(steps).toEqual([
      ['mention', '" "', 'quote'],
      ['mention', '" "'],
      ['mention'],
      []
    ])
    // Text is the browser's; each chip is the plugin's.
    expect(handled).toEqual([false, true, false, true])
    expect(out).toBe('')
  })

  it('deletes exactly the chip before the caret and leaves the caret there', async () => {
    let selection = -1
    await withDraft((view) => {
      // Before the trailing space, right after `#1`: paragraph content starts
      // at 1, mention 1–2, space 2–3, quote 3–4, space 4–5.
      caret(view, 4)
      expect(fire(view, 'deleteContentBackward')).toBe(true)
      selection = view.state.selection.from
      // The two spaces around the chip merge into one text node.
      expect(inline(view)).toEqual(['mention', '"  "'])
    })
    expect(selection).toBe(3)
  })

  it('leaves the caret beside text to the browser', async () => {
    await withEditor('plain text', (view) => {
      caret(view, 6)
      expect(fire(view, 'deleteContentBackward')).toBe(false)
      expect(fire(view, 'deleteContentForward')).toBe(false)
      expect(view.state.doc.textContent).toBe('plain text')
    })
  })

  it('leaves a block boundary to the base keymap', async () => {
    // Caret at the start of the paragraph after a thematic break: nothing
    // inline before it, so the plugin declines and joinBackward /
    // selectNodeBackward get their turn on the keydown path.
    await withEditor('---\n\ntext', (view) => {
      let start = -1
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph') start = pos + 1
      })
      caret(view, start)
      expect(fire(view, 'deleteContentBackward')).toBe(false)
      expect(view.state.doc.childCount).toBe(2)
    })
  })

  it('undoes an input rule that just fired instead of deleting its atom', async () => {
    const out = await withEditor('a', (view) => {
      const end = view.state.doc.content.size - 1
      view.dispatch(view.state.tr.insertText(' $x', end))
      const pos = view.state.doc.content.size - 1
      view.someProp('handleTextInput', (f) => f(view, pos, pos, '$'))
      expect(inline(view)[1]).toBe('math_inline')
      expect(fire(view, 'deleteContentBackward')).toBe(true)
      expect(view.state.doc.textContent).toBe('a $x$')
    })
    // Plain text again (the serializer escapes the dollars), not inline math.
    expect(out).toBe('a \\$x\\$')
  })

  it('stays out of an IME composition', async () => {
    await withDraft((view) => {
      caret(view, view.state.doc.content.size - 2)
      ;(view as unknown as { input: { composing: boolean } }).input.composing = true
      expect(fire(view, 'deleteContentBackward')).toBe(false)
      expect(inline(view)).toEqual(['mention', '" "', 'quote', '" "'])
    })
  })
})

describe('inline-atom: Delete and node selections', () => {
  it('Delete removes the chip after the caret', async () => {
    await withDraft((view) => {
      caret(view, 2) // after the mention: a space is next, the browser's job
      expect(fire(view, 'deleteContentForward')).toBe(false)
      caret(view, 1) // before the mention
      expect(fire(view, 'deleteContentForward')).toBe(true)
      expect(inline(view)).toEqual(['" "', 'quote', '" "'])
      expect(view.state.selection.from).toBe(1)
    })
  })

  it('a node-selected chip goes on Backspace', async () => {
    await withDraft((view) => {
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, 1))
      )
      expect(fire(view, 'deleteContentBackward')).toBe(true)
      expect(inline(view)).toEqual(['" "', 'quote', '" "'])
    })
  })
})

describe('deleteInlineAtom', () => {
  it('returns null for a range selection', async () => {
    await withDraft((view) => {
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 3))
      )
      expect(deleteInlineAtom(view.state, -1)).toBeNull()
      expect(deleteInlineAtom(view.state, 1)).toBeNull()
    })
  })
})
