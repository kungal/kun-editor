<script setup lang="ts">
// KunUI view switch for <KunEditor>'s #view-switch slot — 预览 / Markdown / 分栏
// as a real <KunTab variant="underlined"> (keyboard nav, sliding indicator, a11y),
// plus a swap button in split mode. Same pattern as <KunEditorToolbar>: it lives
// in this ui-nuxt-assuming layer (not headless editor-vue) and is driven purely
// by the slot API.
//
//   <KunEditor v-model="md">
//     <template #view-switch="s"><KunEditorViewSwitch v-bind="s" /></template>
//   </KunEditor>
//
// KunTab / KunButton / KunIcon are auto-imported by @kungal/ui-nuxt.
import { computed } from 'vue'
import type { KunEditorViewSwitchApi } from '@kungal/editor-vue'

const props = defineProps<KunEditorViewSwitchApi>()

// Only the offered views (from the `views` prop). Hidden entirely for one view.
const items = computed(() =>
  props.views.map((v) => ({ value: v, textValue: props.labels[v] }))
)

const onChange = (value: string) => {
  props.setMode(
    value === 'source' ? 'source' : value === 'split' ? 'split' : 'wysiwyg'
  )
}
</script>

<template>
  <!-- Hidden entirely when only one view is offered (e.g. a reply box). -->
  <div v-if="views.length > 1" class="flex items-center gap-1">
    <KunTab
      :model-value="mode"
      :items="items"
      variant="underlined"
      color="primary"
      size="sm"
      @update:model-value="onChange"
    />
    <template v-if="mode === 'split'">
      <KunButton
        variant="light"
        size="sm"
        :is-icon-only="true"
        :aria-label="labels.swap"
        @click="swap()"
      >
        <KunIcon name="lucide:arrow-left-right" />
      </KunButton>
      <KunButton
        :variant="scrollSync ? 'flat' : 'light'"
        :color="scrollSync ? 'primary' : 'default'"
        size="sm"
        :is-icon-only="true"
        :aria-label="labels.scrollSync"
        :aria-pressed="scrollSync"
        @click="toggleScrollSync()"
      >
        <KunIcon :name="scrollSync ? 'lucide:link' : 'lucide:unlink'" />
      </KunButton>
    </template>
  </div>
</template>
