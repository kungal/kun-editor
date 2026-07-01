---
'@kungal/editor-vue': minor
---

P3 (complete) — replace the source-mode `<textarea>` with a CodeMirror editor.

The "Markdown" tab is now a real CodeMirror editor with markdown syntax
highlighting, reusing the code block's `kunCM` theme (from
`@kungal/editor-core`) so the source view and code blocks match. Edits sync back
through `v-model` to the WYSIWYG view; the view is mounted on demand (CodeMirror
measures poorly while hidden).

Adds `@codemirror/lang-markdown` alongside the CodeMirror packages the editor
already needs (declared as optional peers; externalized from the build so the
host dedupes them). This finishes the P3 dual-view editor: WYSIWYG + toolbar +
@mention dropdown + sticker/emoji picker + CodeMirror source.
