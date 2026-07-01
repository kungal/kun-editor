<script setup lang="ts">
import ForumReply from '~/examples/forum-reply/ForumReply.vue'
import ForumReplySrc from '~/examples/forum-reply/ForumReply.vue?raw'

// forum component → what this example reproduces
const mapping = [
  { name: 'reply/BodyEditor.vue', type: '正文', description: '把 <KunEditor> 接到回复草稿(v-model)。' },
  { name: 'milkdown/Editor.vue footer', type: 'footer', description: 'Markdown 支持 chip + 字数 + 「特殊语法 ||隐藏文本||」提示。' },
  { name: 'reply/PanelBtn.vue', type: '提交行', description: '取消 / 确认发布(loading 态),KunButton。' },
  { name: 'topic/footer/Reply.vue', type: '引用', description: '某楼「引用」→ 把 @作者 #楼层 引用插入编辑器。' },
  { name: 'plugins/upload/uploader.ts', type: 'adapter', description: 'uploadImage → POST /image/topic。' },
  { name: 'plugins/mention/MentionDropdown', type: 'adapter', description: 'searchMentionUsers → OAuth /user/search。' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">这是什么</h2>
    <p class="text-default-600">
      一个尽量贴近 <strong>kun-galgame-forum</strong> 回复编辑器的示例:KunUI
      提供面板外壳(卡片 / 按钮 / 头像 / chip / footer),<code class="text-primary">&lt;KunEditor&gt;</code>
      是回复正文,每层的「引用」经
      <code class="text-primary">insertQuote</code> /
      <code class="text-primary">insertMention</code> 命令式 API
      把 <code>@作者 #楼层</code> <strong>在光标处实时插入</strong>(和论坛一致),已发布的回复用
      <strong>只读的同一个编辑器</strong>渲染(这样 <code>||剧透||</code>、公式、@提及、引用
      都能正确显示 —— 普通 markdown 渲染器做不到)。adapters 用 mock 代替,但注释标了论坛的真实端点。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">在线演示</h2>
    <p class="text-default-600 mb-3">
      在某楼点「引用」,或在下方编辑器里写回复(试 <code>@a</code> 提及、上传图片、
      <code>||剧透||</code>),再点确认发布:
    </p>
    <div class="border-default-200 bg-content1/60 rounded-kun-lg my-5 border p-4">
      <ClientOnly>
        <ForumReply />
        <template #fallback>
          <div class="text-default-400 py-8 text-center text-sm">加载中…</div>
        </template>
      </ClientOnly>
    </div>

    <h2 class="mt-8 mb-1 text-xl font-semibold">对应论坛的哪些部分</h2>
    <PropsTable head="论坛组件" :rows="mapping" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">源码</h2>
    <p class="text-default-600 mb-3">
      自包含单文件组件 —— 把 mock adapter 换成论坛的真实端点即可上生产:
    </p>
    <Code :code="ForumReplySrc" lang="vue" />

    <p class="text-default-500 mt-6 text-sm">
      这正是 P4「论坛接入」要做的事:用 <code>@kungal/editor-nuxt</code> +
      <code>&lt;KunEditor&gt;</code> 替换论坛内置的
      <code>components/kun/milkdown</code>,传入真实 adapters。
    </p>
  </article>
</template>
