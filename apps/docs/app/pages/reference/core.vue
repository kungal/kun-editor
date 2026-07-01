<script setup lang="ts">
const preset = `import { createKunEditorPlugins } from '@kungal/editor-core/preset'

// 渲染层唯一的一次调用 —— 组装 Milkdown baseline + KunEditor 插件
const plugins = createKunEditorPlugins(adapters, features, { locale: 'zh-cn' })
editor.use(plugins)`

const light = `// 轻量主入口:仅类型 + 常量,零运行时依赖(服务端可直接引)
import { MENTION_SCHEME, QUOTE_SCHEME } from '@kungal/editor-core'
// MENTION_SCHEME === 'kungal-user:'
// QUOTE_SCHEME   === 'kungal-reply:'`

const factories = [
  { name: 'createKunEditorPlugins', type: '(adapters?, features?, opts?) => MilkdownPlugin[]', description: '组装好的插件包(baseline + 各插件),渲染层的唯一入口。' },
  { name: 'createSpoilerPlugin', type: '() => MilkdownPlugin[]', description: 'spoiler 节点 + 输入规则 + remark 往返 + 插入命令。' },
  { name: 'createKatexPlugins', type: '() => MilkdownPlugin[]', description: '行内 / 块级 LaTeX 全套。' },
  { name: 'createCodeBlockPlugins', type: '(opts?) => MilkdownPlugin[]', description: 'CodeMirror 代码块组件 + 配置(主题 / 语言 / 图标 / 本地化 / latex 预览)。' },
  { name: 'createStopLinkPlugin', type: '() => MilkdownPlugin[]', description: 'Space 断开活动的链接标记。' },
  { name: 'createMentionPlugin', type: '() => MilkdownPlugin[]', description: 'mention schema + remark 往返 + 插入命令。' },
  { name: 'createUploadPlugin', type: '(uploadImage, opts?) => MilkdownPlugin[]', description: '基于 uploadImage 适配器的图片上传。' },
  { name: 'createQuotePlugin', type: '() => MilkdownPlugin[]', description: '不透明的行内引用原子 + 插入命令。' }
]

const consts = [
  { name: 'MENTION_SCHEME', type: "'kungal-user:'", description: '@提及的 markdown link scheme(与服务端共享)。' },
  { name: 'QUOTE_SCHEME', type: "'kungal-reply:'", description: '引用的 markdown link scheme(与服务端共享)。' },
  { name: 'insertQuoteCommand', type: '$Command<{ refId, label }>', description: '在光标处插入一个引用原子(宿主调用)。' },
  { name: 'insertMentionCommand', type: '$Command<{ userId, name }>', description: '在光标处插入一个提及(工具栏 / 测试用)。' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">两个入口</h2>
    <p class="text-default-600 mb-3">
      主入口 <code>@kungal/editor-core</code> 是<strong>轻量</strong>的(仅类型 +
      scheme 常量,零运行时依赖);Milkdown 插件在
      <code>@kungal/editor-core/preset</code>(会引入 milkdown / katex / codemirror
      peer)。
    </p>
    <Code :code="light" lang="ts" />
    <Code :code="preset" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">/preset 导出</h2>
    <PropsTable head="导出" :rows="factories" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">命令与常量</h2>
    <PropsTable head="导出" :rows="consts" />

    <p class="text-default-500 mt-6 text-sm">
      每个插件都是<strong>工厂</strong>(<code>createXxxPlugin</code>),而非绑定单一宿主的模块级单例
      —— 这正是论坛版难以复用的根因。
    </p>
  </article>
</template>
