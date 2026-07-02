import { defineNuxtModule, addComponent, createResolver } from '@nuxt/kit'

// KunEditor Nuxt layer. <KunEditor> itself lives in the framework-agnostic,
// headless @kungal/editor-vue; this layer registers it as a Nuxt auto-import so
// downstream templates use `<KunEditor>` with no import (and Nuxt generates its
// types, keeping the tag type-checked in consumer templates).
//
// It also ships <KunEditorToolbar>: the KunUI-built toolbar for <KunEditor>'s
// #toolbar slot. It belongs HERE (this layer already assumes @kungal/ui-nuxt),
// not in headless @kungal/editor-vue — so editor-vue stays UI-kit-free while the
// KunUI ecosystem gets native chrome. Same shape as TipTap's optional UI pkg.
export default defineNuxtConfig({
  modules: [
    defineNuxtModule({
      meta: { name: 'kun-editor-components' },
      setup() {
        const { resolve } = createResolver(import.meta.url)
        addComponent({
          name: 'KunEditor',
          export: 'KunEditor',
          filePath: '@kungal/editor-vue'
        })
        addComponent({
          name: 'KunEditorToolbar',
          filePath: resolve('./runtime/KunEditorToolbar.vue')
        })
      }
    })
  ],

  // Under `nuxt dev`, Milkdown's markdown tokenizer (micromark) resolves to its
  // DEV build, which does `import debug from 'debug'`. `debug` is CommonJS, so
  // unless Vite pre-bundles it, its browser.js is served raw with no `default`
  // export and the editor throws at load:
  //   SyntaxError: … 'debug' does not provide an export named 'default'
  //   (create-tokenizer.js)
  // which also aborts app init. Whether it fires is non-deterministic per app —
  // it depends on whether Vite's dep scan reaches the editor before it evaluates
  // (the docs happens to get auto-scanned; other consumers don't). So pin it
  // HERE, in the layer: force-including the editor/milkdown ENTRY points makes
  // esbuild pre-bundle their whole subgraph and resolve micromark's CJS `debug`
  // INSIDE the bundle. Merged into every consumer that extends this layer, so no
  // app configures it. Dev-only: the prod build strips micromark's debug calls.
  //
  // NB: include the resolvable ENTRY points, not `'debug'` — under pnpm's
  // non-hoisted layout `debug` isn't resolvable from the app root, so Vite would
  // silently skip it. Unresolvable entries below are skipped too (harmless).
  vite: {
    optimizeDeps: {
      include: [
        '@kungal/editor-vue',
        '@kungal/editor-core',
        '@kungal/editor-core/preset',
        '@milkdown/kit/preset/commonmark',
        '@milkdown/kit/preset/gfm'
      ]
    }
  }
})

// NOTE: this layer does NOT own a Tailwind entry or import editor styles. The
// consuming app owns one stylesheet and adds `@kungal/editor-vue/style.css`
// alongside its @kungal/ui-tokens + @kungal/ui-vue setup — the @source scan
// path is node_modules-layout-specific, so only the app can write it. It also
// assumes @kungal/ui-nuxt is already extended: <KunEditorToolbar> (and the
// reference editor styles) render KunUI chrome. See this package's README.
