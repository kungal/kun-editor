---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

`<KunEditorToolbar>` gains an `items` prop to reorder / subset the buttons.

Previously the toolbar's button order was fixed, so a host that wanted a different
order had to rebuild a whole custom toolbar via the `#toolbar` slot — which drifts
from the default toolbar used elsewhere (e.g. a topic-edit page vs reply/comment).

Now pass `:items` — an ordered `KunToolbarItem[]` (`'heading' | 'bold' | 'italic'
| 'strike' | 'code' | 'bulletList' | 'orderedList' | 'quote' | 'codeBlock' | 'hr'
| 'spoiler' | 'image' | 'picker' | '|'`, where `'|'` is a divider):

```vue
<KunEditorToolbar v-bind="api" :items="['picker','|','bold','italic','|','image','|','heading']" />
```

Apply the same array to every editor for a consistent site-wide order without
rebuilding a toolbar. Defaults to the standard layout. `image`/`picker` are still
auto-dropped without their adapter/feature, and dividers collapse around removed
items. `KunToolbarItem` is exported from `@kungal/editor-vue`.
