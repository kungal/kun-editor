# @kungal/editor-vue

## 0.25.0

### Minor Changes

- a103220: Placeholder: default to `'doc'` mode + expose `placeholderMode`.

  The placeholder used to appear on **every empty line** (the cursor's empty
  block) — that's the Milkdown/Notion `'block'` behavior, which was the default but
  is surprising for a reply/comment editor. `<KunEditor>` now defaults to `'doc'`:
  the placeholder shows **only while the whole editor is empty** (the conventional
  empty-state hint), and the new `placeholderMode` prop opts back into per-line
  `'block'`:

  ```vue
  <KunEditor v-model="md" placeholder="写点什么…" />
  <!-- only when empty -->
  <KunEditor v-model="md" placeholder="写点什么…" placeholder-mode="block" />
  <!-- on each empty line -->
  ```

  (The lower-level `createKunEditorPlugins(..., { placeholderMode })` /
  `createPlaceholderPlugin` still default to `'block'` for parity with Crepe; the
  opinion lives in the `<KunEditor>` component.)

  Verified in the docs production build: empty editor shows the placeholder; typing
  a line then Enter (an empty line in a non-empty doc) does not; `placeholder-mode="block"`
  brings back the per-line hint. 47 core tests pass (incl. new doc-vs-block cases).

### Patch Changes

- @kungal/editor-core@0.25.0

## 0.24.0

### Minor Changes

- 5c981df: The selection bubble toolbar's buttons are now configurable.

  `<KunEditor>`'s `selectionToolbar` prop now accepts `boolean | KunSelectionItem[]`:

  ```vue
  <KunEditor v-model="md" />
  <!-- default 4 buttons -->
  <KunEditor v-model="md" :selection-toolbar="['bold', 'italic']" />
  <!-- reorder / subset -->
  <KunEditor v-model="md" :selection-toolbar="false" />
  <!-- off -->
  ```

  `KunSelectionItem` is `'bold' | 'italic' | 'strike' | 'code' | '|'` (`'|'` a
  divider), exported from `@kungal/editor-vue`. The resolved items reach the bubble
  (a plugin view) through the editor context; dividers collapse around removed
  items. The bubble's **look** is (and was) styled via the `.kun-editor__bubble` /
  `.kun-editor__bubble-btn` class hooks — headless, no new API.

  Verified in the docs production build: an editor with
  `:selection-toolbar="['bold','italic']"` shows a 2-button bubble while the default
  shows 4; 0 console errors.

### Patch Changes

- @kungal/editor-core@0.24.0

## 0.23.0

### Minor Changes

- 78e637e: `<KunEditor>` gains a `views` prop to control which view modes the switch offers.

  The split view is great on a full editor but heavy in a small reply/comment box —
  and there was no way to opt out per-editor (all or nothing). Now pass `views`:

  ```vue
  <!-- edit page: all three (default) -->
  <KunEditor v-model="md" />
  <!-- reply / comment: no split -->
  <KunEditor v-model="md" :views="['wysiwyg', 'source']" />
  <!-- just WYSIWYG: the switch bar is hidden entirely -->
  <KunEditor v-model="md" :views="['wysiwyg']" />
  ```

  - Default `['wysiwyg', 'source', 'split']`. The view switch renders only the
    offered modes, and disappears when a single mode is offered. If `views` changes
    to exclude the active mode, it falls back to the first offered.
  - `KunEditorViewSwitchApi` gains `views`; the default view switch and
    `<KunEditorViewSwitch>` (editor-nuxt) both render from it.

  Verified in the docs production build: an editor with `:views="['wysiwyg','source']"`
  shows only 预览/Markdown (no 分栏), while default editors still show all three; 0
  console errors.

### Patch Changes

- @kungal/editor-core@0.23.0

## 0.22.0

### Minor Changes

- fbbb761: Add a selection bubble toolbar (floating format menu on text selection).

  Selecting text now shows a floating inline-format menu (bold / italic /
  strikethrough / inline code) over the selection — the Medium/Notion pattern. It's
  built the Milkdown v7 way: a tooltip plugin view (`@milkdown/kit/plugin/tooltip`'s
  `tooltipFactory` + `TooltipProvider`, rendered via `@prosemirror-adapter/vue` —
  the same plugin-view mechanism as the @mention dropdown). `TooltipProvider`
  handles show/hide/positioning (floating-ui): shown only on a non-empty text
  selection while focused, and never when read-only (so it's inert in the split
  preview). Buttons run the same toggle commands as the fixed toolbar.

  - `<KunEditor>` gains a `selectionToolbar` prop (default `true`; set `false` to
    disable).
  - Headless: the bubble is class hooks only (`.kun-editor__bubble` /
    `.kun-editor__bubble-btn`, with `[data-show]`), like the @mention dropdown —
    styled by the reference `kun-editor.css`. editor-vue still ships zero CSS.

  Verified in the docs production build: selecting text shows the positioned bubble;
  clicking bold marks the selection (`**…**`); collapsing the selection hides it; 0
  console errors.

### Patch Changes

- @kungal/editor-core@0.22.0

## 0.21.0

### Minor Changes

- 9556a51: `<KunEditorToolbar>` gains an `items` prop to reorder / subset the buttons.

  Previously the toolbar's button order was fixed, so a host that wanted a different
  order had to rebuild a whole custom toolbar via the `#toolbar` slot — which drifts
  from the default toolbar used elsewhere (e.g. a topic-edit page vs reply/comment).

  Now pass `:items` — an ordered `KunToolbarItem[]` (`'heading' | 'bold' | 'italic'
| 'strike' | 'code' | 'bulletList' | 'orderedList' | 'quote' | 'codeBlock' | 'hr'
| 'spoiler' | 'image' | 'picker' | '|'`, where `'|'` is a divider):

  ```vue
  <KunEditorToolbar
    v-bind="api"
    :items="['picker', '|', 'bold', 'italic', '|', 'image', '|', 'heading']"
  />
  ```

  Apply the same array to every editor for a consistent site-wide order without
  rebuilding a toolbar. Defaults to the standard layout. `image`/`picker` are still
  auto-dropped without their adapter/feature, and dividers collapse around removed
  items. `KunToolbarItem` is exported from `@kungal/editor-vue`.

### Patch Changes

- @kungal/editor-core@0.21.0

## 0.20.0

### Minor Changes

- 62e14f5: Split view: sync scrolling between the panes, with an off switch.

  Scrolling the markdown source pane now scrolls the WYSIWYG preview to the same
  position (and vice-versa) — proportional/percentage sync (source↔preview line
  mapping is impractical across two separate renderers), with an active-pane +
  idle-timeout guard so the echoed scroll doesn't feed back into a loop.

  Turn it off two ways (for downstream customization):

  - **`scrollSync` prop** on `<KunEditor>` (default `true`) — pass
    `:scroll-sync="false"` to disable entirely.
  - **A runtime toggle** in the view switch: `KunEditorViewSwitchApi` gains
    `scrollSync` / `toggleScrollSync()` (+ `labels.scrollSync`). The default view
    switch shows a 同步滚动 toggle in split mode; `<KunEditorViewSwitch>` (editor-nuxt)
    shows a KunUI link/unlink toggle button. Or replace the whole control via the
    `#view-switch` slot.

  Sync needs each pane to scroll internally, so the reference `kun-editor.css` now
  gives split panes a bounded height (`--kun-editor-split-height`, default `60vh`,
  overridable) with `overflow: auto`. editor-vue still ships zero CSS.

  Verified in the docs production build (headless + KunUI view switches): with the
  panes overflowing, scrolling the source drives the preview to the same ratio;
  toggling off makes them scroll independently; toggling on resumes; 0 console
  errors.

### Patch Changes

- @kungal/editor-core@0.20.0

## 0.19.0

### Minor Changes

- f111b82: Add a desktop **split view** for long-form writing.

  `<KunEditor>` now has a third view mode, `split`, alongside WYSIWYG and Markdown:
  an editable markdown source pane + a live **read-only WYSIWYG preview**, side by
  side and left/right swappable. The markdown string stays the single source of
  truth and the preview is derived — the industry-standard model (VS Code /
  StackEdit / Dillinger), so there's no two-editor bidirectional-sync problem.

  - **editor-vue**: the view mode gains `'split'`; `KunEditorViewSwitchApi` gains
    `swap()` / `swapped` and `labels.split` / `labels.swap`. The WYSIWYG becomes a
    read-only preview in split (its editability now reacts to the `readonly` prop).
    The default hand-rolled view switch gets a 分栏 tab + a ⇄ swap button.
  - **editor-nuxt**: `<KunEditorViewSwitch>` gets the 分栏 KunTab + a KunUI swap
    button (shown in split).
  - **Headless**: the layout is class hooks only — `.kun-editor__panes` /
    `.kun-editor__pane` under `[data-mode='split']` (+ `[data-swap]`). Styled by the
    reference `kun-editor.css`: stacked on narrow screens, side-by-side (swappable)
    from `md` up. editor-vue still ships zero CSS.

  Verified in the docs production build (headless + KunUI view switches): 分栏 shows
  both panes side by side, typing markdown in the source updates the preview live,
  the WYSIWYG preview is `contenteditable=false`, swap reverses the panes; 0 console
  errors. (Synced scrolling between panes is a possible follow-up.)

### Patch Changes

- @kungal/editor-core@0.19.0

## 0.18.0

### Minor Changes

- 6545866: Toolbar image upload now shows an in-document "uploading…" placeholder.

  Previously only paste/drop showed the in-flight placeholder (Milkdown's `upload`
  plugin); the toolbar image button uploaded silently — the image just popped in
  when the adapter resolved. Now the toolbar path uses the same placeholder UX
  (ProseMirror's official upload-example pattern).

  - **editor-core**: `startImageUpload(view, file, { uploadImage, notify, locale })`
    - the `imageUploadPlaceholder` decoration plugin (exported from `/preset`;
      wired by the preset when `uploadImage` is present). Inserts a
      `.kun-editor__uploading` widget at the caret, uploads, then replaces it with the
      image (or removes it + notifies on failure); not an undo step. The paste/drop
      placeholder now uses the same `.kun-editor__uploading` class so both look
      identical.
  - **editor-vue**: `KunEditorToolbarApi` gains `uploadImage(file)`; both the
    headless `EditorToolbar` and the `#toolbar` slot API route uploads through
    `startImageUpload`.
  - **editor-nuxt**: `<KunEditorToolbar>`'s image button uses it.
  - **Headless kept**: the placeholder is a class + widget hook only; style it via
    `.kun-editor__uploading` in the reference `kun-editor.css` (primary-colored).

  Customizable: style the placeholder via `.kun-editor__uploading`; the text is
  localized (zh/en). Verified in the docs production build: uploading via either
  toolbar inserts the image; the unit tests confirm the placeholder shows during a
  pending upload and is replaced on success / removed on failure.

### Patch Changes

- Updated dependencies [6545866]
  - @kungal/editor-core@0.18.0

## 0.17.0

### Minor Changes

- 59abbc8: Add a placeholder (empty-state text).

  - **editor-core**: `createPlaceholderPlugin({ text, mode })` — a `$prose` plugin
    that adds a ProseMirror node DECORATION to the empty block (`.kun-editor__placeholder`
    class + `data-placeholder` attribute). Same mechanism as Milkdown Crepe's v7
    placeholder feature — purely visual (a decoration), so it never enters the doc
    or the markdown output. `mode` `'block'` (default) shows on any empty block,
    `'doc'` only when the whole document is empty; skipped in readonly / code blocks
    / lists / tables. `createKunEditorPlugins(..., { placeholder, placeholderMode })`
    wires it (only when `placeholder` is non-empty). Exported from `/preset`.
  - **editor-vue**: `<KunEditor placeholder="…">` prop, threaded through.
  - **Headless**: the core ships only the class + `data-placeholder` hook; render it
    with `.kun-editor__placeholder::before { content: attr(data-placeholder) }` (added
    to the reference `kun-editor.css`, muted via a KunUI token).

### Patch Changes

- Updated dependencies [59abbc8]
  - @kungal/editor-core@0.17.0

## 0.16.0

### Patch Changes

- @kungal/editor-core@0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Toolbar: headings become one "text size" dropdown; remove the formula button.

  - **Headings → a single "text size" control** (Paragraph / H1–H6) instead of
    three H1/H2/H3 buttons — the modern standard, and it can set Paragraph (reset),
    which the old toggle buttons couldn't. The headless `EditorToolbar` uses a
    native `<select>` (new `.kun-editor__heading-select` class hook); the KunUI
    `<KunEditorToolbar>` uses a `<KunPopover>` with each level shown at its own size
    (like the forum). Both drive `setHeadingCommand`.
  - **Remove the math/formula button.** With no selection it inserted an empty
    inline-math node (a broken formula box). Math is entered via the existing
    `$…$` / `$$` input rules instead — the ecosystem norm (prosemirror-math). The
    spoiler button stays.

### Patch Changes

- Updated dependencies [a7273bb]
  - @kungal/editor-core@0.15.0

## 0.14.0

### Minor Changes

- 506813b: Add a `#view-switch` slot and a KunUI view switch — the Preview/Markdown tabs are
  now a swappable layer too.

  `<KunEditor>` exposes a `#view-switch` scoped slot whose props are
  `KunEditorViewSwitchApi` (`mode` / `setMode` / `labels`). The hand-rolled tabs
  are the slot's fallback — omit the slot and nothing changes. This lets a host
  render a real component (or anything) for the view switch and drive the editor
  via `setMode`, without reaching into internals.

  `@kungal/editor-nuxt` ships `<KunEditorViewSwitch>` (auto-imported): the tabs as a
  real `<KunTab variant="underlined">` (keyboard nav, sliding indicator, a11y):

  ```vue
  <KunEditor v-model="md">
    <template #view-switch="s"><KunEditorViewSwitch v-bind="s" /></template>
    <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
  </KunEditor>
  ```

  Same "headless core + optional KunUI layer" pattern as `#toolbar` /
  `<KunEditorToolbar>`: `@kungal/editor-vue` stays UI-kit-free (default tabs), the
  KunUI ecosystem gets native chrome. Exports `KunEditorViewSwitchApi`.

### Patch Changes

- @kungal/editor-core@0.14.0

## 0.13.0

### Patch Changes

- @kungal/editor-core@0.13.0

## 0.12.0

### Minor Changes

- 5786594: Add a `#toolbar` slot and a KunUI toolbar — the toolbar is now a swappable layer.

  `<KunEditor>` exposes a `#toolbar` scoped slot whose props are the command API
  (`KunEditorToolbarApi`: `run(cmdKey, payload)` / `insertText` / `insertQuote` /
  `insertMention` / `focus` / `adapters` / `features` / `locale`). The API is
  computed inside the Milkdown providers and handed down, so a custom toolbar can
  live in the consumer's tree without `useInstance`/`inject`. The hand-rolled
  default toolbar is the slot's fallback — omit the slot and nothing changes.

  `@kungal/editor-nuxt` ships `<KunEditorToolbar>` (auto-imported): the same
  toolbar built with **KunButton / KunIcon / KunTooltip / KunPopover** (real tooltip
  delay, popover focus/collision, a11y):

  ```vue
  <KunEditor v-model="md" :adapters="adapters">
    <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
  </KunEditor>
  ```

  This keeps `@kungal/editor-vue` **headless / zero UI-kit dependency** (any Vue app
  can use it with the default toolbar) while the KunUI ecosystem (forum, moyu) gets
  native chrome — the "headless core + optional UI layer" pattern (TipTap UI,
  BlockNote's swappable toolbar). Also exports `EMOJI` from `@kungal/editor-vue` for
  building custom pickers.

### Patch Changes

- @kungal/editor-core@0.12.0

## 0.11.0

### Patch Changes

- Updated dependencies [f8fe64c]
  - @kungal/editor-core@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [ebe6c61]
  - @kungal/editor-core@0.10.0

## 0.9.0

### Minor Changes

- 8b86a68: Add an imperative handle to `<KunEditor>` for cursor-level inserts.

  A `<KunEditor>` template ref now exposes `KunEditorExpose`:

  - `insertQuote({ refId, label })` — insert a reference atom
    (`[label](kungal-reply:refId)`) at the caret (requires `features.quote`)
  - `insertMention({ userId, name })` — insert an @mention atom at the caret
  - `focus()` — focus the WYSIWYG editor

  ```ts
  const editor = ref<InstanceType<typeof KunEditor>>();
  editor.value?.insertMention({ userId: 1, name: "Alice" });
  editor.value?.insertQuote({ refId: "101", label: "#1" });
  ```

  This is what the forum's per-floor 「引用」 needs — a live, cursor-level insert of
  `@author #floor` (each command inserts with a trailing space), rather than
  editing the markdown string. Works in either view (the WYSIWYG editor stays
  mounted in source mode too). Exported type: `KunEditorExpose`.

### Patch Changes

- @kungal/editor-core@0.9.0

## 0.8.0

### Minor Changes

- c0908c5: Make `<KunEditor>` headless — ship zero CSS.

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

### Patch Changes

- @kungal/editor-core@0.8.0

## 0.7.0

### Minor Changes

- 4968c96: P3 (complete) — replace the source-mode `<textarea>` with a CodeMirror editor.

  The "Markdown" tab is now a real CodeMirror editor with markdown syntax
  highlighting, reusing the code block's `kunCM` theme (from
  `@kungal/editor-core`) so the source view and code blocks match. Edits sync back
  through `v-model` to the WYSIWYG view; the view is mounted on demand (CodeMirror
  measures poorly while hidden).

  Adds `@codemirror/lang-markdown` alongside the CodeMirror packages the editor
  already needs (declared as optional peers; externalized from the build so the
  host dedupes them). This finishes the P3 dual-view editor: WYSIWYG + toolbar +
  @mention dropdown + sticker/emoji picker + CodeMirror source.

### Patch Changes

- @kungal/editor-core@0.7.0

## 0.6.0

### Minor Changes

- a4cbd3a: P3 — add the sticker / emoji picker to the toolbar.

  A merged popover (ported from the forum's sticker + emoji Containers):

  - **Emoji tab** — a built-in curated unicode set, inserted as plain text. No
    adapter, always available.
  - **Sticker tab** — appears only when the host supplies the `stickerSource`
    adapter; loads packs lazily on first open and inserts each sticker as an image
    node (`insertImageCommand`). Stickers are images, so an image-free editor gets
    emoji only.

  Self-contained (no `@kungal/ui-vue`): a plain trigger button + a click-outside
  popover, themed via CSS variables. Gated by `features.sticker` (default on). The
  `KunEditorContext` now also carries `features` so views can read the flags.
  Verified end-to-end in a browser via `apps/playground` (emoji → text; sticker →
  image node in the v-model markdown).

### Patch Changes

- @kungal/editor-core@0.6.0

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
