---
'@kungal/editor-vue': minor
---

P3 — add the formatting toolbar to `<KunEditor>`.

A self-contained `EditorToolbar` (WYSIWYG mode, hidden when read-only) with:
bold / italic / strikethrough / inline code, H1–H3, bullet & ordered lists,
blockquote, code block, divider, spoiler and LaTeX — plus an image-upload button
that appears only when the host supplies `uploadImage`.

Ported from the forum's `Menu.vue` + `_buttonList.ts`, but kept dependency-free:
inline SVG icons (no `@kungal/ui-vue`), themed via CSS variables so a KunUI host
still gets matching colours. It reaches the editor with `useInstance()` and fires
commands via `callCommand`; command keys are read at click time (they're only
populated once the editor is created). Verified end-to-end in a browser via
`apps/playground`.
