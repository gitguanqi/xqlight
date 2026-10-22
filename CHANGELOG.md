# Changelog

## 0.6.0

### 新增

- **给 AI 代理的元数据**：新增根 `llms.txt`（公开 API 摘要：入口、构造参数、实例方法、纯函数、
  Vue props / events 与关键约束）与 `skills/xqlight-lightbox/`（集成技能：入口选型、Vue 接入
  顺序、生命周期、失效排查，精确签名在 `references/api.md`）。`package.json` 增加 `llms` /
  `agents` 字段指向它们，并把 `llms.txt`、`skills` 加入 `files` 白名单。
- **元数据契约测试**：`test/contracts.test.mjs` 新增 3 条用例，校验 `llms` / `agents` 指向真实
  文件、`llms.txt` 覆盖 ESM 全部具名导出与真实原型方法、技能 frontmatter 合规且相对引用
  都在技能目录内。

运行时入口、`exports`、构建产物与包体积语义均未改动；`npm run build:check` 仍为 in sync。

### 开发

- **提交工具链**：引入 commitlint（`@commitlint/config-conventional` + 11 种 type 白名单）、
  Husky 9 钩子（`pre-commit` 跑 lint-staged，`commit-msg` 跑 commitlint）与 lint-staged。
  仓库目前没有 linter，lint-staged 规则暂留空占位，后续接入 eslint/biome 后只需改
  `lint-staged.config.mjs`。仅影响本地提交，不影响包内容。

## 0.5.0

本次发布不出新依赖、不改入口语义，只把灯箱的观感与常用交互补齐：样式从"能看"打磨到"够精致"，
交互从"能翻页"补到桌面与触屏都顺手。**无破坏性变更**。

### 新增

- **工具栏补齐缩放与旋转**：标题栏新增缩放按钮（1× ↔ 2×，与点击图片一致，放大后图标切换为
  "还原"态并同步 `aria-label`）与旋转按钮（每次顺时针 90°，0→90→180→270→0 循环，切图复位，
  快捷键 `R`）。旋转图标用 CSS 绘制，不增加字体体积。旋转会把位移清零；旋转后若图片超出
  可视区，可用滚轮缩小。transform 统一为 `translate3d(x, y, 0px) rotate(deg) scale(s)`，
  角度为 0 时省略 rotate 段。≤480px 时隐藏图片名，保证五个控件与计数同行放下。
- **缩略图导航**：新增 `thumbnails` 选项（`true` / `false` / `'auto'`，默认 `'auto'` 在 2–20 张时显示）。
  缩略图条用 `[data-xqlight="thumbs"]` 与 `[data-xqlight-thumb="<索引>"]` 钩子，当前项带 `aria-current`；
  DOM 扫描时可用 `<img data-thumb="...">` 指定小图。Vue 版对应 `thumbnails` prop 与列表项 `thumb` 字段。
- **点击遮罩关闭**：点空白处关闭，点图片、箭头、标题、缩略图不触发。
- **点击图片缩放 + 拖拽平移**：原生版与 Vue 版行为一致，在 1× 与 2× 之间切换；放大后可用
  PointerEvent 拖拽，平移范围经 `clampPan` 夹紧，不会把图片拖出视野。
- **移动端滑动切图**：`|dx| > 40px` 且显著大于纵向位移时翻页；`.lightbox-list` 设 `touch-action: none`，
  缩略图条设 `pan-x`，两者互不抢手势。
- **加载 / 错误态与重试**：根节点新增 `data-xqlight-status="idle|loading|loaded|error"`，
  新增 `.lightbox-loader` 与 `.lightbox-error`（含 `[data-xqlight="retry"]` 重试按钮）；
  图片加载完成淡入，失败给出可重试的错误卡片。
- **相邻图预加载**：切图时在后台预加载前后各一张。
- **键盘补全**：`Home` / `End` 跳首末张；`Tab` 在灯箱内循环（焦点陷阱）；`Enter` / `Space`
  可激活 `role="button"` 的图标控件——此前 Tab 聚焦后按键无反应。
- **入场动效与移动端适配**：标题栏与内容区分层淡入（`prefers-reduced-motion` 下关闭）；
  `100dvh`、`env(safe-area-inset-*)`、短横屏断点（标题压缩、隐藏缩略图条）。
- **纯函数下沉**：`buildTransform`、`accumulateWheel`、`collectFocusables`、`focusTrapStep`、
  `clampPan`、`preloadImages`、`lockScroll` / `unlockScroll`、`KEY_ACTIONS`、`WHEEL_UNIT`、
  `WHEEL_IDLE` 同时作为具名导出和 `XqLightBox.utils` 成员，Vue 版复用同一份实现。
- 类型声明补齐到 0.5.0 接口。

### 修复

- **全屏只作用于灯箱**：此前对 `document.documentElement` 调用，整页进入全屏；现在作用于灯箱根节点，
  并监听 `fullscreenchange`，用 `Esc` 退出全屏后图标状态不再错乱。
- **锁滚动导致页面横跳**：锁定时补偿滚动条宽度（`padding-right`），关闭后还原；Vue 版不再自建一套
  计数，与原生版共享同一把锁。
- **滚轮一次跳多档**：触控板的细碎 `wheel` 事件不再每来一次就动一档，改为累积到阈值才走一档
  （鼠标滚轮仍是 1 档），空闲 400ms 自动清零。
- **宽屏图片被压到 700px**：去掉 `.lightbox-img` 的 `max-width: 700px` 硬上限，改为撑满可用区域。
- **`will-change` 常驻**：只在放大（`.lightbox-img-zoomed`）时挂上，减少常驻合成层。
- **图标零反馈**：按钮、箭头补 hover / active 态与过渡，焦点环统一覆盖链接、按钮与
  `[tabindex="0"]`。
- **关闭后焦点丢失**：关闭时回到打开前的元素。

### 测试

- `npm test` 增至 34 项；`npm run verify` 增至 9 个 DOM 行为场景，新增 `backdrop`（遮罩关闭、
  点图缩放）、`toolbar`（缩放/旋转按钮状态与角度循环）与 `focus-trap`（Tab 循环、Home/End、
  缩略图渲染）。
- `test/browser.html`、`esm.html`、`vue2.html`、`vue3.html` 补充对应检查项；五个页面在真实
  Chrome 下全部通过、无控制台错误。

## 0.4.0

本次发布把包从“只有 Vue 插件入口、原生构建拿不到”修成两个构建都能用，
并修掉若干会在真实页面里立刻显形的缺陷。

### 破坏性变更

- `package.json` 的 `main` 改为原生构建 `lib/js/xqlight.js`。`import xqlight from 'xqlight'`
  现在拿到的是灯箱构造器，不再是 Vue 插件；Vue 插件移到 `xqlight/vue`。
- Vue 组件不再用 `v-show` 控制显隐，改为绑定 `.lightbox.active`，与浏览器版共享同一份样式契约。
- 组件不再内联 `<style lang="scss">`，改用 `lib/css/xqlight.css`，使用方无需安装 Sass。
- 组件点击图片改为在两档之间切换（1× / 2×）。旧实现里两个分支顺序执行、净变化为 0，
  点击图片永远不会缩放。

### 修复

- 多实例互相干扰：内部查询全部收进实例自己的根节点，第二个灯箱不再操作第一个灯箱的节点。
- 脚本在 `load` 之后加载时完全失效：不再覆盖 `window.onload`，改为按 `document.readyState`
  在 `DOMContentLoaded` 或立即扫描。
- 重复初始化：`getImgs()` 现在先解绑上一轮监听并清空列表，条目不会翻倍。
- 下载偶发中断与内存泄漏：`revokeObjectURL` 改为传 URL 字符串并延后一轮执行；
  跨域读取失败时回退为直接打开源地址，不再抛未捕获的 Promise 拒绝。
- Vue 组件的 5 处 `defalut` 拼写错误导致 props 默认值从未生效，缺省 `lightImgs` 时直接崩溃。
- 移除了重复注入的 `id`（`#lightbox-current` / `#lightbox-total` / `#lightbox-name`），
  内部钩子改用 `data-xqlight`。
- 移除了 `http()`：无人调用，且状态判断写成 `>= 200 || < 300` 恒为真，404 会被当成成功。
- 滚轮事件从已废弃的 `mousewheel` 改为 `wheel`（Firefox 之前完全不触发），并声明
  `passive: false`，缩放时不再连带滚动页面。

### 新增

- `destroy()`：移除监听与节点、恢复页面滚动，可重复调用。
- `refresh()`：动态插入图片后重新扫描。
- 键盘操作：`Esc` 关闭、`←`/`→` 切换、`+`/`-` 缩放。
- 基础可访问性：`role="dialog"`、`aria-modal`、按钮 `aria-label`、打开时聚焦关闭键、
  `:focus-visible` 轮廓。
- ESM 构建 `lib/js/xqlight.esm.mjs`（含压缩版）与具名导出的纯函数
  （`clampScale`、`wrapIndex`、`buildFileName`、`downloadImage` 等）。
- `exports` / `files` / `types` 清单，以及手写类型声明。
- 构建链路：`npm run build` 从 `lib/js/xqlight.js` 生成全部产物，
  `npm run build:check` 校验是否过期。
- 测试：`npm test`（纯函数 + 仓库契约）、`npm run verify`（DOM 桩执行真实产物，
  含多实例、重复刷新、销毁、缺失参数、就绪时机五个场景）、
  `npm run test:browser`（零依赖静态服务器 + 五个自检页面）。

### 移除

- `lib/js/iconfont.js` 与 `lib/js/iconfont.json`：全仓库无引用。
- 字体文件中的 eot / svg 两种格式。
- 样式表里的两条死规则（`.lightbox-title p i.active`、`.lightbox-ls ul li .lightbox-arrow`）。
- `directories.example`：指向不存在的目录。

## 0.3.7

上一个发布版本。
