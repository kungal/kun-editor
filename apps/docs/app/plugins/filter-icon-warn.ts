// Filter one specific, benign upstream dev warning.
//
// KunUI's <KunIcon> (and components that use it internally, e.g. KunSelect's
// chevron) render `<svg :viewBox="…">` as a COMPONENT ROOT. Vue 3.5's hydration
// then tries to set `viewBox` as a DOM *property* — it's read-only on
// SVGSVGElement — and logs:
//
//   [Vue warn]: Failed setting prop "viewBox" on <svg>: value 0 0 24 24 is
//   invalid. TypeError: Cannot set property viewBox … which has only a getter
//
// The SVG is already correct from the server-rendered HTML, so the failed
// re-patch is a no-op and the icons display fine. It originates in KunUI + Vue
// (present in kun-ui itself) and can't be fixed from a consumer app. Vue strips
// warnings from production builds, so this only matters in dev — filter this ONE
// message and pass everything else through untouched.
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev) return

  const app = nuxtApp.vueApp
  const previous = app.config.warnHandler

  app.config.warnHandler = (msg, instance, trace) => {
    if (msg.includes('Failed setting prop "viewBox"')) return
    if (previous) {
      previous(msg, instance, trace)
    } else {
      // Preserve Vue's default logging for every other warning.
      console.warn(`[Vue warn]: ${msg}${trace}`)
    }
  }
})
