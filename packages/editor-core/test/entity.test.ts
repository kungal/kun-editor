// Entity references: the markdown contract (shared with the server — every case
// of it, negatives included), the one insertion rule on every path (paste,
// autolink, commands), and the undo semantics: the conversion is its own step,
// the first undo leaves plain text, and plain text a boundary then ends stays
// plain. jsdom has no IME and no clipboard, so input / paste are driven through
// the same props prosemirror-view calls.
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { getMarkdown } from '@milkdown/kit/utils'
import { undo } from '@milkdown/kit/prose/history'
import { DOMParser, DOMSerializer, Fragment } from '@milkdown/kit/prose/model'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import type { EntityRef, KunEditorAdapters } from '../src'
import {
  createKunEditorPlugins,
  deleteEntity,
  entityOffer,
  insertEntity,
  replaceRangeWithEntity,
  selectedEntity,
  setEntityDisplay
} from '../src/preset'

// The forum's rules — they live in the forum adapter, not the editor.
const KINDS: [RegExp, string][] = [
  [/^\/topic\/(\d+)\/?$/, 'topic'],
  [/^\/galgame\/resource\/(\d+)\/?$/, 'galgame_resource'],
  [/^\/galgame\/(\d+)\/?$/, 'work'],
  [/^\/user\/(\d+)\/?$/, 'user']
]
const PATH = { topic: 'topic', work: 'galgame', galgame_resource: 'galgame/resource', user: 'user' }
const entityFromUrl = (url: string): EntityRef | null => {
  let parsed: URL
  try {
    parsed = new URL(url, 'https://www.kungal.com')
  } catch {
    return null
  }
  if (
    !/^https?:$/.test(parsed.protocol) ||
    !/^(www\.)?kungal\.com$/.test(parsed.hostname) ||
    url.includes('?') ||
    url.includes('#')
  ) {
    return null
  }
  for (const [pattern, type] of KINDS) {
    const match = pattern.exec(parsed.pathname)
    if (match) {
      const id = match[1]!
      const path = PATH[type as keyof typeof PATH]
      return { type, id, url: `https://www.kungal.com/${path}/${id}` }
    }
  }
  return null
}

const T1 = 'https://www.kungal.com/topic/1'
const T2 = 'https://www.kungal.com/galgame/2'

const view = (editor: Editor): EditorView =>
  editor.action((ctx) => ctx.get(editorViewCtx))

const withEditor = async (
  value: string,
  run: (editor: Editor) => void | Promise<void> = () => {},
  adapters: KunEditorAdapters = { entityFromUrl }
): Promise<string> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, value)
    })
    // No code-block plugin: its CodeMirror view needs layout jsdom lacks.
    .use(createKunEditorPlugins(adapters, { codeBlock: false }))
    .create()
  await run(editor)
  const out = editor.action(getMarkdown()).trim()
  await editor.destroy()
  root.remove()
  return out
}

/** The document as a compact outline: block types, inline node / text runs. */
const outline = (editor: Editor): unknown[] => {
  const walk = (node: import('@milkdown/kit/prose/model').Node): unknown => {
    if (node.isText) {
      const marks = node.marks.map((m) => m.type.name)
      return marks.length ? [node.text, marks] : node.text
    }
    if (node.type.name === 'entity_card') {
      return `card:${node.attrs.type}:${node.attrs.id}`
    }
    if (node.type.name === 'entity_link') {
      const marks = node.marks.map((m) => m.type.name)
      return `chip:${node.attrs.type}:${node.attrs.id}${marks.length ? `+${marks.join('+')}` : ''}`
    }
    const children: unknown[] = []
    node.forEach((child) => children.push(walk(child)))
    return { [node.type.name]: children }
  }
  return (walk(view(editor).state.doc) as { doc: unknown[] }).doc
}

/** Round-trip: parse `md`, report the outline and the re-serialized markdown. */
const roundTrip = async (md: string, adapters?: KunEditorAdapters) => {
  let doc: unknown[] = []
  const out = await withEditor(
    md,
    (editor) => {
      doc = outline(editor)
    },
    adapters
  )
  return { doc, out }
}

describe('entity markdown contract (§1)', () => {
  it('a paragraph that is only an autolink is a card', async () => {
    const { doc, out } = await roundTrip(`<${T1}>`)
    expect(doc).toEqual(['card:topic:1'])
    expect(out).toBe(`<${T1}>`)
  })

  it('a GFM literal and [u](u) alone are cards too, saved as <u>', async () => {
    expect(await roundTrip(T1)).toEqual({ doc: ['card:topic:1'], out: `<${T1}>` })
    expect(await roundTrip(`[${T1}](${T1})`)).toEqual({
      doc: ['card:topic:1'],
      out: `<${T1}>`
    })
  })

  it('surrounding whitespace does not stop a card', async () => {
    expect((await roundTrip(`   <${T1}>   `)).doc).toEqual(['card:topic:1'])
  })

  it('a bare entity link among text is a chip, round-tripped', async () => {
    const md = `看这个 <${T1}> 好`
    const { doc, out } = await roundTrip(md)
    expect(doc).toEqual([{ paragraph: ['看这个 ', 'chip:topic:1', ' 好'] }])
    expect(out).toBe(md)
  })

  it('a chip right against CJK text stays delimited', async () => {
    const md = `看这个<${T1}>好`
    expect(await roundTrip(md)).toEqual({
      doc: [{ paragraph: ['看这个', 'chip:topic:1', '好'] }],
      out: md
    })
  })

  it('[custom text](entity url) is an ordinary link, never upgraded', async () => {
    const md = `[自定义文字](${T1})`
    const { doc, out } = await roundTrip(md)
    expect(doc).toEqual([{ paragraph: [['自定义文字', ['link']]] }])
    expect(out).toBe(md)
  })

  it('a non-entity URL, or one with a query / fragment, stays a link', async () => {
    for (const url of ['https://example.com/topic/1', `${T1}?page=2`, `${T1}#c3`]) {
      const { doc } = await roundTrip(`<${url}>`)
      expect(doc).toEqual([{ paragraph: [[url, ['link']]] }])
    }
  })

  it('canonicalizes on save: a trailing slash / bare host become the canonical URL', async () => {
    expect(await roundTrip('<https://kungal.com/topic/1/>')).toEqual({
      doc: ['card:topic:1'],
      out: `<${T1}>`
    })
  })

  it('a root-relative bare link is an entity too (canonical form saved)', async () => {
    expect(await roundTrip('[/galgame/2](/galgame/2)')).toEqual({
      doc: ['card:work:2'],
      out: `<${T2}>`
    })
  })

  it('www. literal: href http://www… ≠ text, so an ordinary link', async () => {
    const { doc } = await roundTrip('www.kungal.com/topic/1')
    expect(doc).toEqual([
      { paragraph: [['www.kungal.com/topic/1', ['link']]] }
    ])
  })

  it('cards inside a blockquote and as a list item’s first child', async () => {
    expect(await roundTrip(`> <${T1}>`)).toEqual({
      doc: [{ blockquote: ['card:topic:1'] }],
      out: `> <${T1}>`
    })
    const list = await roundTrip(`* <${T1}>\n* <${T2}>`)
    expect(list.doc).toEqual([
      {
        bullet_list: [
          { list_item: ['card:topic:1'] },
          { list_item: ['card:work:2'] }
        ]
      }
    ])
    // Serialized exactly as the same list of plain links is without entities.
    const plain = await withEditor(`* <${T1}>\n* <${T2}>`, () => {}, {})
    expect(list.out).toBe(plain)
  })

  it('a heading or a table cell holds a chip, never a card', async () => {
    expect((await roundTrip(`# <${T1}>`)).doc).toEqual([
      { heading: ['chip:topic:1'] }
    ])
    const table = await roundTrip(`| a |\n| - |\n| <${T1}> |`)
    expect(JSON.stringify(table.doc)).toContain('chip:topic:1')
    expect(JSON.stringify(table.doc)).not.toContain('card:')
    expect(table.out).toContain(`<${T1}>`)
  })

  it('formatting around the only link makes a (formatted) chip', async () => {
    const md = `**<${T1}>**`
    expect(await roundTrip(md)).toEqual({
      doc: [{ paragraph: ['chip:topic:1+strong'] }],
      out: md
    })
  })

  it('a hard break is content: link + break is a chip', async () => {
    const { doc } = await roundTrip(`<${T1}>\\\nnext`)
    expect(JSON.stringify(doc)).toContain('chip:topic:1')
  })

  it('two cards in a row stay two cards', async () => {
    const md = `<${T1}>\n\n<${T2}>`
    expect(await roundTrip(md)).toEqual({
      doc: ['card:topic:1', 'card:work:2'],
      out: md
    })
  })

  it('never in code, inline code, or an inline spoiler', async () => {
    expect((await roundTrip('```\n' + T1 + '\n```')).doc).toEqual([
      { code_block: [T1] }
    ])
    expect((await roundTrip(`\`${T1}\``)).doc).toEqual([
      { paragraph: [[T1, ['inlineCode']]] }
    ])
    const spoiler = await roundTrip(`||${T1}||`)
    expect(JSON.stringify(spoiler.doc)).not.toMatch(/card:|chip:/)
    // …and saved exactly as without the entity feature.
    expect(spoiler.out).toBe(await withEditor(`||${T1}||`, () => {}, {}))
  })

  it('without the adapter, or with a throwing one, links stay links', async () => {
    expect((await roundTrip(`<${T1}>`, {})).doc).toEqual([
      { paragraph: [[T1, ['link']]] }
    ])
    const throwing = await roundTrip(`<${T1}>`, {
      entityFromUrl: () => {
        throw new Error('boom')
      }
    })
    expect(throwing.doc).toEqual([{ paragraph: [[T1, ['link']]] }])
  })
})

// ── Input helpers (as in autolink.test.ts) ──────────────────────────────────

const caret = (editor: Editor, pos: number) => {
  const v = view(editor)
  v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, pos)))
}
const caretAtEnd = (editor: Editor) =>
  caret(editor, TextSelection.atEnd(view(editor).state.doc).from)

const input = (editor: Editor, text: string) => {
  const v = view(editor)
  const { from, to } = v.state.selection
  const deflt = () => {
    const tr = v.state.tr.insertText(text, from, to)
    return v.composing ? tr.setMeta('composition', 1) : tr
  }
  if (!v.someProp('handleTextInput', (f) => f(v, from, to, text, deflt))) {
    v.dispatch(deflt())
  }
}
const type = (editor: Editor, text: string) => {
  for (const ch of text) {
    input(editor, ch)
  }
}
const setComposing = (editor: Editor, composing: boolean) => {
  ;(view(editor) as unknown as { input: { composing: boolean } }).input.composing =
    composing
}
const endComposition = async (editor: Editor) => {
  setComposing(editor, false)
  view(editor).dom.dispatchEvent(new Event('compositionend'))
  await new Promise((resolve) => setTimeout(resolve, 30))
}
const key = (editor: Editor, k: string, init: KeyboardEventInit = {}) =>
  view(editor).dom.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
  )
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const undoOnce = (editor: Editor) => {
  const v = view(editor)
  undo(v.state, v.dispatch)
}

/** Paste the way prosemirror-view hands it to `handlePaste`. */
const paste = (editor: Editor, data: Record<string, string>): boolean => {
  const v = view(editor)
  const event = {
    clipboardData: { getData: (kind: string) => data[kind] ?? '' },
    preventDefault: () => {}
  } as unknown as ClipboardEvent
  const slice = v.state.doc.slice(0, 0)
  return !!v.someProp('handlePaste', (f) => f(v, event, slice))
}

describe('paste', () => {
  it('into an empty paragraph → a card, caret below; undo → plain text; undo → nothing', async () => {
    const steps: unknown[] = []
    await withEditor('', (editor) => {
      caretAtEnd(editor)
      expect(paste(editor, { 'text/plain': T1 })).toBe(true)
      steps.push(outline(editor))
      const v = view(editor)
      // The caret waits in a paragraph after the card; the popover is offered.
      expect(v.state.selection.$from.parent.type.name).toBe('paragraph')
      expect(v.state.selection.from).toBeGreaterThan(1)
      expect(entityOffer(v.state)?.display).toBe('card')
      undoOnce(editor)
      steps.push(outline(editor))
      undoOnce(editor)
      steps.push(outline(editor))
    })
    expect(steps).toEqual([
      ['card:topic:1', { paragraph: [] }],
      [{ paragraph: [T1] }],
      [{ paragraph: [] }]
    ])
  })

  it('among text → a chip; the first undo leaves the plain URL', async () => {
    const steps: unknown[] = []
    const out = await withEditor('看这个', (editor) => {
      caretAtEnd(editor)
      paste(editor, { 'text/plain': T1 })
      steps.push(outline(editor))
      expect(entityOffer(view(editor).state)?.display).toBe('chip')
      undoOnce(editor)
      steps.push(outline(editor))
    })
    expect(steps).toEqual([
      // A chip ending its block gets a trailing space to anchor the caret.
      [{ paragraph: ['看这个', 'chip:topic:1', ' '] }],
      [{ paragraph: [`看这个${T1}`] }]
    ])
    // Plain text saves escaped: it can never become a chip by accident.
    expect(out).not.toContain(`<${T1}>`)
  })

  it('a URL whose conversion was undone stays plain when a space ends it', async () => {
    let doc: unknown[] = []
    await withEditor('看这个', async (editor) => {
      caretAtEnd(editor)
      paste(editor, { 'text/plain': T1 })
      undoOnce(editor)
      input(editor, ' ')
      await settle()
      doc = outline(editor)
    })
    expect(doc).toEqual([{ paragraph: [`看这个${T1} `] }])
  })

  it('accepts <url> and surrounding whitespace', async () => {
    let doc: unknown[] = []
    await withEditor('', (editor) => {
      caretAtEnd(editor)
      paste(editor, { 'text/plain': `  <${T1}>\n` })
      doc = outline(editor)
    })
    expect(doc[0]).toBe('card:topic:1')
  })

  it('the offer is withdrawn as soon as typing continues', async () => {
    await withEditor('看这个', (editor) => {
      caretAtEnd(editor)
      paste(editor, { 'text/plain': T1 })
      expect(entityOffer(view(editor).state)).not.toBeNull()
      input(editor, '好')
      expect(entityOffer(view(editor).state)).toBeNull()
    })
  })

  it('leaves other pastes to the ordinary paste path (no offer, no undo split)', async () => {
    // Only the entity paste path ever offers the popover.
    const offered = (editor: Editor, data: Record<string, string>) => {
      paste(editor, data)
      return entityOffer(view(editor).state) !== null
    }
    await withEditor('看这个', (editor) => {
      caretAtEnd(editor)
      expect(offered(editor, { 'text/plain': 'https://example.com/a' })).toBe(false)
      expect(offered(editor, { 'text/plain': `${T1} and more` })).toBe(false)
      expect(
        offered(editor, {
          'text/plain': `<${T1}>`,
          'text/html': `<span data-kun-entity="chip" data-entity-url="${T1}">${T1}</span>`
        })
      ).toBe(false)
    })
    await withEditor('```\ncode\n```', (editor) => {
      caret(editor, 2)
      expect(offered(editor, { 'text/plain': T1 })).toBe(false)
    })
  })
})

describe('copy / paste of an entity node', () => {
  it('text/html carries the data-* and re-parses as the same node; text/plain is the URL', async () => {
    await withEditor(`<${T1}>\n\n看 <${T2}>`, (editor) => {
      const v = view(editor)
      const { schema } = v.state
      const card = v.state.doc.firstChild!
      const chip = v.state.doc.child(1).child(1)
      for (const node of [card, chip]) {
        const dom = document.createElement('div')
        dom.appendChild(
          DOMSerializer.fromSchema(schema).serializeFragment(Fragment.from(node))
        )
        const slice = DOMParser.fromSchema(schema).parseSlice(dom)
        let found = ''
        slice.content.descendants((n) => {
          if (n.type.name.startsWith('entity_')) {
            found = `${n.type.name}:${n.attrs.url}`
          }
        })
        expect(found).toBe(`${node.type.name}:${node.attrs.url}`)
      }
      // Copying the card: what lands in text/plain.
      v.dispatch(v.state.tr.setSelection(NodeSelection.create(v.state.doc, 0)))
      const text = v.someProp('clipboardTextSerializer', (f) =>
        f(v.state.selection.content(), v)
      )
      expect(text).toBe(T1)
      // Anything more than the one node is markdown as usual.
      v.dispatch(
        v.state.tr.setSelection(TextSelection.create(v.state.doc, 0, v.state.doc.content.size))
      )
      const all = v.someProp('clipboardTextSerializer', (f) =>
        f(v.state.selection.content(), v)
      )
      expect(all?.trim()).toBe(`<${T1}>\n\n看 <${T2}>`)
    })
  })
})

describe('autolink handoff', () => {
  it('a typed URL ended by a space → a chip (own undo step → plain text)', async () => {
    const steps: unknown[] = []
    await withEditor('看', async (editor) => {
      caretAtEnd(editor)
      type(editor, `${T1} `)
      await settle()
      steps.push(outline(editor))
      undoOnce(editor)
      steps.push(outline(editor))
    })
    expect(steps).toEqual([
      [{ paragraph: ['看', 'chip:topic:1', ' '] }],
      [{ paragraph: [`看${T1} `] }]
    ])
  })

  it('a URL alone in its paragraph ended by a space stays a chip (the line goes on)', async () => {
    let doc: unknown[] = []
    await withEditor('', async (editor) => {
      caretAtEnd(editor)
      type(editor, `${T1} `)
      await settle()
      doc = outline(editor)
    })
    expect(doc).toEqual([{ paragraph: ['chip:topic:1', ' '] }])
  })

  it('a URL alone in its paragraph ended by Enter → a card, caret below', async () => {
    let doc: unknown[] = []
    await withEditor('', async (editor) => {
      caretAtEnd(editor)
      type(editor, T1)
      key(editor, 'Enter')
      await settle()
      doc = outline(editor)
      expect(view(editor).state.selection.$from.parent.type.name).toBe('paragraph')
      expect(view(editor).state.selection.from).toBe(2)
    })
    expect(doc).toEqual(['card:topic:1', { paragraph: [] }])
  })

  it('a whole URL committed in one input (keyboard clip) → card; undo → text; undo → empty', async () => {
    const steps: unknown[] = []
    await withEditor('', (editor) => {
      caretAtEnd(editor)
      input(editor, `${T1} `)
      steps.push(outline(editor))
      expect(entityOffer(view(editor).state)).not.toBeNull()
      undoOnce(editor)
      steps.push(outline(editor))
      undoOnce(editor)
      steps.push(outline(editor))
    })
    expect(steps).toEqual([
      ['card:topic:1', { paragraph: [] }],
      [{ paragraph: [`${T1} `] }],
      [{ paragraph: [] }]
    ])
  })

  it('mid-composition nothing converts; on compositionend the clip becomes a chip', async () => {
    const steps: unknown[] = []
    await withEditor('看', async (editor) => {
      caretAtEnd(editor)
      setComposing(editor, true)
      input(editor, T1)
      steps.push(outline(editor))
      await endComposition(editor)
      steps.push(outline(editor))
    })
    expect(steps).toEqual([
      [{ paragraph: [`看${T1}`] }],
      [{ paragraph: ['看', 'chip:topic:1', ' '] }]
    ])
  })

  it('after a Latin letter GFM starts no link, so neither does a space', async () => {
    const out = await withEditor('', async (editor) => {
      caretAtEnd(editor)
      type(editor, `abc${T1} `)
      await settle()
    })
    expect(out).not.toContain('<')
  })

  it('a non-entity URL typed right after CJK text still just links', async () => {
    const out = await withEditor('看', async (editor) => {
      caretAtEnd(editor)
      type(editor, 'https://example.com/x ')
      await settle()
    })
    expect(out).toBe('看<https://example.com/x>')
  })
})

describe('selected entity: keys', () => {
  it('Enter on a selected card opens a paragraph after it — even as the first block', async () => {
    let doc: unknown[] = []
    await withEditor(`<${T1}>\n\nnext`, (editor) => {
      const v = view(editor)
      v.dispatch(v.state.tr.setSelection(NodeSelection.create(v.state.doc, 0)))
      key(editor, 'Enter')
      doc = outline(editor)
      expect(view(editor).state.selection.from).toBe(2)
    })
    expect(doc).toEqual(['card:topic:1', { paragraph: [] }, { paragraph: ['next'] }])
  })

  it('typing with a card selected goes into a new paragraph after it', async () => {
    let doc: unknown[] = []
    await withEditor(`<${T1}>\n\nnext`, (editor) => {
      const v = view(editor)
      v.dispatch(v.state.tr.setSelection(NodeSelection.create(v.state.doc, 0)))
      input(editor, '好')
      doc = outline(editor)
    })
    expect(doc).toEqual(['card:topic:1', { paragraph: ['好'] }, { paragraph: ['next'] }])
  })

  it('typing with a chip selected goes after it, not over it', async () => {
    let doc: unknown[] = []
    await withEditor(`看 <${T1}> 好`, (editor) => {
      const v = view(editor)
      v.dispatch(v.state.tr.setSelection(NodeSelection.create(v.state.doc, 3)))
      expect(selectedEntity(v.state)?.display).toBe('chip')
      input(editor, '!')
      doc = outline(editor)
    })
    expect(doc).toEqual([{ paragraph: ['看 ', 'chip:topic:1', '! 好'] }])
  })

  it('Backspace beside a chip deletes it whole (beforeinput, as a phone sends it)', async () => {
    const out = await withEditor(`看 <${T1}>好`, (editor) => {
      caret(editor, 4)
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true
      })
      view(editor).dom.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })
    expect(out).toBe('看 好')
  })
})

describe('transforms', () => {
  const run = async (
    md: string,
    fn: (tr: import('@milkdown/kit/prose/state').Transaction, v: EditorView) => boolean,
    at?: number
  ) => {
    let doc: unknown[] = []
    let ok = false
    const out = await withEditor(md, (editor) => {
      if (at !== undefined) {
        caret(editor, at)
      }
      const v = view(editor)
      const tr = v.state.tr
      ok = fn(tr, v)
      if (ok) {
        v.dispatch(tr)
      }
      doc = outline(editor)
    })
    return { doc, out, ok }
  }
  const ref1 = entityFromUrl(T1)!

  it('insertEntity card: empty paragraph → card; mid-text → splits around it', async () => {
    expect((await run('', (tr) => insertEntity(tr, ref1, 'card'), 1)).doc).toEqual([
      'card:topic:1',
      { paragraph: [] }
    ])
    const split = await run('ab', (tr) => insertEntity(tr, ref1, 'card'), 2)
    expect(split.doc).toEqual([
      { paragraph: ['a'] },
      'card:topic:1',
      { paragraph: ['b'] }
    ])
    expect(split.out).toBe(`a\n\n<${T1}>\n\nb`)
  })

  it('insertEntity card in a heading falls back to a chip', async () => {
    expect(
      (await run('# title', (tr) => insertEntity(tr, ref1, 'card'), 6)).doc
    ).toEqual([{ heading: ['title', 'chip:topic:1', ' '] }])
  })

  it('insertEntity refuses code and spoilers', async () => {
    expect((await run('`x`', (tr) => insertEntity(tr, ref1, 'chip'), 2)).ok).toBe(true)
    expect((await run('```\nx\n```', (tr) => insertEntity(tr, ref1, 'chip'), 2)).ok).toBe(false)
  })

  it('replaceRangeWithEntity: emptied paragraph → card, else chip', async () => {
    // "/q" is the whole paragraph.
    expect(
      (await run('/q', (tr) => replaceRangeWithEntity(tr, 1, 3, ref1))).doc
    ).toEqual(['card:topic:1', { paragraph: [] }])
    expect(
      (await run('看 /q', (tr) => replaceRangeWithEntity(tr, 3, 5, ref1))).doc
    ).toEqual([{ paragraph: ['看 ', 'chip:topic:1', ' '] }])
  })

  it('card → chip → card', async () => {
    const chip = await run(`<${T1}>`, (tr) => setEntityDisplay(tr, 0, 'chip'))
    expect(chip.doc).toEqual([{ paragraph: ['chip:topic:1'] }])
    expect(chip.out).toBe(`<${T1}>`) // the same markdown: alone it reads as a card
    const card = await run(`看 <${T1}> 好`, (tr) => setEntityDisplay(tr, 3, 'card'))
    expect(card.doc).toEqual([
      { paragraph: ['看'] },
      'card:topic:1',
      { paragraph: ['好'] }
    ])
  })

  it('→ link writes [text](url); a text equal to the URL is refused', async () => {
    const linked = await run(`看 <${T1}> 好`, (tr) =>
      setEntityDisplay(tr, 3, 'link', '魔女的夜宴')
    )
    expect(linked.out).toBe(`看 [魔女的夜宴](${T1}) 好`)
    const card = await run(`<${T1}>`, (tr) =>
      setEntityDisplay(tr, 0, 'link', 'www.kungal.com/topic/1')
    )
    expect(card.out).toBe(`[www.kungal.com/topic/1](${T1})`)
    expect((await run(`<${T1}>`, (tr) => setEntityDisplay(tr, 0, 'link', T1))).ok).toBe(false)
  })

  it('the written link stays a link on reload', async () => {
    const { doc } = await roundTrip(`[魔女的夜宴](${T1})`)
    expect(doc).toEqual([{ paragraph: [['魔女的夜宴', ['link']]] }])
  })

  it('deleteEntity removes the node whole', async () => {
    expect((await run(`a\n\n<${T1}>\n\nb`, (tr) => deleteEntity(tr, 3))).out).toBe('a\n\nb')
  })
})
