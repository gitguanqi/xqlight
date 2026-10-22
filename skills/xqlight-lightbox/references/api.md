# xqlight API reference

Everything below matches the shipped artifacts (`lib/js/xqlight.js`, `lib/js/xqlight.esm.mjs`,
`lib/types/index.d.ts`, `lib/types/vue/index.d.ts`). No API changes are introduced by the agent
metadata; this file only records what the package already exposes.

## Entry points

| Specifier | Resolves to | Notes |
| --- | --- | --- |
| `xqlight` | `lib/js/xqlight.esm.mjs` (import) / `lib/js/xqlight.js` (require) | default export and named helpers |
| `xqlight/vue` | `lib/vue/index.js` | ESM only; plugin + `lightboxComponent`; imports the CSS |
| `xqlight/lib/vue/index.vue` | `lib/vue/index.vue` | uncompiled SFC, your toolchain compiles it |
| `xqlight/css/*` | `lib/css/*` | `xqlight/css/xqlight.css`, `xqlight.min.css` |
| `xqlight/lib/*` | `lib/*` | escape hatch for any shipped file |

`main` / `browser` = `lib/js/xqlight.js`, `module` = `lib/js/xqlight.esm.mjs`,
`unpkg` / `jsdelivr` = `lib/js/xqlight.min.js`, `types` = `lib/types/index.d.ts`.

## Constructor

```js
new XqLightBox({ imgCls: '.imgs', thumbnails: 'auto' })
```

| Option | Type | Default | Behavior |
| --- | --- | --- | --- |
| `imgCls` | `string` | — (required) | Container selector; images are collected with `imgCls + ' img'` document-wide. Missing/blank/invalid only emits a `[xqlight]` console warning; the constructor never throws and the list stays empty. |
| `thumbnails` | `boolean \| 'auto'` | `'auto'` | `true` always shows the strip, `false` never, `'auto'` shows it when the gallery holds 2–20 images. Any other value is normalized to `'auto'`. |

Per-image attributes read during a scan:

| Attribute | Purpose |
| --- | --- |
| `src` | image URL (falls back to `currentSrc`) |
| `alt` or `data-name` | caption; defaults to `img<index+1>` |
| `data-thumb` | smaller thumbnail URL for the strip |

Static members: `XqLightBox.version`, `XqLightBox.utils`.

## Instance state

`imgCls`, `thumbnails`, `imgList` (entries carry `index`, `url`, `name`, `thumb`), `currentImgIndex`,
`currentScale`, `currentX`, `currentY`, `currentRotation` (0/90/180/270), `isScale`, `isOpen`,
`status` (`'idle' | 'loading' | 'loaded' | 'error'`), `root`.

## Instance methods

All return `this` except `downloadImg`.

| Method | Description |
| --- | --- |
| `init()` | `mount()` + keyboard + DOM-ready scan. Called by the constructor. |
| `mount()` | Injects the lightbox markup and binds its own controls. No-op until `document.body` exists. |
| `refresh()` | Re-scans the gallery (debinds old image clicks first). Call after DOM changes. |
| `showLightBox(index)` | Opens at `index`; out-of-range wraps. |
| `closeLightBox()` | Hides, unlocks scroll, exits fullscreen, restores the pre-open focus. |
| `prevImg()` / `nextImg()` | Steps by one, wrapping at both ends. |
| `goTo(index)` | Jumps, wrapping; resets scale, pan and rotation. |
| `setScale(value)` | Sets zoom clamped to 0.4–3; at ≤ 1 the pan offset is cleared. |
| `zoom(direction)` | `1` zooms in, `-1` out, by `ZOOM_STEP`. |
| `toggleZoom()` | Switches between 1× and 2× (what clicking the image does). |
| `rotate(step?)` | 90° clockwise by default; negative values go counter-clockwise. Keeps zoom, clears pan. Reset on image change. |
| `scaleImg()` | Toggles fullscreen on the lightbox root. |
| `fullScreenOpen()` / `fullScreenCancel()` | Explicit fullscreen enter/exit. |
| `downloadImg(url?, name?)` | Downloads the current or given image. `Promise<boolean>`; `name` defaults to the URL file name. |
| `setStatus(status)` | Writes the load state and mirrors it to `data-xqlight-status`. |
| `reloadImg()` | Retry handler behind the error card. |
| `destroy()` | Unbinds every listener, removes the nodes, clears `root`. Idempotent; safe after `closeLightBox()`. |

Chainable setup helpers (`bindBackdrop`, `bindGesture`, `addArrow`, `bindKeyboard`, `whenReady`,
`getImgs`, `renderThumbs`, `syncTotal`, `preloadNeighbors`, `applyScale`, `scheduleFrame`,
`syncZoomButton`, `syncRotateButton`, `syncScaleButton`, `focusClose`) exist but are normally called
by `init()`. Public types: `XqLightOptions`, `XqLightImage`, `XqLightThumbnails`, `XqLightStatus`,
`XqLightAction`, `XqLightWheelState`, `XqLightboxUtils`.

## Pure helpers

Available as named ESM exports, as members of `XqLightBox.utils`, and as properties on the UMD
global's `utils`.

| Helper | Signature | Behavior |
| --- | --- | --- |
| `clampScale` | `(value: number) => number` | Clamps into `[ZOOM_MIN, ZOOM_MAX]`. |
| `wrapIndex` | `(index: number, length: number) => number` | Wraps around; empty list returns `0`. |
| `parseFileName` | `(url: string) => string` | Last path segment, query and hash stripped. |
| `buildFileName` | `(url: string, fallback?: string) => string` | `xqlight-<name>` download name. |
| `buildTransform` | `(x, y, scale, rotation?) => string` | `translate3d(x, y, 0px) rotate(deg) scale(s)`; the rotate segment is omitted at 0. |
| `normalizeRotation` | `(deg: number) => number` | Normalizes to a multiple of 90 in `[0, 360)`. |
| `accumulateWheel` | `(state, deltaY, deltaMode?, now?) => -1 \| 0 \| 1` | Wheel accumulation; fires once `WHEEL_UNIT` is reached, resets after `WHEEL_IDLE` ms idle. `deltaMode` 1/2 scale by 40/800. Scrolling down returns `-1`. |
| `collectFocusables` | `(root: Element) => Element[]` | Focusable nodes (`a[href]`, `button`, `[tabindex="0"]`) in document order. |
| `focusTrapStep` | `(list, active, backwards) => Element \| null` | Next node for the Tab trap. |
| `clampPan` | `(x, y, maxX, maxY) => [number, number]` | Clamps the pan offset. |
| `preloadImages` | `(urls: string[], doc?: Document) => void` | Warms the cache with detached `img` elements. |
| `lockScroll` / `unlockScroll` | `(locked: boolean)` / `()` | Reference-counted page scroll lock with scrollbar-width compensation. |
| `downloadImage` | `(url, filename?) => Promise<boolean>` | Fetches bytes for a native save; falls back to opening the source URL when CORS blocks the read. |
| `toggleFullscreen` / `exitFullscreen` | `(element?: Element) => boolean` / `() => boolean` | Fullscreen on the given element (default: the page). |

Constants: `ZOOM_STEP = 0.2`, `ZOOM_MIN = 0.4`, `ZOOM_MAX = 3`, `WHEEL_UNIT = 50`,
`WHEEL_IDLE = 400`, and `KEY_ACTIONS` (`Escape`→`close`, `ArrowLeft`→`prev`, `ArrowRight`→`next`,
`Home`→`first`, `End`→`last`, `+`/`=`→`zoomIn`, `-`→`zoomOut`, `r`/`R`→`rotate`).

## Vue component

Registered as `xqLightbox` by the plugin; use `<xq-lightbox>` in templates.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `lightTitle` | `String` | `''` | Falls back to 「图片预览」. |
| `showLightBox` | `Boolean` | `false` | Visibility is owned by the parent. |
| `lightImgs` | `Array` | `[]` | Items: `src` \| `url`, `name` \| `title`, optional `thumb`. |
| `currentUrl` | `String` | `''` | Explicit URL, wins when the item has none. |
| `currentIndex` | `Number` | `0` | Index shown when opening. |
| `currentText` | `String` | `''` | Explicit caption. |
| `thumbnails` | `Boolean \| String` | `'auto'` | Same semantics as the constructor option. |

| Event | Payload | When |
| --- | --- | --- |
| `hideLightBox` | — | Close button, `Esc`, backdrop click. Set `showLightBox = false`. |
| `update:currentIndex` | `number` | Image switched by the user. |
| `update:currentUrl` | `string` | Emitted with the index change. |
| `change` | `{ index, item }` | Same moment, with the resolved item. |

The component ships uncompiled and without a `<style>` block; it imports the core helpers from
`lib/js/xqlight.esm.mjs` instead of reimplementing them.

## Styling contracts

Public classes: `.lightbox`, `.lightbox.active`, `.lightbox-title`, `.lightbox-content`,
`.lightbox-ls`, `.lightbox-list`, `.lightbox-img`, `.lightbox-arrow`,
`.lightbox-link`, `.lightbox-name`, `.lightbox-thumbs`, `.lightbox-thumb`, `.lightbox-loader`,
`.lightbox-error`; state classes `.lightbox-img-zoomed`, `.lightbox-img-rotated`,
`.lightbox-img-dragging`.

Attribute hooks: `data-xqlight-root`, `data-xqlight-status`, and `data-xqlight="<role>"` with roles
`close`, `prev`, `next`, `download`, `scale`, `zoom`, `rotate`, `retry`, `img`, `link`, `current`,
`total`, `name`, `stage`, `content`, `ls`, `list`, `loader`, `error`, `thumbs`. Scanned images get
`data-xqlight-index="<i>"`, thumbnails get `data-xqlight-thumb="<i>"` and `aria-current`.

Visibility is exactly `.lightbox { display: none }` → `.lightbox.active { display: flex }`.
