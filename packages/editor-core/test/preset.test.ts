// Tests for the composed preset — createKunEditorPlugins.
//
// These assert the composition contract: the factory returns a flat plugin list
// honouring the feature flags, and an editor built from the FULL preset (incl.
// the code-block component + its config plugin) actually creates in a headless
// DOM. We keep the create-test content free of code fences so no CodeMirror view
// mounts (that needs layout jsdom lacks); the round-trip of spoiler + inline math
// through the full bundle is still exercised.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { getMarkdown } from '@milkdown/kit/utils'

import { createKunEditorPlugins } from '../src/preset'

describe('createKunEditorPlugins', () => {
  it('returns a flat, non-empty list of plugin functions', () => {
    const plugins = createKunEditorPlugins()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThan(0)
    // Flat: every entry is a MilkdownPlugin (a function), not a nested array.
    expect(plugins.every((p) => typeof p === 'function')).toBe(true)
  })

  it('drops plugins for disabled features', () => {
    const full = createKunEditorPlugins({}, {})
    const lean = createKunEditorPlugins(
      {},
      { spoiler: false, katex: false, codeBlock: false }
    )
    expect(lean.length).toBeLessThan(full.length)
  })

  it('creates a working editor from the full preset', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(
          defaultValueCtx,
          '# Title\n\nsome ||hidden|| text with $x^2$ math'
        )
      })
      .use(createKunEditorPlugins())
      .create()

    const out = editor.action(getMarkdown()).trim()
    expect(out).toContain('# Title')
    expect(out).toContain('||hidden||')
    expect(out).toContain('$x^2$')

    await editor.destroy()
    root.remove()
  })
})
