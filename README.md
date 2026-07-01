# KunEditor

A **Milkdown-based, headless Markdown editor** for the KUN Galgame ecosystem.
One editor brain, shared across every KUN app, instead of each re-implementing
the same Milkdown plugins.

> Status: **published (`0.9.0`).** The core plugins (P1), adapter-driven plugins
> (P2) and the Vue layer (P3 — dual WYSIWYG / markdown-source, toolbar, @mention
> dropdown, sticker/emoji picker, imperative insert API) are done and on npm.
> Next: **P4** — adopt in the forum. Docs + live playground:
> **[apps/docs](./apps/docs)** (`editor.kungal.com`). Roadmap in
> [`docs/architecture.md`](./docs/architecture.md).

## Why this exists

The forum (`kun-galgame-forum`) grew a capable Milkdown editor under
`apps/web/app/components/kun/milkdown/` — ~26 files: spoiler, @mention, reply
quotes, KaTeX, a CodeMirror code block, image upload, stickers, a dual
WYSIWYG/markdown-source view. moyu (`kun-galgame-patch`) and future apps need
the *same* editor, and today that means copy-paste and drift: duplicated
plugins, diverging bug fixes, no shared release.

KunEditor extracts that editor into published packages — exactly what
[`kun-ui`](https://github.com/kungal/kun-ui) did for components. The key move is
separating **mechanism from policy**: the editor owns the ProseMirror
nodes/marks/keymaps/serialization; each host injects small *adapters* for where
uploads go, how `@mentions` resolve, what stickers exist, how toasts show. See
[`docs/architecture.md`](./docs/architecture.md).

## Packages

| Package | What | State |
| --- | --- | --- |
| [`@kungal/editor-core`](./packages/editor-core) | framework-agnostic Milkdown plugin bundle + adapter contracts (no Vue/React) | ✅ P1+P2 — spoiler / katex / code-block / stop-link / mention / upload / quote |
| [`@kungal/editor-vue`](./packages/editor-vue) | Vue 3 `<KunEditor>` (dual WYSIWYG / markdown-source, headless) | ✅ P3 — toolbar, @mention dropdown, sticker/emoji picker, imperative insert API |
| [`@kungal/editor-nuxt`](./packages/editor-nuxt) | Nuxt Layer (auto-imports `<KunEditor>`) | ✅ layer |

```
@kungal/editor-core   Milkdown plugins + adapter types   ← the brain (portable)
@kungal/editor-vue    Vue 3 <KunEditor> render layer     ← headless, CSS-var themed
@kungal/editor-nuxt   thin Nuxt Layer over editor-vue    ← Nuxt auto-import sugar
```

`editor-core` never imports Vue; a future `@kungal/editor-react` could sit
beside `editor-vue` and share the exact same plugin brain. The core has a **light
main entry** (types + `MENTION_SCHEME` / `QUOTE_SCHEME`, zero runtime deps — safe
for the server) and a heavier `@kungal/editor-core/preset` that carries the
Milkdown plugins.

## What's inside

- **Dual view** — Milkdown WYSIWYG + a CodeMirror markdown-source tab over one
  `v-model`.
- **Plugins** — `||spoiler||`, KaTeX (`$…$` / `$$…$$`), CodeMirror code blocks,
  `@mention`, image upload, sticker/emoji, inline reply-quote. Each a factory
  over its adapter, never a host-bound singleton.
- **Headless** — `editor-vue` ships **zero CSS**, only stable class hooks; style
  it with the reference [`kun-editor.css`](./apps/docs/app/assets/css/kun-editor.css)
  (themed with KunUI tokens) or your own.
- **Imperative API** — a `<KunEditor>` ref exposes `insertQuote` / `insertMention`
  / `focus` for cursor-level inserts (the forum's 「引用」 flow).

## Install & use

Plain Vue:

```bash
pnpm add @kungal/editor-vue @kungal/editor-core vue \
  @milkdown/kit @milkdown/prose @milkdown/vue
```

```vue
<script setup lang="ts">
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
// editor-vue is HEADLESS (ships no CSS). Give it a look with your own
// stylesheet — copy the reference `kun-editor.css` from the docs site
// (apps/docs), which themes it with KunUI tokens.
import '~/assets/kun-editor.css'

const markdown = ref('')
const adapters: KunEditorAdapters = {
  uploadImage: (file) => api.uploadTopicImage(file),
  searchMentionUsers: (q) => oauth.searchUsers(q)
}
</script>

<template>
  <KunEditor v-model="markdown" :adapters="adapters" />
</template>
```

Nuxt: `extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt']`, then use
`<KunEditor>` with no import. Full setup in
[`docs/INTEGRATION.md`](./docs/INTEGRATION.md).

## Develop

```bash
pnpm install
pnpm build                                  # build all packages
pnpm typecheck                              # typecheck all packages
pnpm --filter @kungal/editor-core test      # headless markdown round-trip tests
pnpm --filter @kungal/editor-docs dev       # run the docs site + live playground
```

Requires Node ≥ 20 and pnpm 10. Uses [changesets](./.changeset) for versioning
(the three packages move in lockstep) and OIDC trusted publishing — see
[`docs/RELEASING.md`](./docs/RELEASING.md). The docs site ships as a GHCR image
(`docker/docs.Dockerfile` + `.github/workflows/docs-image.yml`).

## Ownership

This project belongs to the **kungal** organization (published under the
`@kungal` npm scope, AGPL-3.0-only), alongside `kun-ui`. It is not tied to any
one downstream app.
