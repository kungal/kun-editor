<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import { displayLabel } from '~/site.config'

const route = useRoute()
const label = computed(() => displayLabel(route.path))
</script>

<template>
  <h1 class="text-3xl font-bold tracking-tight">{{ label }}</h1>
</template>
