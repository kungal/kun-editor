import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Library build: compile the .vue components to JS up front so any consumer's
// bundler can use them without transpiling .vue inside node_modules (Vite does
// NOT process .vue in deps by default). Types are emitted by vue-tsc separately
// (see the build script).
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      // Externalize the framework, the whole Milkdown/ProseMirror stack, and
      // @kungal/* siblings so they are deduped by the consumer's node_modules —
      // never inlined. A second ProseMirror copy would break node identity.
      // CSS is the one exception: never externalize it, or a bare
      // `import 'pkg/x.css'` would survive into dist/index.js and Nuxt SSR would
      // hand that path to Node → "Unknown file extension .css".
      external: (id) => {
        if (id.endsWith('.css')) return false
        return (
          id === 'vue' ||
          id.startsWith('@milkdown/') ||
          id.startsWith('@prosemirror-adapter/') ||
          id.startsWith('@kungal/')
        )
      },
    },
  },
})
