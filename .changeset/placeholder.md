---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
---

Add a placeholder (empty-state text).

- **editor-core**: `createPlaceholderPlugin({ text, mode })` — a `$prose` plugin
  that adds a ProseMirror node DECORATION to the empty block (`.kun-editor__placeholder`
  class + `data-placeholder` attribute). Same mechanism as Milkdown Crepe's v7
  placeholder feature — purely visual (a decoration), so it never enters the doc
  or the markdown output. `mode` `'block'` (default) shows on any empty block,
  `'doc'` only when the whole document is empty; skipped in readonly / code blocks
  / lists / tables. `createKunEditorPlugins(..., { placeholder, placeholderMode })`
  wires it (only when `placeholder` is non-empty). Exported from `/preset`.
- **editor-vue**: `<KunEditor placeholder="…">` prop, threaded through.
- **Headless**: the core ships only the class + `data-placeholder` hook; render it
  with `.kun-editor__placeholder::before { content: attr(data-placeholder) }` (added
  to the reference `kun-editor.css`, muted via a KunUI token).
