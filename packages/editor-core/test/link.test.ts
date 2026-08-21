// insertLinkCommand — click-to-insert over the commonmark `link` mark. With a
// selection it wraps the text; with an empty selection it inserts linked text.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import { undoCommand } from '@milkdown/kit/plugin/history'
import { closeHistory } from '@milkdown/kit/prose/history'
import { TextSelection } from '@milkdown/kit/prose/state'
import { toggleLinkCommand, linkSchema } from '@milkdown/kit/preset/commonmark'
import { createKunEditorPlugins } from '../src/preset'
import { insertLinkCommand } from '../src/plugins/link'

const withEditor = async (run: (editor: Editor) => void): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, 'hello')
    })
    .use(createKunEditorPlugins({}, { codeBlock: false }))
    .create()
  run(editor)
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

const select = (editor: Editor, from: number, to: number) =>
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)))
  })

describe('insertLinkCommand', () => {
  it('wraps the selection in a link', async () => {
    const out = await withEditor((editor) => {
      select(editor, 1, 6) // "hello"
      editor.action(callCommand(insertLinkCommand.key, { href: 'https://a.com' }))
    })
    expect(out).toBe('[hello](https://a.com)')
  })

  it('inserts linked text when the selection is empty', async () => {
    const out = await withEditor((editor) => {
      select(editor, 6, 6) // caret at end of "hello"
      editor.action(
        callCommand(insertLinkCommand.key, { href: 'https://a.com', text: 'site' })
      )
    })
    expect(out).toBe('hello[site](https://a.com)')
  })

  it('falls back to the href as text (serialized as an autolink)', async () => {
    const out = await withEditor((editor) => {
      select(editor, 6, 6)
      editor.action(callCommand(insertLinkCommand.key, { href: 'https://a.com' }))
    })
    // remark-stringify collapses a link whose text === href into `<url>`.
    expect(out).toBe('hello<https://a.com>')
  })

  it('gives a schemeless host an https:// scheme', async () => {
    const out = await withEditor((editor) => {
      select(editor, 1, 6) // "hello"
      editor.action(
        callCommand(insertLinkCommand.key, { href: 'www.kungal.com/topic/1' })
      )
    })
    // Without this the href stays relative and resolves against the page URL.
    expect(out).toBe('[hello](https://www.kungal.com/topic/1)')
  })

  it('normalizes the href it inserts as text too', async () => {
    const out = await withEditor((editor) => {
      select(editor, 6, 6)
      editor.action(callCommand(insertLinkCommand.key, { href: 'kungal.com' }))
    })
    expect(out).toBe('hello<https://kungal.com>')
  })

  it('is a no-op for a blank href', async () => {
    const out = await withEditor((editor) => {
      select(editor, 1, 6)
      editor.action(callCommand(insertLinkCommand.key, { href: '  ' }))
    })
    expect(out).toBe('hello')
  })

  it('does not keep the link mark after the linked text is deleted', async () => {
    const out = await withEditor((editor) => {
      select(editor, 1, 6) // "hello"
      editor.action(callCommand(insertLinkCommand.key, { href: 'https://a.com' }))
      // Select the whole link again and delete it in one stroke.
      select(editor, 1, 6)
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.deleteSelection())
      })
      // Type at the (now empty) cursor — it must NOT be linked.
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.insertText('x'))
      })
    })
    expect(out).toBe('x')
  })
})

describe('orphan link stored mark', () => {
  const linkHello = (editor: Editor) => {
    select(editor, 1, 6)
    editor.action(callCommand(insertLinkCommand.key, { href: 'https://a.com' }))
  }

  it('clears the stored mark as soon as the linked text is gone', async () => {
    await withEditor((editor) => {
      linkHello(editor)
      select(editor, 1, 6)
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.deleteSelection())
        const linkType = linkSchema.type(ctx)
        expect(!!linkType.isInSet(view.state.storedMarks ?? [])).toBe(false)
      })
    })
  })

  it('does not keep the link after backspacing the linked text away', async () => {
    const out = await withEditor((editor) => {
      linkHello(editor)
      select(editor, 6, 6)
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        for (let i = 0; i < 5; i++) {
          const { from } = view.state.selection
          view.dispatch(view.state.tr.delete(from - 1, from))
        }
        view.dispatch(view.state.tr.insertText('x'))
      })
    })
    expect(out).toBe('x')
  })

  it('keeps the link when only part of the linked text is deleted', async () => {
    const out = await withEditor((editor) => {
      linkHello(editor)
      select(editor, 4, 6) // "lo"
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.deleteSelection())
        view.dispatch(view.state.tr.insertText('x'))
      })
    })
    expect(out).toBe('[helx](https://a.com)')
  })

  it('continues the link when typing inside leftover linked text', async () => {
    const out = await withEditor((editor) => {
      linkHello(editor)
      select(editor, 3, 3) // after "he"
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.insertText('X'))
      })
    })
    expect(out).toBe('[heXllo](https://a.com)')
  })

  it('strips an armed toggleLink stored mark outside a link', async () => {
    const out = await withEditor((editor) => {
      select(editor, 6, 6)
      editor.action(callCommand(toggleLinkCommand.key, { href: 'https://a.com' }))
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.insertText('x'))
      })
    })
    expect(out).toBe('hellox')
  })

  it('undo after deleting a link restores the link in one step', async () => {
    const out = await withEditor((editor) => {
      linkHello(editor)
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(closeHistory(view.state.tr))
      })
      select(editor, 1, 6)
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.deleteSelection())
      })
      editor.action(callCommand(undoCommand.key))
    })
    expect(out).toBe('[hello](https://a.com)')
  })
})
