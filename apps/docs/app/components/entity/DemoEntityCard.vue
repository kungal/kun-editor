<script setup lang="ts">
// A demo host card for <KunEditor :entity-view>. Fetches its own preview and
// reserves its final height up front, so nothing moves when the preview lands.
import type { KunEntityViewProps } from '@kungal/editor-vue'

const props = defineProps<KunEntityViewProps>()
const preview = ref<{ title: string; subtitle: string } | null>(null)
watch(
  () => `${props.entity.type}:${props.entity.id}`,
  () => {
    preview.value = null
    void mockEntityPreview(props.entity.type, props.entity.id).then((p) => {
      preview.value = p
    })
  },
  { immediate: true }
)
</script>

<template>
  <a
    :href="entity.url"
    class="border-default-200 bg-content1 rounded-kun-lg flex h-16 items-center gap-3 border px-4"
  >
    <span class="bg-primary/15 text-primary rounded-kun-md px-2 py-0.5 text-xs">{{ entity.type }}</span>
    <span class="min-w-0">
      <span class="block truncate font-medium">{{ preview?.title ?? '…' }}</span>
      <span class="text-default-500 block truncate text-xs">{{ preview?.subtitle ?? entity.url }}</span>
    </span>
  </a>
</template>
