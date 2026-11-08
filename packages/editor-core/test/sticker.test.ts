// Sticker — a decoration-only `kun-sticker` class on sticker images. The
// markdown stays a plain image; the class comes from the picker insert (session
// memory) or the host's `isSticker(src)`.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import { getMarkdown, callCommand } from '@milkdown/kit/utils'
import type { KunEditorAdapters, KunEditorFeatures } from '../src/types'
import { createKunEditorPlugins, insertStickerCommand, refreshStickersCommand } from '../src/preset'

const mount = async (
  markdown: string,
  adapters: KunEditorAdapters = {},
  features: KunEditorFeatures = {}
) => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(createKunEditorPlugins(adapters, { codeBlock: false, ...features }))
    .create()
  const stickers = () =>
    [...root.querySelectorAll('.ProseMirror img:not(.ProseMirror-separator)')].map((img) => ({
      src: img.getAttribute('src'),
      sticker: img.classList.contains('kun-sticker')
    }))
  const destroy = async () => {
    await editor.destroy()
    root.remove()
  }
  return { editor, root, stickers, destroy }
}

const CDN = 'https://img.example/ab/cd/abcd1234_320.webp'
const TOKEN = '/image/abcd1234_320'
const PHOTO = 'https://img.example/ff/ee/ffee9999.webp'
const hashOf = (src: string) => /([0-9a-f]{8})_320/.exec(src)?.[1]
const forumIsSticker = (src: string) => hashOf(src) === 'abcd1234'

describe('sticker', () => {
  it('marks images the host recognizes — CDN URL or stored token — and nothing else', async () => {
    const { stickers, destroy } = await mount(
      `![a](${CDN}) and ![b](${TOKEN})\n\n![photo](${PHOTO})`,
      { isSticker: forumIsSticker }
    )
    expect(stickers()).toEqual([
      { src: CDN, sticker: true },
      { src: TOKEN, sticker: true },
      { src: PHOTO, sticker: false }
    ])
    await destroy()
  })

  it('marks a picker insert without an adapter, keeps the markdown a plain image', async () => {
    const { editor, stickers, destroy } = await mount('hi')
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)))
    })
    editor.action(callCommand(insertStickerCommand.key, { src: CDN, name: '团子' }))
    expect(stickers()).toEqual([{ src: CDN, sticker: true }])
    expect(editor.action(getMarkdown()).trim()).toBe(`hi![团子](${CDN} "团子")`)
    // A second copy of the same src (paste / duplicate) is a sticker too.
    editor.action(callCommand(insertStickerCommand.key, { src: CDN, name: '团子' }))
    expect(stickers().every((s) => s.sticker)).toBe(true)
    await destroy()
  })

  it('treats a throwing isSticker as "no"', async () => {
    const { stickers, destroy } = await mount(`![a](${CDN})`, {
      isSticker: () => {
        throw new Error('boom')
      }
    })
    expect(stickers()).toEqual([{ src: CDN, sticker: false }])
    await destroy()
  })

  it('re-evaluates on refreshStickersCommand', async () => {
    let known = new Set<string>()
    const { editor, stickers, destroy } = await mount(`![a](${CDN})`, {
      isSticker: (src) => known.has(hashOf(src) ?? '')
    })
    expect(stickers()[0]?.sticker).toBe(false)
    known = new Set(['abcd1234'])
    editor.action(callCommand(refreshStickersCommand.key))
    expect(stickers()[0]?.sticker).toBe(true)
    await destroy()
  })

  it('is off with the sticker feature off', async () => {
    const { stickers, destroy } = await mount(
      `![a](${CDN})`,
      { isSticker: forumIsSticker },
      { sticker: false }
    )
    expect(stickers()).toEqual([{ src: CDN, sticker: false }])
    await destroy()
  })
})
