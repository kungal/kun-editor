# @kungal/editor-core

## 0.21.0

## 0.20.0

## 0.19.0

## 0.18.0

### Minor Changes

- 6545866: Toolbar image upload now shows an in-document "uploading…" placeholder.

  Previously only paste/drop showed the in-flight placeholder (Milkdown's `upload`
  plugin); the toolbar image button uploaded silently — the image just popped in
  when the adapter resolved. Now the toolbar path uses the same placeholder UX
  (ProseMirror's official upload-example pattern).

  - **editor-core**: `startImageUpload(view, file, { uploadImage, notify, locale })`
    - the `imageUploadPlaceholder` decoration plugin (exported from `/preset`;
      wired by the preset when `uploadImage` is present). Inserts a
      `.kun-editor__uploading` widget at the caret, uploads, then replaces it with the
      image (or removes it + notifies on failure); not an undo step. The paste/drop
      placeholder now uses the same `.kun-editor__uploading` class so both look
      identical.
  - **editor-vue**: `KunEditorToolbarApi` gains `uploadImage(file)`; both the
    headless `EditorToolbar` and the `#toolbar` slot API route uploads through
    `startImageUpload`.
  - **editor-nuxt**: `<KunEditorToolbar>`'s image button uses it.
  - **Headless kept**: the placeholder is a class + widget hook only; style it via
    `.kun-editor__uploading` in the reference `kun-editor.css` (primary-colored).

  Customizable: style the placeholder via `.kun-editor__uploading`; the text is
  localized (zh/en). Verified in the docs production build: uploading via either
  toolbar inserts the image; the unit tests confirm the placeholder shows during a
  pending upload and is replaced on success / removed on failure.

## 0.17.0

### Minor Changes

- 59abbc8: Add a placeholder (empty-state text).

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

## 0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Add `setHeadingCommand` — absolute block-type set (paragraph or heading level).

  commonmark ships `wrapInHeadingCommand` (a toggle) but no "set paragraph"
  command, so a "text size" dropdown (Paragraph / H1–H6, each option setting one
  exact level) couldn't be built from it. `setHeadingCommand` uses ProseMirror's
  `setBlockType`: `level` 0 → paragraph, 1–6 → heading. Exported from
  `@kungal/editor-core/preset`; drive it with `run(setHeadingCommand.key, level)`.

## 0.14.0

## 0.13.0

## 0.12.0

## 0.11.0

### Minor Changes

- f8fe64c: `mentionFromUrl` now also receives the link text.

  The mention-detection hook was `fromUrl(url)` — URL only — so a host couldn't
  replicate a text-based guard. moyu's server treats `/user/<id>` as a mention only
  when the link text starts with `@`; without the text, kun-editor would wrongly
  turn a real link like `[see here](/user/5/x)` into a mention.

  `mentionFromUrl` / `MentionUrlConfig['fromUrl']` are now
  `(url: string, text: string) => number | null` — the remark transform passes the
  link's plain text (concatenated across children). Backward compatible: existing
  `(url) => …` handlers still type-check and behave the same; the default
  `kungal-user:` scheme ignores the text.

  ```ts
  mentionFromUrl: (url, text) => {
    if (!text.startsWith("@")) return null; // reproduce moyu's guard
    const m = url.match(/^\/user\/(\d+)/);
    return m ? Number(m[1]) : null;
  };
  ```

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
