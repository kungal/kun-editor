<script setup lang="ts">
import { mockNotify, mockStickerSource, mockUploadImage } from '~/utils/mockAdapters'
import type { KunEditorAdapters } from '@kungal/editor-core'
import type { KunToolbarItem } from '@kungal/editor-vue'

// No uploadImage adapter here — the image dialog runs the upload itself (so it can
// record a history). stickerSource/notify stay for the picker.
const adapters: KunEditorAdapters = {
  stickerSource: mockStickerSource,
  notify: mockNotify
}

const md = ref('# 图片弹框示例\n\n点工具栏最后的图片按钮试试。')

// The built-in toolbar WITHOUT its image button — the dialog supplies its own.
const items: KunToolbarItem[] = [
  'heading',
  '|',
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  '|',
  'bulletList',
  'orderedList',
  'quote',
  'codeBlock',
  'hr',
  '|',
  'spoiler',
  '|',
  'picker'
]

const src = `<KunEditor v-model="md" :adapters="adapters">
  <template #toolbar="api">
    <div class="flex items-center gap-0.5">
      <!-- built-in toolbar, minus its image button -->
      <KunEditorToolbar v-bind="api" :items="itemsWithoutImage" />
      <!-- your own image dialog, driving the editor via the same api -->
      <ImageDialog :api="api" :upload="uploadImage" />
    </div>
  </template>
</KunEditor>

<!-- ImageDialog.vue (host code) uses:
     api.insertImage({ src })   // URL paste + history re-insert
     props.upload(file)         // your uploader → URL → api.insertImage -->`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <p class="text-default-600 mt-4 leading-relaxed">
      图片弹框是<strong>宿主的 UI</strong>。编辑器只出两个原语:
      <code>api.insertImage({ src })</code>(用现成 URL 插图 —— 链接插入、历史重插)和
      <code>api.uploadImage(file)</code>(带「上传中」占位的便捷上传)。这个示例的弹框更进一步:
      <strong>自己跑上传</strong>拿到 URL,好维护一份「最近使用」历史,再用 <code>insertImage</code> 插入。
      弹框壳(KunPopover)、拖拽、历史全在宿主。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-2">
      工具栏最后一个是<strong>自定义图片弹框</strong>(内置图片按钮已用
      <code>:items</code> 去掉)。支持:粘贴链接插入、选图上传、<strong>一次拖多张</strong>、点「最近使用」重插。
    </p>
    <ClientOnly>
      <div class="border-default-200 rounded-kun-lg my-5 overflow-hidden border">
        <div class="bg-content1/60 p-4">
          <KunEditor v-model="md" :adapters="adapters">
            <template #view-switch="s">
              <KunEditorViewSwitch v-bind="s" />
            </template>
            <template #toolbar="api">
              <div class="flex flex-wrap items-center gap-0.5">
                <KunEditorToolbar v-bind="api" :items="items" />
                <span class="bg-default-200 mx-1 h-5 w-px" aria-hidden="true" />
                <ImageDialog :api="api" :upload="mockUploadImage" />
              </div>
            </template>
          </KunEditor>
        </div>
      </div>
    </ClientOnly>

    <h2 class="mt-8 mb-1 text-xl font-semibold">用法</h2>
    <Code :code="src" lang="vue" />
  </article>
</template>
