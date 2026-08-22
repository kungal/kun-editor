# @kungal/editor-core

## 0.37.0

### Minor Changes

- a473708: 隐藏文本:选区里的换行不再写出读不回来的 markdown,选区气泡里也有了这颗按钮

  - **`insertKunSpoilerCommand` 把选区里的换行折成空格。** `||…||` 在每一个读它的地方
    都只在同一行内配对(这里的 remark 转换、共用同一语法的服务端渲染器),而 commonmark 的
    hardbreak 声明了 `leafText: () => '\n'` —— 所以选中跨行的文字点「隐藏文本」,按钮会写出
    `||第一行\n第二行||`:一段它自己都读不回来、渲染出来是两条光秃秃竖线的 markdown。现在
    `textBetween` 的**两个**分隔符都给 `' '`(块级的本来就是),跨行选区并成一个单行 spoiler。
  - **选区里一个字都没有时返回 `false`**,而不是把选中的东西替换掉 —— 单独选中一张图片点
    「隐藏文本」不再删图。(选中的是节点、或在代码块里,原本就已经返回 `false`。)
  - **选区气泡工具栏加入 `spoiler`**:`KunSelectionItem` 多一个成员,默认那一排变成
    `bold / italic / strike / code / spoiler / link`。按下态走已有的 `activeMarks.spoiler`,
    光标在 spoiler 里时按钮点亮、点一下揭示,和固定工具栏完全一致。
  - 顺手把气泡默认按钮表收成**一份** `DEFAULT_SELECTION_ITEMS`(`context.ts`)。原本
    `<KunEditor>` 和气泡各存一份,只改气泡那份等于没改 —— 真实编辑器读的是 context 那份。

  **跨行剧透不在此列**:`||…||` 是行内语法(schema `inline: true`,mdast 里开闭两个 `||`
  根本落在不同的 text 节点上),要藏整段多行内容需要的是一个块级容器语法,得全生态(渲染器
  先行)另行约定,不是把 `||…||` 拉长。

## 0.36.0

### Minor Changes

- f7c65c2: fix(editor): the spoiler toolbar button hides the selection instead of deleting it

  `insertKunSpoilerCommand` built an EMPTY `kun-spoiler` node and dropped it over
  the selection with `replaceSelectionWith`, so clicking 隐藏文本 with text selected
  deleted the text and left a bare `||||` — and the next thing typed landed
  outside the node, so nothing was hidden either. The JSDoc said "wraps the
  current selection"; the code never wrapped anything.

  The command now covers the three cases the `||…||` syntax does:

  - **a selection** → its text moves inside the node. The schema is `marks: ''`
    (inline formatting cannot round-trip through `||…||`), so bold is what's
    dropped, never the words. Selections spanning paragraphs collapse into one
    spoiler; select-all (an `AllSelection`) works too.
  - **an empty selection** → a new spoiler with the caret INSIDE it: type and it
    is hidden. It holds a zero-width caret anchor, because a caret cannot sit in
    an inline node with no text node in it — the serializer strips anchors, and a
    spoiler holding nothing else serializes to nothing, so a stray click cannot
    leave `||||` behind.
  - **the caret already inside a spoiler** → reveal it, leaving the text selected.
    Nesting would have produced `||||text||||`, which reads back as nothing.

  The button is therefore a toggle, and both toolbars (the headless one and the
  KunUI one in `@kungal/editor-nuxt`) now show it pressed while the caret is
  inside a spoiler — `KunToggleMark` gains a `'spoiler'` member for that, so
  `activeMarks` carries one more key.

  It returns `false` — no document change — inside a code block and with a node
  selected (an image is not text; replacing it would delete it).

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

## 0.32.1

### Patch Changes

- 814c98f: Drive toolbar and bubble toggle-mark state from one editor plugin view, and keep the orphan-link cleanup out of undo history.

  The previous Milkdown-listener + per-toolbar `refresh()` pair leaked subscriptions, missed stored-mark toggles for 200ms, and left the selection bubble without a pressed state. A single ProseMirror `view.update` plugin now writes one reactive record that the toolbar, the `#toolbar` slot, and the bubble all read. The leftover stored-link cleanup is marked `addToHistory: false`.

## 0.32.0

### Patch Changes

- 35bc140: Stop the link mark from leaking onto text typed after a link is deleted.

  A link is a mark, so deleting its text left the link as a ProseMirror STORED
  mark — the pending mark re-applied to the next keystroke — which is why typing
  right after deleting a link kept producing linked text (the Space keymap only
  cleared it while you kept typing). A new `$prose` plugin now clears the stored
  link mark the moment the cursor is no longer inside a link, so the next
  keystroke starts un-linked text.

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

## 0.31.0

## 0.30.0

## 0.29.0

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

## 0.27.0

### Minor Changes

- ac86c0a: Add a heading-outline API for building a table of contents (TOC).

  A host (e.g. a desktop editor with a left-side outline) can now render its own TOC
  and navigate the editor, without reaching into editor internals:

  - **`@update:headings`** on `<KunEditor>` — emits the ordered outline
    (`KunHeading[]` = `{ level, text }`) whenever the content changes.
  - **`ref.scrollToHeading(index)`** — scrolls to that heading in the _current_ view
    and places the caret there: the WYSIWYG heading in wysiwyg mode, the CodeMirror
    heading line in source/split mode (so a click navigates the editable pane).
  - **editor-core** exports the pure `parseHeadings(markdown)` (and `KunHeading`) it's
    built on — usable server-side too. Parses ATX headings, skipping code fences.

  The TOC's styling, colour, indentation and layout (e.g. reserving space on the
  left of the split editor) are entirely the host's — the editor only exposes the
  data + navigation, matching the headless design.

  Verified in a new docs example (`/examples/toc`): the outline tracks the content;
  clicking an item scrolls + carets to that heading in wysiwyg (scrollTop 0→386,
  caret in the target) and in source (CodeMirror scrolled, cursor on `## …`); new
  `parseHeadings` unit tests pass; 0 console errors.

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

## 0.25.2

## 0.25.1

## 0.25.0

## 0.24.0

## 0.23.0

## 0.22.0

## 0.21.0

## 0.20.0

## 0.19.0

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

## 0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Add `setHeadingCommand` — absolute block-type set (paragraph or heading level).

  commonmark ships `wrapInHeadingCommand` (a toggle) but no "set paragraph"
  command, so a "text size" dropdown (Paragraph / H1–H6, each option setting one
  exact level) couldn't be built from it. `setHeadingCommand` uses ProseMirror's
  `setBlockType`: `level` 0 → paragraph, 1–6 → heading. Exported from
  `@kungal/editor-core/preset`; drive it with `run(setHeadingCommand.key, level)`.

## 0.14.0

## 0.13.0

## 0.12.0

## 0.11.0

### Minor Changes

- f8fe64c: `mentionFromUrl` now also receives the link text.

  The mention-detection hook was `fromUrl(url)` — URL only — so a host couldn't
  replicate a text-based guard. moyu's server treats `/user/<id>` as a mention only
  when the link text starts with `@`; without the text, kun-editor would wrongly
  turn a real link like `[see here](/user/5/x)` into a mention.

  `mentionFromUrl` / `MentionUrlConfig['fromUrl']` are now
  `(url: string, text: string) => number | null` — the remark transform passes the
  link's plain text (concatenated across children). Backward compatible: existing
  `(url) => …` handlers still type-check and behave the same; the default
  `kungal-user:` scheme ignores the text.

  ```ts
  mentionFromUrl: (url, text) => {
    if (!text.startsWith("@")) return null; // reproduce moyu's guard
    const m = url.match(/^\/user\/(\d+)/);
    return m ? Number(m[1]) : null;
  };
  ```

## 0.10.0

### Minor Changes

- ebe6c61: Make the @mention link URL form injectable (host policy).

  The mention markdown form was hardcoded to `[@name](kungal-user:<id>)`. But the
  URL shape is a server contract — different hosts render/parse it differently — so
  it's host policy, not editor mechanism. Two new (optional) `KunEditorAdapters`
  fields let a host define it:

  - `mentionToUrl(userId) => string` — build the link URL (default `kungal-user:<id>`)
  - `mentionFromUrl(url) => number | null` — parse a link back to a user id, or
    null if it isn't a mention (default: the `kungal-user:` scheme)

  `createMentionPlugin(config?)` now takes `{ toUrl, fromUrl }`; the preset threads
  the adapters through. Omit them for the unchanged default — fully backward
  compatible, no data migration.

  This unblocks downstream adoption (e.g. moyu, whose mentions are real
  `/user/<id>/resource` links): the host passes its own `mentionToUrl` /
  `mentionFromUrl`, existing content keeps working, and its server + goldmark
  renderer stay untouched. `insertMentionCommand` now resolves the node type by id
  from the live schema, so it works with any mention config.

## 0.9.0

## 0.8.0

## 0.7.0

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.0

## 0.2.0

### Minor Changes

- 6e1f780: P2 — port the adapter-driven Milkdown plugins into `editor-core/preset`.

  - `createUploadPlugin(uploadImage, { locale, notify })` — paste / drop / toolbar
    image upload built on `@milkdown/kit/plugin/upload`. The forum's hardcoded
    `kunFetch('/image/topic')` becomes the injected `uploadImage` adapter; a failed
    image is skipped (and reported via `notify`) instead of aborting the batch.
  - `createMentionPlugin()` — the `[@name](kungal-user:id)` mention atom + `$remark`
    round-trip. The schema is pure; the `@` autocomplete dropdown that consumes
    `searchMentionUsers` is a render-layer view (P3).
  - `createQuotePlugin()` — an inline reference atom, generalized per the
    architecture decision (option 1): the forum's `{ replyId, floor }` becomes an
    opaque `{ refId, label }` the host supplies via `insertQuoteCommand`. Markdown
    form `[label](kungal-reply:<refId>)`.

  `createKunEditorPlugins` now gates upload on the `uploadImage` adapter, wires the
  mention schema by default, and treats quote as opt-in (`features.quote`). Adds
  `QUOTE_SCHEME` to the light main entry (shared with the server, like
  `MENTION_SCHEME`) and a `quote` flag to `KunEditorFeatures`.

  Stickers need no core plugin — a sticker is a plain image node, so its picker is
  a P3 view over the `stickerSource` adapter.

  Covered by headless vitest: mention/quote markdown round-trips, the uploader
  (image filter + notify-on-failure), and preset feature gating.

## 0.1.0

### Minor Changes

- 0386d6d: P1 — port the pure Milkdown plugins into `editor-core`.

  Adds `@kungal/editor-core/preset` with `createKunEditorPlugins(adapters,
features, options)` — the composed Milkdown bundle (commonmark/gfm baseline +
  KunEditor plugins) — and the individual plugin factories:

  - `createSpoilerPlugin()` — `||hidden||` inline node with `$remark` round-trip
  - `createKatexPlugins()` — inline `$…$` and block `$$…$$` LaTeX (KaTeX)
  - `createCodeBlockPlugins(opts)` — CodeMirror code block (theme, languages,
    localized toolbar, `latex` preview)
  - `createStopLinkPlugin()` — Space clears the active link mark

  The main entry (`@kungal/editor-core`) stays light — types + `MENTION_SCHEME`,
  no runtime deps — so the server can import the scheme without the Milkdown /
  katex / codemirror peers. The heavier `@codemirror/*`, `@lezer/highlight` and
  `katex` peers are only needed when importing `/preset`.

  Covered by a headless vitest suite that round-trips markdown for spoiler,
  inline/block math and the full preset.
