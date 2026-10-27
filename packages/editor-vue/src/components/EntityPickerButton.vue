<script setup lang="ts">
// The headless toolbar's entity button: a toolbar button + a panel holding
// <EntityPicker> (the same click-outside popover pattern as LinkInput). Focus
// moves into the picker's search box; ProseMirror keeps its selection across
// the blur, so the pick lands where the caret was — a card in an empty
// paragraph, a chip anywhere else — and focus goes back to the editor.
import { callCommand } from '@milkdown/kit/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { useInstance } from '@milkdown/vue'
import { insertEntityCommand } from '@kungal/editor-core/preset'
import type { EntityHit } from '@kungal/editor-core'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { entityLabels } from '../entity-shared'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'
import EntityPicker from './EntityPicker.vue'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const closeAndFocus = () => {
  open.value = false
  getEditor()?.action((c) => c.get(editorViewCtx).focus())
}

const onPick = (hit: EntityHit) => {
  getEditor()?.action(callCommand(insertEntityCommand.key, { ref: hit.ref }))
  closeAndFocus()
}

const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="kun-editor__entity">
    <button
      type="button"
      class="kun-editor__tool"
      :title="t.insert"
      :aria-label="t.insert"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="kun-editor__icon" v-html="I.entity" />
    </button>
    <div v-if="open" class="kun-editor__entity-panel">
      <EntityPicker
        :adapters="ctx?.adapters ?? {}"
        :locale="ctx?.locale"
        @pick="onPick"
        @close="closeAndFocus"
      />
    </div>
  </div>
</template>
