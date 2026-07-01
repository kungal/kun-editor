# @kungal/editor-core

The **framework-agnostic core** of KunEditor. Pure TypeScript — no Vue, no
React. It owns the Milkdown/ProseMirror mechanism (nodes, marks, input rules,
keymaps, markdown (de)serialization, plugin wiring) and exposes it through
small **adapter contracts** the host fills in.

Ships dual ESM/CJS with type declarations.

## The one idea

> **The editor ships the mechanism; the host injects the policy.**

The editor does not know where an image upload goes, how an `@mention` resolves
to a user, what stickers exist, or how a toast is shown. Those are per-host
*policy*, passed in as adapters:

```ts
import type { KunEditorAdapters } from '@kungal/editor-core'

const adapters: KunEditorAdapters = {
  uploadImage: (file) => api.uploadTopicImage(file),   // → Promise<url>
  searchMentionUsers: (q) => oauth.searchUsers(q),     // → Promise<MentionUser[]>
  notify: (msg, level) => toast(msg, level),
}
```

Omit an adapter and the matching plugin simply isn't wired — that is how the
"image-free" editor (galgame 简介) is expressed: no `uploadImage`, no upload/
paste/sticker paths, no special-casing.

## What's here today

| Export | Purpose |
| --- | --- |
| `KunEditorAdapters` | the policy bundle a host passes (`uploadImage` / `searchMentionUsers` / `stickerSource` / `notify`) |
| `UploadImage`, `SearchMentionUsers`, `StickerSource`, `Notify` | the individual adapter function types |
| `MentionUser`, `StickerItem`, `StickerPack` | the data shapes crossing the boundary |
| `KunEditorFeatures`, `KunEditorLocale` | feature toggles + UI language |
| `MENTION_SCHEME` (`kungal-user:`) | the markdown link scheme shared with the server |

The Milkdown plugin ports land incrementally — see
[`../../docs/architecture.md`](../../docs/architecture.md) § migration.

## The `/preset` subpath — the Milkdown plugins

The main entry above is deliberately **light**: types + `MENTION_SCHEME`, zero
runtime deps, so the server can import the `@mention` scheme without installing
Milkdown. The actual Milkdown plugins live behind a separate subpath that pulls
in the peers:

```ts
import { createKunEditorPlugins } from '@kungal/editor-core/preset'

// The single call the render layer makes — assembles the Milkdown baseline
// (commonmark/gfm/history/listener/clipboard/indent/trailing) with the KunEditor
// plugins, wiring each optional one only when its feature/adapter is present.
editor.use(createKunEditorPlugins(adapters, features, { locale: 'zh-cn' }))
```

Landed so far — each a **factory**, never a module-level singleton bound to one
host:

**P1** (pure — no host policy):

| Export (from `/preset`) | Syntax / behaviour |
| --- | --- |
| `createSpoilerPlugin()` | `\|\|hidden\|\|` inline node + `$remark` round-trip |
| `createKatexPlugins()` | inline `$…$` and block `$$…$$` LaTeX (KaTeX) |
| `createCodeBlockPlugins(opts)` | CodeMirror code block: theme, languages, toolbar, `latex` preview |
| `createStopLinkPlugin()` | Space clears the active link mark |

**P2** (adapter-driven):

| Export (from `/preset`) | Syntax / behaviour | Host policy |
| --- | --- | --- |
| `createUploadPlugin(uploadImage, opts)` | paste / drop / toolbar image upload | `uploadImage(file) → url` (+ optional `notify`) |
| `createMentionPlugin()` | `[@name](kungal-user:id)` mention atom | schema is pure; the `@` dropdown (P3) uses `searchMentionUsers` |
| `createQuotePlugin()` | `[label](kungal-reply:refId)` inline reference atom | host inserts via `insertQuoteCommand({ refId, label })` |

Stickers have **no core plugin** — a sticker is a plain image node, so the picker
is a render-layer view (P3) that reads the `stickerSource` adapter and inserts an
image. The `<KunEditor>` Vue component + toolbar + plugin views land in P3.

## Peer dependencies (and why)

`@milkdown/kit` and `@milkdown/prose` are **peer** dependencies, not bundled.
ProseMirror MUST resolve to a single runtime instance — a second
`prosemirror-model` copy silently breaks schema/node identity. Keeping Milkdown
as a peer means the host owns the one copy. `katex`, `codemirror`, the
`@codemirror/*` packages and `@lezer/highlight` are **optional** peers, needed
only if you enable the katex / code-block plugins (i.e. import `/preset`).

## Build & test

```bash
pnpm --filter @kungal/editor-core build      # tsup → dist (esm + cjs + d.ts)
pnpm --filter @kungal/editor-core typecheck
pnpm --filter @kungal/editor-core test       # vitest — headless markdown round-trip
```
