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
import { Decoration } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'

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

/** The in-flight "uploading…" placeholder shown at the drop position. */
export const createUploadWidgetFactory = (options: UploadPluginOptions = {}) => {
  return (pos: number, spec: Parameters<typeof Decoration.widget>[2]) => {
    const widgetDOM = document.createElement('span')
    widgetDOM.textContent = uploadingLabel(options.locale)
    widgetDOM.style.color = 'var(--color-primary)'
    return Decoration.widget(pos, widgetDOM, spec)
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
