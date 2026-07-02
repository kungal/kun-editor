---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
---

Add a heading-outline API for building a table of contents (TOC).

A host (e.g. a desktop editor with a left-side outline) can now render its own TOC
and navigate the editor, without reaching into editor internals:

- **`@update:headings`** on `<KunEditor>` — emits the ordered outline
  (`KunHeading[]` = `{ level, text }`) whenever the content changes.
- **`ref.scrollToHeading(index)`** — scrolls to that heading in the *current* view
  and places the caret there: the WYSIWYG heading in wysiwyg mode, the CodeMirror
  heading line in source/split mode (so a click navigates the editable pane).
- **editor-core** exports the pure `parseHeadings(markdown)` (and `KunHeading`) it's
  built on — usable server-side too. Parses ATX headings, skipping code fences.

The TOC's styling, colour, indentation and layout (e.g. reserving space on the
left of the split editor) are entirely the host's — the editor only exposes the
data + navigation, matching the headless design.

Verified in a new docs example (`/examples/toc`): the outline tracks the content;
clicking an item scrolls + carets to that heading in wysiwyg (scrollTop 0→386,
caret in the target) and in source (CodeMirror scrolled, cursor on `## …`); new
`parseHeadings` unit tests pass; 0 console errors.
