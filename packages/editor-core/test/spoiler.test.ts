// insertKunSpoilerCommand — the "隐藏文本" toolbar button.
//
// The regression these lock down: the command used to insert an EMPTY node over
// the selection, so clicking the button with text selected DELETED the text and
// left a bare `||||`. The text has to end up inside the node.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import {
  AllSelection,
  NodeSelection,
  TextSelection
} from '@milkdown/kit/prose/state'
import { createKunEditorPlugins } from '../src/preset'
import { insertKunSpoilerCommand } from '../src/plugins/spoiler'

/** The caret anchor the plugin leaves after a spoiler (see CARET_ANCHOR). */
const ZWSP = '​'

const withEditor = async (
  value: string,
  run: (editor: Editor) => void
): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, value)
    })
    // No code-block plugin: its CodeMirror view needs layout jsdom lacks. The
    // commonmark code_block SCHEMA is still there, which is what the guard test
    // needs.
    .use(createKunEditorPlugins({}, { codeBlock: false }))
    .create()
  run(editor)
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

const select = (editor: Editor, from: number, to = from) =>
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to))
    )
  })

const spoiler = (editor: Editor) =>
  editor.action(callCommand(insertKunSpoilerCommand.key))

const type = (editor: Editor, text: string) =>
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.insertText(text))
  })

describe('insertKunSpoilerCommand', () => {
  it('hides the selected text instead of deleting it', async () => {
    const out = await withEditor('hello world', (editor) => {
      select(editor, 1, 6) // "hello"
      spoiler(editor)
    })
    expect(out).toBe('||hello|| world')
  })

  it('keeps the words when the selection carries marks', async () => {
    // `marks: ''` on the schema — the bold cannot survive `||…||`, the text must.
    const out = await withEditor('**bold** text', (editor) => {
      select(editor, 1, 10)
      spoiler(editor)
    })
    expect(out).toBe('||bold text||')
  })

  it('joins a selection spanning paragraphs into one spoiler', async () => {
    const out = await withEditor('a\n\nb', (editor) => {
      select(editor, 1, 5)
      spoiler(editor)
    })
    expect(out).toBe('||a b||')
  })

  it('puts the caret inside the node when nothing is selected', async () => {
    const out = await withEditor('hello', (editor) => {
      select(editor, 6) // caret at the end of "hello"
      spoiler(editor)
      type(editor, 'secret') // must land INSIDE the spoiler
    })
    expect(out).toBe('hello||secret||')
  })

  it('leaves nothing behind when nothing is typed into it', async () => {
    // A spoiler holding only the caret anchor never reaches the markdown, so a
    // stray click cannot leave a `||||` in the document.
    const out = await withEditor('hello', (editor) => {
      select(editor, 6)
      spoiler(editor)
    })
    expect(out).toBe('hello')
  })

  it('leaves the caret outside the spoiler after wrapping', async () => {
    const out = await withEditor('hello world', (editor) => {
      select(editor, 1, 6)
      spoiler(editor)
      type(editor, '!') // must land AFTER the spoiler, not inside it
    })
    expect(out).toBe('||hello||! world')
  })

  it('reveals the spoiler the caret is in instead of nesting', async () => {
    const out = await withEditor('||secret|| tail', (editor) => {
      select(editor, 3) // inside the spoiler
      spoiler(editor)
    })
    expect(out).toBe('secret tail')
  })

  it('takes the caret anchor with it when revealing', async () => {
    // Otherwise hide → reveal → hide → reveal stacks up invisible characters.
    const out = await withEditor(`||secret||${ZWSP} tail`, (editor) => {
      select(editor, 3)
      spoiler(editor)
    })
    expect(out).toBe('secret tail')
  })

  it('re-hides exactly what it revealed (the button is a toggle)', async () => {
    const out = await withEditor('||secret|| tail', (editor) => {
      select(editor, 3)
      spoiler(editor) // reveal, leaving "secret" selected
      spoiler(editor) // hide it again
    })
    expect(out).toBe('||secret|| tail')
  })

  it('reveals from a selection that only covers part of the spoiler', async () => {
    const out = await withEditor('||secret||', (editor) => {
      select(editor, 3, 5) // "ec" inside the node
      spoiler(editor)
    })
    expect(out).toBe('secret')
  })

  it('flattens a spoiler caught inside a wider selection', async () => {
    const out = await withEditor('a ||b|| c', (editor) => {
      // 1..9, not 1..8: loading a spoiler leaves a caret anchor after it, so the
      // paragraph is one (invisible) character longer than its markdown.
      select(editor, 1, 9) // the whole paragraph
      spoiler(editor)
    })
    expect(out).toBe('||a b c||')
  })

  it('hides everything on a select-all (an AllSelection, not a text one)', async () => {
    const out = await withEditor('hide me', (editor) => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc))
        )
      })
      spoiler(editor)
    })
    expect(out).toBe('||hide me||')
  })

  it('refuses with a node selected, instead of replacing it', async () => {
    let handled: boolean | undefined
    const out = await withEditor('![kun](/a.webp)', (editor) => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(
          view.state.tr.setSelection(NodeSelection.create(view.state.doc, 1))
        )
      })
      handled = spoiler(editor)
    })
    expect(handled).toBe(false)
    expect(out).toBe('![kun](/a.webp)')
  })

  // `||…||` pairs within one line — in the remark transform here and in the
  // server renderer alike — so a spoiler holding a line break would serialize to
  // markdown that reads back as literal `||`. Commonmark's hardbreak declares
  // `leafText: () => '\n'`, so this is exactly what textBetween hands over.
  it('turns a line break inside the selection into a space', async () => {
    const out = await withEditor('第一行\n第二行', (editor) => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc))
        )
      })
      spoiler(editor)
    })
    expect(out).toBe('||第一行 第二行||')
  })

  it('round-trips what it wrote across a line break', async () => {
    const hidden = await withEditor('第一行\n第二行', (editor) => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc))
        )
      })
      spoiler(editor)
    })
    // Loading it back gives a real spoiler node, not literal `||`.
    let nodes = 0
    await withEditor(hidden, (editor) => {
      editor.action((ctx) => {
        ctx.get(editorViewCtx).state.doc.descendants((node) => {
          if (node.type.name === 'kun-spoiler') nodes++
        })
      })
    })
    expect(nodes).toBe(1)
  })

  it('refuses over a selection with no words in it', async () => {
    let handled: boolean | undefined
    const out = await withEditor('![kun](/a.webp)', (editor) => {
      // A TEXT selection across the image, not a NodeSelection: the image is
      // all there is to hide, and hiding it would delete it.
      select(editor, 1, 2)
      handled = spoiler(editor)
    })
    expect(handled).toBe(false)
    expect(out).toBe('![kun](/a.webp)')
  })

  it('refuses inside a code block, where an inline node cannot go', async () => {
    let handled: boolean | undefined
    const out = await withEditor('```\ncode\n```', (editor) => {
      select(editor, 3) // inside the code block's text
      handled = spoiler(editor)
    })
    expect(handled).toBe(false)
    expect(out).toBe('```\ncode\n```')
  })

  // ── The caret anchor is an EDITOR device ──────────────────────────────────
  // It has to be in the ProseMirror document (a caret cannot sit anywhere but a
  // text node) and must never be in what the host stores: it used to ride along
  // into the saved markdown, putting an invisible U+200B in the database.

  it('never writes the caret anchor into the markdown', async () => {
    const out = await withEditor('hello world', (editor) => {
      select(editor, 1, 6)
      spoiler(editor)
    })
    expect(out).not.toContain(ZWSP)
  })

  it('takes out an anchor that arrived with stored content', async () => {
    // Exactly what an older version of this plugin saved — opening and saving
    // the post heals it.
    const out = await withEditor(`鲲 ||Galgame||${ZWSP} 论坛`, () => {})
    expect(out).toBe('鲲 ||Galgame|| 论坛')
  })

  it('gives a loaded spoiler the anchor the caret needs', async () => {
    // The markdown no longer carries one, so parsing has to put it back: with no
    // text node after a spoiler ending a paragraph, the browser puts the next
    // keystroke INSIDE the spoiler.
    let trailing = ''
    await withEditor('||secret||', (editor) => {
      editor.action((ctx) => {
        const { doc } = ctx.get(editorViewCtx).state
        doc.descendants((node, pos) => {
          if (node.type.name === 'kun-spoiler') {
            const end = pos + node.nodeSize
            trailing = doc.textBetween(end, end + 1)
          }
        })
      })
    })
    expect(trailing).toBe(ZWSP)
  })
})
