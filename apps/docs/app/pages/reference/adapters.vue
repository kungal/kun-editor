<script setup lang="ts">
const types = `interface KunEditorAdapters {
  uploadImage?: (file: File) => Promise<string>
  searchMentionUsers?: (query: string) => Promise<MentionUser[]>
  stickerSource?: () => StickerPack[] | Promise<StickerPack[]>
  notify?: (message: string, level: NotifyLevel) => void
  mentionToUrl?: (userId: number) => string
  mentionFromUrl?: (url: string, text: string) => number | null
}

interface MentionUser { id: number; name: string; avatar?: string }
interface StickerItem { src: string; name: string }
interface StickerPack { name: string; stickers: StickerItem[] }

type NotifyLevel = 'info' | 'success' | 'warn' | 'error'`

const rows = [
  { name: 'uploadImage', type: '(file) => Promise<string>', description: '上传一张图片,resolve 要嵌入的 URL。paste / drop / 工具栏各调一次;reject 则中止该张。' },
  { name: 'searchMentionUsers', type: '(query) => Promise<MentionUser[]>', description: '解析 @提及 查询;防抖由渲染层负责。应尽快返回,调用方按序号丢弃过期结果。' },
  { name: 'stickerSource', type: '() => StickerPack[] | Promise', description: '提供贴纸包。省略则隐藏贴纸 UI。' },
  { name: 'notify', type: '(message, level) => void', description: '把编辑器通知路由到宿主的 toast 系统。' },
  { name: 'mentionToUrl', type: '(userId) => string', description: '@提及 的链接 URL 形态(服务端契约,故为策略)。默认 kungal-user:<id>;如 moyu 用 /user/<id>/resource。' },
  { name: 'mentionFromUrl', type: '(url, text) => number | null', description: '把链接解析回 user id(非提及返回 null),须与 mentionToUrl 对应。也拿到链接文本 → 可复现文本守卫(如 moyu「文本须以 @ 开头」)。默认 kungal-user: scheme。' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">类型</h2>
    <Code :code="types" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">字段</h2>
    <PropsTable head="adapter" :rows="rows" />

    <p class="text-default-500 mt-6 text-sm">
      全部来自 <code>@kungal/editor-core</code>。使用见<NuxtLink
        class="text-primary"
        to="/guide/adapters"
        >适配器指南</NuxtLink
      >。
    </p>
  </article>
</template>
