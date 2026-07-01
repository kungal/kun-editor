// P2 tests: the adapter-driven plugins.
//
// - mention / quote: markdown round-trips through their custom link schemes
//   (kungal-user: / kungal-reply:), same headless approach as roundtrip.test.ts.
// - upload: the uploader built from the `uploadImage` adapter — filters to
//   images, maps each to an image node, and skips (+ notifies on) failures.
// - preset gating: upload only wires when `uploadImage` is present; quote is
//   opt-in.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx, schemaCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { getMarkdown } from '@milkdown/kit/utils'
import type { Node, Schema } from '@milkdown/kit/prose/model'
import type { Ctx } from '@milkdown/kit/ctx'

import { createMentionPlugin } from '../src/plugins/mention'
import { createQuotePlugin } from '../src/plugins/quote'
import { createUploader } from '../src/plugins/upload'
import { createKunEditorPlugins } from '../src/preset'

const roundTrip = async (markdown: string): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(commonmark)
    .use(gfm)
    .use(createMentionPlugin())
    .use(createQuotePlugin())
    .create()
  const out = editor.action(getMarkdown())
  await editor.destroy()
  root.remove()
  return out.trim()
}

// A minimal FileList over an array — enough for the uploader (it only reads
// `.length` and `.item(i)`). jsdom provides `File`.
const makeFileList = (files: File[]): FileList => {
  const list: Record<string | number, unknown> = {
    length: files.length,
    item: (i: number) => files[i] ?? null
  }
  files.forEach((f, i) => {
    list[i] = f
  })
  return list as unknown as FileList
}

describe('mention round-trip', () => {
  it('round-trips [@name](kungal-user:id)', async () => {
    expect(await roundTrip('[@Alice](kungal-user:42)')).toBe(
      '[@Alice](kungal-user:42)'
    )
  })

  it('leaves an ordinary link alone', async () => {
    expect(await roundTrip('[docs](https://kungal.com)')).toBe(
      '[docs](https://kungal.com)'
    )
  })
})

describe('quote round-trip', () => {
  it('round-trips [label](kungal-reply:refId)', async () => {
    expect(await roundTrip('[#5](kungal-reply:123)')).toBe(
      '[#5](kungal-reply:123)'
    )
  })
})

describe('upload uploader', () => {
  // Build a schema (needs commonmark's `image` node) to create nodes against.
  const withSchema = async (
    run: (schema: Schema, ctx: Ctx) => Promise<void>
  ) => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const editor = await Editor.make()
      .config((ctx) => ctx.set(rootCtx, root))
      .use(commonmark)
      .create()
    await editor.action(async (ctx) => {
      await run(ctx.get(schemaCtx), ctx)
    })
    await editor.destroy()
    root.remove()
  }

  it('uploads image files to image nodes via the adapter', async () => {
    await withSchema(async (schema, ctx) => {
      const uploader = createUploader(
        async (file) => `https://cdn.example/${file.name}`
      )
      const png = new File(['x'], 'a.png', { type: 'image/png' })
      const txt = new File(['x'], 'b.txt', { type: 'text/plain' })
      const nodes = (await uploader(
        makeFileList([png, txt]),
        schema,
        ctx,
        0
      )) as Node[]
      expect(nodes.length).toBe(1) // the .txt is filtered out
      expect(nodes[0]!.type.name).toBe('image')
      expect(nodes[0]!.attrs.src).toBe('https://cdn.example/a.png')
    })
  })

  it('skips a failed upload and reports it via notify', async () => {
    await withSchema(async (schema, ctx) => {
      const notices: string[] = []
      const uploader = createUploader(
        async () => {
          throw new Error('boom')
        },
        { notify: (msg) => notices.push(msg) }
      )
      const png = new File(['x'], 'a.png', { type: 'image/png' })
      const nodes = (await uploader(
        makeFileList([png]),
        schema,
        ctx,
        0
      )) as Node[]
      expect(nodes.length).toBe(0)
      expect(notices.length).toBe(1)
    })
  })
})

describe('createKunEditorPlugins gating (P2)', () => {
  it('wires upload only when uploadImage is present', () => {
    const withUpload = createKunEditorPlugins({
      uploadImage: async () => 'https://cdn.example/x.png'
    })
    const withoutUpload = createKunEditorPlugins({})
    expect(withUpload.length).toBeGreaterThan(withoutUpload.length)
  })

  it('wires quote only when the feature is enabled', () => {
    const withQuote = createKunEditorPlugins({}, { quote: true })
    const withoutQuote = createKunEditorPlugins({}, { quote: false })
    expect(withQuote.length).toBeGreaterThan(withoutQuote.length)
  })

  it('drops the mention schema when mention is off', () => {
    const withMention = createKunEditorPlugins({}, { mention: true })
    const withoutMention = createKunEditorPlugins({}, { mention: false })
    expect(withMention.length).toBeGreaterThan(withoutMention.length)
  })
})
