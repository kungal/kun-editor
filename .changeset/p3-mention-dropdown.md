---
'@kungal/editor-vue': minor
---

P3 — wire the `@mention` autocomplete dropdown.

Typing `@` in `<KunEditor>` now opens a debounced, keyboard-navigable dropdown
(ported from the forum's `MentionDropdown.vue`) that resolves users through the
injected `searchMentionUsers` adapter and inserts a mention chip serializing to
`[@name](kungal-user:id)`. Without the adapter the mention schema still
round-trips — there's just no autocomplete.

The adapter reaches the dropdown via a `provide()` on `<KunEditor>`: because
@prosemirror-adapter/vue renders plugin views as portals that are *siblings* of
the editor (children of `<ProsemirrorAdapterProvider>`), only an ancestor of the
provider can inject into them. Verified end-to-end in a real browser via the new
`apps/playground` dev app.
