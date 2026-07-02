<script setup lang="ts">
// KunUI view switch for <KunEditor>'s #view-switch slot — the Preview/Markdown
// tabs as a real <KunTab variant="underlined"> (keyboard nav, sliding indicator,
// a11y). Same pattern as <KunEditorToolbar>: it lives in this ui-nuxt-assuming
// layer (not headless editor-vue) and is driven purely by the slot API.
//
//   <KunEditor v-model="md">
//     <template #view-switch="s"><KunEditorViewSwitch v-bind="s" /></template>
//   </KunEditor>
//
// KunTab is auto-imported by @kungal/ui-nuxt in the consuming app.
import { computed } from 'vue'
import type { KunEditorViewSwitchApi } from '@kungal/editor-vue'

const props = defineProps<KunEditorViewSwitchApi>()

const items = computed(() => [
  { value: 'wysiwyg', textValue: props.labels.wysiwyg },
  { value: 'source', textValue: props.labels.source }
])

const onChange = (value: string) => {
  props.setMode(value === 'source' ? 'source' : 'wysiwyg')
}
</script>

<template>
  <KunTab
    :model-value="mode"
    :items="items"
    variant="underlined"
    color="primary"
    size="sm"
    @update:model-value="onChange"
  />
</template>
