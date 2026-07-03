---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Make the insert-link URL entry customizable via a `linkPrompt` adapter.

The headless toolbar and the selection bubble asked for the link URL with the
native `window.prompt` (the KunUI toolbar used an inline popover). Hosts can now
supply their own UI instead — a modal, an article picker, etc.:

```ts
const adapters = {
  // …uploadImage, notify…
  linkPrompt: async ({ text }) => await openLinkModal(text) // return the URL, or null to cancel
}
```

- **editor-core**: new `LinkPrompt` type + `linkPrompt?` on `KunEditorAdapters`.
  It receives the selected text (to prefill / search).
- **editor-vue**: the default toolbar and the selection bubble use `linkPrompt`
  when supplied, else fall back to `window.prompt`.
- **editor-nuxt**: when `linkPrompt` is set, `<KunEditorToolbar>`'s link button
  uses it instead of its inline popover — so one override covers every link entry
  point (toolbar, default toolbar, bubble).

Verified in the docs production build: with a `linkPrompt` that derives a URL from
the selected text, the selection bubble inserts
`[…](https://example.com/search?q=…)` with no native dialog, and the KunUI
toolbar link becomes a plain button (no popover); 0 console errors.
