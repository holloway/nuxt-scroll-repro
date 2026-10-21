/**
 * Regression test for: browser Back button loses scroll position after same-page
 * hash navigation.
 *   Issue: https://github.com/nuxt/nuxt/issues/35588
 *   Fix:   https://github.com/nuxt/nuxt/pull/35608
 *
 * Following a same-page hash link scrolls to the target; pressing Back should
 * return the reader to their previous position. Before the fix, the default
 * scrollBehaviour returned `{ left: 0, top: 0 }` for the `from.hash && !to.hash`
 * case, throwing the reader to the top. The fix returns
 * `savedPosition ?? { left: 0, top: 0 }`.
 *
 * This test drives a `<NuxtLink to="#…">`, which is deterministic: without the
 * fix the position is lost (settles at 0) on every run; with the fix it is
 * restored on every run.
 *
 * NOTE: a plain native `<a href="#…">` exercises the same scrollBehaviour path
 * but is intentionally NOT asserted here — for native anchors the browser's own
 * scroll restoration races vue-router's scroll handling, so the un-fixed result
 * is timing-dependent and would make the test flaky. The NuxtLink case is the
 * reliable signal.
 *
 * ── COMPANION FIXTURE (add as test/fixtures/basic/pages/scroll-behavior-hash.vue) ──
 *
 *   <template>
 *     <div>
 *       <div style="height: 2000px">spacer top</div>
 *       <NuxtLink id="hash-link" to="#hash-target">hash link</NuxtLink>
 *       <div style="height: 4000px">spacer middle</div>
 *       <div id="hash-target" style="height: 200px">hash target</div>
 *       <div style="height: 2000px">spacer bottom</div>
 *     </div>
 *   </template>
 *
 * If merging into test/basic.test.ts, drop the `it(...)` block into the existing
 * `describe('nuxt links', ...)` and delete the imports + `setup()` here (that file
 * already calls setup against the same fixture).
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
  it('restores scroll position on Back after following a same-page hash link', async () => {
    const page = await createPage('/scroll-behavior-hash', {
      viewport: { width: 1000, height: 800 },
    })
    await page.waitForFunction(() => window.useNuxtApp?.()._route.fullPath === '/scroll-behavior-hash')

    // Bring the link into view like a reader would, and record the position.
    await page.locator('#hash-link').scrollIntoViewIfNeeded()
    await page.waitForFunction(() => window.scrollY > 0)
    const beforeY = await page.evaluate(() => window.scrollY)
    expect(beforeY).toBeGreaterThan(0)

    // Follow the hash link — the page scrolls down to the target.
    await page.locator('#hash-link').click()
    await page.waitForFunction(() => window.location.hash === '#hash-target')
    await page.waitForFunction(y => window.scrollY > (y as number), beforeY)

    // Press Back — the reader should return to where they were, not the top.
    await page.goBack()
    await page.waitForFunction(() => !window.location.hash)
    // Regressed behaviour settles at 0; the fix restores `beforeY` (allow sub-pixel).
    await page.waitForFunction(y => Math.abs(window.scrollY - (y as number)) <= 2, beforeY)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - beforeY)).toBeLessThanOrEqual(2)

    await page.close()
  })
})
