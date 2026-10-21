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
<link rel="stylesheet" href="https://unpkg.com/xqlight@0.4.0/lib/css/xqlight.min.css">
<script src="https://unpkg.com/xqlight@0.4.0/lib/js/xqlight.min.js"></script>
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
| `imgCls` | `string` | yes | Selector of the gallery container. Images are found with `<imgCls> img`. |

A missing or unusable `imgCls` only logs a warning — the constructor never throws.

### Instance methods

| Method | Description |
| --- | --- |
| `showLightBox(index)` | Open at `index`; out-of-range values wrap around. |
| `closeLightBox()` | Close and restore page scrolling. |
| `prevImg()` / `nextImg()` | Move by one, wrapping at both ends. |
| `goTo(index)` | Jump to an index. |
| `zoom(direction)` | `1` zooms in, `-1` zooms out, clamped to 0.4×–3×. |
| `scaleImg()` | Toggle fullscreen. |
| `downloadImg(url?, name?)` | Download the current (or given) image. Returns a `Promise<boolean>`. |
| `refresh()` | Re-scan the gallery after the DOM changed. |
| `destroy()` | Remove listeners and nodes. Safe to call twice. |

### Keyboard

When the lightbox is open: `Esc` closes, `←` / `→` switch images, `+` / `-` zoom.
The wheel zooms only while the lightbox is open and never scrolls the page behind it.

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
import XqLightBox, { clampScale, wrapIndex, buildFileName } from 'xqlight';
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
fight each other. Class names are a public contract:

`.lightbox`, `.lightbox-title`, `.lightbox-content`, `.lightbox-ls`, `.lightbox-list`,
`.lightbox-img`, `.lightbox-arrow`, `.lightbox-link`, `.lightbox-name`.

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
