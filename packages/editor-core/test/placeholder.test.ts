// Placeholder — a ProseMirror node DECORATION (class + data-placeholder attr) on
// the empty block; never enters the doc/markdown. Assert the rendered DOM carries
// the attribute when empty, and not when there's content.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import { createKunEditorPlugins } from '../src/preset'

const mount = async (markdown: string, placeholder?: string) => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(createKunEditorPlugins({}, { codeBlock: false }, { placeholder }))
    .create()
  const el = root.querySelector('[data-placeholder]')
  const attr = el?.getAttribute('data-placeholder') ?? null
  await editor.destroy()
  root.remove()
  return attr
}

describe('placeholder', () => {
  it('decorates the empty block with the placeholder text', async () => {
    expect(await mount('', '写点什么…')).toBe('写点什么…')
  })

  it('does not decorate when there is content', async () => {
    expect(await mount('hello', '写点什么…')).toBeNull()
  })

  it('is absent when no placeholder is configured', async () => {
    expect(await mount('', undefined)).toBeNull()
  })
})

// mode 'doc' vs 'block' — the distinguishing case: an empty block INSIDE a
// non-empty document, with the cursor in it.
const mountEmptyLineInNonEmptyDoc = async (mode: 'doc' | 'block') => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, 'hello')
    })
    .use(
      createKunEditorPlugins(
        {},
        { codeBlock: false },
        { placeholder: 'ph', placeholderMode: mode }
      )
    )
    .create()
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view
    // Append an empty paragraph and put the cursor inside it.
    const para = state.schema.nodes.paragraph!.create()
    const tr = state.tr.insert(state.doc.content.size, para)
    tr.setSelection(TextSelection.near(tr.doc.resolve(tr.doc.content.size - 1)))
    view.dispatch(tr)
  })
  const present = !!root.querySelector('[data-placeholder]')
  await editor.destroy()
  root.remove()
  return present
}

describe('placeholder mode', () => {
  it("'block' shows on an empty line inside a non-empty doc", async () => {
    expect(await mountEmptyLineInNonEmptyDoc('block')).toBe(true)
  })

  it("'doc' does NOT show on an empty line inside a non-empty doc", async () => {
    expect(await mountEmptyLineInNonEmptyDoc('doc')).toBe(false)
  })
})
