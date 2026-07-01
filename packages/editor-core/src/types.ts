// KunEditor adapter contracts.
//
// The design rule this file encodes: **the editor ships the MECHANISM, the
// host injects the POLICY.** KunEditor owns the ProseMirror nodes/marks, the
// input rules, the keymaps, the markdown (de)serialization and the plugin
// wiring. It does NOT own where an image upload goes, how an @mention resolves
// to a user, what stickers exist, or how a toast is shown — those differ per
// host app (the forum, moyu, a future App). Each is a small injected adapter.
//
// This is the whole reason the forum's `components/kun/milkdown` folder cannot
// just be published as-is: today it hardcodes `kunFetch('/image/topic')`, the
// OAuth `/users/search` endpoint, `useMessage(10107)` and the forum's
// `ReplyReference` type. Extracting those into the adapters below is what makes
// the same editor reusable across the ecosystem. See docs/architecture.md.

/**
 * Uploads one image and resolves to the URL to embed. Called once per image
 * for toolbar picks, paste and drag-drop. Reject to abort that image (the
 * editor removes the in-flight upload placeholder).
 *
 * Forum today: `POST /image/topic` (multipart) → returns the URL string.
 */
export type UploadImage = (file: File) => Promise<string>

/** A user surfaced by @mention autocomplete. */
export interface MentionUser {
  /** Stable identity written into the document — never renumbered. */
  id: number
  /** Display name snapshot shown in the chip. */
  name: string
  /** Optional avatar (image hash or URL); the render layer decides. */
  avatar?: string
}

/**
 * Resolves an @mention query to candidate users. Debouncing/rate-limiting is
 * the render layer's job; this is the raw fetch. Should be abortable-friendly
 * (return quickly; the caller drops stale results by sequence number).
 *
 * Forum today: OAuth `GET /users/search?keyword=` (must NOT be cached).
 */
export type SearchMentionUsers = (query: string) => Promise<MentionUser[]>

/** A sticker/emoji the picker can insert (rendered as an image node). */
export interface StickerItem {
  /** Image URL to embed. */
  src: string
  /** Alt text / shortcode. */
  name: string
}

/** A named group of stickers shown as one tab in the picker. */
export interface StickerPack {
  name: string
  stickers: StickerItem[]
}

/** Supplies the sticker packs the picker shows. Omit to hide the sticker UI. */
export type StickerSource = () => StickerPack[] | Promise<StickerPack[]>

/** Severity for host-surfaced editor notices. */
export type NotifyLevel = 'info' | 'success' | 'warn' | 'error'

/**
 * How the editor tells the user something (e.g. "image too large"). The host
 * routes it to its own toast system.
 *
 * Forum today: `useMessage(code, level)`.
 */
export type Notify = (message: string, level: NotifyLevel) => void

/**
 * The full policy bundle a host passes when constructing the editor. Every
 * field is optional: omit `uploadImage` for an image-free editor (the galgame
 * 简介 case), omit `searchMentionUsers` to drop @mentions, etc. What is present
 * decides which plugins are wired.
 */
export interface KunEditorAdapters {
  uploadImage?: UploadImage
  searchMentionUsers?: SearchMentionUsers
  stickerSource?: StickerSource
  notify?: Notify
}

/** BCP-47-ish UI language for the editor chrome (toolbar labels, placeholders). */
export type KunEditorLocale = 'zh-cn' | 'en-us' | (string & {})

/** Which optional plugins to enable. Absent adapters override these to false. */
export interface KunEditorFeatures {
  /** ||spoiler|| hidden text. Default: true. */
  spoiler?: boolean
  /** @mentions. Requires `searchMentionUsers`. Default: on when adapter present. */
  mention?: boolean
  /** LaTeX via katex (inline `$…$` and block `$$…$$`). Requires the katex peer. Default: true. */
  katex?: boolean
  /** Fenced code blocks with CodeMirror. Requires the codemirror peers. Default: true. */
  codeBlock?: boolean
  /** Sticker/emoji picker. Requires `stickerSource`. Default: on when adapter present. */
  sticker?: boolean
}
