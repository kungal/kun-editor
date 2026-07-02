---
'@kungal/editor-vue': patch
---

Fix the source pane rewriting raw markdown in split/source mode.

Typing `>` turned into `> <br />`, and `~~` / `**` / `[` became `\~\~` / `\*\*` /
`\[` in the markdown source. Cause: those are Milkdown's WYSIWYG→markdown
serialization (empty-blockquote → `<br />`, and remark-stringify escaping special
characters) — correct when Milkdown is the editor, but in split/source mode the
CodeMirror source owns the raw markdown, and the read-only preview was echoing its
re-serialized markdown back into the shared `v-model`, clobbering what you typed.

Fix: the WYSIWYG editor now emits only when it is the ACTIVE editor (WYSIWYG
mode). In source/split mode it's a derived preview and never writes back, so the
source keeps your exact raw markdown. The preview still renders it correctly.

Verified in the docs production build (split mode): `> `, `~~strike~~`,
`**bold**`, and a lone `>` all stay verbatim in the source (no `<br />`, no
backslash escapes); WYSIWYG-mode editing still updates the value; 0 console errors.
