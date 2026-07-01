# @kungal/editor-nuxt

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
