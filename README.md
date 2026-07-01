# KunEditor

A **Milkdown-based Markdown editor** for the KUN Galgame ecosystem. One editor
brain, shared across every KUN app, instead of each re-implementing the same
Milkdown plugins.

> Status: **P0 scaffold.** The monorepo, publishing pipeline and the public
> contract (`@kungal/editor-core` adapter types + `<KunEditor>` prop surface)
> are in place. The Milkdown plugin ports land incrementally — see
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
| [`@kungal/editor-core`](./packages/editor-core) | framework-agnostic Milkdown plugin bundle + adapter contracts (no Vue/React) | 🟡 scaffold — contracts landed, plugin ports in progress |
| [`@kungal/editor-vue`](./packages/editor-vue) | Vue 3 `<KunEditor>` component (dual WYSIWYG / markdown-source) | 🟡 scaffold — prop surface stable, wiring in progress |
| [`@kungal/editor-nuxt`](./packages/editor-nuxt) | Nuxt Layer (auto-imports `<KunEditor>`) | 🟡 scaffold |

```
@kungal/editor-core   Milkdown plugins + adapter types   ← the brain (portable)
@kungal/editor-vue    Vue 3 <KunEditor> render layer     ← Vue chrome (on @kungal/ui-vue)
@kungal/editor-nuxt   thin Nuxt Layer over editor-vue    ← Nuxt auto-import sugar
```

`editor-core` never imports Vue; a future `@kungal/editor-react` could sit
beside `editor-vue` and share the exact same plugin brain.

## Use it (once published)

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
pnpm build       # build all packages
pnpm typecheck   # typecheck all packages
```

Requires Node ≥ 20 and pnpm 10. Uses [changesets](./.changeset) for versioning
(the three packages move in lockstep) and OIDC trusted publishing — see
[`docs/RELEASING.md`](./docs/RELEASING.md).

## Ownership

This project belongs to the **kungal** organization (published under the
`@kungal` npm scope, AGPL-3.0-only), alongside `kun-ui`. It is not tied to any
one downstream app.
