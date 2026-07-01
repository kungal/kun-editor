<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import { getPageMeta, site } from '~/site.config'

const route = useRoute()
const description = computed(
  () => getPageMeta(route.path)?.description ?? site.description
)
</script>

<template>
  <p class="text-default-600 mt-3 text-lg">{{ description }}</p>
</template>
