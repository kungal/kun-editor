# @kungal/editor-core

## 0.10.0

### Minor Changes

- ebe6c61: Make the @mention link URL form injectable (host policy).

  The mention markdown form was hardcoded to `[@name](kungal-user:<id>)`. But the
  URL shape is a server contract — different hosts render/parse it differently — so
  it's host policy, not editor mechanism. Two new (optional) `KunEditorAdapters`
  fields let a host define it:

  - `mentionToUrl(userId) => string` — build the link URL (default `kungal-user:<id>`)
  - `mentionFromUrl(url) => number | null` — parse a link back to a user id, or
    null if it isn't a mention (default: the `kungal-user:` scheme)

  `createMentionPlugin(config?)` now takes `{ toUrl, fromUrl }`; the preset threads
  the adapters through. Omit them for the unchanged default — fully backward
  compatible, no data migration.

  This unblocks downstream adoption (e.g. moyu, whose mentions are real
  `/user/<id>/resource` links): the host passes its own `mentionToUrl` /
  `mentionFromUrl`, existing content keeps working, and its server + goldmark
  renderer stay untouched. `insertMentionCommand` now resolves the node type by id
  from the live schema, so it works with any mention config.

## 0.9.0

## 0.8.0

## 0.7.0

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.0

## 0.2.0

### Minor Changes

- 6e1f780: P2 — port the adapter-driven Milkdown plugins into `editor-core/preset`.

  - `createUploadPlugin(uploadImage, { locale, notify })` — paste / drop / toolbar
    image upload built on `@milkdown/kit/plugin/upload`. The forum's hardcoded
    `kunFetch('/image/topic')` becomes the injected `uploadImage` adapter; a failed
    image is skipped (and reported via `notify`) instead of aborting the batch.
  - `createMentionPlugin()` — the `[@name](kungal-user:id)` mention atom + `$remark`
    round-trip. The schema is pure; the `@` autocomplete dropdown that consumes
    `searchMentionUsers` is a render-layer view (P3).
  - `createQuotePlugin()` — an inline reference atom, generalized per the
    architecture decision (option 1): the forum's `{ replyId, floor }` becomes an
    opaque `{ refId, label }` the host supplies via `insertQuoteCommand`. Markdown
    form `[label](kungal-reply:<refId>)`.

  `createKunEditorPlugins` now gates upload on the `uploadImage` adapter, wires the
  mention schema by default, and treats quote as opt-in (`features.quote`). Adds
  `QUOTE_SCHEME` to the light main entry (shared with the server, like
  `MENTION_SCHEME`) and a `quote` flag to `KunEditorFeatures`.

  Stickers need no core plugin — a sticker is a plain image node, so its picker is
  a P3 view over the `stickerSource` adapter.

  Covered by headless vitest: mention/quote markdown round-trips, the uploader
  (image filter + notify-on-failure), and preset feature gating.

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
