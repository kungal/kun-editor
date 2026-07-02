// Image upload plugin — paste / drop / toolbar image upload.
//
// Ported from the forum's plugins/upload/uploader.ts, generalized over the
// `uploadImage` adapter. This is the plugin the architecture calls out as the
// clearest mechanism-vs-policy split: the forum hardcoded
// `kunFetch('/image/topic')`; here the host injects WHERE the upload goes, and
// the editor owns the paste/drop wiring and the in-flight placeholder.
//
// Built on @milkdown/kit/plugin/upload: we set its `uploader` (per-image → url)
// and `uploadWidgetFactory` (the "uploading…" placeholder) via ctx config,
// bundled as a plugin so the render layer needs no separate config call.
import type { Ctx, MilkdownPlugin } from '@milkdown/kit/ctx'
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import type { Uploader } from '@milkdown/kit/plugin/upload'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { EditorView } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'
import { $prose } from '@milkdown/kit/utils'

import type { KunEditorLocale, Notify, UploadImage } from '../../types'

/** Options for the upload plugin. */
export interface UploadPluginOptions {
  /** UI language for the in-flight placeholder text. Default `'zh-cn'`. */
  locale?: KunEditorLocale
  /** Surface an "upload failed" notice per image. Omit to fail silently. */
  notify?: Notify
}

const uploadingLabel = (locale: KunEditorLocale | undefined): string =>
  locale && locale.toLowerCase().startsWith('en') ? 'Uploading…' : '正在上传中...'

const uploadFailedLabel = (locale: KunEditorLocale | undefined): string =>
  locale && locale.toLowerCase().startsWith('en')
    ? 'Image upload failed'
    : '图片上传失败'

/**
 * Build a Milkdown `Uploader` from the host's `uploadImage` adapter. Filters to
 * image files, uploads each via the adapter, and returns image nodes. A failed
 * image is skipped (and reported via `notify` if provided) instead of aborting
 * the whole batch — more robust than the forum's all-or-nothing Promise.all.
 */
export const createUploader = (
  uploadImage: UploadImage,
  options: UploadPluginOptions = {}
): Uploader => {
  return async (files, schema) => {
    const images: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)
      if (!file || !file.type.startsWith('image/')) {
        continue
      }
      images.push(file)
    }

    const nodes = await Promise.all(
      images.map(async (image): Promise<Node | null> => {
        try {
          const src = await uploadImage(image)
          return schema.nodes.image!.createAndFill({
            src,
            alt: image.name
          }) as Node
        } catch {
          options.notify?.(uploadFailedLabel(options.locale), 'error')
          return null
        }
      })
    )

    return nodes.filter((node): node is Node => node !== null)
  }
}

/** Build the in-flight "uploading…" placeholder DOM — a `.kun-editor__uploading`
 * span (class hook, styled by the host stylesheet — headless). Shared by the
 * paste/drop path and the toolbar path so they look identical. */
const uploadingWidget = (locale: KunEditorLocale | undefined): HTMLElement => {
  const el = document.createElement('span')
  el.className = 'kun-editor__uploading'
  el.textContent = uploadingLabel(locale)
  return el
}

/** The in-flight "uploading…" placeholder shown at the drop position (paste/drop
 * path — Milkdown's `upload` plugin calls this). */
export const createUploadWidgetFactory = (options: UploadPluginOptions = {}) => {
  return (pos: number, spec: Parameters<typeof Decoration.widget>[2]) => {
    return Decoration.widget(pos, uploadingWidget(options.locale), spec)
  }
}

/** Applies the uploader + placeholder to a Milkdown ctx. Call after the `upload`
 * plugin has registered its config slice. */
export const applyUploadConfig = (
  ctx: Ctx,
  uploadImage: UploadImage,
  options: UploadPluginOptions = {}
): void => {
  ctx.update(uploadConfig.key, (prev) => ({
    ...prev,
    uploader: createUploader(uploadImage, options),
    uploadWidgetFactory: createUploadWidgetFactory(options)
  }))
}

const uploadConfigPlugin =
  (uploadImage: UploadImage, options: UploadPluginOptions): MilkdownPlugin =>
  (ctx) =>
  () => {
    applyUploadConfig(ctx, uploadImage, options)
  }

/**
 * The image-upload plugin bundle: Milkdown's `upload` plugin plus the KUN config
 * (uploader over the `uploadImage` adapter + localized placeholder). Wire this
 * only when a host provides `uploadImage` — its absence is exactly how the
 * image-free editor (galgame 简介) is expressed.
 */
export const createUploadPlugin = (
  uploadImage: UploadImage,
  options: UploadPluginOptions = {}
): MilkdownPlugin[] => [...upload, uploadConfigPlugin(uploadImage, options)]

// ── Toolbar / programmatic upload (in-document placeholder) ─────────────────
//
// Milkdown's `upload` plugin only shows the in-flight placeholder for paste/drop
// (it intercepts those DOM events). The toolbar's image button uploads a File
// programmatically, so it gets no placeholder — the image just pops in when the
// upload resolves. This mirrors ProseMirror's official "upload" example: a
// DecorationSet plugin holds a widget placeholder (keyed by a unique id) that
// maps through edits; `startImageUpload` inserts it, awaits the adapter, then
// replaces the placeholder with the image (or removes it on failure). Same
// `.kun-editor__uploading` widget as paste/drop, so both look identical.

interface PlaceholderMeta {
  add?: { id: object; pos: number; locale: KunEditorLocale | undefined }
  remove?: { id: object }
}

const placeholderKey = new PluginKey<DecorationSet>('KUN_IMAGE_UPLOAD_PLACEHOLDER')

/** The placeholder DecorationSet plugin — add it when uploads are enabled. */
export const imageUploadPlaceholder: MilkdownPlugin = $prose(
  () =>
    new Plugin<DecorationSet>({
      key: placeholderKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, set) {
          let next = set.map(tr.mapping, tr.doc)
          const meta = tr.getMeta(placeholderKey) as PlaceholderMeta | undefined
          if (meta?.add) {
            const deco = Decoration.widget(
              meta.add.pos,
              uploadingWidget(meta.add.locale),
              { id: meta.add.id } as Parameters<typeof Decoration.widget>[2]
            )
            next = next.add(tr.doc, [deco])
          } else if (meta?.remove) {
            const { id } = meta.remove
            next = next.remove(
              next.find(undefined, undefined, (spec) => spec.id === id)
            )
          }
          return next
        }
      },
      props: {
        decorations: (state) => placeholderKey.getState(state)
      }
    })
)

const findPlaceholder = (view: EditorView, id: object): number | null => {
  const set = placeholderKey.getState(view.state)
  const found = set?.find(undefined, undefined, (spec) => spec.id === id)
  return found && found.length ? found[0]!.from : null
}

/**
 * Upload a File and show an in-document "uploading…" placeholder at the caret
 * until it resolves, then replace it with the image (or remove it + notify on
 * failure). The placeholder isn't an undo step (`addToHistory: false`), so undo
 * removes the inserted image cleanly. Used by the toolbar image button.
 */
export const startImageUpload = async (
  view: EditorView,
  file: File,
  options: { uploadImage: UploadImage; notify?: Notify; locale?: KunEditorLocale }
): Promise<void> => {
  if (!file.type.startsWith('image/')) {
    return
  }
  const id = {}
  const tr = view.state.tr
  if (!tr.selection.empty) {
    tr.deleteSelection()
  }
  tr.setMeta(placeholderKey, {
    add: { id, pos: tr.selection.from, locale: options.locale }
  } satisfies PlaceholderMeta)
  tr.setMeta('addToHistory', false)
  view.dispatch(tr)

  try {
    const src = await options.uploadImage(file)
    const pos = findPlaceholder(view, id)
    if (pos === null) {
      return // placeholder gone (e.g. user undid) — drop the result
    }
    const imageType = view.state.schema.nodes.image
    const node = imageType?.createAndFill({ src, alt: file.name })
    if (!node) {
      return
    }
    view.dispatch(
      view.state.tr
        .replaceWith(pos, pos, node)
        .setMeta(placeholderKey, { remove: { id } } satisfies PlaceholderMeta)
    )
  } catch {
    view.dispatch(
      view.state.tr
        .setMeta(placeholderKey, { remove: { id } } satisfies PlaceholderMeta)
        .setMeta('addToHistory', false)
    )
    options.notify?.(uploadFailedLabel(options.locale), 'error')
  }
}
