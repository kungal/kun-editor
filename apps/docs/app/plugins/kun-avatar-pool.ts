import { installKunUIConfig } from '@kungal/ui-vue'
import { KUN_AVATAR_POOL } from '~/utils/avatarPool'

// Hands KunUI the images it picks a default avatar from. Without this the pool
// is `[]` and every user without an avatar renders one identical picture --
// see `utils/avatarPool.ts`.
//
// `installKunUIConfig` merges over whatever a previous call installed, so this
// plugin and the @kungal/ui-nuxt layer's own config plugin may run in either
// order.
export default defineNuxtPlugin((nuxtApp) => {
  installKunUIConfig(nuxtApp.vueApp, { avatarFallbackPool: KUN_AVATAR_POOL })
})
