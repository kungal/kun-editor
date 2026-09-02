<script setup lang="ts">
const importCss = `/* 你的 main.css —— 在 KunUI 的 tokens/style 之后 */
@import '@kungal/ui-tokens';
@import '@kungal/ui-vue/style.css';
@import '@kungal/editor-nuxt/editor.css';   /* 随 layer 发布的参考样式 */`

const hooks = [
  { name: '.kun-editor', type: 'shell', description: '最外层容器(纵向 flex)' },
  { name: '.kun-editor__toolbar', type: 'tabs', description: '预览 / Markdown 切换栏' },
  { name: '.kun-editor__tab[data-active]', type: 'tabs', description: '视图切换按钮(激活态用 data-active)' },
  { name: '.kun-editor__wysiwyg .ProseMirror', type: 'wysiwyg', description: '所见即所得编辑区(需要 white-space: pre-wrap)' },
  { name: '.kun-editor__wysiwyg img.ProseMirror-separator', type: 'wysiwyg', description: 'ProseMirror 在「块以不可编辑节点结尾」时插的光标锚点 —— 必须挡住宿主的通用 img 规则,否则光标会掉到下一行' },
  { name: '.kun-spoiler', type: 'wysiwyg', description: '编辑中的剧透块 —— 底色走 --kun-spoiler-bg 变量(见下)' },
  { name: '.kun-editor__format-toolbar', type: 'toolbar', description: '格式化工具栏' },
  { name: '.kun-editor__tool', type: 'toolbar', description: '工具栏按钮' },
  { name: '.kun-editor__tool[data-active], .kun-editor__bubble-btn[data-active]', type: 'toolbar', description: '加粗 / 斜体等 toggle 的按下态' },
  { name: '.kun-editor__bubble[data-show]', type: 'bubble', description: '选区浮动菜单(定位 + 显隐必需)' },
  { name: '.kun-editor__link', type: 'link', description: '工具栏链接按钮 + 其 URL 面板的容器(定位必需)' },
  { name: '.kun-editor__link-panel', type: 'link', description: '工具栏链接按钮下的 URL 面板(定位必需)' },
  { name: '.kun-editor__link-input', type: 'link', description: '链接 URL 输入框 —— 工具栏面板与选区气泡共用同一个钩子' },
  { name: '.kun-editor__source .cm-editor', type: 'source', description: 'CodeMirror 源码视图' },
  { name: '.kun-mention-dropdown[data-show]', type: 'mention', description: '@提及下拉(定位 + 显隐必需)' },
  { name: '.kun-editor__picker-panel', type: 'picker', description: '贴纸 / 表情弹层(定位必需)' },
  { name: '.kun-editor__emoji / __sticker', type: 'picker', description: 'emoji / 贴纸格子' }
]

const structural = `/* 编辑器真正「需要」的结构性规则 —— 别漏 */
.kun-editor__wysiwyg .ProseMirror { white-space: pre-wrap; } /* ProseMirror 必需 */
/* 段落以 @提及 / #楼层 这类不可编辑节点结尾时,ProseMirror 会补一个
   <img class="ProseMirror-separator"> 给 Chrome / Safari 画光标。Tailwind 的
   preflight 会把所有 img 变成 display:block —— 锚点一变块级,光标就掉到下一行。
   这是 ProseMirror 官方样式表里的那条守卫,Milkdown 不带,得自己写 */
.kun-editor__wysiwyg img.ProseMirror-separator {
  display: inline !important; width: 0 !important; height: 0 !important;
  margin: 0 !important; padding: 0 !important; border: none !important;
}
.kun-mention-dropdown { position: absolute; display: none; }
.kun-mention-dropdown[data-show='true'] { display: block; }
.kun-editor__picker { position: relative; }
.kun-editor__picker-panel { position: absolute; }
.kun-editor__link { position: relative; }
.kun-editor__link-panel { position: absolute; }
/* placeholder 的 ::before 是绝对定位 —— 空块必须是它的定位祖先,
   否则长 placeholder 会按视口宽度排版,直接溢出编辑器 */
.kun-editor__placeholder { position: relative; }
.kun-editor__placeholder::before { position: absolute; top: 0; left: 0; width: 100%; }`

const theming = `/* 所有配色都读 KunUI 设计 token —— 换肤只需覆盖变量,或改 KunUI 主题 */
.kun-editor__tab[data-active='true'] { background: var(--color-primary); }
.kun-editor__tool:hover { background: var(--color-default-100); }
.kun-editor__tool[data-active='true'],
.kun-editor__bubble-btn[data-active='true'] { background: var(--color-primary); }
/* 剧透块的底色是内联样式(编辑器自带一份不依赖任何 token 的默认值),
   选择器压不过它 —— 但改一个自定义属性就行,这是它的换肤钩子 */
.kun-editor__wysiwyg .kun-spoiler { --kun-spoiler-bg: var(--color-default-200); }
/* 暗色模式:KunUI 的 .kun-dark-mode 一挂,token 自动切换,编辑器随之变色 */`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">为什么零样式</h2>
    <p class="text-default-600">
      <code class="text-primary">@kungal/editor-vue</code>
      不发布任何 CSS,组件只渲染稳定的 class 钩子(<code>.kun-editor__*</code>、<code>.kun-mention-dropdown*</code>)与
      <code>data-*</code> 状态。这样编辑器能装进任意 Vue
      应用而不绑定某个 UI 库,样式完全由你掌控 —— 本站的
      playground 就是一份用 KunUI token 主题化的参考实现。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">最快的上手方式</h2>
    <p class="text-default-600 mb-3">
      参考样式表随
      <code class="text-primary">@kungal/editor-nuxt</code>
      一起发布,直接 import 即可(样式修复随版本升级到手,不用再拷一遍):
    </p>
    <Code :code="importCss" lang="css" />
    <p class="text-default-600 mt-3 mb-3">
      想改就改:把
      <a
        class="text-primary"
        href="https://github.com/kungal/kun-editor/blob/main/packages/editor-nuxt/editor.css"
        target="_blank"
        >packages/editor-nuxt/editor.css</a
      >
      拷进项目当起点也行 —— 纯 CSS,无构建步骤,且已用 KunUI token 主题化。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">Class 钩子</h2>
    <p class="text-default-600">写自己的样式时,针对这些稳定的钩子:</p>
    <PropsTable head="选择器" :rows="hooks" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">必需的结构规则</h2>
    <p class="text-default-600 mb-3">
      有几条规则编辑器<strong>功能上</strong>就需要(不是美化):ProseMirror
      的 <code>white-space</code>、以及下拉 / 弹层的定位与显隐。自己写样式时别漏掉:
    </p>
    <Code :code="structural" lang="css" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">主题与暗色模式</h2>
    <p class="text-default-600 mb-3">
      参考样式全部读取 KunUI 设计 token(<code>--color-primary</code> /
      <code>--color-default-*</code> 等),所以在 KunUI
      宿主里自动贴合;挂上 <code>.kun-dark-mode</code> 即随主题切换暗色。
    </p>
    <Code :code="theming" lang="css" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">别忘了 peer 的 CSS</h2>
    <p class="text-default-600">
      启用了带 CSS 的 peer 就把它的样式也引入,例如 KaTeX:
    </p>
    <Code code="import 'katex/dist/katex.min.css'" lang="ts" />
  </article>
</template>
