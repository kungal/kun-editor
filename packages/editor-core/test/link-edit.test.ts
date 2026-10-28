// The link editor's model: what it prefills, and `[文本](链接)` applied in one
// transaction — over a selection, at a caret, on an existing link — plus unlink
// and the entity rule (a bare entity URL becomes its chip / card).
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import { undo } from '@milkdown/kit/prose/history'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import type { KunEditorAdapters } from '../src'
import {
  createKunEditorPlugins,
  linkDraft,
  linkAtSelection,
  removeLinkCommand,
  setLinkCommand
} from '../src/preset'

const T1 = 'https://www.kungal.com/topic/1'
const entityFromUrl: KunEditorAdapters['entityFromUrl'] = (url) =>
  url === T1 ? { type: 'topic', id: '1', url } : null

const run = async (
  md: string,
  fn: (editor: Editor, view: EditorView) => void,
  adapters: KunEditorAdapters = { entityFromUrl }
): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, md)
    })
    .use(createKunEditorPlugins(adapters, { codeBlock: false }))
    .create()
  fn(editor, editor.action((ctx) => ctx.get(editorViewCtx)))
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}
const select = (v: EditorView, from: number, to = from) =>
  v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, from, to)))
const set = (editor: Editor, payload: { text?: string; href: string }) =>
  editor.action(callCommand(setLinkCommand.key, payload))

describe('link draft', () => {
  it('a selection: its text, nothing to edit yet', async () => {
    await run('hello world', (_e, v) => {
      select(v, 7, 12)
      expect(linkDraft(v.state)).toMatchObject({ text: 'world', href: '', editing: false, textEditable: true })
    })
  })

  it('a caret inside a link: the whole link, editable and removable', async () => {
    await run('see [the docs](https://a.com/x) now', (_e, v) => {
      select(v, 8)
      expect(linkDraft(v.state)).toMatchObject({ text: 'the docs', href: 'https://a.com/x', editing: true })
      expect(linkAtSelection(v.state, true)).not.toBeNull()
      // At its very edge the caret is not "on" the link (strict), but Mod-K
      // there still edits it.
      select(v, 5)
      expect(linkAtSelection(v.state, true)).toBeNull()
      expect(linkDraft(v.state).editing).toBe(true)
    })
  })

  it('text is read-only across a chip or paragraphs', async () => {
    await run(`a <${T1}> b\n\nnext`, (_e, v) => {
      select(v, 1, 6)
      expect(linkDraft(v.state).textEditable).toBe(false)
      select(v, 2, v.state.doc.content.size - 2)
      expect(linkDraft(v.state).textEditable).toBe(false)
    })
  })
})

describe('setLinkCommand', () => {
  it('a selection with new text: [文本](链接), round-tripped', async () => {
    const out = await run('看 这里 吧', (editor, v) => {
      select(v, 3, 5)
      set(editor, { text: '文档', href: 'www.a.com/x' })
    })
    expect(out).toBe('看 [文档](https://www.a.com/x) 吧')
    const back = await run(out, () => {})
    expect(back).toBe(out)
  })

  it('a caret, both given: inserted; empty text falls back to the URL', async () => {
    expect(await run('a', (editor, v) => {
      select(v, 2)
      set(editor, { text: '文本', href: 'https://a.com' })
    })).toBe('a[文本](https://a.com)')
    expect(await run('a', (editor, v) => {
      select(v, 2)
      set(editor, { text: '  ', href: 'https://a.com' })
    })).toBe('a<https://a.com>')
  })

  it('unchanged text keeps mixed formatting', async () => {
    let runs: [string, string[]][] = []
    await run('**bold**plain', (editor, v) => {
      select(v, 1, 10)
      set(editor, { text: 'boldplain', href: 'https://a.com' })
      v.state.doc.descendants((node) => {
        if (node.isText) runs.push([node.text!, node.marks.map((m) => m.type.name).sort()])
      })
    })
    expect(runs).toEqual([
      ['bold', ['link', 'strong']],
      ['plain', ['link']]
    ])
  })

  it('edits an existing link: text and URL; one undo restores it', async () => {
    let undone = ''
    const out = await run('see [the docs](https://a.com/x) now', (editor, v) => {
      select(v, 8)
      set(editor, { text: 'guide', href: 'https://b.com' })
      undo(v.state, v.dispatch)
      undone = editor.action(getMarkdown()).trim()
      v.dispatch(v.state.tr) // keep the editor alive for the final serialize
    })
    expect(undone).toBe('see [the docs](https://a.com/x) now')
    expect(out).toBe('see [the docs](https://a.com/x) now')
    expect(await run('see [the docs](https://a.com/x) now', (editor, v) => {
      select(v, 8)
      set(editor, { text: 'guide', href: 'https://b.com' })
    })).toBe('see [guide](https://b.com) now')
  })

  it('removeLinkCommand unlinks the whole link, keeping its text', async () => {
    expect(await run('see [the docs](https://a.com/x) now', (editor, v) => {
      select(v, 8)
      editor.action(callCommand(removeLinkCommand.key))
    })).toBe('see the docs now')
  })

  it('across a chip the text stays, the mark goes on', async () => {
    const out = await run(`a <${T1}> b`, (editor, v) => {
      select(v, 1, 6)
      set(editor, { text: 'ignored', href: 'https://a.com' })
    })
    expect(out).toContain('(https://a.com)')
    expect(out).toContain(`<${T1}>`)
  })

  it('text equal to an entity URL: the chip / card the entity rule says', async () => {
    expect(await run('', (editor, v) => {
      select(v, 1)
      set(editor, { text: T1, href: T1 })
    })).toBe(`<${T1}>`)
    expect(await run('看', (editor, v) => {
      select(v, 2)
      set(editor, { href: T1, text: '' })
    })).toBe(`看<${T1}>`)
    // A title of its own: an ordinary link.
    expect(await run('看', (editor, v) => {
      select(v, 2)
      set(editor, { text: '帖子', href: T1 })
    })).toBe(`看[帖子](${T1})`)
  })

  it('a blank URL is refused', async () => {
    expect(await run('a', (editor, v) => {
      select(v, 1, 2)
      expect(editor.action(callCommand(setLinkCommand.key, { text: 'a', href: '  ' }))).toBe(false)
    })).toBe('a')
  })
})
