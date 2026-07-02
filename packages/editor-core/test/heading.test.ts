// setHeadingCommand — the absolute block-type command behind the "text size"
// dropdown. Unlike wrapInHeadingCommand (toggle), it sets an exact level, and
// level 0 resets to a paragraph.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import { createKunEditorPlugins } from '../src/preset'
import { setHeadingCommand } from '../src/plugins/heading'

const withEditor = async (
  run: (editor: Editor) => void
): Promise<string> => {
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

describe('setHeadingCommand', () => {
  it('sets a heading level (paragraph → ## )', async () => {
    const out = await withEditor((editor) =>
      editor.action(callCommand(setHeadingCommand.key, 2))
    )
    expect(out).toBe('## hello')
  })

  it('resets to a paragraph with level 0', async () => {
    const out = await withEditor((editor) => {
      editor.action(callCommand(setHeadingCommand.key, 3))
      editor.action(callCommand(setHeadingCommand.key, 0))
    })
    expect(out).toBe('hello')
  })
})
