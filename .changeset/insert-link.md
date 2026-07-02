---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Add an insert-link feature (click to add a URL).

The `link` mark already existed (so `[text](url)` round-trips and pasted URLs
autolink), but there was no click-to-insert UI. Now there is:

- **editor-core**: `insertLinkCommand` (`{ href, text? }`) — applies the link mark
  to the selection, or inserts linked text on an empty selection; clears the
  stored mark afterwards. Re-exported from `@kungal/editor-core/preset`.
- **editor-vue**: `KunEditorToolbarApi.insertLink(payload)`; a `link` button in the
  default toolbar and the selection bubble (both default-on); `'link'` added to
  `KunToolbarItem` and `KunSelectionItem`. Headless UI prompts for the URL.
- **editor-nuxt**: `<KunEditorToolbar>` gains a `link` button — a KunPopover with a
  KunInput for the URL.

A link is a **mark** (`[text](url)`), deliberately distinct from the custom-NODE
embeds (mention / quote). A future "article card" or custom component would be a
node like those (schema + toUrl/fromUrl), not this — a separate mechanism.

Verified in the docs production build: the KunUI toolbar popover wraps a selection
(`[…](https://example.com)`); the selection bubble does too
(`[linktext](https://kun.com)`); 4 new core tests (wrap / insert / autolink
fallback / blank-href no-op) pass; 0 console errors.
