// The markdown round-trip CONTRACT — the guard to run on every Milkdown upgrade.
//
// KunEditor wraps Milkdown; the one thing that must never silently drift is how
// markdown parses → doc → serializes for the KUN syntax (and ordinary markdown).
// If an upstream Milkdown minor changes parse/serialize behaviour, a case here
// breaks — that's the signal to review before shipping the bump.
//
// Runs through the SHIPPED bundle (createKunEditorPlugins), with the code-block
// COMPONENT off: the contract is schema/transformer-level, and the interactive
// CodeMirror NodeView needs layout jsdom can't provide. Fenced code + block math
// still round-trip via commonmark's code-block SCHEMA (always present).
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { getMarkdown } from '@milkdown/kit/utils'
import { createKunEditorPlugins } from '../src/preset'

const roundTrip = async (markdown: string): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(createKunEditorPlugins({}, { codeBlock: false, quote: true }))
    .create()
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

// [label, input, tokens that MUST survive the round-trip]. Substring checks keep
// the contract robust against harmless whitespace normalization (list spacing,
// trailing newlines) while still pinning the meaningful syntax.
const cases: Array<[string, string, string[]]> = [
  ['heading', '# Hello world', ['# Hello world']],
  ['bold', 'x **bold** y', ['**bold**']],
  ['italic', 'x *italic* y', ['*italic*']],
  ['strikethrough (gfm)', 'x ~~struck~~ y', ['~~struck~~']],
  ['inline code', 'a `code` b', ['`code`']],
  ['link', '[docs](https://kungal.com)', ['[docs](https://kungal.com)']],
  ['blockquote', '> quoted', ['> quoted']],
  ['bullet list', '- one\n- two', ['one', 'two']],
  ['ordered list', '1. one\n2. two', ['one', 'two']],
  ['spoiler', 'say ||secret|| ok', ['||secret||']],
  ['inline math', '$a^2 + b^2 = c^2$', ['$a^2 + b^2 = c^2$']],
  ['block math', '$$\n\\frac{1}{2}\n$$', ['$$', '\\frac{1}{2}']],
  ['fenced code', '```js\nconst x = 1\n```', ['```', 'const x = 1']],
  ['mention', '[@Alice](kungal-user:42)', ['[@Alice](kungal-user:42)']],
  ['quote', '[#5](kungal-reply:123)', ['[#5](kungal-reply:123)']]
]

describe('markdown round-trip contract (run on Milkdown upgrades)', () => {
  it.each(cases)('preserves %s', async (_label, input, tokens) => {
    const out = await roundTrip(input)
    for (const token of tokens) {
      expect(out).toContain(token)
    }
  })

  it('preserves a mixed paragraph (bold + spoiler + inline math + mention)', async () => {
    const out = await roundTrip(
      'hi **there** ||psst|| $x^2$ [@Kun](kungal-user:1)'
    )
    expect(out).toContain('**there**')
    expect(out).toContain('||psst||')
    expect(out).toContain('$x^2$')
    expect(out).toContain('[@Kun](kungal-user:1)')
  })
})
