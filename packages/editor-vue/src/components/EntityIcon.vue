<script setup lang="ts">
// A type icon in entity chrome (the `/` menu, the toolbar type menu). The icon
// string is the host's: a URL / data: URI is an image; anything else is a NAME
// for the host's icon component (KUN_EDITOR_ICON / `icon-component`). With
// neither, a letter tile keeps the rows aligned.
import { computed, inject } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'

const props = defineProps<{ icon?: string; label: string }>()
const ctx = inject(KUN_EDITOR_CONTEXT, undefined)
const isUrl = computed(() => !!props.icon && /^(https?:|data:|\/|\.)/.test(props.icon))
const iconComponent = computed(() => ctx?.iconComponent)
</script>

<template>
  <span class="kun-entity-icon" aria-hidden="true">
    <img v-if="icon && isUrl" :src="icon" alt="" draggable="false" />
    <component :is="iconComponent" v-else-if="icon && iconComponent" :name="icon" />
    <span v-else class="kun-entity-icon__letter">{{ label.trim().charAt(0) }}</span>
  </span>
</template>
