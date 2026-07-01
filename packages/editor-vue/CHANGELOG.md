# @kungal/editor-vue

## 0.3.0

### Minor Changes

- 62b2dad: P3 (in progress) — `<KunEditor>` is now a real Milkdown dual-view editor.

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

### Patch Changes

- @kungal/editor-core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [6e1f780]
  - @kungal/editor-core@0.2.0

## 0.1.0

### Patch Changes

- Updated dependencies [0386d6d]
  - @kungal/editor-core@0.1.0
