# Nuxt Back-button scroll restoration repro

Follow-up to https://github.com/nuxt/nuxt/issues/35588, which #35608 fixed for
`<NuxtLink to="#…">` but not for a plain native `<a href="#…">`.

Pressing the browser **Back** button after following a same-page native hash
anchor scrolls to the top instead of restoring the reader's position.

Tested with Nuxt 4.6.2, vue-router 5.4.0, Vue 3.5.44 (Chromium).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and:

1. Scroll down so the links are in view.
2. Click the native `<a href="#foot">` — the page jumps down to `#foot`.
3. Press the browser **Back** button.

**Expected:** return to the previous scroll position (where you clicked).
**Actual:** the page jumps to the very top (`scrollY = 0`).

The `<NuxtLink to="#foot">` beside it is a control: it restores correctly.

| Link | scrollY before click | after click | after Back |
| ---- | -------------------- | ----------- | ---------- |
| native `<a href="#foot">` | 1918 | 6252 | **0** |
| `<NuxtLink to="#foot">` | 1918 | 6252 | 1918 |

## Cause

A native anchor click creates a history entry that vue-router did not create, so
its `history.state.scroll` is `null` and `savedPosition` is `null` on Back. Nuxt's
default scroll behaviour, `packages/nuxt/src/pages/runtime/router.options.ts`:

```js
if (to.path.replace(/\/$/, "") === from.path.replace(/\/$/, "")) {
  if (from.hash && !to.hash) {
    return savedPosition ?? { left: 0, top: 0 } // <-- no savedPosition, so forced to the top
  }
  ...
}
```

Pressing Back from `/#foot` to `/` matches `from.hash && !to.hash`. With no
`savedPosition` the fallback forces the top and overrides the browser's native
scroll restoration.

## Fix

Return `false` instead of `{ left: 0, top: 0 }` when there is no `savedPosition`,
deferring to the browser. As `app/router.options.ts` this restores the position:

```ts
import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, from, savedPosition) {
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) {
        return savedPosition ?? false
      }
      if (to.hash) {
        return { el: to.hash, behavior: 'instant' }
      }
      return false
    }
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'instant' }
    }
    return { left: 0, top: 0 }
  }
} satisfies RouterConfig
```

Open question: `false` also applies to a programmatic hash removal such as
`router.push({ hash: '' })`, which previously scrolled to the top.
