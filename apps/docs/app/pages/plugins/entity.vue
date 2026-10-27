<script setup lang="ts">
import DemoEntityCard from '~/components/entity/DemoEntityCard.vue'
import DemoEntityChip from '~/components/entity/DemoEntityChip.vue'

const entityView = { card: DemoEntityCard, chip: DemoEntityChip }

const md = `<!-- 卡片:一个段落里只有一个「裸」实体链接 -->
<https://www.kungal.com/topic/1>

<!-- 行内:其余任何位置的裸实体链接 -->
推荐 <https://www.kungal.com/galgame/2> 给大家

<!-- 普通链接:文本 ≠ URL,永不升级 -->
[这个帖子](https://www.kungal.com/topic/1)`

const adapter = `const adapters: KunEditorAdapters = {
  // 识别实体 URL,返回规范(绝对)URL;非实体返回 null
  entityFromUrl: (url) => forumEntityFromUrl(url),
  // 「/」菜单 + 工具栏选择器
  searchEntities: (type, query, signal) =>
    kunFetch('/search', { query: { type, q: query }, signal }),
  entityTypes: [
    { type: 'topic', label: '话题' },
    { type: 'work', label: 'Galgame' },
    { type: 'user', label: '用户' }
  ],
  // 可选:「转为链接」写入的标题
  entityTitle: (ref, signal) => previewCache.title(ref, signal)
}`

const view = `<KunEditor
  v-model="markdown"
  :adapters="adapters"
  :entity-view="{ card: TopicCard, chip: TopicChip }"
/>

<!-- TopicCard / TopicChip 收到 { entity: EntityRef, selected: boolean },
     自己取预览(宿主侧批量 + 缓存),并预留最终高度 —— 编辑器不再包任何
     会改变尺寸的东西,预览晚到也不会让正文跳动。 -->`

const demo = `打开下面的编辑器,试试:

<https://www.kungal.com/topic/1>

推荐 <https://www.kungal.com/galgame/2> 给大家。在新的一行输入 / 选择类型并搜索,或把 https://www.kungal.com/user/3 粘贴进来。
`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">markdown 契约(与服务端共用)</h2>
    <p class="text-default-600 mb-3">
      存储形式就是普通 markdown,<strong>规范 URL 本身就是引用</strong>(像 GitHub 一样,放到哪里都能降级成链接)。
    </p>
    <Code :code="md" lang="markdown" />
    <ul class="text-default-600 mt-3 list-disc space-y-1 pl-5">
      <li>
        <strong>裸链接</strong>:链接文本 === href(<code>&lt;url&gt;</code>、GFM 字面量 <code>url</code>、<code>[url](url)</code>),且
        <code>entityFromUrl(href)</code> 返回非 null。<code>www.…</code> 字面量的 href 带 <code>http://</code>,与文本不等 → 普通链接。
      </li>
      <li>
        <strong>卡片</strong>:段落的直接子节点(去掉纯空白文本)恰好是一个裸实体链接。引用块、列表项里同样成立(列表项第一个块也可以是卡片)。
        <code>**&lt;url&gt;**</code>、带换行的段落、标题、表格单元格里都是<strong>行内</strong>。
      </li>
      <li>代码、行内代码、<code>||隐藏文本||</code> 里永远不是实体。</li>
      <li>卡片与行内都序列化回裸的<strong>规范</strong> URL(<code>&lt;url&gt;</code>);<code>https://kungal.com/topic/1/</code> 读入后保存为 <code>&lt;https://www.kungal.com/topic/1&gt;</code> —— 语义往返,不是逐字节往返。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">适配器</h2>
    <Code :code="adapter" lang="ts" />
    <p class="text-default-600 mt-3">
      规范 URL 必须是绝对 URL:<code>&lt;…&gt;</code> 只对带 scheme 的 URL 成立。见
      <NuxtLink class="text-primary" to="/reference/adapters">适配器类型</NuxtLink>。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">渲染(宿主组件)</h2>
    <Code :code="view" lang="vue" />
    <p class="text-default-600 mt-3">
      没传组件时,卡片 / 行内退化为显示 URL 的中性样式。编辑器内不跳转(像 @提及 一样):点击只是选中。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">插入:一条规则,所有入口</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li><strong>粘贴</strong>单个实体 URL:粘进空段落 → 卡片,夹在文字中 → 行内。</li>
      <li><strong>自动链接</strong>:手机键盘剪贴板条一次提交整条 URL 同粘贴;手打 URL 后按回车且它独占一段 → 卡片,按空格 → 行内(这一行还在写)。中文后直接接 URL(<code>看这个https://…</code>)也认。IME 组字期间不转换。</li>
      <li><strong>「/」菜单</strong>:段首或空白后输入 <code>/</code>,列出宿主的类型;继续输入过滤,回车选中后在文档里直接输入搜索词(IME 照常),↑/↓/回车 选结果。选中后:段落为空 → 卡片,否则行内。Esc:类型列表中关闭并保留 <code>/</code>;搜索词为空时只删掉 <code>/</code>;有搜索词时关闭并保留文字。空搜索词时退格回到类型列表。</li>
      <li><strong>工具栏</strong>:<code>entityPicker</code> 按钮(手机用户没有 <code>/</code> 的习惯);<code>insertEntity(ref, display?)</code> 在工具栏 API 与 ref 句柄上。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">撤销与显示切换</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>粘贴 / 剪贴板条的转换是<strong>单独的撤销步</strong>:第一次 Ctrl+Z 变回<strong>纯文本</strong> URL,第二次撤掉粘贴。不是「普通链接」—— 按契约,裸实体链接就是行内引用,保存后会变回去。被撤销过的 URL 之后接空格 / 回车也不会再转换。</li>
      <li>粘贴后在节点旁出现小气泡 <code>卡片 / 行内 / 链接</code>,不抢焦点、不截获回车:按 <kbd>Tab</kbd> 进入,←/→ 移动,回车应用,Esc 关闭,继续打字即消失。</li>
      <li>选中卡片 / 行内(点击、轻触、方向键)时:<code>卡片 / 行内 / 链接 / 删除</code>。回车在卡片后新开一段;选中时打字落在其后,不会覆盖。</li>
      <li><strong>链接</strong> 写成普通的 <code>[标题](url)</code>(标题来自 <code>entityTitle</code>,缺席时用去掉 scheme 的 URL)—— 文本 ≠ URL,才能保持是链接。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <DemoEditor
      :model-value="demo"
      :adapters="mockEntityAdapters"
      :entity-view="entityView"
    />
  </article>
</template>
