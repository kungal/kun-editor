---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

实体搜索可交给宿主弹窗、「/」命令卡片重做、表情贴纸面板改为底部分类栏 + 连续滚动、工具栏按钮可覆盖图标与文案

**宿主自己的实体搜索(`entityPrompt`):** 新增可选适配器 `entityPrompt({ type, display }) → Promise<EntityRef | null>`。提供后,「/」菜单里回车选中类型、或工具栏条目按钮的类型菜单里选中,都直接交给宿主弹窗(不再有内联搜索阶段);没有它时行为不变。编辑器先删掉 `/…`,把插入点存进插件状态并随后续编辑映射;resolve 引用即按 `display`(插入点所在段落为空 → `card`,否则 `chip`)插入,null 则只保留删掉的 `/…`;两种情况都把焦点与选区还给编辑器。插入点在弹窗期间被整段删掉时丢弃结果;宿主返回的引用须被本编辑器的 `entityFromUrl` 接受,否则丢弃;同一编辑器同时只开一个弹窗。核心导出 `promptForEntity(view, prompt, type, range?)` 与 `entityDisplayAt(doc, pos)`;工具栏 API 新增 `promptEntity(type)`。

**`EntityTypeItem` 新增 `command?`(「/」关键字)与 `description?`(说明行)。**

**「/」菜单重做:** 浮起的圆角卡片(柔和阴影),每行 20px 图标、`label`(原样显示)、其下灰色小字 `description`、右对齐等宽灰字 `/command`;当前行是带底色的圆角,悬停与键盘共用同一个当前行,并自动滚入视野。`/` 后的文字同时匹配 label 与 command(前缀优先,命中处高亮),可含空格;没有匹配时显示「没有匹配的卡片类型」,再输入空格即关闭。最高约 360px 可滚动,下方放不下时翻到光标上方,手机上限宽。图标:URL / data: 显示为图片,其他字符串是图标名,交给 `KUN_EDITOR_ICON` 注入的组件(`@kungal/editor-nuxt` 自动注入 KunIcon,所以 `lucide:…` 直接可用;`<KunEditor :icon-component>` 可单独指定),都没有时显示首字母方块。工具栏的类型菜单(`KunEntityTypePicker`,新导出)用同样的行。

**表情 / 贴纸面板(`KunStickerPanel`,新导出,两套工具栏共用):** 约 360×380 的一个面板,一条连续滚动:「最近使用」→ 表情 → 每个贴纸包一节,小标题吸顶;底部分类栏(tablist)是时钟、笑脸、每个包首张贴纸作 28px 封面(包名作提示),溢出横向滚动;滚动时分类栏跟随高亮,点分类滚到对应一节(减弱动效时瞬间跳转)。「最近使用」保留最近 16 个,按浏览者存于 localStorage,所有读写容错,打开期间不重排,已不在当前贴纸包里的贴纸不再出现。贴纸 `loading="lazy"`、格子尺寸固定。键盘:网格一个 Tab 停靠点,方向键按格子实际位置移动,回车插入,Tab 到分类栏,←/→ 切换,Esc 关闭。≤640px 时手搓工具栏的面板贴底整宽;桌面上面板始终留在视口内。`KunEditorToolbar` 的贴纸弹层不再用 KunTab。

**`KunEditorToolbar` 新增 `itemOverrides`:** `Partial<Record<KunToolbarItem, { icon?, label? }>>`,label 同时作为提示文字与 aria-label,适用于所有内置按钮(含文本大小、链接、图片、表情、条目)。

**修复:** 插件视图(粘贴气泡、「/」菜单)拿到的 `view` 是 @prosemirror-adapter 每次更新时复制的快照,dispatch 后再读它的 state、focus 或 await 都是旧的。现在这些路径改用 Milkdown 的实时 EditorView。
