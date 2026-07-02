// Single source of truth for the docs site's copy + SEO. `site` holds the global
// constants; `pageMeta` maps each route to its title (English API name), an
// optional Chinese name (`cn`), and a description. This feeds the <title>/SEO
// meta, the page <h1> (<DocTitle>), the sidebar labels, and the page intro
// (<DocIntro>) — so the copy lives in ONE place and never drifts.

export const site = {
  name: 'KunEditor',
  url: 'https://editor.kungal.com',
  slogan: '基于 Milkdown 的 headless Markdown 编辑器',
  description:
    'KunEditor —— 为 KUN Galgame 生态打造的、基于 Milkdown 的 headless Markdown 编辑器。框架无关的插件内核 + 薄薄的 Vue 渲染层:机制 vs 策略、零样式、双视图,一套大脑处处复用。',
  keywords: [
    'KunEditor',
    'Milkdown',
    'ProseMirror',
    'Markdown 编辑器',
    'headless editor',
    'Vue 编辑器',
    'Nuxt',
    'WYSIWYG',
    'galgame',
    'ACGN',
    'kungal'
  ],
  locale: 'zh-CN',
  repo: 'https://github.com/kungal/kun-editor'
} as const

export interface PageMeta {
  /** English API name (also the page H1 base). */
  title: string
  /** Chinese name, shown as "Title (cn)" in nav + H1 + <title>. */
  cn?: string
  description: string
}

export const pageMeta: Record<string, PageMeta> = {
  '/': { title: site.name, description: site.description },
  '/getting-started': {
    title: '快速开始',
    description:
      '几分钟把 KunEditor 接入你的 Vue / Nuxt 项目:安装、peer 依赖、给 headless 编辑器上样式、绑定 v-model。'
  },
  '/playground': {
    title: 'Playground',
    cn: '在线试玩',
    description:
      '一个用 KunUI 主题化的 <KunEditor>,拨动开关实时看 adapter 如何点亮功能。'
  },
  '/changelog': {
    title: 'Changelog',
    cn: '更新日志',
    description: '各版本变更,随每次发布由 changeset 自动生成。三个包锁步同版本。'
  },

  // Guides
  '/guide/styling': {
    title: 'Styling',
    cn: '样式',
    description:
      'KunEditor 是 headless 的 —— 不带任何 CSS,只暴露稳定的 class 钩子。本页说明如何给它上样式:参考样式表、需要的结构规则、主题变量、暗色模式。'
  },
  '/guide/adapters': {
    title: 'Adapters',
    cn: '适配器',
    description:
      '编辑器出机制,宿主注入策略。adapters 是编辑器与你后端之间的契约:图片上传去哪、@mention 怎么解析、有哪些贴纸、通知怎么弹 —— 全部可选,缺哪个对应功能自动关闭。'
  },
  '/guide/features': {
    title: 'Features',
    cn: '功能开关',
    description:
      '用 features 显式开关可选插件(spoiler / katex / 代码块 / mention / quote / sticker),以及 adapter 缺席如何覆盖这些开关。'
  },
  '/guide/nuxt': {
    title: 'Nuxt',
    cn: 'Nuxt 接入',
    description:
      '通过 @kungal/editor-nuxt 层自动导入 <KunEditor>,无需手动 import。'
  },

  // Examples
  '/examples/forum-reply': {
    title: 'Forum reply',
    cn: '论坛回复编辑器',
    description:
      '贴近 kun-galgame-forum 回复编辑器的整合示例:KunUI 提供面板外壳,<KunEditor> 是回复正文,支持「引用」楼层、@提及、上传、贴纸,已发布回复用只读编辑器渲染。这就是 KunEditor + KunUI 的真实用法。'
  },
  '/examples/kunui-toolbar': {
    title: 'KunUI toolbar',
    cn: 'KunUI 工具栏',
    description:
      '用 #toolbar 具名插槽把手搓工具栏换成 KunUI 组件版(KunButton / KunIcon / KunTooltip / KunPopover)。核心保持 headless:插槽把命令 API 传出,editor-nuxt 提供 <KunEditorToolbar> 作默认实现。'
  },
  '/examples/toc': {
    title: 'Table of contents',
    cn: '大纲 / TOC',
    description:
      '桌面版编辑器左侧的浅色大纲:<KunEditor> 的 @update:headings 派生标题列表,点击调 scrollToHeading(i) 在当前视图(所见即所得 / 源码 / 分栏)跳转并落光标。样式、布局(左侧留白)由宿主决定,编辑器只出能力。'
  },

  // Plugins
  '/plugins/spoiler': {
    title: 'Spoiler',
    cn: '隐藏文本',
    description:
      '`||隐藏文本||` 行内节点,点击揭示。纯插件,无需 adapter,与服务端渲染器共用同一语法。'
  },
  '/plugins/katex': {
    title: 'KaTeX',
    cn: '数学公式',
    description:
      '行内 `$…$` 与块级 `$$…$$` LaTeX 公式,由 KaTeX 渲染。纯插件(katex 为可选 peer)。'
  },
  '/plugins/code-block': {
    title: 'Code Block',
    cn: '代码块',
    description:
      '基于 CodeMirror 的代码块:语法高亮、语言切换、可本地化工具栏、latex 块的公式预览。'
  },
  '/plugins/mention': {
    title: 'Mention',
    cn: '提及',
    description:
      '`@` 提及原子节点,markdown 形式 `[@name](kungal-user:id)`。schema 纯往返;`@` 自动补全下拉消费 searchMentionUsers 适配器。'
  },
  '/plugins/upload': {
    title: 'Upload',
    cn: '图片上传',
    description:
      '粘贴 / 拖拽 / 工具栏图片上传,基于 uploadImage 适配器 —— 缺它即为「无图编辑器」。'
  },
  '/plugins/quote': {
    title: 'Quote',
    cn: '引用',
    description:
      '不透明的行内引用原子 `[label](kungal-reply:refId)`;由宿主通过 insertQuoteCommand 插入,含义由宿主决定。'
  },
  '/plugins/sticker': {
    title: 'Sticker & Emoji',
    cn: '贴纸与表情',
    description:
      '工具栏弹层:内置 emoji(unicode,插入为文本)+ 贴纸标签页(需 stickerSource 适配器,插入为图片节点)。'
  },

  // Reference
  '/reference/editor': {
    title: '<KunEditor>',
    cn: '组件 API',
    description: '<KunEditor> 组件的 props / v-model / emits 参考。'
  },
  '/reference/adapters': {
    title: 'Adapters API',
    cn: '适配器类型',
    description:
      'KunEditorAdapters 及各适配器函数类型的完整参考,来自 @kungal/editor-core。'
  },
  '/reference/core': {
    title: 'Core API',
    cn: '内核 API',
    description:
      '@kungal/editor-core/preset 的导出:createKunEditorPlugins、各插件工厂、以及共享的 markdown scheme 常量。'
  }
}

/** "Title (cn)" for a route, or the raw title when there's no Chinese name. */
export const displayLabel = (path: string): string => {
  const m = pageMeta[path]
  if (!m) return path
  return m.cn ? `${m.title} (${m.cn})` : m.title
}

export const getPageMeta = (path: string): PageMeta | undefined => pageMeta[path]
