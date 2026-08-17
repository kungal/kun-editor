---
'@kungal/editor-core': patch
'@kungal/editor-vue': patch
'@kungal/editor-nuxt': patch
---

Drive toolbar and bubble toggle-mark state from one editor plugin view, and keep the orphan-link cleanup out of undo history.

The previous Milkdown-listener + per-toolbar `refresh()` pair leaked subscriptions, missed stored-mark toggles for 200ms, and left the selection bubble without a pressed state. A single ProseMirror `view.update` plugin now writes one reactive record that the toolbar, the `#toolbar` slot, and the bubble all read. The leftover stored-link cleanup is marked `addToHistory: false`.
