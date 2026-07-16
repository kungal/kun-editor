---
'@kungal/editor-vue': minor
---

Add a loading placeholder and make `<KunEditor>` SSR-safe.

Under SSR the editor area went blank for a moment while Milkdown hydrated (and it
could throw a hydration mismatch, since Milkdown/CodeMirror need the DOM). Now:

- The editor body mounts **client-side only**; the server and the first client
  paint render just a **skeleton placeholder**, which hydrates cleanly before the
  editor swaps in — no mismatch, and the area never collapses to nothing. So
  `<KunEditor>` no longer needs to be wrapped in `<ClientOnly>`.
- The placeholder also covers Milkdown's own create gap, using its `loading` state
  (`useEditor().loading`), then disappears when the editor is ready.
- **`@update:loading`** event — so a host can react (e.g. disable a submit button
  until ready).
- **`#loading` slot** to supply your own placeholder (e.g. a `<KunSkeleton>`), or
  restyle the default via the `.kun-editor__loading` / `.kun-editor__skeleton`
  class hooks (a shimmer added to the reference stylesheet).

Verified in the docs production build: the server HTML contains only the skeleton
(no editor DOM); the page hydrates with 0 console errors (mismatch gone); the
placeholder shows on first paint and on every remount and is removed once the
editor is ready.
