# @kungal/editor-nuxt

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
