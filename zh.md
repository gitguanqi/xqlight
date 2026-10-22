# xqlight

一个零依赖的浏览器图片灯箱，同时提供 Vue 2 / Vue 3 封装。
无运行时依赖、不绑定 CSS 框架、使用方不需要构建步骤。

[English](./README.md) · [更新日志](./CHANGELOG.md)

- **原生优先** — 一个 `<script>` 标签、一个全局构造器。
- **也是正经模块** — ESM 与 CommonJS 都通过 `package.json` 的 `exports` 解析。
- **多实例安全** — 每个实例拥有自己独立的 DOM 子树。
- **一个组件同时服务 Vue 2 与 Vue 3** — 不需要两套构建。

## 安装

```bash
npm install xqlight
```

## 在浏览器中使用

```html
<link rel="stylesheet" href="https://unpkg.com/xqlight@0.5.0/lib/css/xqlight.min.css">
<script src="https://unpkg.com/xqlight@0.5.0/lib/js/xqlight.min.js"></script>
```

先写好图库标记，再构造灯箱。`imgCls` 是包裹图片的容器选择器，**必填**。

```html
<ul class="imgs">
    <li><img src="./img/a1.jpg" alt="第一张"></li>
    <li><img src="./img/a2.jpg" alt="第二张"></li>
</ul>

<script>
    var lightbox = new XqLightBox({ imgCls: '.imgs' });
</script>
```

图片在 DOM 就绪时扫描，所以脚本放在 `<head>` 或 `<body>` 末尾都可以。
如果图片是之后动态插入的，调用 `lightbox.refresh()` 重新扫描。

### 选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `imgCls` | `string` | 是 | 图库容器选择器，按 `<imgCls> img` 查找图片。每个 `<img>` 可加 `data-thumb="<地址>"` 指定缩略图。 |
| `thumbnails` | `boolean \| 'auto'` | 否 | 缩略图条：`true` 强制显示、`false` 关闭、`'auto'`（默认）在 2–20 张时显示。 |

`imgCls` 缺失或不可用时只打印警告，构造函数不会抛错。

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `showLightBox(index)` | 打开指定索引，越界时环绕。 |
| `closeLightBox()` | 关闭并恢复页面滚动。 |
| `prevImg()` / `nextImg()` | 前后切换，两端环绕。 |
| `goTo(index)` | 跳到指定索引。 |
| `zoom(direction)` | `1` 放大，`-1` 缩小，范围夹紧在 0.4–3 倍。 |
| `setScale(value)` | 直接设置缩放；回到 1 倍时清零位移。 |
| `toggleZoom()` | 在 1 倍与点击放大档之间切换（点击图片的效果）。 |
| `rotate(step?)` | 顺时针旋转 90 度（0→90→180→270→0），同时清零位移，切图复位；传负数逆时针。 |
| `scaleImg()` | 切换全屏。全屏作用于灯箱根节点，而不是整页。 |
| `downloadImg(url?, name?)` | 下载当前（或指定）图片，返回 `Promise<boolean>`。 |
| `refresh()` | DOM 变化后重新扫描图库。 |
| `destroy()` | 解绑监听并移除节点，重复调用安全。 |

### 键盘操作

灯箱打开时：`Esc` 关闭，`←` / `→` 切换，`Home` / `End` 跳到首张 / 末张，`+` / `-` 缩放，
`R` 顺时针旋转 90 度。`Tab` 在灯箱内循环，`Enter` / `Space` 激活当前控件（关闭、箭头、
下载、缩放、旋转、全屏、重试）。滚轮只在打开时缩放，不会把页面一起滚走；
触控板的小幅滚动会先累积，一次手势只走一档。

### 指针交互

- 点击遮罩空白处关闭；点图片、箭头、标题或缩略图不触发关闭。
- 点击图片在 1 倍与 2 倍之间切换；放大后可拖拽平移，平移范围会被限制，图片不会滑出视野。
- 触屏设备上左右滑动切换图片。

### 状态与 CSS 钩子

根节点带 `data-xqlight-status="idle | loading | loaded | error"`：`loading` 时显示加载指示，
`loaded` 时图片淡入，`error` 时展示错误卡片与重试按钮（`[data-xqlight="retry"]`）。
相邻图片会在后台预加载。

其他可用的钩子：`[data-xqlight="thumbs"]`（缩略图条，`role="group"`）、
`[data-xqlight-thumb="<索引>"]`（单个缩略图，当前项带 `aria-current`）、
`.lightbox-img-zoomed`（放大到 1 倍以上时挂上，同时把光标切成 grab/grabbing）、
`.lightbox-img-rotated`（图片处于旋转状态时挂上）。

标题栏共五个控件：缩放（放大镜图标，放大后切换为"还原"态）、旋转（CSS 画的环形箭头，
不依赖字体）、下载、全屏、关闭。

入场动画放在子元素的 keyframes 里，因此打开有过渡、关闭是瞬切（为了保持
`.lightbox` / `.lightbox.active` 的 display 契约足够简单）。所有动效在
`prefers-reduced-motion: reduce` 下关闭。

## 作为模块使用

```js
import XqLightBox from 'xqlight';

const lightbox = new XqLightBox({ imgCls: '.imgs' });
```

```js
const XqLightBox = require('xqlight');
```

纯函数也会导出，便于复用：

```js
import XqLightBox, { clampScale, wrapIndex, buildFileName, buildTransform, accumulateWheel } from 'xqlight';
```

浏览器构建上同样的函数挂在 `XqLightBox.utils`。

## 在 Vue 中使用

封装从 `xqlight/vue` 子路径导出，同一个组件同时支持 Vue 2 与 Vue 3。

```js
// main.js
import xqlight from 'xqlight/vue';

Vue.use(xqlight);   // Vue 2
app.use(xqlight);   // Vue 3
```

它会注册 `<xq-lightbox>`，并自动加载样式。

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
                { id: 1, src: '/img/a1.jpg', name: '第一张' },
                { id: 2, src: '/img/a2.jpg', name: '第二张' }
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

> 模板里请使用 kebab-case 属性。in-DOM 模板会被浏览器把属性名小写，
> 写 `:showLightBox` 会静默变成 `showlightbox`。

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `lightTitle` | `String` | `''` | 标题栏文字，缺省显示「图片预览」。 |
| `showLightBox` | `Boolean` | `false` | 是否显示，由父组件控制。 |
| `lightImgs` | `Array` | `[]` | 元素可用 `src` 或 `url`，以及 `name` 或 `title`。 |
| `currentUrl` | `String` | `''` | 显式指定图片地址；列表元素没给地址时生效。 |
| `currentIndex` | `Number` | `0` | 打开时展示的索引。 |
| `currentText` | `String` | `''` | 显式指定标题。 |
| `thumbnails` | `Boolean \| String` | `'auto'` | 与构造选项同义；列表元素可给 `thumb` 指定缩略图。 |

### 事件

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `hideLightBox` | — | 点击关闭、按 `Esc` 时触发，父组件应把 `showLightBox` 置为 `false`。 |
| `update:currentIndex` | `number` | 用户切换图片时触发。 |
| `update:currentUrl` | `string` | 与索引变化同时触发。 |
| `change` | `{ index, item }` | 同一时刻，附带解析后的图片对象。 |

### 直接挂载未编译的 SFC

组件以未编译形式发布，由使用方自己的 Vue 工具链编译。这条路径需要自行引入样式：

```js
import XqLightbox from 'xqlight/lib/vue/index.vue';
import 'xqlight/lib/css/xqlight.css';
```

不需要 Sass —— 组件里没有 `<style lang="scss">` 块。

## 样式

样式表是两个构建的唯一来源：浏览器版由脚本给根节点加 `.active`，Vue 版绑定同一个
类名，两者不会互相打架。必须自行引入 `lib/css/xqlight.css`（或 `.min.css`）——
组件里没有内联样式。

以下类名属于公开契约：

`.lightbox`、`.lightbox-title`、`.lightbox-content`、`.lightbox-ls`、`.lightbox-list`、
`.lightbox-img`、`.lightbox-arrow`、`.lightbox-link`、`.lightbox-name`、
`.lightbox-thumbs`、`.lightbox-thumb`、`.lightbox-loader`、`.lightbox-error`。

除类名外，每个结构与交互节点都带 `data-xqlight="<角色>"` 钩子——`close`、`prev`、
`next`、`download`、`scale`、`zoom`、`rotate`、`retry`、`img`、`link`、`current`、
`total`、`name`、`stage`、`content`、`ls`、`list`、`loader`、`error`、`thumbs`——
即使类名被改也能定位。颜色、间距、强调色都是普通 CSS 值，直接在自己样式表里覆盖即可，
不需要 CSS 变量。

## 浏览器支持

Chrome / Edge / Firefox / Safari 的当前版本与上一大版本。构建目标为 ES2017，不支持 IE。

## 给 AI 代理的元数据

`llms.txt` 是给代理读的紧凑 API 摘要。`skills/xqlight-lightbox/` 是对摘要说不清的部分的集成
技能：选哪个入口、Vue 侧的接入顺序、`refresh` / `destroy` 的生命周期、以及优先排查的失效
场景；精确签名在 `skills/xqlight-lightbox/references/api.md`。两者都会打进 npm 包，并通过
`package.json` 的 `llms` 与 `agents` 字段指向。

## 开发

```bash
npm install
npm run build        # 重新生成 lib/js/*.min.* 与 lib/css/*.min.css
npm run build:check  # 产物过期时失败
npm test             # 纯函数与仓库契约测试
npm run verify       # 用 DOM 桩执行真实构建产物
npm run test:browser # 启动零依赖静态服务器，打开 test/*.html
```

`lib/js/xqlight.js` 是唯一手写源码，ESM 构建与所有 `*.min.*` 都由它生成。
产物一并提交，因此改完源码必须跑一次 `npm run build` 才算完成。

## 许可证

MIT
