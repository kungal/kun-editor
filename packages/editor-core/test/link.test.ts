// insertLinkCommand — click-to-insert over the commonmark `link` mark. With a
// selection it wraps the text; with an empty selection it inserts linked text.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import { TextSelection } from '@milkdown/kit/prose/state'
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

  it('is a no-op for a blank href', async () => {
    const out = await withEditor((editor) => {
      select(editor, 1, 6)
      editor.action(callCommand(insertLinkCommand.key, { href: '  ' }))
    })
    expect(out).toBe('hello')
  })
})
