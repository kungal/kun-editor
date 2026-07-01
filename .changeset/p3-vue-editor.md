---
'@kungal/editor-vue': minor
---

P3 (in progress) — `<KunEditor>` is now a real Milkdown dual-view editor.

Replaces the P0 textarea scaffold with a WYSIWYG view built from
`@kungal/editor-core/preset` (`createKunEditorPlugins` — spoiler / katex /
code-block / mention / upload / stop-link), plus a markdown-source view, bound to
one `v-model`. Wires the Milkdown + ProseMirror adapter providers and handles
external-value sync without cursor-resetting feedback loops.

The public prop/emit surface is unchanged (`v-model`, `adapters`, `features`,
`locale`, `readonly`), so P0 integrations keep working. View state is
per-instance (fixes the forum's module-level `activeTab` singleton that would
cross-wire two editors on a page).

Still to come in P3 (they build on `@kungal/ui-vue`): the rich formatting
toolbar, the `@mention` autocomplete dropdown, the sticker/emoji picker, and the
CodeMirror markdown-source view (currently a `<textarea>`).
