# @kungal/editor-vue

## 0.5.0

### Minor Changes

- 53a2769: P3 — add the formatting toolbar to `<KunEditor>`.

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

### Patch Changes

- @kungal/editor-core@0.5.0

## 0.4.0

### Minor Changes

- 56f4a77: P3 — wire the `@mention` autocomplete dropdown.

  Typing `@` in `<KunEditor>` now opens a debounced, keyboard-navigable dropdown
  (ported from the forum's `MentionDropdown.vue`) that resolves users through the
  injected `searchMentionUsers` adapter and inserts a mention chip serializing to
  `[@name](kungal-user:id)`. Without the adapter the mention schema still
  round-trips — there's just no autocomplete.

  The adapter reaches the dropdown via a `provide()` on `<KunEditor>`: because
  @prosemirror-adapter/vue renders plugin views as portals that are _siblings_ of
  the editor (children of `<ProsemirrorAdapterProvider>`), only an ancestor of the
  provider can inject into them. Verified end-to-end in a real browser via the new
  `apps/playground` dev app.

### Patch Changes

- @kungal/editor-core@0.4.0

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
