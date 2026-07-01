---
'@kungal/editor-vue': minor
---

Make `<KunEditor>` headless — ship zero CSS.

**BREAKING** (pre-1.0): the `@kungal/editor-vue/style.css` export is removed. The
component now renders only stable class hooks (`.kun-editor__*`,
`.kun-mention-dropdown*`) and `data-*` state; all styling is the host's.

Migration: copy the reference stylesheet
`apps/docs/app/assets/css/kun-editor.css` (themed with KunUI tokens) into your
app and import it, or write your own targeting the same hooks. Also import each
enabled peer's CSS (e.g. `katex/dist/katex.min.css`). The reference stylesheet
carries the two structural rules the editor needs (ProseMirror `white-space`,
popover positioning / show-hide).

Also drops the unused `@kungal/ui-vue` peer dependency — the editor no longer
references any UI kit, so it installs in any Vue 3 app.
