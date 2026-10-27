<script setup lang="ts">
const src = `const adapters = {
  // 返回贴纸包;每张贴纸插入为一个 image 节点
  stickerSource: () => [
    { name: '默认', stickers: [{ src: '/s/1.webp', name: 'smile' }] }
  ]
}`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>工具栏的弹层,由 <code>features.sticker</code> 控制(默认开)。约 360×380,手机(≤640px)上是贴底的整宽面板。</li>
      <li><strong>顶部标签 表情 | 贴纸</strong>(KunUI 工具栏里是 KunTab;<code>KunStickerPanel</code> 的 <code>#tabs</code> 插槽可换成你自己的标签组件)。</li>
      <li><strong>表情</strong>:有记录时顶部是「最近使用」,然后是全部 emoji,小标题吸顶。</li>
      <li><strong>贴纸</strong>:标签下方一行贴纸包 —— 有记录时第一个是「最近使用」(时钟),其后每个包以首张贴纸作封面(包名作提示与 aria-label),当前包高亮。这一行可横向滚动(滚轮、触摸均可,不显示滚动条);溢出时两端出现 ‹ ›,按可见宽度翻页(减弱动效时瞬间跳转),到头的一侧自动隐藏。选中哪个包,下方就显示哪个包的网格。</li>
      <li><strong>表情</strong>内置一套 unicode emoji,插入为纯文本 —— 无需 adapter。<strong>贴纸</strong>仅在提供 <code>stickerSource</code> 时出现,插入为 image 节点(所以无图编辑器只有 emoji)。贴纸图片 <code>loading="lazy"</code>,格子尺寸固定,加载时不跳动。</li>
      <li><strong>最近使用</strong>两个标签各有一份,各记最近 16 个,按浏览者分别存在 localStorage(<code>kun-editor:recent-emoji</code> / <code>kun-editor:recent-stickers</code>),读写全部容错 —— 存储不可用时面板照常工作,只是没有这一节。打开面板时读取,打开期间不重排;已不在当前贴纸包里的贴纸不会再出现。</li>
      <li><strong>键盘</strong>:网格是一个 Tab 停靠点,方向键按格子实际位置移动,Home / End 跳首尾,回车插入;标签与贴纸包行是 tablist,←/→ 切换。Esc 关闭。</li>
      <li>两套工具栏(手搓的与 KunUI 的)用的是同一个面板,也以 <code>KunStickerPanel</code> 导出给自定义工具栏。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">贴纸来源</h2>
    <Code :code="src" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">点工具栏的表情按钮,切到「贴纸」标签选择贴纸包:</p>
    <DemoEditor
      model-value="点右边的笑脸,插入 emoji 或贴纸 —— "
      :adapters="{ stickerSource: mockStickerSource }"
    />
  </article>
</template>
