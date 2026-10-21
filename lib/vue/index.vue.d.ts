/**
 * xqlight v0.4.0 — 未编译 SFC 的类型存根。
 *
 * 放在 index.vue 旁边，TypeScript 解析 `import './index.vue'` 时会自动匹配到
 * `index.vue.d.ts`，因此使用方不需要额外的 `declare module '*.vue'`。
 */
import type { XqLightboxComponent } from '../types/vue/index';

declare const component: XqLightboxComponent;

export default component;
