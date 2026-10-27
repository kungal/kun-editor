# @kungal/editor-core

## 0.39.1

### Patch Changes

- 411255b: 修复 0.39.0 的 `KunEditorToolbar.vue` 让宿主的 `vue-tsc` 报错,实体样式只作用于编辑器内

  - `@kungal/editor-nuxt` 以 `.vue` 源码发布,宿主会对它做类型检查。0.39.0 在模板里直接写了 `entityPopoverEl?.close()`,而这个 `let` 只在 ref 回调里被重新赋值,TS 的流分析在模板表达式里把它收窄成 `null`,于是报 `Property 'close' does not exist on type 'never'`。现在改为调用脚本里的 `closeEntityPopover()`,行为不变。
  - 参考样式表里 `.kun-entity`、`.kun-entity-card`、`.kun-entity-chip`(及其 `__body` / `__fallback` / 选中描边)改为只在 `.kun-editor__wysiwyg` 内生效。宿主在**发布后的帖子**里渲染自己的同名类时,不会再被全站引入的 `editor.css` 改样式。弹层类(`.kun-entity-menu*` / `.kun-entity-slash*` / `.kun-entity-picker*`)名字独特,保持不变。

## 0.39.0

### Minor Changes

- 1306ca3: 实体引用:话题 / Galgame / 资源 / 用户等站内实体显示为块级卡片或行内引用,存储形式仍是裸的规范 URL

  **markdown 契约(与服务端共用,存储格式不变):** 规范 URL 本身就是引用。链接只有在「裸」的时候才是实体链接 —— 文本等于 href(`<https://…>`、GFM 字面量 `https://…`、`[u](u)`)且宿主的 `entityFromUrl(href)` 认得它。一个段落里(去掉纯空白文本)只有这一个链接 → **卡片**(引用块、列表项里同样成立,列表项第一个块也可以是卡片);其余位置 → **行内**(标题、表格单元格、`**<url>**` 都是行内)。代码、行内代码、`||隐藏文本||` 里永远不是。`[自定义文字](url)` 是普通链接,永不升级。两者都序列化回 `<规范 URL>`,所以 `https://kungal.com/topic/1/` 读入后保存为 `<https://www.kungal.com/topic/1>`。

  **适配器(都在 `KunEditorAdapters`,全部可选):**

  - `entityFromUrl(url) → { type, id, url } | null` —— 开关整个功能;`url` 返回规范的绝对 URL。抛错 / 返回畸形值视为「不是实体」。
  - `searchEntities(type, query, signal)`、`entityTypes: { type, label, icon? }[]` —— 「/」菜单与工具栏选择器。
  - `entityTitle(ref, signal) → string | null` —— 「转为链接」写入的标题。
  - 新增 `features.entity`(默认开,缺 `entityFromUrl` 时无效)。

  **渲染由宿主提供:** `<KunEditor :entity-view="{ card, chip }">`,两个组件都收到 `{ entity, selected }`,自己取预览并预留最终尺寸(编辑器不额外包会改变尺寸的东西,预览晚到不跳动)。不传时退化为显示 URL 的中性样式。编辑器内不跳转。参考样式表新增 `.kun-entity*`、`.kun-entity-menu*`、`.kun-entity-slash*`、`.kun-entity-picker*` 与 gap cursor 样式(遵守 `prefers-reduced-motion`)。

  **一条规则,所有入口:**

  - **粘贴**单个实体 URL:粘进空段落 → 卡片(光标落到其后一段),夹在文字中 → 行内。转换是**单独一个撤销步**:第一次 Ctrl+Z 变回**纯文本** URL(不是普通链接 —— 裸实体链接按契约就是行内,保存后会变回去),第二次撤掉粘贴;撤销过的 URL 之后接空格 / 回车不会再被转换。随后在节点旁出现 `卡片 / 行内 / 链接` 小气泡:不抢焦点、不截获回车,<kbd>Tab</kbd> 进入,←/→ 移动,回车应用,Esc 关闭,继续打字即消失。
  - **自动链接**:手机键盘剪贴板条整条提交同粘贴;手打的 URL 按回车且独占一段 → 卡片,按空格 → 行内。输入法组字期间不转换。
  - **「/」菜单**:段首或空白后输入 `/`,列出 `entityTypes`;继续输入过滤类型,选中后在文档里直接输入搜索词(防抖、可中止、过期结果丢弃,有加载 / 无结果状态),↑/↓/回车 选择;段落为空 → 卡片,否则行内。`role="listbox"` + 编辑器上的 `aria-activedescendant`。Esc 在搜索词为空时只删掉 `/`;空搜索词时退格回到类型列表。
  - **程序化**:工具栏 API 与 ref 句柄新增 `insertEntity(ref, display?)`(`'card' | 'chip' | 'auto'`,默认 `auto`);`KunEditorToolbar` 新增 `entityPicker` 按钮(默认布局里排在图片后,缺适配器自动隐藏);选择器面板以 `KunEntityPicker` 导出,供自定义工具栏使用。
  - **选中**卡片 / 行内(点击、轻触、方向键,卡片前后有 gap cursor):气泡 `卡片 / 行内 / 链接 / 删除`;回车在卡片后新开一段;选中时打字落在其后,不会覆盖;退格 / Delete 整块删除;复制的 text/plain 是 URL,text/html 带 data-\* 属性,粘回来仍是同一个节点。「链接」写成 `[标题](url)`(标题来自 `entityTitle`,缺席 / 失败 / 超过 1.5 秒时用去掉 scheme 的 URL)。

  **自动链接顺带修正:** 中文后面直接接网址(`看这个https://example.com/x` 再按空格)现在也会变成链接,和粘贴同一段文字时 GFM 的读法一致;只在网址前一个字符是非 ASCII(中文、全角标点)时生效,`x.https://a.com` 这类仍然不动。

## 0.38.4

### Patch Changes

- 8dcc220: 手打的网址在按空格或回车那一下变成链接,紧接着撤销一次只撤掉链接

  0.38.3 让「一次输入整段插进来的网址」变成链接;手打的网址仍然是纯文本,而纯文本网址会被序列化器转义成 `https\://…`(正是为了它以后不被读成链接),发出去的帖子上点不了 —— 和下游报的「手机上加不了超链接」是同一个抱怨。

  现在(`createLinkPlugin()` 里的同一个插件,预设默认启用,纯逻辑):**按空格或回车那一下,光标前面那个词如果整段恰好是一个链接**(用粘贴所用的同一个 markdown 解析器判定,所以 `www.…`、邮箱和粘贴时一样),就给它加上链接,保存为 `<https://…>`。GitHub、Discord、Telegram、Notion 都是这样做的。

  - **紧接着撤销一次,只撤掉链接、保留文字**(空格 / 换行也留着)—— 给真想留纯文本的人一条退路;再撤一次才是撤销打字本身。
  - 打到一半的网址不转:还没有边界,单个按键也永远不是一整个链接。
  - 代码块、行内代码、已有链接、剧透里不转;一个词如果前半截带着别的格式(比如加粗的 `https://` 后面接普通文字),也不只转后半截。
  - 回车:硬件键盘的 keydown 与虚拟键盘的 `beforeinput`(`insertParagraph` / `insertLineBreak`,常见于 keyCode 229)都能识别;Shift+回车(换行)同样算边界。
  - 输入法组字中不动它,等 `compositionend` 再加,和 0.38.3 一样。中文输入法用空格选字不受影响(上屏的是汉字,不是空格)。

  无破坏性变更。

## 0.38.3

### Patch Changes

- cac6a81: 一次输入整段插进来的网址会自动变成链接,和粘贴一样

  下游报的问题:手机上复制链接再插进编辑器,不会自动变成超链接。

  真正的粘贴(长按「粘贴」、Ctrl+V)一直会变:Milkdown 的剪贴板插件把文本当 markdown 读,GFM 的裸链接识别把它变成链接。但安卓输入法的**剪贴板栏**(Gboard、搜狗、百度……)根本不触发 paste,它像打出一个词一样把整段文字提交进来,所以网址一直是纯文本。这不只是「编辑时不是蓝的」:序列化器会把纯文本网址转义成 `https\://…`(正是为了它以后不被读成链接),发出去的帖子上它也点不了。

  新增(在 `createLinkPlugin()` 里,预设默认启用,纯逻辑):**一次输入插进来的文本,如果整段恰好是一个链接**(由粘贴所用的同一个 markdown 解析器判定,所以 `www.…`、邮箱都和粘贴时一样),就给它加上链接,保存为 `<https://…>`。三种情况不转:

  - 在代码块或行内代码里;
  - 已经在链接里(剧透里也不转 —— 剧透只装纯文本);
  - 逐字打出来的网址:每次按键都是单独一次输入,几个字符永远不是一整个链接,打到一半不会变蓝。

  输入法在前后带的空格不算进链接;链接后面接着打的字不会跟进链接。输入法组字过程中不动它,等 `compositionend` 再加(和输入规则一样 —— 组字中改样式会把组字打断);加链接这一步和那次输入在同一个撤销步骤里,撤销一次全部撤掉。

  无破坏性变更。

- 8c798e2: 剧透里的网址不再在第二次打开时把收尾的 `||` 吞进链接

  下游报的问题:引用块里放一个链接再隐藏,第一次编辑正常,第二次打开就把右边的 `||` 当成了链接的一部分;再保存,帖子里就成了一条坏链接。

  根因:GFM 的裸链接识别(micromark 的 autolink literal)不会在 `|` 处停下,所以 `||https://a.com||` 在剧透的 remark 转换运行**之前**,收尾的 `||` 就被吞进了链接 —— mdast 里是文字 `||` 加一个指向 `https://a.com||` 的链接,没有哪个文字节点装着完整的一对 `||`,剧透就没了。再保存会写出 `||<https://a.com||>`,任何渲染器读出来都是一条以 `||` 结尾的坏链接。服务端的 linkify 遇到 `|` 会停,所以第一次保存看起来没问题。

  修法(`remarkSpoilerPlugin`):落在**未闭合的 `||` 里**、且收尾的 `||` 在它里面或后面的**裸链接**(GFM 字面链接或 `<…>`,也就是文字就是网址本身的链接),先还原成文字、和前后文字合并,再按原来的规则配对。这一步不丢任何东西 —— 剧透本来就只装纯文本(`marks: ''`),装不下链接。

  - `||https://…||`、`||www.…||`、`||me@a.com||`、`||看 https://… 这个||` 都会得到同一个剧透,打开、保存多少次都一样。剧透里的网址存成 `https\://…`(序列化器对纯文本网址的既有转义,防止它被再读成链接)。
  - 已经坏成 `||<https://…||>` 的旧内容,**打开再保存一次即可自愈**。
  - 不在剧透里的裸链接不受影响;`[文字](链接)` 这种带自己文字的链接不会被拆(拆了会丢网址),原样保留。

  无破坏性变更。

## 0.38.2

### Patch Changes

- 4dbe38b: 删 @提及 / #楼层 引用块时光标不再跳行,手机键盘不再收起又弹出

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

## 0.38.1

### Patch Changes

- f078b5b: KunUI 工具栏的链接面板不再抢着聚焦,页面不会被弹到顶部

  下游报的两个 bug:① 滚到页面中部点「链接」,整页跳回顶部;② 编辑器放进 `KunModal` /
  `KunDrawer` 时,链接面板里的输入框一个字都打不进去。

  两个都属实,但根因都在 KunUI 侧,且 `@kungal/ui-vue` **2.26.0 已经全部修好**(库里每一处
  主动 `focus()` 都带 `preventScroll`;浮层面板会登记进开它的那个弹窗的焦点陷阱)。

  这里只做一件事:**把工具栏链接面板上那个多余的 `:autofocus="true"` 删掉。**
  `KunPopover` 打开时本来就会带着 `preventScroll` 聚焦面板里第一个可聚焦元素 ——
  输入框自己的挂载聚焦比它早一拍,发生在 floating-ui 量出位置**之前**,此时 teleport 到
  `<body>` 的面板还停在文档原点(实测 `getBoundingClientRect().top === -1440`),
  浏览器「滚动到该元素」就把整页拉回了顶部。这个 prop 从来没做过 popover 没做对的事,
  删掉之后即使宿主的 KunUI 还没升到 2.26.0,也不会再跳顶。

  第二个问题(弹窗里的焦点陷阱)编辑器这一侧无解 —— 面板是 KunUI teleport 的,陷阱也是
  KunUI 建的。**编辑器放进 `KunModal` / `KunDrawer`,请把 `@kungal/ui-vue` 升到 2.26.0 及以上**,
  这一点已写进 `@kungal/editor-nuxt` 的 README 与文档的「Nuxt 接入」页(那页还加了一个
  「弹窗里的编辑器」实测 demo)。

  无破坏性变更:面板照样自动聚焦,行为不变。

## 0.38.0

### Minor Changes

- 0f3ceab: 隐藏文本:编辑时看得出被隐藏,光标锚点不再进入存库的 markdown

  - **剧透块的底色不再依赖宿主 token。** 原来是 `background: var(--color-default-500)`,
    没有 fallback —— 宿主没定义这个调色板变量时整条声明作废,实测算出来是
    `rgba(0, 0, 0, 0)`:编辑时剧透块和正文长得一模一样。而「零 CSS 的 headless 编辑器」
    正是这样的宿主。现在自带一份不依赖任何设计 token 的默认底色(由 `currentColor`
    混出,明暗主题都成立),并留出 `--kun-spoiler-bg` 这个换肤钩子 —— 内联样式压得过
    任何选择器,但压不过自定义属性,所以这是宿主唯一能用纯 CSS 改它的入口。
    `@kungal/editor-nuxt/editor.css` 把它映射成 `--color-default-200`,KunUI 宿主观感不变。
  - **光标锚点(`U+200B`)只留在编辑器文档里,不再写进 markdown。** 锚点是编辑器的
    内部装置(光标必须落在某个 text 节点上),但它一直跟着正文一起被序列化出去,存库的
    文本会变成 `鲲 ||Galgame||<U+200B> 论坛` —— 数据库、diff、以及每一个不认识本编辑器的
    下游都得吃下这个看不见的字符。现在在 **serializer** 这一层统一剥掉:`getMarkdown()`、
    `v-model`、源码视图、宿主自己的 action 都读同一个 slice,所以一处收口全部干净;
    从旧内容或粘贴带进来的锚点也一并清掉 —— **旧帖打开再保存一次就自愈**。
    解析时反过来给每个 `||…||` 补回锚点,所以「点在段尾的剧透块后面接着打字,字落在
    块外面」这件事和以前一样成立。

  对下游没有破坏性改动:markdown 少了一个不可见字符,DOM 结构与命令行为不变。

## 0.37.0

### Minor Changes

- a473708: 隐藏文本:选区里的换行不再写出读不回来的 markdown,选区气泡里也有了这颗按钮

  - **`insertKunSpoilerCommand` 把选区里的换行折成空格。** `||…||` 在每一个读它的地方
    都只在同一行内配对(这里的 remark 转换、共用同一语法的服务端渲染器),而 commonmark 的
    hardbreak 声明了 `leafText: () => '\n'` —— 所以选中跨行的文字点「隐藏文本」,按钮会写出
    `||第一行\n第二行||`:一段它自己都读不回来、渲染出来是两条光秃秃竖线的 markdown。现在
    `textBetween` 的**两个**分隔符都给 `' '`(块级的本来就是),跨行选区并成一个单行 spoiler。
  - **选区里一个字都没有时返回 `false`**,而不是把选中的东西替换掉 —— 单独选中一张图片点
    「隐藏文本」不再删图。(选中的是节点、或在代码块里,原本就已经返回 `false`。)
  - **选区气泡工具栏加入 `spoiler`**:`KunSelectionItem` 多一个成员,默认那一排变成
    `bold / italic / strike / code / spoiler / link`。按下态走已有的 `activeMarks.spoiler`,
    光标在 spoiler 里时按钮点亮、点一下揭示,和固定工具栏完全一致。
  - 顺手把气泡默认按钮表收成**一份** `DEFAULT_SELECTION_ITEMS`(`context.ts`)。原本
    `<KunEditor>` 和气泡各存一份,只改气泡那份等于没改 —— 真实编辑器读的是 context 那份。

  **跨行剧透不在此列**:`||…||` 是行内语法(schema `inline: true`,mdast 里开闭两个 `||`
  根本落在不同的 text 节点上),要藏整段多行内容需要的是一个块级容器语法,得全生态(渲染器
  先行)另行约定,不是把 `||…||` 拉长。

## 0.36.0

### Minor Changes

- f7c65c2: fix(editor): the spoiler toolbar button hides the selection instead of deleting it

  `insertKunSpoilerCommand` built an EMPTY `kun-spoiler` node and dropped it over
  the selection with `replaceSelectionWith`, so clicking 隐藏文本 with text selected
  deleted the text and left a bare `||||` — and the next thing typed landed
  outside the node, so nothing was hidden either. The JSDoc said "wraps the
  current selection"; the code never wrapped anything.

  The command now covers the three cases the `||…||` syntax does:

  - **a selection** → its text moves inside the node. The schema is `marks: ''`
    (inline formatting cannot round-trip through `||…||`), so bold is what's
    dropped, never the words. Selections spanning paragraphs collapse into one
    spoiler; select-all (an `AllSelection`) works too.
  - **an empty selection** → a new spoiler with the caret INSIDE it: type and it
    is hidden. It holds a zero-width caret anchor, because a caret cannot sit in
    an inline node with no text node in it — the serializer strips anchors, and a
    spoiler holding nothing else serializes to nothing, so a stray click cannot
    leave `||||` behind.
  - **the caret already inside a spoiler** → reveal it, leaving the text selected.
    Nesting would have produced `||||text||||`, which reads back as nothing.

  The button is therefore a toggle, and both toolbars (the headless one and the
  KunUI one in `@kungal/editor-nuxt`) now show it pressed while the caret is
  inside a spoiler — `KunToggleMark` gains a `'spoiler'` member for that, so
  `activeMarks` carries one more key.

  It returns `false` — no document change — inside a code block and with a node
  selected (an image is not text; replacing it would delete it).

## 0.35.0

### Minor Changes

- c90e1b9: fix(link): give a typed URL the scheme it needs, in ONE place

  Typing `www.kungal.com/topic/1` into any link input produced a **relative**
  href: with no scheme the browser resolves it against the current page, so the
  link went to `<origin>/<current/path>/www.kungal.com/topic/1` — dead, and dead
  in a way the author can't see while writing.

  `insertLinkCommand` now normalizes its `href`, and since every link entry point
  (the selection bubble's input, the headless toolbar's URL panel, the KunUI
  toolbar's popover, and a host's own `linkPrompt` adapter) dispatches that one
  command, all of them are fixed at once — a host must not re-implement this.

  - `www.kungal.com/topic/1` → `https://www.kungal.com/topic/1` (https, not http:
    an http-only site redirects, an https-only site doesn't). Ports, queries,
    fragments and bare IPv4 hosts included.
  - `me@kungal.com` → `mailto:me@kungal.com` (`https://` would read the address as
    userinfo and go nowhere).
  - Untouched: anything with a scheme — `kungal-user:` / `kungal-reply:` included
    — and anything explicitly relative (`/x`, `./x`, `../x`, `#x`, `?x`, `//host`).
  - The one ambiguous input is a lone dotted word: `readme.md` looks exactly like
    a hostname (`.md` is a TLD), so it gets `https://`. Write `./readme.md` when a
    relative file is what you mean.

  The rule is also exported as `normalizeLinkHref(input)` from the light,
  zero-dependency `@kungal/editor-core` entry, so a server can normalize legacy
  content with the exact same logic.

  Along with it, the three URL inputs move from `type="url"` to `type="text"` +
  `inputmode="url"`. Native URL validation rejects exactly the schemeless input
  this change exists to accept — in the KunUI toolbar's popover, which submits a
  real `<form>`, pressing Enter on `www.kungal.com/topic/1` did nothing at all.
  The mobile keyboard hint is kept.

## 0.34.0

### Minor Changes

- ab7fbc2: No native `prompt` left: the headless toolbar gets a link URL panel too

  0.33.0 gave the selection bubble an inline URL input; the fixed (headless)
  toolbar still popped `window.prompt`. It now opens a small panel under the link
  button — Enter applies, Esc cancels, clicking outside closes, and the editor
  gets focus back. Same behaviour as the bubble otherwise: an existing href is
  prefilled (and selected), and with nothing selected the URL is inserted as
  linked text. A panel rather than an in-place swap because a fixed toolbar row
  that rearranges itself is jarring; the bubble is already a floating layer, so
  there the swap is the right shape.

  **Breaking (CSS hook, one version old):** `.kun-editor__bubble-input` →
  `.kun-editor__link-input`. Both entry points render the same input, so the hook
  is named after the thing, not the place. Hosts importing
  `@kungal/editor-nuxt/editor.css` need no change; a copied stylesheet wants the
  rename plus the two new hooks:

  ```css
  .kun-editor__link {
    position: relative;
  } /* structural */
  .kun-editor__link-panel {
    position: absolute;
  } /* structural */
  .kun-editor__link-input {
    /* shared by the toolbar panel and the bubble */
  }
  ```

  `linkPrompt` keeps taking precedence over all three built-in entries (bubble
  input, toolbar panel, KunUI popover), so a host modal is still one override.

## 0.33.0

### Minor Changes

- 9294ba2: Insert a link from the selection bubble without a native `prompt`

  Selecting text → 「链接」 used to pop `window.prompt`. The bubble now asks for the
  URL **in place**: the button row swaps for a URL input (`data-mode="link"`),
  Enter applies, Esc cancels, and the row comes back. If the selection is already
  a link its href is prefilled (and selected), so editing a URL is the same flow.

  Why in place, and not a popover/dialog: the bubble is a Milkdown tooltip whose
  `shouldShow` keeps it alive only while focus is in the editor **or inside the
  bubble element**. Any popover teleports its panel to `<body>` — outside that
  element — so the bubble would hide the moment the panel's input took focus. An
  input in our own DOM keeps the bubble put, and the ProseMirror selection
  survives the DOM blur, so the link wraps exactly what was selected.

  Still headless: a plain `<input>` plus one new class hook.

  ```css
  .kun-editor__bubble[data-mode="link"] {
    /* the URL-entry state */
  }
  .kun-editor__bubble-input {
    /* the input itself */
  }
  ```

  Hosts that want their own UI keep the escape hatch — the `linkPrompt` adapter
  takes precedence over the inline input, exactly as it does over the KunUI
  toolbar's popover.

  Also in the shipped reference stylesheet (`@kungal/editor-nuxt/editor.css`): the
  selection bubble, the @mention dropdown and the sticker/emoji picker painted
  themselves with `--color-background` — KunUI's _glassy page_ tint (0.7 alpha) —
  so document text showed through a panel floating over it. They now use the
  RAISED surface token the KunUI popovers use, via one overridable var:

  ```css
  :root {
    --kun-editor-surface: var(--color-content1, var(--color-background));
  }
  ```

## 0.32.1

### Patch Changes

- 814c98f: Drive toolbar and bubble toggle-mark state from one editor plugin view, and keep the orphan-link cleanup out of undo history.

  The previous Milkdown-listener + per-toolbar `refresh()` pair leaked subscriptions, missed stored-mark toggles for 200ms, and left the selection bubble without a pressed state. A single ProseMirror `view.update` plugin now writes one reactive record that the toolbar, the `#toolbar` slot, and the bubble all read. The leftover stored-link cleanup is marked `addToHistory: false`.

## 0.32.0

### Patch Changes

- 35bc140: Stop the link mark from leaking onto text typed after a link is deleted.

  A link is a mark, so deleting its text left the link as a ProseMirror STORED
  mark — the pending mark re-applied to the next keystroke — which is why typing
  right after deleting a link kept producing linked text (the Space keymap only
  cleared it while you kept typing). A new `$prose` plugin now clears the stored
  link mark the moment the cursor is no longer inside a link, so the next
  keystroke starts un-linked text.

## 0.31.1

### Patch Changes

- b7fe837: Fix a long `placeholder` overflowing the editor, and ship the reference
  stylesheet from the layer.

  The placeholder is a decoration (`.kun-editor__placeholder` +
  `data-placeholder`) rendered by the host's `::before` rule. That rule was
  absolutely positioned with **no positioned ancestor**, so the browser laid it
  out against the viewport: a long placeholder ran past the editor's right edge —
  and could even paint over the toolbar — instead of wrapping inside it. The
  empty block is now the containing block, and the text wraps (`width: 100%` +
  `overflow-wrap: break-word`):

  ```css
  .kun-editor__placeholder {
    position: relative;
  }
  .kun-editor__placeholder::before {
    content: attr(data-placeholder);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow-wrap: break-word;
  }
  ```

  Because that CSS lived only in the docs app, every host had a _copy_ — an
  upstream style fix could never reach them. The reference stylesheet now ships
  with `@kungal/editor-nuxt`, so hosts can import it and get fixes with a version
  bump (copying it still works):

  ```css
  @import "@kungal/editor-nuxt/editor.css";
  ```

  `@kungal/editor-vue` is unchanged and still headless (zero CSS).

## 0.31.0

## 0.30.0

## 0.29.0

## 0.28.0

### Minor Changes

- 8d278e5: Make the insert-link URL entry customizable via a `linkPrompt` adapter.

  The headless toolbar and the selection bubble asked for the link URL with the
  native `window.prompt` (the KunUI toolbar used an inline popover). Hosts can now
  supply their own UI instead — a modal, an article picker, etc.:

  ```ts
  const adapters = {
    // …uploadImage, notify…
    linkPrompt: async ({ text }) => await openLinkModal(text), // return the URL, or null to cancel
  };
  ```

  - **editor-core**: new `LinkPrompt` type + `linkPrompt?` on `KunEditorAdapters`.
    It receives the selected text (to prefill / search).
  - **editor-vue**: the default toolbar and the selection bubble use `linkPrompt`
    when supplied, else fall back to `window.prompt`.
  - **editor-nuxt**: when `linkPrompt` is set, `<KunEditorToolbar>`'s link button
    uses it instead of its inline popover — so one override covers every link entry
    point (toolbar, default toolbar, bubble).

  Verified in the docs production build: with a `linkPrompt` that derives a URL from
  the selected text, the selection bubble inserts
  `[…](https://example.com/search?q=…)` with no native dialog, and the KunUI
  toolbar link becomes a plain button (no popover); 0 console errors.

## 0.27.0

### Minor Changes

- ac86c0a: Add a heading-outline API for building a table of contents (TOC).

  A host (e.g. a desktop editor with a left-side outline) can now render its own TOC
  and navigate the editor, without reaching into editor internals:

  - **`@update:headings`** on `<KunEditor>` — emits the ordered outline
    (`KunHeading[]` = `{ level, text }`) whenever the content changes.
  - **`ref.scrollToHeading(index)`** — scrolls to that heading in the _current_ view
    and places the caret there: the WYSIWYG heading in wysiwyg mode, the CodeMirror
    heading line in source/split mode (so a click navigates the editable pane).
  - **editor-core** exports the pure `parseHeadings(markdown)` (and `KunHeading`) it's
    built on — usable server-side too. Parses ATX headings, skipping code fences.

  The TOC's styling, colour, indentation and layout (e.g. reserving space on the
  left of the split editor) are entirely the host's — the editor only exposes the
  data + navigation, matching the headless design.

  Verified in a new docs example (`/examples/toc`): the outline tracks the content;
  clicking an item scrolls + carets to that heading in wysiwyg (scrollTop 0→386,
  caret in the target) and in source (CodeMirror scrolled, cursor on `## …`); new
  `parseHeadings` unit tests pass; 0 console errors.

## 0.26.0

### Minor Changes

- 945708d: Add an insert-link feature (click to add a URL).

  The `link` mark already existed (so `[text](url)` round-trips and pasted URLs
  autolink), but there was no click-to-insert UI. Now there is:

  - **editor-core**: `insertLinkCommand` (`{ href, text? }`) — applies the link mark
    to the selection, or inserts linked text on an empty selection; clears the
    stored mark afterwards. Re-exported from `@kungal/editor-core/preset`.
  - **editor-vue**: `KunEditorToolbarApi.insertLink(payload)`; a `link` button in the
    default toolbar and the selection bubble (both default-on); `'link'` added to
    `KunToolbarItem` and `KunSelectionItem`. Headless UI prompts for the URL.
  - **editor-nuxt**: `<KunEditorToolbar>` gains a `link` button — a KunPopover with a
    KunInput for the URL.

  A link is a **mark** (`[text](url)`), deliberately distinct from the custom-NODE
  embeds (mention / quote). A future "article card" or custom component would be a
  node like those (schema + toUrl/fromUrl), not this — a separate mechanism.

  Verified in the docs production build: the KunUI toolbar popover wraps a selection
  (`[…](https://example.com)`); the selection bubble does too
  (`[linktext](https://kun.com)`); 4 new core tests (wrap / insert / autolink
  fallback / blank-href no-op) pass; 0 console errors.

## 0.25.2

## 0.25.1

## 0.25.0

## 0.24.0

## 0.23.0

## 0.22.0

## 0.21.0

## 0.20.0

## 0.19.0

## 0.18.0

### Minor Changes

- 6545866: Toolbar image upload now shows an in-document "uploading…" placeholder.

  Previously only paste/drop showed the in-flight placeholder (Milkdown's `upload`
  plugin); the toolbar image button uploaded silently — the image just popped in
  when the adapter resolved. Now the toolbar path uses the same placeholder UX
  (ProseMirror's official upload-example pattern).

  - **editor-core**: `startImageUpload(view, file, { uploadImage, notify, locale })`
    - the `imageUploadPlaceholder` decoration plugin (exported from `/preset`;
      wired by the preset when `uploadImage` is present). Inserts a
      `.kun-editor__uploading` widget at the caret, uploads, then replaces it with the
      image (or removes it + notifies on failure); not an undo step. The paste/drop
      placeholder now uses the same `.kun-editor__uploading` class so both look
      identical.
  - **editor-vue**: `KunEditorToolbarApi` gains `uploadImage(file)`; both the
    headless `EditorToolbar` and the `#toolbar` slot API route uploads through
    `startImageUpload`.
  - **editor-nuxt**: `<KunEditorToolbar>`'s image button uses it.
  - **Headless kept**: the placeholder is a class + widget hook only; style it via
    `.kun-editor__uploading` in the reference `kun-editor.css` (primary-colored).

  Customizable: style the placeholder via `.kun-editor__uploading`; the text is
  localized (zh/en). Verified in the docs production build: uploading via either
  toolbar inserts the image; the unit tests confirm the placeholder shows during a
  pending upload and is replaced on success / removed on failure.

## 0.17.0

### Minor Changes

- 59abbc8: Add a placeholder (empty-state text).

  - **editor-core**: `createPlaceholderPlugin({ text, mode })` — a `$prose` plugin
    that adds a ProseMirror node DECORATION to the empty block (`.kun-editor__placeholder`
    class + `data-placeholder` attribute). Same mechanism as Milkdown Crepe's v7
    placeholder feature — purely visual (a decoration), so it never enters the doc
    or the markdown output. `mode` `'block'` (default) shows on any empty block,
    `'doc'` only when the whole document is empty; skipped in readonly / code blocks
    / lists / tables. `createKunEditorPlugins(..., { placeholder, placeholderMode })`
    wires it (only when `placeholder` is non-empty). Exported from `/preset`.
  - **editor-vue**: `<KunEditor placeholder="…">` prop, threaded through.
  - **Headless**: the core ships only the class + `data-placeholder` hook; render it
    with `.kun-editor__placeholder::before { content: attr(data-placeholder) }` (added
    to the reference `kun-editor.css`, muted via a KunUI token).

## 0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Add `setHeadingCommand` — absolute block-type set (paragraph or heading level).

  commonmark ships `wrapInHeadingCommand` (a toggle) but no "set paragraph"
  command, so a "text size" dropdown (Paragraph / H1–H6, each option setting one
  exact level) couldn't be built from it. `setHeadingCommand` uses ProseMirror's
  `setBlockType`: `level` 0 → paragraph, 1–6 → heading. Exported from
  `@kungal/editor-core/preset`; drive it with `run(setHeadingCommand.key, level)`.

## 0.14.0

## 0.13.0

## 0.12.0

## 0.11.0

### Minor Changes

- f8fe64c: `mentionFromUrl` now also receives the link text.

  The mention-detection hook was `fromUrl(url)` — URL only — so a host couldn't
  replicate a text-based guard. moyu's server treats `/user/<id>` as a mention only
  when the link text starts with `@`; without the text, kun-editor would wrongly
  turn a real link like `[see here](/user/5/x)` into a mention.

  `mentionFromUrl` / `MentionUrlConfig['fromUrl']` are now
  `(url: string, text: string) => number | null` — the remark transform passes the
  link's plain text (concatenated across children). Backward compatible: existing
  `(url) => …` handlers still type-check and behave the same; the default
  `kungal-user:` scheme ignores the text.

  ```ts
  mentionFromUrl: (url, text) => {
    if (!text.startsWith("@")) return null; // reproduce moyu's guard
    const m = url.match(/^\/user\/(\d+)/);
    return m ? Number(m[1]) : null;
  };
  ```

## 0.10.0

### Minor Changes

- ebe6c61: Make the @mention link URL form injectable (host policy).

  The mention markdown form was hardcoded to `[@name](kungal-user:<id>)`. But the
  URL shape is a server contract — different hosts render/parse it differently — so
  it's host policy, not editor mechanism. Two new (optional) `KunEditorAdapters`
  fields let a host define it:

  - `mentionToUrl(userId) => string` — build the link URL (default `kungal-user:<id>`)
  - `mentionFromUrl(url) => number | null` — parse a link back to a user id, or
    null if it isn't a mention (default: the `kungal-user:` scheme)

  `createMentionPlugin(config?)` now takes `{ toUrl, fromUrl }`; the preset threads
  the adapters through. Omit them for the unchanged default — fully backward
  compatible, no data migration.

  This unblocks downstream adoption (e.g. moyu, whose mentions are real
  `/user/<id>/resource` links): the host passes its own `mentionToUrl` /
  `mentionFromUrl`, existing content keeps working, and its server + goldmark
  renderer stay untouched. `insertMentionCommand` now resolves the node type by id
  from the live schema, so it works with any mention config.

## 0.9.0

## 0.8.0

## 0.7.0

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.0

## 0.2.0

### Minor Changes

- 6e1f780: P2 — port the adapter-driven Milkdown plugins into `editor-core/preset`.

  - `createUploadPlugin(uploadImage, { locale, notify })` — paste / drop / toolbar
    image upload built on `@milkdown/kit/plugin/upload`. The forum's hardcoded
    `kunFetch('/image/topic')` becomes the injected `uploadImage` adapter; a failed
    image is skipped (and reported via `notify`) instead of aborting the batch.
  - `createMentionPlugin()` — the `[@name](kungal-user:id)` mention atom + `$remark`
    round-trip. The schema is pure; the `@` autocomplete dropdown that consumes
    `searchMentionUsers` is a render-layer view (P3).
  - `createQuotePlugin()` — an inline reference atom, generalized per the
    architecture decision (option 1): the forum's `{ replyId, floor }` becomes an
    opaque `{ refId, label }` the host supplies via `insertQuoteCommand`. Markdown
    form `[label](kungal-reply:<refId>)`.

  `createKunEditorPlugins` now gates upload on the `uploadImage` adapter, wires the
  mention schema by default, and treats quote as opt-in (`features.quote`). Adds
  `QUOTE_SCHEME` to the light main entry (shared with the server, like
  `MENTION_SCHEME`) and a `quote` flag to `KunEditorFeatures`.

  Stickers need no core plugin — a sticker is a plain image node, so its picker is
  a P3 view over the `stickerSource` adapter.

  Covered by headless vitest: mention/quote markdown round-trips, the uploader
  (image filter + notify-on-failure), and preset feature gating.

## 0.1.0

### Minor Changes

- 0386d6d: P1 — port the pure Milkdown plugins into `editor-core`.

  Adds `@kungal/editor-core/preset` with `createKunEditorPlugins(adapters,
features, options)` — the composed Milkdown bundle (commonmark/gfm baseline +
  KunEditor plugins) — and the individual plugin factories:

  - `createSpoilerPlugin()` — `||hidden||` inline node with `$remark` round-trip
  - `createKatexPlugins()` — inline `$…$` and block `$$…$$` LaTeX (KaTeX)
  - `createCodeBlockPlugins(opts)` — CodeMirror code block (theme, languages,
    localized toolbar, `latex` preview)
  - `createStopLinkPlugin()` — Space clears the active link mark

  The main entry (`@kungal/editor-core`) stays light — types + `MENTION_SCHEME`,
  no runtime deps — so the server can import the scheme without the Milkdown /
  katex / codemirror peers. The heavier `@codemirror/*`, `@lezer/highlight` and
  `katex` peers are only needed when importing `/preset`.

  Covered by a headless vitest suite that round-trips markdown for spoiler,
  inline/block math and the full preset.
