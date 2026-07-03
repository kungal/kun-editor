// Sidebar navigation. Order lives here; labels come from site.config
// (displayLabel → "Spoiler (隐藏文本)") so the Chinese names live in one place.
import { displayLabel } from './site.config'

export interface NavItem {
  label: string
  to: string
}
export interface NavSection {
  title: string
  items: NavItem[]
}

const item = (to: string): NavItem => ({ label: displayLabel(to), to })

export const nav: NavSection[] = [
  {
    title: '开始使用',
    items: [
      { label: '简介', to: '/' },
      item('/getting-started'),
      item('/playground'),
      item('/changelog')
    ]
  },
  {
    title: '指南',
    items: [
      item('/guide/styling'),
      item('/guide/adapters'),
      item('/guide/features'),
      item('/guide/nuxt')
    ]
  },
  {
    title: '示例',
    items: [
      item('/examples/forum-reply'),
      item('/examples/kunui-toolbar'),
      item('/examples/toc'),
      item('/examples/image-dialog')
    ]
  },
  {
    title: '插件',
    items: [
      item('/plugins/spoiler'),
      item('/plugins/katex'),
      item('/plugins/code-block'),
      item('/plugins/mention'),
      item('/plugins/upload'),
      item('/plugins/quote'),
      item('/plugins/sticker')
    ]
  },
  {
    title: 'API 参考',
    items: [
      item('/reference/editor'),
      item('/reference/adapters'),
      item('/reference/core')
    ]
  }
]
