# @kungal/editor-vue

## 0.41.0

### Minor Changes

- 0563f9e: 拖动卡片、实体气泡动效、单独一行的链接只能是卡片、实体菜单隐藏滚动条、表情贴纸面板改回顶部标签 + 贴纸包行

  **拖动卡片(Notion 式):** 悬停或选中卡片时左侧渐显拖动手柄(手机上先轻触卡片,再长按手柄)。拖动时卡片半透明、略缩小的影子跟随指针,一条落点线在块之间滑动;松手后卡片与被挤开的块一起滑到新位置(FLIP,约 180ms)。Esc 取消,整个移动是一次撤销。键盘:选中卡片后 Alt+↑ / Alt+↓。卡片在其所在容器(文档顶层,或同一个引用块 / 列表项)内移动,只在容器内容规则允许时生效;每次移动各自是一个撤销步。核心导出 `moveEntityCard(tr, pos, dir)` / `moveEntityCardTo(tr, pos, slot)`,并把 Alt+↑/↓ 加入核心按键处理。

  **宿主组件不再被重新挂载:** ProseMirror 在节点往下移动、撤销重做时会销毁并重建节点视图。现在卡片 / 行内的宿主组件由 `<KunEditor>` 统一持有(实体池),节点视图只是借用它的容器;被释放的组件约 500ms 内无人认领才卸载。于是拖放、Alt 移动、撤销重做都不会让宿主组件重新挂载、重新取预览。顺带修正 Chrome 的一个怪癖:组件在光标旁晚一拍挂载后,Chrome 会把光标当成不可编辑(按键无效),现在会在挂载后重新落一次同一个光标。

  **单独一行的链接只能是卡片:** 按共享契约,独占一段的裸链接就是卡片,所以卡片(以及段落里除空白外只有它的行内引用)转成「行内」后保存会变回卡片。气泡里的「行内」此时显示为禁用(aria-disabled),提示「单独一行的链接总是显示为卡片」,键盘导航跳过它。核心导出 `entityDisplayPersists(doc, pos, display)`。

  **实体气泡动效(遵守 `prefers-reduced-motion`):** 「卡片 / 行内 / 链接 / 删除」气泡与粘贴后的小气泡淡入、上浮 4px、由 .98 缩放到 1(约 150ms ease-out),离开约 100ms;气泡开着时选中另一个卡片,会平滑滑过去而不是跳过去;拖动期间气泡隐藏。

  **实体菜单不显示滚动条:** 工具栏的类型菜单按内容自然高度展开,只有视口放不下时才滚动(由 floating-ui 算出的可用高度 `--kun-float-max-height` 决定),且滚动条隐藏(滚轮、触摸、键盘滚入视野照常)。「/」菜单仍最高 360px,同样隐藏滚动条。

  **表情 / 贴纸面板(取代 0.40 的底部分类栏):** 顶部标签「表情 | 贴纸」(KunUI 工具栏里是 KunTab,`KunStickerPanel` 的 `#tabs` 插槽可替换)。贴纸标签下是一行贴纸包:有记录时第一个是「最近使用」(时钟),其后每个包首张贴纸作封面(包名作提示与 aria-label),当前包高亮;这一行可横向滚动(滚轮、触摸,无滚动条),溢出时两端出现 ‹ › 按可见宽度翻页(减弱动效时瞬间跳转),到头的一侧隐藏。两个标签各有自己的「最近使用」(各 16 个,分别存于 `kun-editor:recent-emoji` / `kun-editor:recent-stickers`,读写容错,空时不显示)。键盘网格、懒加载图片、固定格子尺寸与 360px 宽度保持不变。

### Patch Changes

- Updated dependencies [0563f9e]
  - @kungal/editor-core@0.41.0

## 0.40.0

### Minor Changes

- 842c114: 实体搜索可交给宿主弹窗、「/」命令卡片重做、表情贴纸面板改为底部分类栏 + 连续滚动、工具栏按钮可覆盖图标与文案

  **宿主自己的实体搜索(`entityPrompt`):** 新增可选适配器 `entityPrompt({ type, display }) → Promise<EntityRef | null>`。提供后,「/」菜单里回车选中类型、或工具栏条目按钮的类型菜单里选中,都直接交给宿主弹窗(不再有内联搜索阶段);没有它时行为不变。编辑器先删掉 `/…`,把插入点存进插件状态并随后续编辑映射;resolve 引用即按 `display`(插入点所在段落为空 → `card`,否则 `chip`)插入,null 则只保留删掉的 `/…`;两种情况都把焦点与选区还给编辑器。插入点在弹窗期间被整段删掉时丢弃结果;宿主返回的引用须被本编辑器的 `entityFromUrl` 接受,否则丢弃;同一编辑器同时只开一个弹窗。核心导出 `promptForEntity(view, prompt, type, range?)` 与 `entityDisplayAt(doc, pos)`;工具栏 API 新增 `promptEntity(type)`。

  **`EntityTypeItem` 新增 `command?`(「/」关键字)与 `description?`(说明行)。**

  **「/」菜单重做:** 浮起的圆角卡片(柔和阴影),每行 20px 图标、`label`(原样显示)、其下灰色小字 `description`、右对齐等宽灰字 `/command`;当前行是带底色的圆角,悬停与键盘共用同一个当前行,并自动滚入视野。`/` 后的文字同时匹配 label 与 command(前缀优先,命中处高亮),可含空格;没有匹配时显示「没有匹配的卡片类型」,再输入空格即关闭。最高约 360px 可滚动,下方放不下时翻到光标上方,手机上限宽。图标:URL / data: 显示为图片,其他字符串是图标名,交给 `KUN_EDITOR_ICON` 注入的组件(`@kungal/editor-nuxt` 自动注入 KunIcon,所以 `lucide:…` 直接可用;`<KunEditor :icon-component>` 可单独指定),都没有时显示首字母方块。工具栏的类型菜单(`KunEntityTypePicker`,新导出)用同样的行。

  **表情 / 贴纸面板(`KunStickerPanel`,新导出,两套工具栏共用):** 约 360×380 的一个面板,一条连续滚动:「最近使用」→ 表情 → 每个贴纸包一节,小标题吸顶;底部分类栏(tablist)是时钟、笑脸、每个包首张贴纸作 28px 封面(包名作提示),溢出横向滚动;滚动时分类栏跟随高亮,点分类滚到对应一节(减弱动效时瞬间跳转)。「最近使用」保留最近 16 个,按浏览者存于 localStorage,所有读写容错,打开期间不重排,已不在当前贴纸包里的贴纸不再出现。贴纸 `loading="lazy"`、格子尺寸固定。键盘:网格一个 Tab 停靠点,方向键按格子实际位置移动,回车插入,Tab 到分类栏,←/→ 切换,Esc 关闭。≤640px 时手搓工具栏的面板贴底整宽;桌面上面板始终留在视口内。`KunEditorToolbar` 的贴纸弹层不再用 KunTab。

  **`KunEditorToolbar` 新增 `itemOverrides`:** `Partial<Record<KunToolbarItem, { icon?, label? }>>`,label 同时作为提示文字与 aria-label,适用于所有内置按钮(含文本大小、链接、图片、表情、条目)。

  **修复:** 插件视图(粘贴气泡、「/」菜单)拿到的 `view` 是 @prosemirror-adapter 每次更新时复制的快照,dispatch 后再读它的 state、focus 或 await 都是旧的。现在这些路径改用 Milkdown 的实时 EditorView。

### Patch Changes

- Updated dependencies [842c114]
  - @kungal/editor-core@0.40.0

## 0.39.1

### Patch Changes

- 411255b: 修复 0.39.0 的 `KunEditorToolbar.vue` 让宿主的 `vue-tsc` 报错,实体样式只作用于编辑器内

  - `@kungal/editor-nuxt` 以 `.vue` 源码发布,宿主会对它做类型检查。0.39.0 在模板里直接写了 `entityPopoverEl?.close()`,而这个 `let` 只在 ref 回调里被重新赋值,TS 的流分析在模板表达式里把它收窄成 `null`,于是报 `Property 'close' does not exist on type 'never'`。现在改为调用脚本里的 `closeEntityPopover()`,行为不变。
  - 参考样式表里 `.kun-entity`、`.kun-entity-card`、`.kun-entity-chip`(及其 `__body` / `__fallback` / 选中描边)改为只在 `.kun-editor__wysiwyg` 内生效。宿主在**发布后的帖子**里渲染自己的同名类时,不会再被全站引入的 `editor.css` 改样式。弹层类(`.kun-entity-menu*` / `.kun-entity-slash*` / `.kun-entity-picker*`)名字独特,保持不变。

- Updated dependencies [411255b]
  - @kungal/editor-core@0.39.1

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

### Patch Changes

- Updated dependencies [1306ca3]
  - @kungal/editor-core@0.39.0

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

- Updated dependencies [8dcc220]
  - @kungal/editor-core@0.38.4

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

- Updated dependencies [cac6a81]
- Updated dependencies [8c798e2]
  - @kungal/editor-core@0.38.3

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

- Updated dependencies [4dbe38b]
  - @kungal/editor-core@0.38.2

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

- Updated dependencies [f078b5b]
  - @kungal/editor-core@0.38.1

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

### Patch Changes

- Updated dependencies [0f3ceab]
  - @kungal/editor-core@0.38.0

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

### Patch Changes

- Updated dependencies [a473708]
  - @kungal/editor-core@0.37.0

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

### Patch Changes

- Updated dependencies [f7c65c2]
  - @kungal/editor-core@0.36.0

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

### Patch Changes

- Updated dependencies [c90e1b9]
  - @kungal/editor-core@0.35.0

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

### Patch Changes

- Updated dependencies [ab7fbc2]
  - @kungal/editor-core@0.34.0

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

### Patch Changes

- Updated dependencies [9294ba2]
  - @kungal/editor-core@0.33.0

## 0.32.1

### Patch Changes

- 814c98f: Drive toolbar and bubble toggle-mark state from one editor plugin view, and keep the orphan-link cleanup out of undo history.

  The previous Milkdown-listener + per-toolbar `refresh()` pair leaked subscriptions, missed stored-mark toggles for 200ms, and left the selection bubble without a pressed state. A single ProseMirror `view.update` plugin now writes one reactive record that the toolbar, the `#toolbar` slot, and the bubble all read. The leftover stored-link cleanup is marked `addToHistory: false`.

- Updated dependencies [814c98f]
  - @kungal/editor-core@0.32.1

## 0.32.0

### Minor Changes

- 7dd7f71: Show an active state on the toolbar's toggle marks (bold / italic /
  strikethrough / inline code).

  The toolbar buttons ran the toggle commands but never reflected whether the
  mark was on, so a user could not tell if bold (etc.) was engaged. The
  `#toolbar` slot API now exposes a reactive `activeMarks` map (bold / italic /
  strike / code), recomputed from the ProseMirror selection on selection and doc
  changes and immediately after each command. `<KunEditorToolbar>` renders the
  pressed buttons with the primary "active" look (same as hover) and sets
  `aria-pressed`; the headless `EditorToolbar` sets `data-active` for the
  `.kun-editor__tool[data-active='true']` style.

### Patch Changes

- Updated dependencies [35bc140]
  - @kungal/editor-core@0.32.0

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

- Updated dependencies [b7fe837]
  - @kungal/editor-core@0.31.1

## 0.31.0

### Minor Changes

- 6b3a2f7: Add a loading placeholder and make `<KunEditor>` SSR-safe.

  Under SSR the editor area went blank for a moment while Milkdown hydrated (and it
  could throw a hydration mismatch, since Milkdown/CodeMirror need the DOM). Now:

  - The editor body mounts **client-side only**; the server and the first client
    paint render just a **skeleton placeholder**, which hydrates cleanly before the
    editor swaps in — no mismatch, and the area never collapses to nothing. So
    `<KunEditor>` no longer needs to be wrapped in `<ClientOnly>`.
  - The placeholder also covers Milkdown's own create gap, using its `loading` state
    (`useEditor().loading`), then disappears when the editor is ready.
  - **`@update:loading`** event — so a host can react (e.g. disable a submit button
    until ready).
  - **`#loading` slot** to supply your own placeholder (e.g. a `<KunSkeleton>`), or
    restyle the default via the `.kun-editor__loading` / `.kun-editor__skeleton`
    class hooks (a shimmer added to the reference stylesheet).

  Verified in the docs production build: the server HTML contains only the skeleton
  (no editor DOM); the page hydrates with 0 console errors (mismatch gone); the
  placeholder shows on first paint and on every remount and is removed once the
  editor is ready.

### Patch Changes

- @kungal/editor-core@0.31.0

## 0.30.0

### Patch Changes

- @kungal/editor-core@0.30.0

## 0.29.0

### Minor Changes

- 8609e53: Add an `insertImage({ src })` primitive so hosts can build a rich image dialog.

  The editor already had `uploadImage(file)` (adapter-backed, in-document
  "uploading…" placeholder). The missing piece for a custom image dialog — insert by
  URL, or re-insert from an upload history — was a way to insert an image from a
  ready URL. Added:

  - `KunEditorToolbarApi.insertImage({ src, alt?, title? })` — for a dialog dropped
    into the `#toolbar` slot.
  - `KunEditorExpose.insertImage(...)` and `KunEditorExpose.uploadImage(file)` — the
    same two, on the `<KunEditor>` template ref, to drive image insertion from
    anywhere.

  The dialog UI (KunPopover, drag-drop, "recent" history) stays entirely the host's,
  matching the headless design and how TipTap/ProseMirror split this
  (`setImage(url)` command + host-provided upload UI). Drop the built-in image
  button with `:items` and render your own next to `<KunEditorToolbar>`.

  Verified in a new docs example (`/examples/image-dialog`): a host dialog inserts
  by URL (`api.insertImage`), uploads one or many picked files via the host's own
  uploader then inserts each, keeps a "recent" history, and re-inserts on click; the
  built-in image button is dropped via `:items`; 0 console errors.

### Patch Changes

- @kungal/editor-core@0.29.0

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

### Patch Changes

- Updated dependencies [8d278e5]
  - @kungal/editor-core@0.28.0

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

### Patch Changes

- Updated dependencies [ac86c0a]
  - @kungal/editor-core@0.27.0

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

### Patch Changes

- Updated dependencies [945708d]
  - @kungal/editor-core@0.26.0

## 0.25.2

### Patch Changes

- 8e1b8ac: Fix the source pane rewriting raw markdown in split/source mode.

  Typing `>` turned into `> <br />`, and `~~` / `**` / `[` became `\~\~` / `\*\*` /
  `\[` in the markdown source. Cause: those are Milkdown's WYSIWYG→markdown
  serialization (empty-blockquote → `<br />`, and remark-stringify escaping special
  characters) — correct when Milkdown is the editor, but in split/source mode the
  CodeMirror source owns the raw markdown, and the read-only preview was echoing its
  re-serialized markdown back into the shared `v-model`, clobbering what you typed.

  Fix: the WYSIWYG editor now emits only when it is the ACTIVE editor (WYSIWYG
  mode). In source/split mode it's a derived preview and never writes back, so the
  source keeps your exact raw markdown. The preview still renders it correctly.

  Verified in the docs production build (split mode): `> `, `~~strike~~`,
  `**bold**`, and a lone `>` all stay verbatim in the source (no `<br />`, no
  backslash escapes); WYSIWYG-mode editing still updates the value; 0 console errors.

  - @kungal/editor-core@0.25.2

## 0.25.1

### Patch Changes

- 177df55: Fix the cursor jumping to the start when editing the source pane in split mode.

  Typing a character on an empty line (or deleting the first character of a line)
  in the split-view source editor jumped the caret back to the document start. Cause:
  a feedback loop — the source (CodeMirror) edit updated the shared `v-model`, the
  read-only WYSIWYG preview re-rendered and echoed its _re-serialized_ (normalized)
  markdown back into `v-model`, and CodeMirror then rebuilt its whole state
  (`setState`) to match, resetting the selection.

  Two fixes:

  - **MilkdownEditor** no longer echoes changes it applied from an external
    `v-model` update (it only emits genuine user edits), so the preview stops
    feeding normalized markdown back.
  - **MarkdownSource** now re-syncs external changes with a content-replacing
    transaction that preserves (clamps) the selection, instead of a full `setState`
    rebuild — so the caret and undo history survive.

  Verified in the docs production build (split mode): typing `x y z` on an empty
  line yields `xyz` in order; deleting the first char of a line keeps the caret on
  that line; 0 console errors.

  - @kungal/editor-core@0.25.1

## 0.25.0

### Minor Changes

- a103220: Placeholder: default to `'doc'` mode + expose `placeholderMode`.

  The placeholder used to appear on **every empty line** (the cursor's empty
  block) — that's the Milkdown/Notion `'block'` behavior, which was the default but
  is surprising for a reply/comment editor. `<KunEditor>` now defaults to `'doc'`:
  the placeholder shows **only while the whole editor is empty** (the conventional
  empty-state hint), and the new `placeholderMode` prop opts back into per-line
  `'block'`:

  ```vue
  <KunEditor v-model="md" placeholder="写点什么…" />
  <!-- only when empty -->
  <KunEditor v-model="md" placeholder="写点什么…" placeholder-mode="block" />
  <!-- on each empty line -->
  ```

  (The lower-level `createKunEditorPlugins(..., { placeholderMode })` /
  `createPlaceholderPlugin` still default to `'block'` for parity with Crepe; the
  opinion lives in the `<KunEditor>` component.)

  Verified in the docs production build: empty editor shows the placeholder; typing
  a line then Enter (an empty line in a non-empty doc) does not; `placeholder-mode="block"`
  brings back the per-line hint. 47 core tests pass (incl. new doc-vs-block cases).

### Patch Changes

- @kungal/editor-core@0.25.0

## 0.24.0

### Minor Changes

- 5c981df: The selection bubble toolbar's buttons are now configurable.

  `<KunEditor>`'s `selectionToolbar` prop now accepts `boolean | KunSelectionItem[]`:

  ```vue
  <KunEditor v-model="md" />
  <!-- default 4 buttons -->
  <KunEditor v-model="md" :selection-toolbar="['bold', 'italic']" />
  <!-- reorder / subset -->
  <KunEditor v-model="md" :selection-toolbar="false" />
  <!-- off -->
  ```

  `KunSelectionItem` is `'bold' | 'italic' | 'strike' | 'code' | '|'` (`'|'` a
  divider), exported from `@kungal/editor-vue`. The resolved items reach the bubble
  (a plugin view) through the editor context; dividers collapse around removed
  items. The bubble's **look** is (and was) styled via the `.kun-editor__bubble` /
  `.kun-editor__bubble-btn` class hooks — headless, no new API.

  Verified in the docs production build: an editor with
  `:selection-toolbar="['bold','italic']"` shows a 2-button bubble while the default
  shows 4; 0 console errors.

### Patch Changes

- @kungal/editor-core@0.24.0

## 0.23.0

### Minor Changes

- 78e637e: `<KunEditor>` gains a `views` prop to control which view modes the switch offers.

  The split view is great on a full editor but heavy in a small reply/comment box —
  and there was no way to opt out per-editor (all or nothing). Now pass `views`:

  ```vue
  <!-- edit page: all three (default) -->
  <KunEditor v-model="md" />
  <!-- reply / comment: no split -->
  <KunEditor v-model="md" :views="['wysiwyg', 'source']" />
  <!-- just WYSIWYG: the switch bar is hidden entirely -->
  <KunEditor v-model="md" :views="['wysiwyg']" />
  ```

  - Default `['wysiwyg', 'source', 'split']`. The view switch renders only the
    offered modes, and disappears when a single mode is offered. If `views` changes
    to exclude the active mode, it falls back to the first offered.
  - `KunEditorViewSwitchApi` gains `views`; the default view switch and
    `<KunEditorViewSwitch>` (editor-nuxt) both render from it.

  Verified in the docs production build: an editor with `:views="['wysiwyg','source']"`
  shows only 预览/Markdown (no 分栏), while default editors still show all three; 0
  console errors.

### Patch Changes

- @kungal/editor-core@0.23.0

## 0.22.0

### Minor Changes

- fbbb761: Add a selection bubble toolbar (floating format menu on text selection).

  Selecting text now shows a floating inline-format menu (bold / italic /
  strikethrough / inline code) over the selection — the Medium/Notion pattern. It's
  built the Milkdown v7 way: a tooltip plugin view (`@milkdown/kit/plugin/tooltip`'s
  `tooltipFactory` + `TooltipProvider`, rendered via `@prosemirror-adapter/vue` —
  the same plugin-view mechanism as the @mention dropdown). `TooltipProvider`
  handles show/hide/positioning (floating-ui): shown only on a non-empty text
  selection while focused, and never when read-only (so it's inert in the split
  preview). Buttons run the same toggle commands as the fixed toolbar.

  - `<KunEditor>` gains a `selectionToolbar` prop (default `true`; set `false` to
    disable).
  - Headless: the bubble is class hooks only (`.kun-editor__bubble` /
    `.kun-editor__bubble-btn`, with `[data-show]`), like the @mention dropdown —
    styled by the reference `kun-editor.css`. editor-vue still ships zero CSS.

  Verified in the docs production build: selecting text shows the positioned bubble;
  clicking bold marks the selection (`**…**`); collapsing the selection hides it; 0
  console errors.

### Patch Changes

- @kungal/editor-core@0.22.0

## 0.21.0

### Minor Changes

- 9556a51: `<KunEditorToolbar>` gains an `items` prop to reorder / subset the buttons.

  Previously the toolbar's button order was fixed, so a host that wanted a different
  order had to rebuild a whole custom toolbar via the `#toolbar` slot — which drifts
  from the default toolbar used elsewhere (e.g. a topic-edit page vs reply/comment).

  Now pass `:items` — an ordered `KunToolbarItem[]` (`'heading' | 'bold' | 'italic'
| 'strike' | 'code' | 'bulletList' | 'orderedList' | 'quote' | 'codeBlock' | 'hr'
| 'spoiler' | 'image' | 'picker' | '|'`, where `'|'` is a divider):

  ```vue
  <KunEditorToolbar
    v-bind="api"
    :items="['picker', '|', 'bold', 'italic', '|', 'image', '|', 'heading']"
  />
  ```

  Apply the same array to every editor for a consistent site-wide order without
  rebuilding a toolbar. Defaults to the standard layout. `image`/`picker` are still
  auto-dropped without their adapter/feature, and dividers collapse around removed
  items. `KunToolbarItem` is exported from `@kungal/editor-vue`.

### Patch Changes

- @kungal/editor-core@0.21.0

## 0.20.0

### Minor Changes

- 62e14f5: Split view: sync scrolling between the panes, with an off switch.

  Scrolling the markdown source pane now scrolls the WYSIWYG preview to the same
  position (and vice-versa) — proportional/percentage sync (source↔preview line
  mapping is impractical across two separate renderers), with an active-pane +
  idle-timeout guard so the echoed scroll doesn't feed back into a loop.

  Turn it off two ways (for downstream customization):

  - **`scrollSync` prop** on `<KunEditor>` (default `true`) — pass
    `:scroll-sync="false"` to disable entirely.
  - **A runtime toggle** in the view switch: `KunEditorViewSwitchApi` gains
    `scrollSync` / `toggleScrollSync()` (+ `labels.scrollSync`). The default view
    switch shows a 同步滚动 toggle in split mode; `<KunEditorViewSwitch>` (editor-nuxt)
    shows a KunUI link/unlink toggle button. Or replace the whole control via the
    `#view-switch` slot.

  Sync needs each pane to scroll internally, so the reference `kun-editor.css` now
  gives split panes a bounded height (`--kun-editor-split-height`, default `60vh`,
  overridable) with `overflow: auto`. editor-vue still ships zero CSS.

  Verified in the docs production build (headless + KunUI view switches): with the
  panes overflowing, scrolling the source drives the preview to the same ratio;
  toggling off makes them scroll independently; toggling on resumes; 0 console
  errors.

### Patch Changes

- @kungal/editor-core@0.20.0

## 0.19.0

### Minor Changes

- f111b82: Add a desktop **split view** for long-form writing.

  `<KunEditor>` now has a third view mode, `split`, alongside WYSIWYG and Markdown:
  an editable markdown source pane + a live **read-only WYSIWYG preview**, side by
  side and left/right swappable. The markdown string stays the single source of
  truth and the preview is derived — the industry-standard model (VS Code /
  StackEdit / Dillinger), so there's no two-editor bidirectional-sync problem.

  - **editor-vue**: the view mode gains `'split'`; `KunEditorViewSwitchApi` gains
    `swap()` / `swapped` and `labels.split` / `labels.swap`. The WYSIWYG becomes a
    read-only preview in split (its editability now reacts to the `readonly` prop).
    The default hand-rolled view switch gets a 分栏 tab + a ⇄ swap button.
  - **editor-nuxt**: `<KunEditorViewSwitch>` gets the 分栏 KunTab + a KunUI swap
    button (shown in split).
  - **Headless**: the layout is class hooks only — `.kun-editor__panes` /
    `.kun-editor__pane` under `[data-mode='split']` (+ `[data-swap]`). Styled by the
    reference `kun-editor.css`: stacked on narrow screens, side-by-side (swappable)
    from `md` up. editor-vue still ships zero CSS.

  Verified in the docs production build (headless + KunUI view switches): 分栏 shows
  both panes side by side, typing markdown in the source updates the preview live,
  the WYSIWYG preview is `contenteditable=false`, swap reverses the panes; 0 console
  errors. (Synced scrolling between panes is a possible follow-up.)

### Patch Changes

- @kungal/editor-core@0.19.0

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

### Patch Changes

- Updated dependencies [6545866]
  - @kungal/editor-core@0.18.0

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

### Patch Changes

- Updated dependencies [59abbc8]
  - @kungal/editor-core@0.17.0

## 0.16.0

### Patch Changes

- @kungal/editor-core@0.16.0

## 0.15.0

### Minor Changes

- a7273bb: Toolbar: headings become one "text size" dropdown; remove the formula button.

  - **Headings → a single "text size" control** (Paragraph / H1–H6) instead of
    three H1/H2/H3 buttons — the modern standard, and it can set Paragraph (reset),
    which the old toggle buttons couldn't. The headless `EditorToolbar` uses a
    native `<select>` (new `.kun-editor__heading-select` class hook); the KunUI
    `<KunEditorToolbar>` uses a `<KunPopover>` with each level shown at its own size
    (like the forum). Both drive `setHeadingCommand`.
  - **Remove the math/formula button.** With no selection it inserted an empty
    inline-math node (a broken formula box). Math is entered via the existing
    `$…$` / `$$` input rules instead — the ecosystem norm (prosemirror-math). The
    spoiler button stays.

### Patch Changes

- Updated dependencies [a7273bb]
  - @kungal/editor-core@0.15.0

## 0.14.0

### Minor Changes

- 506813b: Add a `#view-switch` slot and a KunUI view switch — the Preview/Markdown tabs are
  now a swappable layer too.

  `<KunEditor>` exposes a `#view-switch` scoped slot whose props are
  `KunEditorViewSwitchApi` (`mode` / `setMode` / `labels`). The hand-rolled tabs
  are the slot's fallback — omit the slot and nothing changes. This lets a host
  render a real component (or anything) for the view switch and drive the editor
  via `setMode`, without reaching into internals.

  `@kungal/editor-nuxt` ships `<KunEditorViewSwitch>` (auto-imported): the tabs as a
  real `<KunTab variant="underlined">` (keyboard nav, sliding indicator, a11y):

  ```vue
  <KunEditor v-model="md">
    <template #view-switch="s"><KunEditorViewSwitch v-bind="s" /></template>
    <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
  </KunEditor>
  ```

  Same "headless core + optional KunUI layer" pattern as `#toolbar` /
  `<KunEditorToolbar>`: `@kungal/editor-vue` stays UI-kit-free (default tabs), the
  KunUI ecosystem gets native chrome. Exports `KunEditorViewSwitchApi`.

### Patch Changes

- @kungal/editor-core@0.14.0

## 0.13.0

### Patch Changes

- @kungal/editor-core@0.13.0

## 0.12.0

### Minor Changes

- 5786594: Add a `#toolbar` slot and a KunUI toolbar — the toolbar is now a swappable layer.

  `<KunEditor>` exposes a `#toolbar` scoped slot whose props are the command API
  (`KunEditorToolbarApi`: `run(cmdKey, payload)` / `insertText` / `insertQuote` /
  `insertMention` / `focus` / `adapters` / `features` / `locale`). The API is
  computed inside the Milkdown providers and handed down, so a custom toolbar can
  live in the consumer's tree without `useInstance`/`inject`. The hand-rolled
  default toolbar is the slot's fallback — omit the slot and nothing changes.

  `@kungal/editor-nuxt` ships `<KunEditorToolbar>` (auto-imported): the same
  toolbar built with **KunButton / KunIcon / KunTooltip / KunPopover** (real tooltip
  delay, popover focus/collision, a11y):

  ```vue
  <KunEditor v-model="md" :adapters="adapters">
    <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
  </KunEditor>
  ```

  This keeps `@kungal/editor-vue` **headless / zero UI-kit dependency** (any Vue app
  can use it with the default toolbar) while the KunUI ecosystem (forum, moyu) gets
  native chrome — the "headless core + optional UI layer" pattern (TipTap UI,
  BlockNote's swappable toolbar). Also exports `EMOJI` from `@kungal/editor-vue` for
  building custom pickers.

### Patch Changes

- @kungal/editor-core@0.12.0

## 0.11.0

### Patch Changes

- Updated dependencies [f8fe64c]
  - @kungal/editor-core@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [ebe6c61]
  - @kungal/editor-core@0.10.0

## 0.9.0

### Minor Changes

- 8b86a68: Add an imperative handle to `<KunEditor>` for cursor-level inserts.

  A `<KunEditor>` template ref now exposes `KunEditorExpose`:

  - `insertQuote({ refId, label })` — insert a reference atom
    (`[label](kungal-reply:refId)`) at the caret (requires `features.quote`)
  - `insertMention({ userId, name })` — insert an @mention atom at the caret
  - `focus()` — focus the WYSIWYG editor

  ```ts
  const editor = ref<InstanceType<typeof KunEditor>>();
  editor.value?.insertMention({ userId: 1, name: "Alice" });
  editor.value?.insertQuote({ refId: "101", label: "#1" });
  ```

  This is what the forum's per-floor 「引用」 needs — a live, cursor-level insert of
  `@author #floor` (each command inserts with a trailing space), rather than
  editing the markdown string. Works in either view (the WYSIWYG editor stays
  mounted in source mode too). Exported type: `KunEditorExpose`.

### Patch Changes

- @kungal/editor-core@0.9.0

## 0.8.0

### Minor Changes

- c0908c5: Make `<KunEditor>` headless — ship zero CSS.

  **BREAKING** (pre-1.0): the `@kungal/editor-vue/style.css` export is removed. The
  component now renders only stable class hooks (`.kun-editor__*`,
  `.kun-mention-dropdown*`) and `data-*` state; all styling is the host's.

  Migration: copy the reference stylesheet
  `apps/docs/app/assets/css/kun-editor.css` (themed with KunUI tokens) into your
  app and import it, or write your own targeting the same hooks. Also import each
  enabled peer's CSS (e.g. `katex/dist/katex.min.css`). The reference stylesheet
  carries the two structural rules the editor needs (ProseMirror `white-space`,
  popover positioning / show-hide).

  Also drops the unused `@kungal/ui-vue` peer dependency — the editor no longer
  references any UI kit, so it installs in any Vue 3 app.

### Patch Changes

- @kungal/editor-core@0.8.0

## 0.7.0

### Minor Changes

- 4968c96: P3 (complete) — replace the source-mode `<textarea>` with a CodeMirror editor.

  The "Markdown" tab is now a real CodeMirror editor with markdown syntax
  highlighting, reusing the code block's `kunCM` theme (from
  `@kungal/editor-core`) so the source view and code blocks match. Edits sync back
  through `v-model` to the WYSIWYG view; the view is mounted on demand (CodeMirror
  measures poorly while hidden).

  Adds `@codemirror/lang-markdown` alongside the CodeMirror packages the editor
  already needs (declared as optional peers; externalized from the build so the
  host dedupes them). This finishes the P3 dual-view editor: WYSIWYG + toolbar +
  @mention dropdown + sticker/emoji picker + CodeMirror source.

### Patch Changes

- @kungal/editor-core@0.7.0

## 0.6.0

### Minor Changes

- a4cbd3a: P3 — add the sticker / emoji picker to the toolbar.

  A merged popover (ported from the forum's sticker + emoji Containers):

  - **Emoji tab** — a built-in curated unicode set, inserted as plain text. No
    adapter, always available.
  - **Sticker tab** — appears only when the host supplies the `stickerSource`
    adapter; loads packs lazily on first open and inserts each sticker as an image
    node (`insertImageCommand`). Stickers are images, so an image-free editor gets
    emoji only.

  Self-contained (no `@kungal/ui-vue`): a plain trigger button + a click-outside
  popover, themed via CSS variables. Gated by `features.sticker` (default on). The
  `KunEditorContext` now also carries `features` so views can read the flags.
  Verified end-to-end in a browser via `apps/playground` (emoji → text; sticker →
  image node in the v-model markdown).

### Patch Changes

- @kungal/editor-core@0.6.0

## 0.5.0

### Minor Changes

- 53a2769: P3 — add the formatting toolbar to `<KunEditor>`.

  A self-contained `EditorToolbar` (WYSIWYG mode, hidden when read-only) with:
  bold / italic / strikethrough / inline code, H1–H3, bullet & ordered lists,
  blockquote, code block, divider, spoiler and LaTeX — plus an image-upload button
  that appears only when the host supplies `uploadImage`.

  Ported from the forum's `Menu.vue` + `_buttonList.ts`, but kept dependency-free:
  inline SVG icons (no `@kungal/ui-vue`), themed via CSS variables so a KunUI host
  still gets matching colours. It reaches the editor with `useInstance()` and fires
  commands via `callCommand`; command keys are read at click time (they're only
  populated once the editor is created). Verified end-to-end in a browser via
  `apps/playground`.

### Patch Changes

- @kungal/editor-core@0.5.0

## 0.4.0

### Minor Changes

- 56f4a77: P3 — wire the `@mention` autocomplete dropdown.

  Typing `@` in `<KunEditor>` now opens a debounced, keyboard-navigable dropdown
  (ported from the forum's `MentionDropdown.vue`) that resolves users through the
  injected `searchMentionUsers` adapter and inserts a mention chip serializing to
  `[@name](kungal-user:id)`. Without the adapter the mention schema still
  round-trips — there's just no autocomplete.

  The adapter reaches the dropdown via a `provide()` on `<KunEditor>`: because
  @prosemirror-adapter/vue renders plugin views as portals that are _siblings_ of
  the editor (children of `<ProsemirrorAdapterProvider>`), only an ancestor of the
  provider can inject into them. Verified end-to-end in a real browser via the new
  `apps/playground` dev app.

### Patch Changes

- @kungal/editor-core@0.4.0

## 0.3.0

### Minor Changes

- 62b2dad: P3 (in progress) — `<KunEditor>` is now a real Milkdown dual-view editor.

  Replaces the P0 textarea scaffold with a WYSIWYG view built from
  `@kungal/editor-core/preset` (`createKunEditorPlugins` — spoiler / katex /
  code-block / mention / upload / stop-link), plus a markdown-source view, bound to
  one `v-model`. Wires the Milkdown + ProseMirror adapter providers and handles
  external-value sync without cursor-resetting feedback loops.

  The public prop/emit surface is unchanged (`v-model`, `adapters`, `features`,
  `locale`, `readonly`), so P0 integrations keep working. View state is
  per-instance (fixes the forum's module-level `activeTab` singleton that would
  cross-wire two editors on a page).

  Still to come in P3 (they build on `@kungal/ui-vue`): the rich formatting
  toolbar, the `@mention` autocomplete dropdown, the sticker/emoji picker, and the
  CodeMirror markdown-source view (currently a `<textarea>`).

### Patch Changes

- @kungal/editor-core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [6e1f780]
  - @kungal/editor-core@0.2.0

## 0.1.0

### Patch Changes

- Updated dependencies [0386d6d]
  - @kungal/editor-core@0.1.0
