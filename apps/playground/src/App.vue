<script setup lang="ts">
import { ref } from 'vue'
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
import '@kungal/editor-vue/style.css'

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

const adapters: KunEditorAdapters = { searchMentionUsers }
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
