// Autolink on input — a whole URL committed by ONE input is linked like a paste.
//
// The case it exists for: an Android keyboard's clipboard strip (Gboard, Sogou,
// Baidu…) commits the clip as typed text, never firing a paste, so the URL stayed
// plain — and a plain URL is saved escaped (`https\://…`), dead on the published
// page too. jsdom has no IME, so `input()` drives the plugin through
// `handleTextInput` exactly the way prosemirror-view's DOM-change reader does.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import { undoCommand } from '@milkdown/kit/plugin/history'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { createKunEditorPlugins } from '../src/preset'

const URL = 'https://www.kungal.com/topic/1'

const view = (editor: Editor): EditorView =>
  editor.action((ctx) => ctx.get(editorViewCtx))

/** One input inserting `text` at the selection, the way prosemirror-view reads
 * a DOM change: the plugins get `handleTextInput` first, else the default —
 * tagged with the composition id while composing, as prosemirror-view does. */
const input = (editor: Editor, text: string) => {
  const v = view(editor)
  const { from, to } = v.state.selection
  const deflt = () => {
    const tr = v.state.tr.insertText(text, from, to)
    return v.composing ? tr.setMeta('composition', 1) : tr
  }
  if (!v.someProp('handleTextInput', (f) => f(v, from, to, text, deflt))) {
    v.dispatch(deflt())
  }
}

const caret = (editor: Editor, pos: number) => {
  const v = view(editor)
  v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, pos)))
}

const caretAtEnd = (editor: Editor) =>
  caret(editor, TextSelection.atEnd(view(editor).state.doc).from)

/** prosemirror-view's own flag; jsdom cannot start a real composition. */
const setComposing = (editor: Editor, composing: boolean) => {
  ;(view(editor) as unknown as { input: { composing: boolean } }).input.composing =
    composing
}

const endComposition = async (editor: Editor) => {
  setComposing(editor, false)
  view(editor).dom.dispatchEvent(new Event('compositionend'))
  await new Promise((resolve) => setTimeout(resolve, 30))
}

/** Each linked run of text with its href, in document order. */
const links = (editor: Editor) => {
  const found: [string, string][] = []
  view(editor).state.doc.descendants((node) => {
    const link = node.marks.find((mark) => mark.type.name === 'link')
    if (node.isText && link) {
      found.push([node.text ?? '', link.attrs.href])
    }
  })
  return found
}

const withEditor = async (
  value: string,
  run: (editor: Editor) => void | Promise<void>
): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, value)
    })
    // No code-block plugin: its CodeMirror view needs layout jsdom lacks. The
    // commonmark code_block SCHEMA is still there.
    .use(createKunEditorPlugins({}, { codeBlock: false }))
    .create()
  await run(editor)
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

describe('autolink on input', () => {
  it('links a whole URL committed in one input', async () => {
    let found: [string, string][] = []
    const out = await withEditor('看这个', (editor) => {
      caretAtEnd(editor)
      input(editor, URL)
      found = links(editor)
    })
    expect(found).toEqual([[URL, URL]])
    // Saved as a link, not as the escaped `https\://` a plain URL becomes.
    expect(out).toBe(`看这个<${URL}>`)
  })

  it('reads www. and an email address the way a paste does', async () => {
    let found: [string, string][] = []
    await withEditor('a', (editor) => {
      caretAtEnd(editor)
      input(editor, 'www.kungal.com/topic/1')
      input(editor, ' ')
      input(editor, 'me@kungal.com')
      found = links(editor)
    })
    expect(found).toEqual([
      ['www.kungal.com/topic/1', 'http://www.kungal.com/topic/1'],
      ['me@kungal.com', 'mailto:me@kungal.com']
    ])
  })

  it('links only the URL when the keyboard adds a space after it', async () => {
    let found: [string, string][] = []
    const out = await withEditor('a', (editor) => {
      caretAtEnd(editor)
      input(editor, `${URL} `)
      found = links(editor)
    })
    expect(found).toEqual([[URL, URL]])
    expect(out).toBe(`a<${URL}>`)
  })

  it('does not link what is typed right after it', async () => {
    let found: [string, string][] = []
    await withEditor('a', (editor) => {
      caretAtEnd(editor)
      input(editor, URL)
      input(editor, '!')
      found = links(editor)
    })
    expect(found).toEqual([[URL, URL]])
  })

  it('never links a URL typed key by key', async () => {
    let found: [string, string][] = []
    await withEditor('a', (editor) => {
      caretAtEnd(editor)
      for (const ch of ` ${URL}`) {
        input(editor, ch)
      }
      found = links(editor)
    })
    expect(found).toEqual([])
  })

  it('leaves an input that is more than one URL alone', async () => {
    let found: [string, string][] = []
    await withEditor('a', (editor) => {
      caretAtEnd(editor)
      input(editor, `see ${URL}`)
      found = links(editor)
    })
    expect(found).toEqual([])
  })

  it('does not link inside a code block', async () => {
    let found: [string, string][] = []
    const out = await withEditor('```\ncode\n```', (editor) => {
      caret(editor, 3)
      input(editor, URL)
      found = links(editor)
    })
    expect(found).toEqual([])
    expect(out).toContain(URL)
  })

  it('does not link inside inline code', async () => {
    let found: [string, string][] = []
    const out = await withEditor('`code`', (editor) => {
      caret(editor, 3)
      input(editor, URL)
      found = links(editor)
    })
    expect(found).toEqual([])
    expect(out).toBe(`\`co${URL}de\``)
  })

  it('does not re-link text inside a link', async () => {
    let found: [string, string][] = []
    await withEditor('[text](https://a.com)', (editor) => {
      caret(editor, 3)
      input(editor, 'https://b.com')
      found = links(editor)
    })
    expect(found).toEqual([[`tehttps://b.comxt`, 'https://a.com']])
  })

  it('does not link inside a spoiler, which holds plain text', async () => {
    let found: [string, string][] = []
    const out = await withEditor('||secret||', (editor) => {
      caret(editor, 3)
      input(editor, URL)
      found = links(editor)
    })
    expect(found).toEqual([])
    expect(out).toContain('||')
  })

  it('waits for the composition to end before linking', async () => {
    let during: [string, string][] = []
    let after: [string, string][] = []
    await withEditor('a', async (editor) => {
      caretAtEnd(editor)
      setComposing(editor, true)
      input(editor, URL)
      during = links(editor)
      await endComposition(editor)
      after = links(editor)
    })
    expect(during).toEqual([])
    expect(after).toEqual([[URL, URL]])
  })

  it('gives up if the composition rewrote the text', async () => {
    let after: [string, string][] = []
    await withEditor('a', async (editor) => {
      caretAtEnd(editor)
      setComposing(editor, true)
      input(editor, URL)
      const v = view(editor)
      const end = v.state.doc.content.size - 1
      v.dispatch(v.state.tr.insertText('xyz', end - 5, end))
      await endComposition(editor)
      after = links(editor)
    })
    expect(after).toEqual([])
  })

  it('takes the text and the link back in one undo', async () => {
    const out = await withEditor('a', async (editor) => {
      caretAtEnd(editor)
      setComposing(editor, true)
      input(editor, URL)
      await endComposition(editor)
      editor.action(callCommand(undoCommand.key))
    })
    expect(out).toBe('a')
  })
})
