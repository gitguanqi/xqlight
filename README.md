# xqlight

A dependency-free image lightbox for the browser, plus a Vue 2 / Vue 3 wrapper.
No runtime dependencies, no CSS framework, no build step for consumers.

[中文文档](./zh.md) · [更新日志](./CHANGELOG.md)

- **Vanilla first** — one `<script>` tag, one global constructor.
- **Also a real module** — ESM and CommonJS both resolve through `package.json` `exports`.
- **Multi-instance safe** — every instance owns its own DOM subtree.
- **Vue 2 and Vue 3 from one component** — no separate builds.

## Install

```bash
npm install xqlight
```

## Use in the browser

```html
<link rel="stylesheet" href="https://unpkg.com/xqlight@0.5.0/lib/css/xqlight.min.css">
<script src="https://unpkg.com/xqlight@0.5.0/lib/js/xqlight.min.js"></script>
```

Mark up a gallery, then construct the lightbox. `imgCls` is the selector of the
container that wraps the images — it is required.

```html
<ul class="imgs">
    <li><img src="./img/a1.jpg" alt="First photo"></li>
    <li><img src="./img/a2.jpg" alt="Second photo"></li>
</ul>

<script>
    var lightbox = new XqLightBox({ imgCls: '.imgs' });
</script>
```

Images are scanned when the DOM is ready, so the script can sit in `<head>` or at
the end of `<body>`. If you inject images later, call `lightbox.refresh()`.

### Options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `imgCls` | `string` | yes | Selector of the gallery container. Images are found with `<imgCls> img`. Each `<img>` may carry `data-thumb="<url>"` to use a smaller thumbnail. |
| `thumbnails` | `boolean \| 'auto'` | no | Thumbnail strip. `true` always shows it, `false` turns it off, `'auto'` (default) shows it when the gallery holds 2–20 images. |

A missing or unusable `imgCls` only logs a warning — the constructor never throws.

### Instance methods

| Method | Description |
| --- | --- |
| `showLightBox(index)` | Open at `index`; out-of-range values wrap around. |
| `closeLightBox()` | Close and restore page scrolling. |
| `prevImg()` / `nextImg()` | Move by one, wrapping at both ends. |
| `goTo(index)` | Jump to an index. |
| `zoom(direction)` | `1` zooms in, `-1` zooms out, clamped to 0.4×–3×. |
| `setScale(value)` | Set the zoom level directly; returning to 1× resets the pan offset. |
| `toggleZoom()` | Toggle between 1× and the click-zoom level (what clicking the image does). |
| `rotate(step?)` | Rotate 90° clockwise (0 → 90 → 180 → 270 → 0); pan offsets reset, rotation resets on image switch. Negative values rotate counter-clockwise. |
| `scaleImg()` | Toggle fullscreen. Fullscreen applies to the lightbox root, not the page. |
| `downloadImg(url?, name?)` | Download the current (or given) image. Returns a `Promise<boolean>`. |
| `refresh()` | Re-scan the gallery after the DOM changed. |
| `destroy()` | Remove listeners and nodes. Safe to call twice. |

### Keyboard

When the lightbox is open: `Esc` closes, `←` / `→` switch images, `Home` / `End`
jump to the first / last image, `+` / `-` zoom, `R` rotates 90° clockwise. `Tab`
cycles inside the lightbox; `Enter` / `Space` activate the focused control (close,
arrows, download, zoom, rotate, fullscreen, retry). The wheel zooms only while the
lightbox is open and never scrolls the page behind it — touchpad events are
accumulated so one gesture equals one step.

### Pointer interactions

- Click the backdrop to close; clicking the image, arrows, title or thumbnails does not.
- Click the image to toggle between 1× and 2×. When zoomed in, drag to pan — panning
  is clamped so the image cannot fly out of view.
- On touch devices, swipe horizontally to switch images.

### States & CSS hooks

The root carries `data-xqlight-status="idle | loading | loaded | error"`. The CSS
shows a spinner while `loading`, fades the image in on `loaded`, and reveals an
error card with a Retry button (`[data-xqlight="retry"]`) on `error`. Adjacent
images are preloaded in the background.

The title bar carries five controls: zoom (magnifier, switches to "restore" while
zoomed), rotate (a CSS-drawn circular arrow, no extra font weight), download,
fullscreen, and close.

Other hooks you can style against: `[data-xqlight="thumbs"]` (the thumbnail strip,
`role="group"`), `[data-xqlight-thumb="<index>"]` (each thumb, `aria-current` marks
the active one), `.lightbox-img-zoomed` (applied while the image is above 1×; also
switches the cursor to grab/grabbing), and `.lightbox-img-rotated` (applied while
the image has a non-zero rotation).

The open animation is implemented as child-element keyframes, so opening feels
smooth while closing is an instant hide (by design, to keep the
`.lightbox` / `.lightbox.active` display contract simple). All motion is disabled
under `prefers-reduced-motion: reduce`.

## Use as a module

```js
import XqLightBox from 'xqlight';

const lightbox = new XqLightBox({ imgCls: '.imgs' });
```

```js
const XqLightBox = require('xqlight');
```

Pure helpers are exported for reuse:

```js
import XqLightBox, { clampScale, wrapIndex, buildFileName, buildTransform, accumulateWheel } from 'xqlight';
```

The same helpers are available on the global build as `XqLightBox.utils`.

## Use in Vue

The wrapper is exported from the `xqlight/vue` subpath and works on Vue 2 and Vue 3
with the same component.

```js
// main.js
import xqlight from 'xqlight/vue';

Vue.use(xqlight);   // Vue 2
app.use(xqlight);   // Vue 3
```

It registers `<xq-lightbox>` and loads the stylesheet for you.

```vue
<template>
    <div>
        <ul class="imgs">
            <li v-for="item in lightImgs" :key="item.id">
                <img :src="item.src" alt="" @click="open(item)">
            </li>
        </ul>

        <xq-lightbox
            :show-light-box="visible"
            :light-imgs="lightImgs"
            :current-index="currentIndex"
            light-title="图片预览"
            @hide-light-box="visible = false"
            @update:current-index="currentIndex = $event"
        />
    </div>
</template>

<script>
import xqlight from 'xqlight/vue';

export default {
    data() {
        return {
            visible: false,
            currentIndex: 0,
            lightImgs: [
                { id: 1, src: '/img/a1.jpg', name: 'First photo' },
                { id: 2, src: '/img/a2.jpg', name: 'Second photo' }
            ]
        };
    },
    methods: {
        open(item) {
            this.currentIndex = this.lightImgs.indexOf(item);
            this.visible = true;
        }
    }
};
</script>
```

> Use kebab-case props in templates. In an in-DOM template the browser lowercases
> attribute names, so `:showLightBox` silently becomes `showlightbox`.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `lightTitle` | `String` | `''` | Title bar text; falls back to 「图片预览」. |
| `showLightBox` | `Boolean` | `false` | Visibility, controlled by the parent. |
| `lightImgs` | `Array` | `[]` | Items may use `src` or `url`, and `name` or `title`. |
| `currentUrl` | `String` | `''` | Explicit image URL; wins when the list item has none. |
| `currentIndex` | `Number` | `0` | Index shown when the lightbox opens. |
| `currentText` | `String` | `''` | Explicit caption. |
| `thumbnails` | `Boolean \| String` | `'auto'` | Same semantics as the constructor option; list items may set `thumb` for a smaller preview. |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `hideLightBox` | — | Close button, `Esc`, or backdrop request. Set `showLightBox` to `false`. |
| `update:currentIndex` | `number` | Emitted when the user switches images. |
| `update:currentUrl` | `string` | Emitted together with the index change. |
| `change` | `{ index, item }` | Same moment, with the resolved item. |

### Mounting the raw SFC

The component is shipped uncompiled, so your own Vue toolchain compiles it. Import
the stylesheet yourself in this case:

```js
import XqLightbox from 'xqlight/lib/vue/index.vue';
import 'xqlight/lib/css/xqlight.css';
```

No Sass toolchain is required — the component ships no `<style lang="scss">` block.

## Styling

The stylesheet is the single source of truth for both builds; the browser build adds
`.active` to the root and the Vue component binds the same class, so the two never
fight each other. You must include `lib/css/xqlight.css` (or `xqlight.min.css`) —
the component ships no inline styles.

Class names are a public contract:

`.lightbox`, `.lightbox-title`, `.lightbox-content`, `.lightbox-ls`, `.lightbox-list`,
`.lightbox-img`, `.lightbox-arrow`, `.lightbox-link`, `.lightbox-name`,
`.lightbox-thumbs`, `.lightbox-thumb`, `.lightbox-loader`, `.lightbox-error`.

Beyond classes, every structural and interactive node carries a `data-xqlight="<role>"`
hook — `close`, `prev`, `next`, `download`, `scale`, `zoom`, `rotate`, `retry`,
`img`, `link`, `current`, `total`, `name`, `stage`, `content`, `ls`, `list`,
`loader`, `error`, `thumbs` — so you can target nodes without class names. Colors,
spacing and the accent are plain CSS values — override them in your own stylesheet,
no CSS variables required.

## Browser support

Chrome / Edge / Firefox / Safari, current and previous major versions. The build
targets ES2017; IE is not supported.

## Development

```bash
npm install
npm run build        # regenerate lib/js/*.min.* and lib/css/*.min.css
npm run build:check  # fail if committed artifacts are stale
npm test             # pure-function and repository contract tests
npm run verify       # run the real bundle against a stubbed DOM
npm run test:browser # dependency-free server for test/*.html
```

`lib/js/xqlight.js` is the only hand-written source; the ESM build and every
`*.min.*` file are generated from it. Everything is committed, so a source change
is not done until `npm run build` has been run.

## License

MIT
