# @kungal/editor-core

## 0.1.0

### Minor Changes

- 0386d6d: P1 — port the pure Milkdown plugins into `editor-core`.

  Adds `@kungal/editor-core/preset` with `createKunEditorPlugins(adapters,
features, options)` — the composed Milkdown bundle (commonmark/gfm baseline +
  KunEditor plugins) — and the individual plugin factories:

  - `createSpoilerPlugin()` — `||hidden||` inline node with `$remark` round-trip
  - `createKatexPlugins()` — inline `$…$` and block `$$…$$` LaTeX (KaTeX)
  - `createCodeBlockPlugins(opts)` — CodeMirror code block (theme, languages,
    localized toolbar, `latex` preview)
  - `createStopLinkPlugin()` — Space clears the active link mark

  The main entry (`@kungal/editor-core`) stays light — types + `MENTION_SCHEME`,
  no runtime deps — so the server can import the scheme without the Milkdown /
  katex / codemirror peers. The heavier `@codemirror/*`, `@lezer/highlight` and
  `katex` peers are only needed when importing `/preset`.

  Covered by a headless vitest suite that round-trips markdown for spoiler,
  inline/block math and the full preset.
