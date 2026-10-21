# Changelog

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
