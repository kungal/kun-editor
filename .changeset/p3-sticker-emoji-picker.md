---
'@kungal/editor-vue': minor
---

P3 — add the sticker / emoji picker to the toolbar.

A merged popover (ported from the forum's sticker + emoji Containers):

- **Emoji tab** — a built-in curated unicode set, inserted as plain text. No
  adapter, always available.
- **Sticker tab** — appears only when the host supplies the `stickerSource`
  adapter; loads packs lazily on first open and inserts each sticker as an image
  node (`insertImageCommand`). Stickers are images, so an image-free editor gets
  emoji only.

Self-contained (no `@kungal/ui-vue`): a plain trigger button + a click-outside
popover, themed via CSS variables. Gated by `features.sticker` (default on). The
`KunEditorContext` now also carries `features` so views can read the flags.
Verified end-to-end in a browser via `apps/playground` (emoji → text; sticker →
image node in the v-model markdown).
