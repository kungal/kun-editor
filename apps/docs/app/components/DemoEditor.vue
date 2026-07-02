<script setup lang="ts">
// A live <KunEditor> demo with a v-model output panel — the reusable building
// block for the plugin + guide pages. Client-only: Milkdown needs a DOM, so it
// mounts on the client (SSR/prerender renders the fallback).
import { ref } from 'vue'
import { KunEditor } from '@kungal/editor-vue'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    adapters?: KunEditorAdapters
    features?: KunEditorFeatures
    locale?: KunEditorLocale
    readonly?: boolean
    /** Show the raw markdown v-model under the editor. Default: true. */
    output?: boolean
    /** Fill the #toolbar slot with the KunUI <KunEditorToolbar> (editor-nuxt). */
    kunuiToolbar?: boolean
  }>(),
  {
    modelValue: '',
    adapters: () => ({}),
    features: () => ({}),
    locale: 'zh-cn',
    readonly: false,
    output: true,
    kunuiToolbar: false
  }
)

const md = ref(props.modelValue)
</script>

<template>
  <div
    class="border-default-200 rounded-kun-lg my-5 overflow-hidden border"
  >
    <div class="bg-content1/60 p-4">
      <ClientOnly>
        <KunEditor
          v-model="md"
          :adapters="adapters"
          :features="features"
          :locale="locale"
          :readonly="readonly"
        >
          <template v-if="kunuiToolbar" #view-switch="s">
            <KunEditorViewSwitch v-bind="s" />
          </template>
          <template v-if="kunuiToolbar" #toolbar="api">
            <KunEditorToolbar v-bind="api" />
          </template>
        </KunEditor>
        <template #fallback>
          <div class="text-default-400 py-8 text-center text-sm">
            加载编辑器…
          </div>
        </template>
      </ClientOnly>
    </div>

    <div
      v-if="output"
      class="border-default-200 bg-content1/40 border-t"
    >
      <div class="text-default-500 px-3 py-1.5 text-xs">v-model markdown</div>
      <pre
        class="border-default-100 border-t px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap"
      >{{ md }}</pre>
    </div>
  </div>
</template>
