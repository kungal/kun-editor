<script setup lang="ts">
// The formatting toolbar — the central WYSIWYG chrome. Ported from the forum's
// Menu.vue + _buttonList.ts, made self-contained: plain buttons + inline SVG
// (no @kungal/ui-vue hard dep), themed via CSS vars so a KunUI host still gets
// consistent colours.
//
// Must live inside <MilkdownProvider> (KunEditor.vue places it there): it uses
// useInstance() to reach the editor created by <MilkdownEditor> and fires
// commands via callCommand. Command `.key`s are populated once the editor is
// created, so we read them at click time (never at module load).
import { callCommand } from '@milkdown/kit/utils'
import { useInstance } from '@milkdown/vue'
import {
  createCodeBlockCommand,
  insertHrCommand,
  insertImageCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import {
  insertKunSpoilerCommand,
  toggleLatexCommand
} from '@kungal/editor-core/preset'
import type { CmdKey } from '@milkdown/kit/core'
import { computed, inject, ref } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'
import StickerPicker from './StickerPicker.vue'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const uploadImage = computed(() => ctx?.adapters.uploadImage)
const notify = () => ctx?.adapters.notify
// The emoji/sticker picker (emoji is built-in; the sticker tab needs the
// adapter). Shown unless the host turns the feature off.
const showPicker = computed(() => ctx?.features.sticker !== false)
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)

const call = <T,>(key: CmdKey<T>, payload?: T) => {
  getEditor()?.action(callCommand(key, payload))
}

interface ToolButton {
  svg: string
  title: string
  run: () => void
}

const t = computed(() => {
  const en = isEnglish.value
  return {
    bold: en ? 'Bold' : '加粗',
    italic: en ? 'Italic' : '斜体',
    strike: en ? 'Strikethrough' : '删除线',
    code: en ? 'Inline code' : '行内代码',
    h1: en ? 'Heading 1' : '一级标题',
    h2: en ? 'Heading 2' : '二级标题',
    h3: en ? 'Heading 3' : '三级标题',
    bulletList: en ? 'Bullet list' : '无序列表',
    orderedList: en ? 'Ordered list' : '有序列表',
    quote: en ? 'Blockquote' : '引用块',
    codeBlock: en ? 'Code block' : '代码块',
    hr: en ? 'Divider' : '分隔线',
    spoiler: en ? 'Spoiler' : '隐藏文本',
    latex: en ? 'Math (LaTeX)' : '公式',
    image: en ? 'Upload image' : '上传图片'
  }
})

// Grouped for visual separation; each `run` reads the command `.key` lazily.
const groups = computed<ToolButton[][]>(() => [
  [
    { svg: I.bold, title: t.value.bold, run: () => call(toggleStrongCommand.key) },
    { svg: I.italic, title: t.value.italic, run: () => call(toggleEmphasisCommand.key) },
    { svg: I.strike, title: t.value.strike, run: () => call(toggleStrikethroughCommand.key) },
    { svg: I.code, title: t.value.code, run: () => call(toggleInlineCodeCommand.key) }
  ],
  [
    { svg: I.h1, title: t.value.h1, run: () => call(wrapInHeadingCommand.key, 1) },
    { svg: I.h2, title: t.value.h2, run: () => call(wrapInHeadingCommand.key, 2) },
    { svg: I.h3, title: t.value.h3, run: () => call(wrapInHeadingCommand.key, 3) }
  ],
  [
    { svg: I.bulletList, title: t.value.bulletList, run: () => call(wrapInBulletListCommand.key) },
    { svg: I.orderedList, title: t.value.orderedList, run: () => call(wrapInOrderedListCommand.key) },
    { svg: I.quote, title: t.value.quote, run: () => call(wrapInBlockquoteCommand.key) },
    { svg: I.codeBlock, title: t.value.codeBlock, run: () => call(createCodeBlockCommand.key, '') },
    { svg: I.hr, title: t.value.hr, run: () => call(insertHrCommand.key) }
  ],
  [
    { svg: I.spoiler, title: t.value.spoiler, run: () => call(insertKunSpoilerCommand.key) },
    { svg: I.latex, title: t.value.latex, run: () => call(toggleLatexCommand.key) }
  ]
])

// Image upload button (only when the host supplies uploadImage). Reuses the same
// adapter as paste/drop; on success inserts an image node at the cursor.
const fileInput = ref<HTMLInputElement | null>(null)
const pickImage = () => fileInput.value?.click()
const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const upload = uploadImage.value
  if (!file || !upload) {
    return
  }
  try {
    const src = await upload(file)
    call(insertImageCommand.key, { src, title: file.name, alt: file.name })
  } catch {
    notify()?.(isEnglish.value ? 'Image upload failed' : '图片上传失败', 'error')
  }
}
</script>

<template>
  <div class="kun-editor__format-toolbar" role="toolbar">
    <template v-for="(group, gi) in groups" :key="gi">
      <span v-if="gi > 0" class="kun-editor__toolbar-divider" aria-hidden="true" />
      <button
        v-for="(btn, bi) in group"
        :key="bi"
        type="button"
        class="kun-editor__tool"
        :title="btn.title"
        :aria-label="btn.title"
        @click="btn.run()"
      >
        <span class="kun-editor__icon" v-html="btn.svg" />
      </button>
    </template>

    <template v-if="uploadImage">
      <span class="kun-editor__toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        class="kun-editor__tool"
        :title="t.image"
        :aria-label="t.image"
        @click="pickImage"
      >
        <span class="kun-editor__icon" v-html="I.image" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif"
        hidden
        @change="onFileChange"
      />
    </template>

    <template v-if="showPicker">
      <span class="kun-editor__toolbar-divider" aria-hidden="true" />
      <StickerPicker />
    </template>
  </div>
</template>

