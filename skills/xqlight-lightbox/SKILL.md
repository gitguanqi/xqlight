---
name: xqlight-lightbox
description: Integrate the xqlight image lightbox into a plain HTML page or a Vue 2 / Vue 3 app. Load this when wiring gallery images to a lightbox, when choosing between the UMD script, the module import, the Vue plugin and the raw SFC, or when debugging stylesheet loading, re-scanning after dynamic images, multi-instance scroll lock, and teardown.
---

# xqlight integration

`xqlight` is a dependency-free browser image lightbox. One core implementation produces:

- a UMD file for `<script>` tags (`window.XqLightBox`),
- an ESM build and a CommonJS/UMD `main` resolved through `package.json` `exports`,
- a Vue 2 / Vue 3 plugin at `xqlight/vue` that reuses the same pure helpers.

Decide the entry before writing code; the four entries have different asset duties.

## Pick the entry

| Host | Entry | Stylesheet |
| --- | --- | --- |
| Plain HTML, no bundler | `lib/js/xqlight.min.js` + `lib/css/xqlight.min.css` | `<link>` yourself |
| Bundler, vanilla JS | `import XqLightBox from 'xqlight'` | `import 'xqlight/lib/css/xqlight.css'` |
| Vue 2 / Vue 3 app | `import xqlight from 'xqlight/vue'` then `Vue.use` / `app.use` | imported by the plugin |
| Vue app that must compile the SFC itself, or needs the component without the plugin | `import XqLightbox from 'xqlight/lib/vue/index.vue'` | import `xqlight/lib/css/xqlight.css` yourself |

`xqlight/vue` is ESM-only. Do not reach for the raw SFC just to "avoid the plugin" — the plugin is
what registers the component name and pulls in the CSS.

## Vanilla integration order

1. Load the stylesheet before the script; the lightbox is invisible without it
   (`display: none` on `.lightbox`, flipped to `flex` by `.lightbox.active`).
2. Ship the gallery markup, then construct: `new XqLightBox({ imgCls: '.imgs' })`. Construction
   mounts the lightbox DOM and binds clicks on every `imgCls img`.
3. Add images later? Call `lightbox.refresh()` — the scan is a snapshot, not an observer. Re-scan on
   every list mutation (re-render, infinite scroll, filter change).
4. Tear down with `lightbox.destroy()` when the host page/view is discarded. It is idempotent and
   removes both the injected nodes and the listeners on gallery images.

Choose `imgCls` so it matches exactly one gallery: the selector is resolved document-wide, so a
shared class binds every matching image to one instance.

## Vue integration order

1. `app.use(xqlight)` (Vue 3) or `Vue.use(xqlight)` (Vue 2). This registers `xqLightbox`, so the
   template tag is `<xq-lightbox>`, and loads the stylesheet once.
2. Keep `showLightBox` in the parent and open from your own `<img @click>`:
   set `currentIndex`, then `showLightBox = true`. The component never scans the DOM in Vue mode —
   `lightImgs` is the only source of images.
3. Listen for `hideLightBox` and set `showLightBox = false`; the component emits, it does not own the
   flag. Bind `:current-index` with `@update:current-index` (or `v-model:current-index`) so arrow
   navigation and your own UI stay in sync.
4. Always write props in kebab-case in templates. An in-DOM template lowercases attributes, so
   `:showLightBox` silently becomes `showlightbox` and the prop is dropped.

Item shape: `src` or `url`, `name` or `title`, optional `thumb`. `currentUrl` / `currentText`
override the item when you render one image outside a list.

## Behavior contracts that change how you wire things

- Visibility is CSS-driven. Never put `v-show` on the root or toggle `display` yourself; toggle
  `showLightBox` and let `.active` do the work.
- The page scroll lock is reference-counted across instances, so a modal that opens a second
  lightbox does not unlock the page when it closes.
- Zoom clamps to 0.4–3 and click/toggle zoom jumps to 2×. `goTo` / `prevImg` / `nextImg` reset zoom,
  pan and rotation; `rotate` keeps zoom but zeroes the pan and is reset on image change.
- Fullscreen applies to the lightbox root, not `documentElement`. `destroy()` and `closeLightBox()`
  both exit fullscreen.
- `downloadImg` resolves `true`/`false`; cross-origin images without CORS fall back to opening the
  source URL rather than rejecting.
- Keyboard handling is bound at the document while open (`Esc`, arrows, `Home`/`End`, `+`/`-`, `R`,
  `Tab` trap). The wheel is consumed only while open, so it cannot leak into the page.

## Failure modes to check first

| Symptom | Cause |
| --- | --- |
| Nothing appears on click | Stylesheet missing, or `.lightbox` display overridden by host CSS |
| Newly rendered images do nothing | `refresh()` not called after the list changed |
| `imgCls` warning, empty list | Selector invalid or matches no container; construction still succeeds |
| Vue: prop ignored | camelCase attribute in an in-DOM template |
| Vue: lightbox stuck open | `hideLightBox` handled but `showLightBox` not set back to `false` |
| Duplicate lightboxes | More than one instance constructed for the same gallery, or the plugin registered twice |
| Page cannot scroll after closing | An instance was unmounted without calling `destroy()` |

## Verification

- Confirm the stylesheet request returns 200 and `.lightbox` resolves to `display: none` while closed.
- Open, step through `←`/`→`, zoom, rotate, fullscreen, download, then `Esc` — page scroll must be
  restored and focus returned to the trigger.
- For dynamic galleries, append an image, call `refresh()`, and confirm the new image opens at the
  correct index and the counter total updates.
- In Vue, confirm `update:current-index` fires on arrow navigation and that unmounting the parent
  leaves no `.lightbox` node in the DOM.

Exact signatures, option defaults, helper functions, CSS hooks and the full prop/event tables live in
[references/api.md](./references/api.md).
