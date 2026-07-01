// Headless markdown round-trip tests for the P1 pure plugins.
//
// The point of these (per docs/architecture.md § migration P1) is to prove the
// transformer round-trips markdown: parse markdown → ProseMirror doc → serialize
// markdown, for the KUN-specific syntax (`||spoiler||`, `$inline$`, `$$block$$`)
// as well as ordinary markdown.
//
// We build a MINIMAL editor here (commonmark + gfm + spoiler + katex) rather
// than the full preset: the code-block WEB COMPONENT would mount a real
// CodeMirror view per code block, which needs layout jsdom can't provide. The
// block-math path still exercises commonmark's code-block SCHEMA (parse +
// serialize), which is what the round-trip is about.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { getMarkdown } from '@milkdown/kit/utils'

import { createSpoilerPlugin } from '../src/plugins/spoiler'
import { createKatexPlugins } from '../src/plugins/katex'

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
    .use(createSpoilerPlugin())
    .use(createKatexPlugins())
    .create()

  const out = editor.action(getMarkdown())
  await editor.destroy()
  root.remove()
  return out.trim()
}

describe('markdown round-trip', () => {
  it('preserves an ordinary heading', async () => {
    expect(await roundTrip('# Hello world')).toBe('# Hello world')
  })

  it('preserves bold + italic emphasis', async () => {
    const out = await roundTrip('This is **bold** and *italic* text')
    expect(out).toContain('**bold**')
    expect(out).toContain('*italic*')
  })

  it('preserves a bullet list (normalized to `*` bullets)', async () => {
    // Milkdown serializes mdast lists with `*` bullets, so a `-` list survives
    // as a `*` list — the list structure round-trips even if the marker is
    // normalized.
    const out = await roundTrip('- one\n- two\n- three')
    expect(out).toContain('* one')
    expect(out).toContain('* three')
  })

  it('round-trips a ||spoiler||', async () => {
    expect(await roundTrip('||hidden secret||')).toBe('||hidden secret||')
  })

  it('round-trips a spoiler embedded in a sentence', async () => {
    const out = await roundTrip('the answer is ||42|| ok')
    expect(out).toContain('||42||')
  })

  it('round-trips inline math', async () => {
    expect(await roundTrip('$a^2 + b^2 = c^2$')).toBe('$a^2 + b^2 = c^2$')
  })

  it('round-trips a block math formula', async () => {
    const out = await roundTrip('$$\n\\frac{1}{2}\n$$')
    expect(out).toContain('$$')
    expect(out).toContain('\\frac{1}{2}')
  })
})
