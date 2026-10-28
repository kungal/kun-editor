<script setup lang="ts">
const types = `interface KunEditorAdapters {
  uploadImage?: (file: File) => Promise<string>
  searchMentionUsers?: (query: string) => Promise<MentionUser[]>
  stickerSource?: () => StickerPack[] | Promise<StickerPack[]>
  notify?: (message: string, level: NotifyLevel) => void
  linkPrompt?: (ctx: { text: string }) => MaybePromise<string | { text?: string; href: string } | null | undefined>
  mentionToUrl?: (userId: number) => string
  mentionFromUrl?: (url: string, text: string) => number | null
  entityFromUrl?: (url: string) => EntityRef | null
  searchEntities?: (type: string, query: string, signal: AbortSignal) => Promise<EntityHit[]>
  entityTypes?: EntityTypeItem[]
  entityTitle?: (ref: EntityRef, signal: AbortSignal) => Promise<string | null>
  entityPrompt?: (ctx: { type: string; display: 'card' | 'chip' | 'auto' }) => Promise<EntityRef | null>
}

interface EntityRef { type: string; id: string; url: string } // url = 规范 URL(绝对)
interface EntityHit { ref: EntityRef; title: string; subtitle?: string; thumbnail?: string }
interface EntityTypeItem {
  type: string
  label: string        // 行标题,原样显示
  icon?: string        // URL / data: → 图片;否则是图标名,交给 KUN_EDITOR_ICON(Nuxt 层 = KunIcon)
  command?: string     // 「/」关键字,右侧显示 /command,也参与过滤
  description?: string // 标题下的一行说明
}

interface MentionUser { id: number; name: string; avatar?: string }
interface StickerItem { src: string; name: string }
interface StickerPack { name: string; stickers: StickerItem[] }

type NotifyLevel = 'info' | 'success' | 'warn' | 'error'
type MaybePromise<T> = T | Promise<T>`

const rows = [
  { name: 'uploadImage', type: '(file) => Promise<string>', description: '上传一张图片,resolve 要嵌入的 URL。paste / drop / 工具栏各调一次;reject 则中止该张。' },
  { name: 'searchMentionUsers', type: '(query) => Promise<MentionUser[]>', description: '解析 @提及 查询;防抖由渲染层负责。应尽快返回,调用方按序号丢弃过期结果。' },
  { name: 'stickerSource', type: '() => StickerPack[] | Promise', description: '提供贴纸包。省略则隐藏贴纸 UI。' },
  { name: 'notify', type: '(message, level) => void', description: '把编辑器通知路由到宿主的 toast 系统。' },
  { name: 'linkPrompt', type: '({ text }) => MaybePromise<string | { text?, href } | null>', description: '自定义链接输入(你自己的 KunModal / 文章选择器),替换内置的链接编辑器(选区气泡、两种工具栏、Ctrl+K)。拿到当前链接文本;返回 URL 字符串(文本不变),或 { text, href } 同时设置文本与 URL,返回空值 = 取消。URL 与内置入口走同一次归一化(见 normalizeLinkHref),不必自己补 https://。' },
  { name: 'mentionToUrl', type: '(userId) => string', description: '@提及 的链接 URL 形态(服务端契约,故为策略)。默认 kungal-user:<id>;如 moyu 用 /user/<id>/resource。' },
  { name: 'entityFromUrl', type: '(url) => EntityRef | null', description: '识别实体 URL,返回带「规范 URL」(必须是绝对 https://…)的引用,非实体返回 null。缺席 = 实体功能关闭,链接仍是链接。解析与粘贴时都会调用,须纯且快;抛错视为非实体。' },
  { name: 'searchEntities', type: '(type, query, signal) => Promise<EntityHit[]>', description: '「/」菜单与工具栏选择器的搜索。防抖由渲染层负责;被新查询取代时 signal 中止(过期结果无论如何都会丢弃)。' },
  { name: 'entityTypes', type: 'EntityTypeItem[]', description: '「/」菜单与选择器的类型列表(宿主顺序)。「/」菜单需要它与 searchEntities 同时存在。' },
  { name: 'entityTitle', type: '(ref, signal) => Promise<string | null>', description: '「转为链接」时写入的标题 → [title](url)。可选:缺席 / 返回 null / 失败 / 超过 1.5 秒,则用去掉 scheme 的 URL 作文本。' },
  { name: 'entityPrompt', type: '({ type, display }) => Promise<EntityRef | null>', description: '宿主自己的实体搜索(你的弹窗)。提供后,「/」菜单与工具栏按钮只选类型,然后交给它;resolve 引用即插入,null = 取消。display 是插入点处将得到的形态(空段落 card,否则 chip)。弹窗期间编辑器记住插入点(随编辑映射),结束后恢复焦点与选区;插入点被删掉则丢弃结果。' },
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
