---
'@kungal/editor-nuxt': minor
---

The Nuxt layer now preconfigures Vite's dev dependency optimizer, so consumers
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
