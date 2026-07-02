# @kungal/editor-nuxt

## 0.25.1

### Patch Changes

- Updated dependencies [177df55]
  - @kungal/editor-vue@0.25.1
  - @kungal/editor-core@0.25.1

## 0.25.0

### Patch Changes

- Updated dependencies [a103220]
  - @kungal/editor-vue@0.25.0
  - @kungal/editor-core@0.25.0

## 0.24.0

### Patch Changes

- Updated dependencies [5c981df]
  - @kungal/editor-vue@0.24.0
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

- Updated dependencies [78e637e]
  - @kungal/editor-vue@0.23.0
  - @kungal/editor-core@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies [fbbb761]
  - @kungal/editor-vue@0.22.0
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

- Updated dependencies [9556a51]
  - @kungal/editor-vue@0.21.0
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

- Updated dependencies [62e14f5]
  - @kungal/editor-vue@0.20.0
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

- Updated dependencies [f111b82]
  - @kungal/editor-vue@0.19.0
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
  - @kungal/editor-vue@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [59abbc8]
  - @kungal/editor-core@0.17.0
  - @kungal/editor-vue@0.17.0

## 0.16.0

### Minor Changes

- 4e160ee: `<KunEditorToolbar>`: the emoji/sticker picker tabs are now a
  `<KunTab variant="underlined" full-width>` instead of two `<KunButton>`s —
  matching `<KunEditorViewSwitch>` and the forum's picker (keyboard nav, sliding
  indicator, a11y). Only shown when a `stickerSource` adapter is present.

### Patch Changes

- @kungal/editor-core@0.16.0
- @kungal/editor-vue@0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Ship `tailwind.css` so the KunUI toolbar/picker/tabs styles render drop-in.

  `<KunEditorToolbar>` / `<KunEditorViewSwitch>` use Tailwind utility classes
  (grids, aspect, sizes, dividers, menu items). Tailwind v4 doesn't scan
  `node_modules`, so without registration the sticker/emoji grid collapsed (huge
  stickers). The package now ships `tailwind.css` containing a path-relative
  `@source "./runtime"` — the Tailwind-team-recommended pattern for a
  Tailwind-based library, and pnpm-layout-safe (resolved relative to the file, not
  the app's `node_modules`). Consumers add one line to their Tailwind entry:

  ```css
  @import "@kungal/ui-vue/style.css";
  @import "@kungal/editor-nuxt/tailwind.css";
  ```

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
- Updated dependencies [a7273bb]
  - @kungal/editor-core@0.15.0
  - @kungal/editor-vue@0.15.0

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

- Updated dependencies [506813b]
  - @kungal/editor-vue@0.14.0
  - @kungal/editor-core@0.14.0

## 0.13.0

### Minor Changes

- 8ce8210: The Nuxt layer now preconfigures Vite's dev dependency optimizer, so consumers
  never hit the micromark/`debug` dev error.

  Under `nuxt dev`, Milkdown's tokenizer (micromark) resolves to its DEV build,
  which does `import debug from 'debug'`. `debug` is CommonJS; unless Vite
  pre-bundles it, its browser build is served raw with no `default` export and the
  editor throws at load — `SyntaxError: 'debug' does not provide an export named
'default'` (create-tokenizer.js), which also aborts app init. Whether it fires is
  non-deterministic per app (it depends on whether Vite's dep scan reaches the
  editor before it evaluates).

  The layer now sets `vite.optimizeDeps.include` for the editor + Milkdown entry
  points, which Nuxt merges into every consuming app — so esbuild pre-bundles that
  subgraph and resolves micromark's CJS `debug` inside the bundle. No app needs to
  configure this itself. Dev-only: the production build strips micromark's debug
  calls, so `nuxt build` is unaffected. (Plain non-Nuxt Vite apps that use
  `@kungal/editor-vue` directly still add the same `optimizeDeps.include` manually —
  a layer can inject Vite config, a plain package cannot.)

### Patch Changes

- @kungal/editor-core@0.13.0
- @kungal/editor-vue@0.13.0

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

- Updated dependencies [5786594]
  - @kungal/editor-vue@0.12.0
  - @kungal/editor-core@0.12.0

## 0.11.0

### Patch Changes

- @kungal/editor-vue@0.11.0

## 0.10.0

### Patch Changes

- @kungal/editor-vue@0.10.0

## 0.9.0

### Patch Changes

- Updated dependencies [8b86a68]
  - @kungal/editor-vue@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [c0908c5]
  - @kungal/editor-vue@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [4968c96]
  - @kungal/editor-vue@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [a4cbd3a]
  - @kungal/editor-vue@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [53a2769]
  - @kungal/editor-vue@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [56f4a77]
  - @kungal/editor-vue@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [62b2dad]
  - @kungal/editor-vue@0.3.0

## 0.2.0

### Patch Changes

- @kungal/editor-vue@0.2.0

## 0.1.0

### Patch Changes

- @kungal/editor-vue@0.1.0
