<script setup lang="ts">
// A reply editor + thread, reproducing how the KUN forum
// (kun-galgame-forum → components/topic/reply) uses the editor: KunUI supplies
// the panel chrome (card / buttons / avatar / chip / link + the footer with the
// Markdown hint and char count), <KunEditor> is the reply body, each floor's
// 「引用」 inserts a reference into the draft, and posted replies are rendered
// read-only by the SAME editor. The adapters are mocked here but annotated with
// the forum's real endpoints.
import { computed, ref } from 'vue'
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
import type { KunUser } from '@kungal/ui-vue'

const dot = (color: string): string =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><circle cx='32' cy='32' r='28' fill='${color}'/></svg>`

// Host policy — the forum wires these to its real backend (endpoints noted).
const adapters: KunEditorAdapters = {
  // forum: POST /image/topic (multipart) → returns the image URL
  uploadImage: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    }),
  // forum: OAuth GET /user/search?keyword= (never cached)
  searchMentionUsers: async (q) =>
    [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 42, name: 'Kun' }
    ].filter((u) => u.name.toLowerCase().includes(q.toLowerCase())),
  // forum: the sticker.kungal.com packs
  stickerSource: () => [
    {
      name: '默认',
      stickers: [
        { src: dot('%23f43f5e'), name: 'red' },
        { src: dot('%233b82f6'), name: 'blue' },
        { src: dot('%2322c55e'), name: 'green' }
      ]
    }
  ],
  // forum: useMessage(code, level)
  notify: (message, level) => {
    // eslint-disable-next-line no-console
    console.log(`[notify:${level}] ${message}`)
  }
}

interface Reply {
  id: number
  floor: number
  author: KunUser
  body: string
}

const replies = ref<Reply[]>([
  {
    id: 101,
    floor: 1,
    author: { id: 1, name: 'Alice' },
    body: '楼主这个 **Milkdown** 编辑器真好用!支持 `代码`、公式 $E=mc^2$。'
  },
  {
    id: 102,
    floor: 2,
    author: { id: 2, name: 'Bob' },
    body: '同意,而且能藏 ||剧透|| —— 点一下才显示。'
  }
])

const draft = ref('')
const publishing = ref(false)
let nextFloor = 3

// The editor's imperative handle (KunEditorExpose), via a template ref.
const editor = ref<InstanceType<typeof KunEditor>>()

// forum: clicking a floor's 「引用」 inserts `@author #floor` at the CARET —
// a live, cursor-level insert via insertMention + insertQuote (needs
// features.quote). Each inserts with a trailing space, so you get "@Alice #1 ".
const quote = (r: Reply) => {
  editor.value?.insertMention({ userId: r.author.id, name: r.author.name })
  editor.value?.insertQuote({ refId: String(r.id), label: `#${r.floor}` })
}

// Rough "字" count — strips the common markdown punctuation (forum uses
// markdownToText()).
const textCount = computed(
  () => draft.value.replace(/[#*`|>[\]()~$]/g, '').trim().length
)
const canPublish = computed(() => !!draft.value.trim())

const publish = () => {
  if (!canPublish.value) return
  publishing.value = true
  // forum: POST /topic/{id}/reply
  window.setTimeout(() => {
    replies.value.push({
      id: Date.now(),
      floor: nextFloor++,
      author: { id: 99, name: '我' },
      body: draft.value
    })
    draft.value = ''
    publishing.value = false
  }, 300)
}

const cancel = () => {
  draft.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Thread: each floor is author + #floor + read-only body + a 「引用」 button -->
    <KunCard v-for="r in replies" :key="r.id">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <KunAvatar :user="r.author" :is-navigation="false" />
          <span class="font-medium">{{ r.author.name }}</span>
          <span class="text-default-400 text-sm">#{{ r.floor }}</span>
        </div>
        <KunButton size="sm" variant="light" @click="quote(r)">
          <KunIcon name="lucide:quote" /> 引用
        </KunButton>
      </div>
      <KunEditor :model-value="r.body" :readonly="true" locale="zh-cn" />
    </KunCard>

    <!-- Reply editor — the forum's reply panel -->
    <KunCard>
      <div class="space-y-2">
        <KunEditor
          ref="editor"
          v-model="draft"
          :adapters="adapters"
          :features="{ quote: true }"
          locale="zh-cn"
        />

        <!-- The forum Editor.vue footer -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-default-500 flex items-center gap-1">
            <KunIcon name="lucide:circle-help" /> 回复面板使用帮助
          </span>
          <div class="flex shrink-0 items-center gap-2">
            <KunChip color="success">
              <KunIcon name="simple-icons:markdown" /> Markdown 支持
            </KunChip>
            <span>{{ textCount }} 字</span>
          </div>
        </div>
        <div class="text-default-500 text-sm">
          特殊语法: 您可以使用 ||隐藏文本|| 来隐藏图片或者文字 (目前依然禁止 R18
          图片内容)
        </div>

        <!-- The forum PanelBtn submit row -->
        <div class="flex justify-end gap-1">
          <KunButton color="danger" variant="light" @click="cancel">
            取消
          </KunButton>
          <KunButton
            :loading="publishing"
            :disabled="!canPublish"
            @click="publish"
          >
            确认发布
          </KunButton>
        </div>
      </div>
    </KunCard>
  </div>
</template>
