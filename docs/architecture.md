# KunEditor architecture

## The problem

The forum's Milkdown editor (`kun-galgame-forum` →
`apps/web/app/components/kun/milkdown/`, ~26 files / ~3.7k lines) is good, but
it is welded to the forum:

- image upload calls `kunFetch('/image/topic')` directly (`plugins/upload/uploader.ts`);
- `@mention` autocomplete hits the OAuth `/users/search` endpoint;
- toasts go through `useMessage(10107, …)` (`plugins/menu/Menu.vue`);
- the reply-quote plugin is typed against the forum's `ReplyReference`
  (`~/store/types/topic/reply`);
- the chrome is built from KunUI components (`KunButton`, `KunIcon`, `KunPopover`, …).

moyu and future apps want the *same* editor. Copy-paste means duplicated plugins
and diverging fixes. KunEditor extracts the editor into published `@kungal/*`
packages, the same way `kun-ui` extracted components.

## The one principle: mechanism vs policy

> **The editor ships the mechanism; the host injects the policy.**

- **Mechanism** (KunEditor owns): the ProseMirror schema (nodes/marks), input
  rules, keymaps, markdown parse/serialize, the plugin wiring, the dual
  WYSIWYG/source view, the toolbar UI.
- **Policy** (the host injects): *where* an image upload goes, *how* an
  `@mention` resolves to a user, *what* stickers exist, *how* a toast is shown.

Policy is passed as a small `KunEditorAdapters` bundle
(`packages/editor-core/src/types.ts`). Every field is optional; **what's present
decides which plugins wire up.** The forum's "image-free" editor (galgame 简介)
stops being a special `disableImage` flag threaded through three components and
becomes simply *"no `uploadImage` adapter"*.

This is the single thing the forum version got wrong for reuse: its plugins are
module-level singletons bound to forum endpoints. In KunEditor every plugin is a
**factory over an adapter** — `createUploadPlugin(uploadImage)`, never a
top-level `kunUploader` that closes over `kunFetch`.

## Package layout

```
@kungal/editor-core   pure TS: Milkdown plugins + adapter contracts   ← the brain
@kungal/editor-vue    Vue 3 <KunEditor> on @milkdown/vue + @kungal/ui-vue
@kungal/editor-nuxt   thin Nuxt Layer (auto-import <KunEditor>)
```

Mirrors `kun-ui`'s `core → vue → nuxt` split so a future
`@kungal/editor-react` can reuse `editor-core` unchanged. `editor-core` must
never import Vue.

## The singleton rule (why Milkdown is a peer dependency)

ProseMirror **must** resolve to a single runtime copy. Two `prosemirror-model`
instances produce two distinct `Schema`/`NodeType` identities, and node
comparisons silently fail (a node created by one copy isn't recognized by the
other). So `@milkdown/kit`, `@milkdown/prose` and `@milkdown/vue` are
**peerDependencies** of the KunEditor packages, and are marked `external` in the
`tsup`/`vite` builds — never bundled. The host installs the Milkdown stack once;
KunEditor binds to that one copy. `.npmrc` keeps `shamefully-hoist=false` so an
accidental second copy surfaces as a resolution error, not a heisenbug.

`katex`, `codemirror` and `@codemirror/*` are **optional** peers, needed only
when the katex / code-block plugins are enabled.

## Plugin inventory & coupling

Ported from the forum, each with the adapter it needs (✅ pure = no host policy):

| Plugin | Forum source | Host policy → adapter |
| --- | --- | --- |
| spoiler `\|\|text\|\|` | `plugins/spoiler/spoilerPlugin.ts` | ✅ pure |
| stop-link keymap | `plugins/stop-link/stopLinkPlugin.ts` | ✅ pure |
| KaTeX (inline/block + input rules + remark) | `plugins/katex/*` | ✅ pure (peer: `katex`) |
| code block (CodeMirror) | `plugins/code/*`, `codemirror/*` | ✅ pure (peers: `codemirror`, `@codemirror/*`); labels via `locale` |
| `@mention` atom | `plugins/mention/*` | `searchMentionUsers(q)` → `MentionUser[]` |
| image upload (paste/drop/toolbar) | `plugins/upload/uploader.ts` | `uploadImage(file)` → `url` |
| sticker / emoji picker | `plugins/sticker/*`, `plugins/emoji/*` | `stickerSource()` → `StickerPack[]` |
| reply quote | `plugins/quote/quotePlugin.ts` | host-supplied reference (see below) |
| toolbar / menu | `plugins/menu/*`, `plugins/header/*` | `notify(msg, level)` for user notices |

The `@mention` markdown form — `[@name](kungal-user:<id>)` — is shared with the
server, so the scheme string lives in core as `MENTION_SCHEME`, not buried in
the plugin.

### The reply-quote question

`quote` is the least generic plugin: it encodes "an inline reference to reply
`#floor` by `@author`", a forum concept. Options, to decide when porting:

1. Keep it in `editor-core` but generalize the node attrs to an opaque
   `{ refId, label }` the host supplies — the editor renders the atom, the host
   owns what a reference *means*.
2. Ship it as an optional plugin the host explicitly enables with its own
   reference type.

**Decided (P2): option 1.** The mechanism (a non-editable inline atom with a
stable trailing caret — see the trailing-space fix in the forum's `Editor.vue
insertReference`) is genuinely reusable; only the label/target is host-specific.
`createQuotePlugin()` ships a `quote` node with opaque `{ refId, label }` attrs;
the host inserts one via `insertQuoteCommand({ refId, label })` and owns what the
reference means. Markdown form: `[label](kungal-reply:<refId>)`.

## Migration plan (incremental, forum stays the reference)

The forum keeps its working in-repo editor until each piece is proven in
KunEditor — no big-bang cutover.

- **P0 — scaffold. ✅ done.** Monorepo, three package skeletons, publish
  pipeline, adapter contracts, `<KunEditor>` prop surface. Textarea fallback
  keeps `v-model` live so hosts can integrate against the real contract now.
- **P1 — core, pure plugins. ✅ done.** Ported spoiler, stop-link, katex,
  code-block into `editor-core` behind `createKunEditorPlugins(adapters,
  features, options)`, exposed from the `@kungal/editor-core/preset` subpath
  (the light main entry stays peer-free for the server). No adapters needed →
  lowest risk. Headless vitest round-trips markdown for `||spoiler||`, inline
  `$…$` and block `$$…$$`, plus the full preset. Each plugin is a factory
  (`createXxxPlugin`), never a host-bound singleton.
- **P2 — adapter plugins. ✅ done.** Ported upload
  (`createUploadPlugin(uploadImage)` — the forum's `kunFetch('/image/topic')`
  becomes the injected adapter), the mention schema (`createMentionPlugin()`,
  pure round-trip; the `@` dropdown that uses `searchMentionUsers` is a P3 view),
  and quote (`createQuotePlugin()`) generalized per option 1 — the forum's
  `{ replyId, floor }` is now an opaque `{ refId, label }` the host supplies via
  `insertQuoteCommand`. Sticker needs no core plugin: a sticker is a plain image
  node, so its picker is a P3 view over the `stickerSource` adapter.
  `createKunEditorPlugins` gates upload on the adapter, mention on by default,
  quote opt-in. Covered by headless round-trip + uploader tests.
- **P3 — Vue layer. 🚧 in progress.** `<KunEditor>` now renders a real Milkdown
  dual-view editor (WYSIWYG from `createKunEditorPlugins` + a markdown-source
  view) over one `v-model`, replacing the P0 textarea — ported from the forum's
  `DualEditorProvider` + `Editor.vue`, minus the forum-specific flags (now
  adapters/features). The per-instance view state fixes the forum's module-level
  `activeTab` singleton. The `@mention` autocomplete dropdown is wired too — a
  slash view over the `searchMentionUsers` adapter, injected from `<KunEditor>`
  (an ancestor of the adapter provider, since @prosemirror-adapter/vue renders
  plugin views as portal siblings of the editor). Verified end-to-end in a
  browser via `apps/playground`. Still to port (they build on `@kungal/ui-vue`):
  the formatting toolbar, the sticker/emoji picker, and the CodeMirror source
  view (currently a `<textarea>`).
- **P4 — adopt in the forum.** Replace `components/kun/milkdown` with
  `@kungal/editor-nuxt`, passing the forum's real adapters (`/image/topic`
  upload, OAuth mention search, `useMessage` notify). Delete the in-repo copy
  once parity is verified. moyu adopts next.
- **P5 (maybe) — React layer.** `@kungal/editor-react` on the same
  `editor-core`.

## Non-goals

- Not a general-purpose CMS editor — it targets the KUN ecosystem's markdown
  needs (the plugin set above), not arbitrary extensibility.
- Not re-authoring Milkdown — KunEditor is a curated, adapter-driven bundle *on
  top of* Milkdown, not a fork.
- `editor-core` will not grow a Vue/React import to save a few lines; the
  framework-agnostic boundary is the whole point.
