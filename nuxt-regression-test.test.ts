/**
 * Regression test for: browser Back button loses scroll position after following
 * a same-page hash link that is a plain native `<a href="#…">` anchor.
 *   Original issue:   https://github.com/nuxt/nuxt/issues/35588
 *   Partial fix:      https://github.com/nuxt/nuxt/pull/35608
 *
 * #35608 changed the default scrollBehaviour's `from.hash && !to.hash` case to
 * `savedPosition ?? { left: 0, top: 0 }`. That restores the position for a
 * `<NuxtLink to="#…">`, where vue-router recorded a `savedPosition`. A native
 * anchor creates a history entry vue-router did not create, so `savedPosition`
 * is null on Back and the `{ left: 0, top: 0 }` fallback still throws the reader
 * to the top. The fix is `savedPosition ?? false`, which defers to the browser's
 * own scroll restoration.
 *
 * The NuxtLink case is kept as a control: it passes before and after the fix.
 * The native anchor case fails before the fix (settles at 0) and passes after.
 *
 * ── COMPANION FIXTURE (add as test/fixtures/basic/pages/scroll-behavior-hash.vue) ──
 *
 *   <template>
 *     <div>
 *       <div style="height: 2000px">spacer top</div>
 *       <a id="native-hash-link" href="#hash-target">native hash link</a>
 *       <NuxtLink id="hash-link" to="#hash-target">hash link</NuxtLink>
 *       <div style="height: 4000px">spacer middle</div>
 *       <div id="hash-target" style="height: 200px">hash target</div>
 *       <div style="height: 2000px">spacer bottom</div>
 *     </div>
 *   </template>
 *
 * If merging into test/basic.test.ts, drop the `describe(...)` block into the
 * existing `describe('nuxt links', ...)` and delete the imports + `setup()` here
 * (that file already calls setup against the same fixture).
 */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

await setup({
  rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  server: true,
  browser: true,
})

describe('scroll behaviour: same-page hash back navigation', () => {
  it.each([
    ['native <a href="#…"> anchor', '#native-hash-link'],
    ['<NuxtLink to="#…">', '#hash-link'],
  ])('restores scroll position on Back after following a %s', async (_name, linkSelector) => {
    const page = await createPage('/scroll-behavior-hash', {
      viewport: { width: 1000, height: 800 },
    })
    await page.waitForFunction(() => window.useNuxtApp?.()._route.fullPath === '/scroll-behavior-hash')
    // vue-router only takes over scroll restoration once the app has hydrated.
    await page.waitForFunction(() => window.useNuxtApp?.().isHydrating === false)

    // Bring the link into view like a reader would, and record the position.
    await page.locator(linkSelector).scrollIntoViewIfNeeded()
    await page.waitForFunction(() => window.scrollY > 0)
    const beforeY = await page.evaluate(() => window.scrollY)
    expect(beforeY).toBeGreaterThan(0)

    // Follow the hash link — the page scrolls down to the target.
    await page.locator(linkSelector).click()
    // Wait for vue-router itself to settle on the hash, not just the browser's location.
    await page.waitForFunction(() => window.useNuxtApp?.()._route.hash === '#hash-target')
    await page.waitForFunction(y => window.scrollY > (y as number), beforeY)

    // Press Back — the reader should return to where they were, not the top.
    await page.goBack()
    await page.waitForFunction(() => !window.location.hash)
    // The browser natively restores `beforeY` straight away, but vue-router runs
    // scrollBehaviour after the route settles, so the regressed jump to the top lands
    // later. Wait for it before asserting, or the regression passes by timing.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
    // Regressed behaviour settles at 0; the fix restores `beforeY` (allow sub-pixel).
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - beforeY)).toBeLessThanOrEqual(2)

    await page.close()
  })
})
