// parseHeadings — the pure ATX-heading outline used to build a TOC.
import { describe, expect, it } from 'vitest'
import { parseHeadings } from '../src/outline'

describe('parseHeadings', () => {
  it('parses ATX headings with levels', () => {
    expect(parseHeadings('# A\n## B\n### C')).toEqual([
      { level: 1, text: 'A' },
      { level: 2, text: 'B' },
      { level: 3, text: 'C' }
    ])
  })

  it('ignores `#` inside fenced code blocks', () => {
    const md = '# Real\n\n```js\n# not a heading\n```\n\n## Also real'
    expect(parseHeadings(md)).toEqual([
      { level: 1, text: 'Real' },
      { level: 2, text: 'Also real' }
    ])
  })

  it('strips trailing closing hashes and needs a space after #', () => {
    expect(parseHeadings('## Title ##')).toEqual([{ level: 2, text: 'Title' }])
    expect(parseHeadings('#nospace')).toEqual([])
  })

  it('returns [] for content with no headings', () => {
    expect(parseHeadings('just a paragraph\nand another')).toEqual([])
  })
})
