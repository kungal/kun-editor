<script setup lang="ts">
// The formatting toolbar — the central WYSIWYG chrome. Ported from the forum's
// Menu.vue + _buttonList.ts, made self-contained: plain controls + inline SVG
// (no @kungal/ui-vue hard dep), themed via CSS vars so a KunUI host still gets
// consistent colours.
//
// Must live inside <MilkdownProvider> (KunEditor.vue places it there): it uses
// useInstance() to reach the editor created by <MilkdownEditor> and fires
// commands via callCommand. Command `.key`s are populated once the editor is
// created, so we read them at click time (never at module load).
//
// Headings are ONE "text size" <select> (Paragraph / H1–H6), not N buttons — the
// modern standard — driven by setHeadingCommand (absolute set, so Paragraph
// resets). There is deliberately NO math button: an empty inline-math atom is a
// broken node; math is entered via the `$…$` / `$$` input rules instead.
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
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import {
  insertKunSpoilerCommand,
  setHeadingCommand
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
    textSize: en ? 'Text size' : '文本大小',
    bold: en ? 'Bold' : '加粗',
    italic: en ? 'Italic' : '斜体',
    strike: en ? 'Strikethrough' : '删除线',
    code: en ? 'Inline code' : '行内代码',
    bulletList: en ? 'Bullet list' : '无序列表',
    orderedList: en ? 'Ordered list' : '有序列表',
    quote: en ? 'Blockquote' : '引用块',
    codeBlock: en ? 'Code block' : '代码块',
    hr: en ? 'Divider' : '分隔线',
    spoiler: en ? 'Spoiler' : '隐藏文本',
    image: en ? 'Upload image' : '上传图片'
  }
})

// Paragraph (level 0) + H1–H6, for the text-size <select>.
const headingOptions = computed(() => {
  const en = isEnglish.value
  const cn = ['正文', '一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题']
  return cn.map((label, level) => ({
    level,
    label: en ? (level === 0 ? 'Paragraph' : `Heading ${level}`) : label
  }))
})
const onHeadingSelect = (e: Event) => {
  const el = e.target as HTMLSelectElement
  call(setHeadingCommand.key, Number(el.value))
  el.selectedIndex = 0 // reset to the placeholder (this is an action menu)
}

// Grouped for visual separation; each `run` reads the command `.key` lazily.
const groups = computed<ToolButton[][]>(() => [
  [
    { svg: I.bold, title: t.value.bold, run: () => call(toggleStrongCommand.key) },
    { svg: I.italic, title: t.value.italic, run: () => call(toggleEmphasisCommand.key) },
    { svg: I.strike, title: t.value.strike, run: () => call(toggleStrikethroughCommand.key) },
    { svg: I.code, title: t.value.code, run: () => call(toggleInlineCodeCommand.key) }
  ],
  [
    { svg: I.bulletList, title: t.value.bulletList, run: () => call(wrapInBulletListCommand.key) },
    { svg: I.orderedList, title: t.value.orderedList, run: () => call(wrapInOrderedListCommand.key) },
    { svg: I.quote, title: t.value.quote, run: () => call(wrapInBlockquoteCommand.key) },
    { svg: I.codeBlock, title: t.value.codeBlock, run: () => call(createCodeBlockCommand.key, '') },
    { svg: I.hr, title: t.value.hr, run: () => call(insertHrCommand.key) }
  ],
  [
    { svg: I.spoiler, title: t.value.spoiler, run: () => call(insertKunSpoilerCommand.key) }
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
    <select
      class="kun-editor__heading-select"
      :aria-label="t.textSize"
      @change="onHeadingSelect"
    >
      <option value="" disabled selected>{{ t.textSize }}</option>
      <option v-for="o in headingOptions" :key="o.level" :value="o.level">
        {{ o.label }}
      </option>
    </select>

    <template v-for="(group, gi) in groups" :key="gi">
      <span class="kun-editor__toolbar-divider" aria-hidden="true" />
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
