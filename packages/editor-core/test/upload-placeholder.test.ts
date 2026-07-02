// startImageUpload — the toolbar upload path: an in-document "uploading…"
// placeholder (a decoration) at the caret while the adapter runs, replaced by the
// image on success / removed on failure. (Paste/drop uses Milkdown's own
// placeholder; this covers the programmatic toolbar path.)
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { getMarkdown } from '@milkdown/kit/utils'
import { createKunEditorPlugins } from '../src/preset'
import { startImageUpload } from '../src/plugins/upload'

const makeEditor = async () => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, '')
    })
    .use(
      createKunEditorPlugins(
        { uploadImage: async () => 'unused' },
        { codeBlock: false }
      )
    )
    .create()
  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  return { editor, root, view }
}

const pngFile = () => new File(['x'], 'a.png', { type: 'image/png' })

describe('startImageUpload (toolbar upload placeholder)', () => {
  it('shows a placeholder while uploading, then replaces it with the image', async () => {
    const { editor, root, view } = await makeEditor()
    let resolve!: (url: string) => void
    const done = startImageUpload(view, pngFile(), {
      uploadImage: () => new Promise<string>((r) => (resolve = r))
    })
    // In-flight: the placeholder decoration is in the DOM.
    expect(root.querySelector('.kun-editor__uploading')).not.toBeNull()

    resolve('https://cdn.example/a.png')
    await done
    // Resolved: placeholder gone, image inserted.
    expect(root.querySelector('.kun-editor__uploading')).toBeNull()
    expect(editor.action(getMarkdown())).toContain('https://cdn.example/a.png')

    await editor.destroy()
    root.remove()
  })

  it('removes the placeholder and notifies on failure (no image)', async () => {
    const { editor, root, view } = await makeEditor()
    const notices: string[] = []
    await startImageUpload(view, pngFile(), {
      uploadImage: async () => {
        throw new Error('boom')
      },
      notify: (msg) => notices.push(msg)
    })
    expect(root.querySelector('.kun-editor__uploading')).toBeNull()
    expect(editor.action(getMarkdown())).not.toContain('!\[')
    expect(notices.length).toBe(1)

    await editor.destroy()
    root.remove()
  })

  it('ignores non-image files', async () => {
    const { editor, root, view } = await makeEditor()
    await startImageUpload(view, new File(['x'], 'a.txt', { type: 'text/plain' }), {
      uploadImage: async () => 'https://cdn.example/nope.png'
    })
    expect(root.querySelector('.kun-editor__uploading')).toBeNull()
    expect(editor.action(getMarkdown())).not.toContain('nope')
    await editor.destroy()
    root.remove()
  })
})
