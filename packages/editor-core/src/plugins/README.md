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
  stop-link/    link keymap that stops the auto-link mark
```

Each folder exports a **factory** (`createXxxPlugin(adapter?)`), never a
module-level singleton bound to one host — that binding is exactly what made the
forum copy non-reusable.
