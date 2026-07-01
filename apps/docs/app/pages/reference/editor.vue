<script setup lang="ts">
// Props table is generated from <KunEditor>'s TypeScript types (see
// scripts/gen-meta.mjs → app/generated/component-meta.json), so it can't drift.
import meta from '~/generated/component-meta.json'

const props = meta.KunEditor.props

const emits = [
  { name: 'update:modelValue', type: '(markdown: string) => void', description: '内容变化时触发(v-model)。' }
]

const usage = `<script setup lang="ts">
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
import '~/assets/kun-editor.css'

const markdown = ref('')
const adapters: KunEditorAdapters = { /* … */ }
<\/script>

<template>
  <KunEditor
    v-model="markdown"
    :adapters="adapters"
    :features="{ quote: true }"
    locale="zh-cn"
    :readonly="false"
  />
<\/template>`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">用法</h2>
    <Code :code="usage" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">Props</h2>
    <PropsTable :rows="props" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">Emits</h2>
    <PropsTable head="事件" :rows="emits" />

    <p class="text-default-500 mt-6 text-sm">
      来自 <code>@kungal/editor-vue</code>。类型 <code>KunEditorAdapters</code> /
      <code>KunEditorFeatures</code> / <code>KunEditorLocale</code> 从
      <code>@kungal/editor-core</code> 重导出。
    </p>
  </article>
</template>
