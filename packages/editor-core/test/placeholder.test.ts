// Placeholder — a ProseMirror node DECORATION (class + data-placeholder attr) on
// the empty block; never enters the doc/markdown. Assert the rendered DOM carries
// the attribute when empty, and not when there's content.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
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
