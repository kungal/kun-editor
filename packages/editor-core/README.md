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

The Milkdown plugin ports (`createKunEditorPlugins`, spoiler, mention, upload,
katex, code-block, stop-link) land incrementally — see
[`../../docs/architecture.md`](../../docs/architecture.md) § migration.

## Peer dependencies (and why)

`@milkdown/kit` and `@milkdown/prose` are **peer** dependencies, not bundled.
ProseMirror MUST resolve to a single runtime instance — a second
`prosemirror-model` copy silently breaks schema/node identity. Keeping Milkdown
as a peer means the host owns the one copy. `katex`, `codemirror` and the
`@codemirror/*` packages are **optional** peers, needed only if you enable the
katex / code-block plugins.

## Build

```bash
pnpm --filter @kungal/editor-core build      # tsup → dist (esm + cjs + d.ts)
pnpm --filter @kungal/editor-core typecheck
```
