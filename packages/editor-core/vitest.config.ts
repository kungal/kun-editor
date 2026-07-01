import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Milkdown creates a real ProseMirror EditorView, and the katex node's toDOM
    // renders into the DOM — so the round-trip tests need a DOM. jsdom is enough
    // (no layout required for parse → doc → serialize).
    environment: 'jsdom',
    include: ['test/**/*.test.ts']
  }
})
