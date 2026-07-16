# Nuxt Back-button scroll restoration repro

Minimal reproduction: pressing the browser **Back** button after following a
same-page hash link scrolls to the top instead of restoring the reader's
position. Affects both a native `<a href="#…">` and a `<NuxtLink to="#…">`.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and:

1. Scroll down so one of the links is in view.
2. Click either link (`native <a href="#foot">` or `<NuxtLink to="#foot">`) —
   the page jumps down to `#foot`.
3. Press the browser **Back** button.

**Expected:** return to the previous scroll position (where you clicked).
**Actual:** the page jumps to the very top (`scrollY = 0`).

## Cause

Nuxt's default scroll behaviour, `packages/nuxt/src/pages/runtime/router.options.ts`:

```js
if (to.path.replace(/\/$/, "") === from.path.replace(/\/$/, "")) {
  if (from.hash && !to.hash) {
    return { left: 0, top: 0 } // <-- forces scroll-to-top on Back; ignores savedPosition
  }
  if (to.hash) { ... }
  return false                 // <-- sibling case defers to the browser
}
```

Pressing Back from `/#foot` to `/` matches `from.hash && !to.hash`, so the page
is forced to the top. The branch never consults `savedPosition` and overrides the
browser's native scroll restoration (`history.scrollRestoration === 'auto'`).

## Workaround

`app/router.options.ts`:

```ts
import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) {
      if (to.hash) return { el: to.hash, behavior: 'instant' }
      return false // defer to native scroll restoration (fixes Back button)
    }
    if (to.hash) return { el: to.hash, behavior: 'instant' }
    return { left: 0, top: 0 }
  }
} satisfies RouterConfig
```

Copy this file into the repo to see the Back button behave correctly.
