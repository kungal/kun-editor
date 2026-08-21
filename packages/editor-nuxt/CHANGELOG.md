# @kungal/editor-nuxt

## 0.35.0

### Minor Changes

- c90e1b9: fix(link): give a typed URL the scheme it needs, in ONE place

  Typing `www.kungal.com/topic/1` into any link input produced a **relative**
  href: with no scheme the browser resolves it against the current page, so the
  link went to `<origin>/<current/path>/www.kungal.com/topic/1` — dead, and dead
  in a way the author can't see while writing.

  `insertLinkCommand` now normalizes its `href`, and since every link entry point
  (the selection bubble's input, the headless toolbar's URL panel, the KunUI
  toolbar's popover, and a host's own `linkPrompt` adapter) dispatches that one
  command, all of them are fixed at once — a host must not re-implement this.

  - `www.kungal.com/topic/1` → `https://www.kungal.com/topic/1` (https, not http:
    an http-only site redirects, an https-only site doesn't). Ports, queries,
    fragments and bare IPv4 hosts included.
  - `me@kungal.com` → `mailto:me@kungal.com` (`https://` would read the address as
    userinfo and go nowhere).
  - Untouched: anything with a scheme — `kungal-user:` / `kungal-reply:` included
    — and anything explicitly relative (`/x`, `./x`, `../x`, `#x`, `?x`, `//host`).
  - The one ambiguous input is a lone dotted word: `readme.md` looks exactly like
    a hostname (`.md` is a TLD), so it gets `https://`. Write `./readme.md` when a
    relative file is what you mean.

  The rule is also exported as `normalizeLinkHref(input)` from the light,
  zero-dependency `@kungal/editor-core` entry, so a server can normalize legacy
  content with the exact same logic.

  Along with it, the three URL inputs move from `type="url"` to `type="text"` +
  `inputmode="url"`. Native URL validation rejects exactly the schemeless input
  this change exists to accept — in the KunUI toolbar's popover, which submits a
  real `<form>`, pressing Enter on `www.kungal.com/topic/1` did nothing at all.
  The mobile keyboard hint is kept.

### Patch Changes

- Updated dependencies [c90e1b9]
  - @kungal/editor-core@0.35.0
  - @kungal/editor-vue@0.35.0

## 0.34.0

### Minor Changes

- ab7fbc2: No native `prompt` left: the headless toolbar gets a link URL panel too

  0.33.0 gave the selection bubble an inline URL input; the fixed (headless)
  toolbar still popped `window.prompt`. It now opens a small panel under the link
  button — Enter applies, Esc cancels, clicking outside closes, and the editor
  gets focus back. Same behaviour as the bubble otherwise: an existing href is
  prefilled (and selected), and with nothing selected the URL is inserted as
  linked text. A panel rather than an in-place swap because a fixed toolbar row
  that rearranges itself is jarring; the bubble is already a floating layer, so
  there the swap is the right shape.

  **Breaking (CSS hook, one version old):** `.kun-editor__bubble-input` →
  `.kun-editor__link-input`. Both entry points render the same input, so the hook
  is named after the thing, not the place. Hosts importing
  `@kungal/editor-nuxt/editor.css` need no change; a copied stylesheet wants the
  rename plus the two new hooks:

  ```css
  .kun-editor__link {
    position: relative;
  } /* structural */
  .kun-editor__link-panel {
    position: absolute;
  } /* structural */
  .kun-editor__link-input {
    /* shared by the toolbar panel and the bubble */
  }
  ```

  `linkPrompt` keeps taking precedence over all three built-in entries (bubble
  input, toolbar panel, KunUI popover), so a host modal is still one override.

### Patch Changes

- Updated dependencies [ab7fbc2]
  - @kungal/editor-core@0.34.0
  - @kungal/editor-vue@0.34.0

## 0.33.0

### Minor Changes

- 9294ba2: Insert a link from the selection bubble without a native `prompt`

  Selecting text → 「链接」 used to pop `window.prompt`. The bubble now asks for the
  URL **in place**: the button row swaps for a URL input (`data-mode="link"`),
  Enter applies, Esc cancels, and the row comes back. If the selection is already
  a link its href is prefilled (and selected), so editing a URL is the same flow.

  Why in place, and not a popover/dialog: the bubble is a Milkdown tooltip whose
  `shouldShow` keeps it alive only while focus is in the editor **or inside the
  bubble element**. Any popover teleports its panel to `<body>` — outside that
  element — so the bubble would hide the moment the panel's input took focus. An
  input in our own DOM keeps the bubble put, and the ProseMirror selection
  survives the DOM blur, so the link wraps exactly what was selected.

  Still headless: a plain `<input>` plus one new class hook.

  ```css
  .kun-editor__bubble[data-mode="link"] {
    /* the URL-entry state */
  }
  .kun-editor__bubble-input {
    /* the input itself */
  }
  ```

  Hosts that want their own UI keep the escape hatch — the `linkPrompt` adapter
  takes precedence over the inline input, exactly as it does over the KunUI
  toolbar's popover.

  Also in the shipped reference stylesheet (`@kungal/editor-nuxt/editor.css`): the
  selection bubble, the @mention dropdown and the sticker/emoji picker painted
  themselves with `--color-background` — KunUI's _glassy page_ tint (0.7 alpha) —
  so document text showed through a panel floating over it. They now use the
  RAISED surface token the KunUI popovers use, via one overridable var:

  ```css
  :root {
    --kun-editor-surface: var(--color-content1, var(--color-background));
  }
  ```

### Patch Changes

- Updated dependencies [9294ba2]
  - @kungal/editor-core@0.33.0
  - @kungal/editor-vue@0.33.0

## 0.32.1

### Patch Changes

- 814c98f: Drive toolbar and bubble toggle-mark state from one editor plugin view, and keep the orphan-link cleanup out of undo history.

  The previous Milkdown-listener + per-toolbar `refresh()` pair leaked subscriptions, missed stored-mark toggles for 200ms, and left the selection bubble without a pressed state. A single ProseMirror `view.update` plugin now writes one reactive record that the toolbar, the `#toolbar` slot, and the bubble all read. The leftover stored-link cleanup is marked `addToHistory: false`.

- Updated dependencies [814c98f]
  - @kungal/editor-core@0.32.1
  - @kungal/editor-vue@0.32.1

## 0.32.0

### Minor Changes

- 7dd7f71: Show an active state on the toolbar's toggle marks (bold / italic /
  strikethrough / inline code).

  The toolbar buttons ran the toggle commands but never reflected whether the
  mark was on, so a user could not tell if bold (etc.) was engaged. The
  `#toolbar` slot API now exposes a reactive `activeMarks` map (bold / italic /
  strike / code), recomputed from the ProseMirror selection on selection and doc
  changes and immediately after each command. `<KunEditorToolbar>` renders the
  pressed buttons with the primary "active" look (same as hover) and sets
  `aria-pressed`; the headless `EditorToolbar` sets `data-active` for the
  `.kun-editor__tool[data-active='true']` style.

### Patch Changes

- Updated dependencies [7dd7f71]
- Updated dependencies [35bc140]
  - @kungal/editor-vue@0.32.0
  - @kungal/editor-core@0.32.0

## 0.31.1

### Patch Changes

- b7fe837: Fix a long `placeholder` overflowing the editor, and ship the reference
  stylesheet from the layer.

  The placeholder is a decoration (`.kun-editor__placeholder` +
  `data-placeholder`) rendered by the host's `::before` rule. That rule was
  absolutely positioned with **no positioned ancestor**, so the browser laid it
  out against the viewport: a long placeholder ran past the editor's right edge —
  and could even paint over the toolbar — instead of wrapping inside it. The
  empty block is now the containing block, and the text wraps (`width: 100%` +
  `overflow-wrap: break-word`):

  ```css
  .kun-editor__placeholder {
    position: relative;
  }
  .kun-editor__placeholder::before {
    content: attr(data-placeholder);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow-wrap: break-word;
  }
  ```

  Because that CSS lived only in the docs app, every host had a _copy_ — an
  upstream style fix could never reach them. The reference stylesheet now ships
  with `@kungal/editor-nuxt`, so hosts can import it and get fixes with a version
  bump (copying it still works):

  ```css
  @import "@kungal/editor-nuxt/editor.css";
  ```

  `@kungal/editor-vue` is unchanged and still headless (zero CSS).

- Updated dependencies [b7fe837]
  - @kungal/editor-core@0.31.1
  - @kungal/editor-vue@0.31.1

## 0.31.0

### Patch Changes

- Updated dependencies [6b3a2f7]
  - @kungal/editor-vue@0.31.0
  - @kungal/editor-core@0.31.0

## 0.30.0

### Minor Changes

- afdeb84: `<KunEditorViewSwitch>` now forwards `variant` / `color` / `size` to its KunTab, so
  the 预览 / Markdown / 分栏 switch can be restyled without rebuilding it:

  ```vue
  <template #view-switch="s">
    <KunEditorViewSwitch
      v-bind="s"
      variant="solid"
      color="secondary"
      size="md"
    />
  </template>
  ```

  Defaults stay `underlined` / `primary` / `sm` (`size` also sizes the swap /
  scroll-sync buttons). This is the middle of the three customization layers, now all
  documented on the KunUI-toolbar example: (1) the default headless switch is styled
  via the `.kun-editor__toolbar` / `.kun-editor__tab` (`[data-active]`) CSS hooks;
  (2) `<KunEditorViewSwitch>` takes these appearance props; (3) the `#view-switch`
  slot API lets you render a completely different control.

  Verified in the docs production build: a `solid` / `secondary` / `md` switch
  renders a bordered, taller tab group distinct from the default underlined one; 0
  console errors.

### Patch Changes

- @kungal/editor-core@0.30.0
- @kungal/editor-vue@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [8609e53]
  - @kungal/editor-vue@0.29.0
  - @kungal/editor-core@0.29.0

## 0.28.0

### Minor Changes

- 8d278e5: Make the insert-link URL entry customizable via a `linkPrompt` adapter.

  The headless toolbar and the selection bubble asked for the link URL with the
  native `window.prompt` (the KunUI toolbar used an inline popover). Hosts can now
  supply their own UI instead — a modal, an article picker, etc.:

  ```ts
  const adapters = {
    // …uploadImage, notify…
    linkPrompt: async ({ text }) => await openLinkModal(text), // return the URL, or null to cancel
  };
  ```

  - **editor-core**: new `LinkPrompt` type + `linkPrompt?` on `KunEditorAdapters`.
    It receives the selected text (to prefill / search).
  - **editor-vue**: the default toolbar and the selection bubble use `linkPrompt`
    when supplied, else fall back to `window.prompt`.
  - **editor-nuxt**: when `linkPrompt` is set, `<KunEditorToolbar>`'s link button
    uses it instead of its inline popover — so one override covers every link entry
    point (toolbar, default toolbar, bubble).

  Verified in the docs production build: with a `linkPrompt` that derives a URL from
  the selected text, the selection bubble inserts
  `[…](https://example.com/search?q=…)` with no native dialog, and the KunUI
  toolbar link becomes a plain button (no popover); 0 console errors.

### Patch Changes

- Updated dependencies [8d278e5]
  - @kungal/editor-core@0.28.0
  - @kungal/editor-vue@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies [ac86c0a]
  - @kungal/editor-core@0.27.0
  - @kungal/editor-vue@0.27.0

## 0.26.0

### Minor Changes

- 945708d: Add an insert-link feature (click to add a URL).

  The `link` mark already existed (so `[text](url)` round-trips and pasted URLs
  autolink), but there was no click-to-insert UI. Now there is:

  - **editor-core**: `insertLinkCommand` (`{ href, text? }`) — applies the link mark
    to the selection, or inserts linked text on an empty selection; clears the
    stored mark afterwards. Re-exported from `@kungal/editor-core/preset`.
  - **editor-vue**: `KunEditorToolbarApi.insertLink(payload)`; a `link` button in the
    default toolbar and the selection bubble (both default-on); `'link'` added to
    `KunToolbarItem` and `KunSelectionItem`. Headless UI prompts for the URL.
  - **editor-nuxt**: `<KunEditorToolbar>` gains a `link` button — a KunPopover with a
    KunInput for the URL.

  A link is a **mark** (`[text](url)`), deliberately distinct from the custom-NODE
  embeds (mention / quote). A future "article card" or custom component would be a
  node like those (schema + toUrl/fromUrl), not this — a separate mechanism.

  Verified in the docs production build: the KunUI toolbar popover wraps a selection
  (`[…](https://example.com)`); the selection bubble does too
  (`[linktext](https://kun.com)`); 4 new core tests (wrap / insert / autolink
  fallback / blank-href no-op) pass; 0 console errors.

### Patch Changes

- Updated dependencies [945708d]
  - @kungal/editor-core@0.26.0
  - @kungal/editor-vue@0.26.0

## 0.25.2

### Patch Changes

- Updated dependencies [8e1b8ac]
  - @kungal/editor-vue@0.25.2
  - @kungal/editor-core@0.25.2

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
