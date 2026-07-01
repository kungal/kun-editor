<script setup lang="ts">
import { ref } from 'vue'
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
// editor-vue is zero-style; this bare dev harness stays unstyled on purpose.
// The styled reference lives in the docs site (apps/docs).

const markdown = ref('Hello **world** — type `@a` to test @mentions.\n')

// Mock host policy: a fake user search adapter for the @mention dropdown.
const searchMentionUsers: KunEditorAdapters['searchMentionUsers'] = async (
  query
) => {
  const all = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Alicia' },
    { id: 3, name: 'Bob' },
    { id: 42, name: 'Kun' }
  ]
  return all.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  )
}

// Mock sticker source for the picker's 贴纸 tab (data URLs so no network).
const dot = (color: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><circle cx='32' cy='32' r='28' fill='${color}'/></svg>`
const stickerSource: KunEditorAdapters['stickerSource'] = () => [
  {
    name: 'Demo',
    stickers: [
      { src: dot('%23f43f5e'), name: 'red' },
      { src: dot('%233b82f6'), name: 'blue' },
      { src: dot('%2322c55e'), name: 'green' },
      { src: dot('%23eab308'), name: 'yellow' }
    ]
  }
]

const adapters: KunEditorAdapters = { searchMentionUsers, stickerSource }
</script>

<template>
  <div style="max-width: 640px; margin: 2rem auto; font-family: sans-serif">
    <h1 style="font-size: 1.2rem">KunEditor Playground</h1>
    <KunEditor v-model="markdown" :adapters="adapters" />
    <h2 style="font-size: 0.9rem; margin-top: 1.5rem">v-model markdown:</h2>
    <pre
      id="md-output"
      style="background: #f4f4f5; padding: 0.75rem; border-radius: 0.5rem; white-space: pre-wrap"
      >{{ markdown }}</pre
    >
  </div>
</template>
