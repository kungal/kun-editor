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
 * Ask the user for a link URL — provide this to show your OWN UI (a modal, an
 * article picker…) instead of the built-in entry: the selection bubble's inline
 * URL input, the headless toolbar's URL panel, or the KunUI toolbar's popover.
 * Gets the currently selected text (to prefill or search). Return the URL, or a
 * falsy value to cancel. One override covers every link entry point.
 *
 * The URL you return is normalized like any other (a schemeless host gets
 * `https://`), so a picker can hand back whatever it has. See
 * `normalizeLinkHref`.
 */
export type LinkPrompt = (
  context: { text: string }
) => string | null | undefined | Promise<string | null | undefined>

/**
 * A reference to a host entity (a topic, a galgame, a user…) that the editor
 * shows as a card or an inline chip. `type` / `id` are opaque to the editor —
 * only the host knows what they mean. `url` is the CANONICAL URL, and it is
 * the reference: the stored markdown is nothing but that URL, so it must be
 * absolute (`https://…`) for the `<url>` form to exist.
 */
export interface EntityRef {
  type: string
  id: string
  url: string
}

/** One result of an entity search, as the `/` menu and the picker list it. */
export interface EntityHit {
  ref: EntityRef
  title: string
  subtitle?: string
  /** Image URL; the render layer decides how (or whether) to show it. */
  thumbnail?: string
}

/** One entry of the `/` menu and the picker's type tabs, in host order. */
export interface EntityTypeItem {
  type: string
  /** The row title, shown as given (no suffix is added). */
  label: string
  /** Icon: a URL / data: URI renders as an image; any other string is an icon
   * NAME handed to the host's icon component (the Nuxt layer wires KunIcon, so
   * `lucide:…` names work there). */
  icon?: string
  /** The `/` keyword (`galgame`, `galgame-rate`) — shown right-aligned as
   * `/command`, and typed after `/` to filter, like the label. */
  command?: string
  /** One muted line under the title (`搜索并插入 Galgame 条目`). */
  description?: string
}

/** How an entity reference shows in the document. `link` is an ordinary
 * `[title](url)` link — no longer an entity at all. */
export type EntityDisplay = 'card' | 'chip' | 'link'

/**
 * Recognize an entity URL. Return the reference (with the CANONICAL url), or
 * `null` for anything that is not one. Called with a link's href, so it gets
 * whatever the author wrote — any host spelling, a trailing slash, a
 * root-relative path. Must be pure and fast: it runs on parse and on paste.
 *
 * Without this adapter the entity feature is off and links stay links.
 */
export type EntityFromUrl = (url: string) => EntityRef | null

/**
 * Search entities of one `type` for the `/` menu and the picker. Debouncing is
 * the render layer's job; `signal` aborts when a newer query supersedes this
 * one (a stale result is dropped either way).
 */
export type SearchEntities = (
  type: string,
  query: string,
  signal: AbortSignal
) => Promise<EntityHit[]>

/**
 * The title to write when a card or chip is turned into an ordinary link
 * (`[title](url)`). Optional: without it, or when it resolves `null`, fails or
 * takes too long, the link text is the URL without its scheme — still an
 * ordinary link, because it differs from the href.
 */
export type EntityTitle = (
  ref: EntityRef,
  signal: AbortSignal
) => Promise<string | null>

/**
 * Let the HOST find the entity: picking a type in the `/` menu or the toolbar
 * then calls this instead of the built-in inline search — open your own modal
 * (search + real previews) and resolve the chosen reference, or `null` on
 * cancel. `display` is what will be inserted at the insertion point (`card`
 * in an empty paragraph, otherwise `chip`), so the modal can preview it. The
 * editor holds the insertion point while the prompt is open and restores focus
 * and selection when it settles.
 */
export type EntityPrompt = (context: {
  type: string
  display: 'card' | 'chip' | 'auto'
}) => Promise<EntityRef | null>

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
  /**
   * Custom link-URL entry (replaces the selection bubble's inline input, the
   * headless toolbar's URL panel, and the KunUI toolbar's popover). See
   * {@link LinkPrompt}.
   */
  linkPrompt?: LinkPrompt
  /**
   * How an @mention's user id becomes its markdown link URL. The URL form is a
   * server contract, so it's host policy — default `kungal-user:<id>` (the KUN
   * server), but e.g. moyu uses a real link `/user/<id>/resource`. Pair with
   * `mentionFromUrl`.
   */
  mentionToUrl?: (userId: number) => string
  /**
   * Parse a markdown link back to a user id, or `null` if it isn't a mention.
   * MUST mirror `mentionToUrl`. Gets the link URL AND its plain text, so a host
   * can replicate a text guard — e.g. moyu treats `/user/<id>` as a mention only
   * when the link text starts with `@`. Default: the `kungal-user:` scheme.
   */
  mentionFromUrl?: (url: string, text: string) => number | null
  /**
   * Recognize entity URLs (topic / galgame / user…) so a BARE link to one
   * becomes a card (alone in its paragraph) or an inline chip. Absent → the
   * entity feature is off. See {@link EntityFromUrl}.
   */
  entityFromUrl?: EntityFromUrl
  /** Entity search for the `/` menu and the picker. See {@link SearchEntities}. */
  searchEntities?: SearchEntities
  /** The `/` menu's entries, in order. The menu needs these AND `searchEntities`. */
  entityTypes?: EntityTypeItem[]
  /** Link text for "turn into a link". See {@link EntityTitle}. */
  entityTitle?: EntityTitle
  /**
   * Host-owned entity search (your own modal). When present, the `/` menu and
   * the toolbar button pick a TYPE and hand off to it instead of searching
   * inline. See {@link EntityPrompt}.
   */
  entityPrompt?: EntityPrompt
}

/** BCP-47-ish UI language for the editor chrome (toolbar labels, placeholders). */
export type KunEditorLocale = 'zh-cn' | 'en-us' | (string & {})

/** Which optional plugins to enable. Absent adapters override these to false. */
export interface KunEditorFeatures {
  /** ||spoiler|| hidden text. Default: true. */
  spoiler?: boolean
  /**
   * @mention nodes. Default: true. The mention *schema* (so `[@x](kungal-user:1)`
   * round-trips) is always wired when on; the interactive `@` autocomplete
   * dropdown additionally needs the `searchMentionUsers` adapter (render layer).
   */
  mention?: boolean
  /**
   * Inline reference / reply-quote atom (`[label](kungal-reply:<refId>)`). The
   * reference is opaque — the host inserts one via `insertQuoteCommand({ refId,
   * label })` and decides what it means. Host-specific, so default: false.
   */
  quote?: boolean
  /** LaTeX via katex (inline `$…$` and block `$$…$$`). Requires the katex peer. Default: true. */
  katex?: boolean
  /** Fenced code blocks with CodeMirror. Requires the codemirror peers. Default: true. */
  codeBlock?: boolean
  /**
   * The sticker/emoji picker. Emoji is built into the render layer (plain
   * unicode, no adapter); the sticker tab additionally needs `stickerSource`.
   * Set false to drop the picker entirely. Default: true.
   */
  sticker?: boolean
  /**
   * Entity references: cards and chips for bare links the `entityFromUrl`
   * adapter recognizes, plus the `/` menu when `searchEntities` + `entityTypes`
   * are present. Default: true — but off without `entityFromUrl`.
   */
  entity?: boolean
}
