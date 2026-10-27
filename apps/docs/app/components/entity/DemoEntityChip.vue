<script setup lang="ts">
// A demo host chip for <KunEditor :entity-view>.
import type { KunEntityViewProps } from '@kungal/editor-vue'

const props = defineProps<KunEntityViewProps>()
const title = ref('')
watch(
  () => `${props.entity.type}:${props.entity.id}`,
  () => {
    title.value = ''
    void mockEntityPreview(props.entity.type, props.entity.id).then((p) => {
      title.value = p.title
    })
  },
  { immediate: true }
)
</script>

<template>
  <a
    :href="entity.url"
    class="bg-primary/10 text-primary rounded-kun-md px-1.5 py-0.5 text-[0.9em]"
  >{{ title || `${entity.type} #${entity.id}` }}</a>
</template>
