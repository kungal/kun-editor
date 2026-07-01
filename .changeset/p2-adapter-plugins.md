---
'@kungal/editor-core': minor
---

P2 — port the adapter-driven Milkdown plugins into `editor-core/preset`.

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
