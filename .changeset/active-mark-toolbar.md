---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Show an active state on the toolbar's toggle marks (bold / italic /
strikethrough / inline code).

The toolbar buttons ran the toggle commands but never reflected whether the
mark was on, so a user could not tell if bold (etc.) was engaged. The
`#toolbar` slot API now exposes a reactive `activeMarks` map (bold / italic /
strike / code), recomputed from the ProseMirror selection on selection and doc
changes and immediately after each command. `<KunEditorToolbar>` renders the
pressed buttons with the primary "active" look (same as hover) and sets
`aria-pressed`; the headless `EditorToolbar` sets `data-active` for the
`.kun-editor__tool[data-active='true']` style.
