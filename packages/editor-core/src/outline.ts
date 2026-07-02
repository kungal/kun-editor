// Heading outline (table-of-contents) parsing — pure, zero-dep, so it lives in
// the light main entry (a host, or the server, can build a TOC without pulling in
// @milkdown/kit). Parses ATX headings (`#`…`######`) — what the toolbar produces
// — and skips fenced code blocks so a `# comment` inside ``` isn't mistaken for a
// heading. Setext headings (underlined) are intentionally not parsed.
//
// The result is an ordered list; a UI renders it and, on click, calls the
// editor's `scrollToHeading(index)` with the item's array index.

export interface KunHeading {
  /** Heading level 1–6. */
  level: number
  /** The heading's text (trailing `#` closers stripped). */
  text: string
}

const FENCE = /^\s{0,3}(?:```|~~~)/
const ATX = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/

/** Parse the ordered ATX-heading outline from a markdown string. */
export const parseHeadings = (markdown: string): KunHeading[] => {
  const out: KunHeading[] = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    const m = line.match(ATX)
    if (m) {
      out.push({ level: m[1]!.length, text: m[2]!.trim() })
    }
  }
  return out
}
