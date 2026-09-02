# plugins/

Milkdown plugin ports live here, one folder per plugin, mirroring the forum's
`apps/web/app/components/kun/milkdown/plugins/` — but with every forum-specific
call lifted into a `KunEditorAdapters` argument (see `../types.ts`).

Target layout (ported incrementally, see `docs/architecture.md § migration`):

```
plugins/
  spoiler/      ||hidden|| node + $remark round-trip           (no adapter — pure)
  mention/      @mention atom + kungal-user: scheme            (adapter: searchMentionUsers)
  quote/        inline reply-reference atom                    (host-supplied reference type)
  katex/        inline + block LaTeX, input rules, remark       (peer: katex)
  code/         CodeMirror code-block config + icons            (peers: codemirror, @codemirror/*)
  upload/       paste/drop/toolbar image upload                 (adapter: uploadImage)
  stop-link/    Space keymap + orphan stored-link cleanup
  inline-atom/  Backspace / Delete beside ANY inline atom → one transaction  (no adapter — pure)
```

## Adding an inline atom (a chip like @mention / #floor)

The contract a new inline atom has to meet — each line is a bug that has been
shipped once:

- Schema: `group: 'inline', inline: true, atom: true`; `toDOM` renders
  `contenteditable="false"` so the browser never edits inside it.
- Insert with a trailing space (`insertMentionCommand` / `insertQuoteCommand`
  do): a real text node after the chip is where the caret and the IME continue.
- Deletion needs nothing per node: `inline-atom/` removes any inline atom
  beside the caret in one transaction at `beforeinput`, on every input path.
  Do NOT add per-node Backspace keymaps or zero-width caret anchors for it.
- With the chip LAST in its block, prosemirror-view appends
  `<img class="ProseMirror-separator">` + a trailing `<br>` so Chrome / Safari
  can draw a caret after it. The reference stylesheet
  (`@kungal/editor-nuxt/editor.css`) pins that img to an invisible inline; a
  host writing its own CSS must keep that rule, or the caret drops a line.

Each folder exports a **factory** (`createXxxPlugin(adapter?)`), never a
module-level singleton bound to one host — that binding is exactly what made the
forum copy non-reusable.
