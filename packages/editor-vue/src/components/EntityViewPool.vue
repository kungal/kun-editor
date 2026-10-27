<script setup lang="ts">
// Renders the host's entity components for the pool (see ../entity-pool): one
// Teleport per slot into the slot's container, which whichever node view holds
// the slot has adopted. Lives in <KunEditor>, outside ProseMirror, so node
// views coming and going never unmount a component that still has a slot.
import type { EntityPool } from '../entity-pool'
import type { KunEntityView } from '../types'

defineProps<{ pool: EntityPool; view: KunEntityView }>()
</script>

<template>
  <template v-for="slot in pool.slots" :key="slot.id">
    <Teleport :to="slot.container">
      <component
        :is="slot.display === 'card' ? view.card : view.chip"
        :entity="slot.entity"
        :selected="slot.selected"
      />
    </Teleport>
  </template>
</template>
