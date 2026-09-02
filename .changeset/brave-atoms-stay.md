---
'@kungal/editor-core': patch
'@kungal/editor-vue': patch
'@kungal/editor-nuxt': patch
---

删 @提及 / #楼层 引用块时光标不再跳行,手机键盘不再收起又弹出

下游报的问题:回复里 `@anjila #3 ` 这样的引用标记,按退格时光标先掉到下一行、再回来,
删两个块要抖两次;手机端每抖一次,键盘就收起再弹出一次。原因此前一直没查明。

根因有两层,都在「段落以一个不可编辑的行内原子节点结尾」这一刻:

1. **视觉跳行(桌面 + 手机都有)。** 尾随空格删掉后,段落最后一个节点是
   `contenteditable="false"` 的芯片。ProseMirror 为了让 Chrome / Safari 能在芯片后面画光标,
   会补一个 `<img class="ProseMirror-separator">` 和一个尾随 `<br>`。这个 img 本该是 0×0 的
   行内空元素,但宿主的通用 `img` 规则(Tailwind preflight 让所有 img `display:block`,
   论坛的 `.milkdown img` 又加了 `my-8` 外边距和边框)把它变成了块级盒子 —— `<br>` 连同光标
   被挤到下一行,段落高度翻倍(实测 24px → 48px),下一次退格删掉芯片后又缩回去,这就是抖动。
   ProseMirror 自己的样式表里有一条 "Protect against generic img rules" 的守卫,Milkdown
   不带那份样式表,`editor.css` 也一直没补 —— 现在补上了,`!important`,压过宿主的 prose 层。
2. **键盘闪烁(Android)。** 光标紧挨芯片时,基础 keymap 的退格命令全都不适用,ProseMirror 交给
   浏览器原生删;桌面上真实的 keydown 会触发 prosemirror-view 自己的兜底(`captureKeyDown`)
   用事务删掉节点,但虚拟键盘发的是 keyCode 229,兜底不会跑,浏览器原生删不可编辑元素
   「有时会失败」(prosemirror-view 原话),它对这种情况的回退是 **`view.dom.blur(); view.focus()`**
   再粗暴删一格 —— 那一对 blur/focus 就是键盘收起又弹出。

修法:

- `@kungal/editor-nuxt/editor.css` 新增结构性规则 `.kun-editor__wysiwyg img.ProseMirror-separator`
  (display:inline、0×0、无外边距无边框)。写自己样式表的宿主请把它一并带上 —— 文档「样式」页
  的结构性规则清单已加入。
- `@kungal/editor-core` 新增 `createInlineAtomPlugin()`(预设默认启用,纯逻辑):在 `beforeinput`
  的 `deleteContentBackward` / `deleteContentForward` 上,只要光标紧挨(或选中的就是)一个行内原子
  节点,就 `preventDefault` 并用**一个事务**删掉它 —— 硬件键盘、IME、虚拟键盘、右键菜单删除走的
  都是这一个事件,浏览器再也碰不到那个 `contenteditable=false` 元素,prosemirror-view 的
  blur/focus 回退没有机会触发。任何 `atom: true` 的行内节点(提及、引用、行内公式、以后的自定义
  芯片)自动享有;块级原子节点仍交给基础 keymap 的 `selectNodeBackward`。输入规则刚触发时的退格
  照旧先撤销规则(与基础 keymap 的顺序一致);IME 组合中不介入。

行为:`@anjila #3 ` 仍是 4 次退格(空格、芯片、空格、芯片 —— 空格是真实字符,与 Slack / Notion /
Google Docs 一致),但每一次都精确删一个单位,光标全程留在同一行。无破坏性变更。
