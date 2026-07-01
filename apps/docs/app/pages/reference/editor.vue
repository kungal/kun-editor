<script setup lang="ts">
const props = [
  { name: 'modelValue', type: 'string', required: true, description: 'v-model 绑定的 markdown 字符串。' },
  { name: 'adapters', type: 'KunEditorAdapters', default: '{}', description: '宿主策略:uploadImage / searchMentionUsers / stickerSource / notify。' },
  { name: 'features', type: 'KunEditorFeatures', default: '{}', description: '可选插件开关(见功能开关页)。' },
  { name: 'locale', type: "'zh-cn' | 'en-us' | string", default: "'zh-cn'", description: '工具栏标签 / 占位文案的语言。' },
  { name: 'readonly', type: 'boolean', default: 'false', description: '只读渲染:不可编辑、隐藏格式化工具栏。' }
]

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
