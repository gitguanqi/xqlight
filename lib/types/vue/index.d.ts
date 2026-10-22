/**
 * xqlight v0.6.0 — Vue 包装层类型声明
 *
 * 不 import Vue：用结构化类型描述 Vue 2 / Vue 3 都满足的最小接口，
 * 这样包本身不会对任何一个大版本产生类型依赖。
 */
import type { XqLightImage, XqLightThumbnails } from '../index';

/** 组件 props */
export interface XqLightboxProps {
    /** 标题栏文字，默认「图片预览」 */
    lightTitle?: string;
    /** 是否显示灯箱，父组件控制 */
    showLightBox?: boolean;
    /** 图片列表，元素支持 src|url 与 name|title，可选 thumb 作为缩略图 */
    lightImgs?: XqLightImage[];
    /** 当前图片地址；不传时取 lightImgs[currentIndex] */
    currentUrl?: string;
    /** 当前图片索引 */
    currentIndex?: number;
    /** 当前图片标题；不传时取 lightImgs[currentIndex] 的 name/title */
    currentText?: string;
    /** 缩略图条：true 强制显示、false 关闭、'auto'（默认）2~20 张时显示 */
    thumbnails?: XqLightThumbnails;
}

/** 组件事件 */
export interface XqLightboxEvents {
    /** 点击关闭时触发，父组件应把 showLightBox 置为 false */
    hideLightBox: () => void;
    'update:currentIndex': (index: number) => void;
    'update:currentUrl': (url: string) => void;
    change: (payload: { index: number; item: XqLightImage | null }) => void;
}

/** Vue 2 的 Vue 构造器与 Vue 3 的 app 都满足的最小结构 */
export interface VueApp {
    component(name: string, definition: unknown): unknown;
}

/** 插件对象 */
export interface XqLightboxPlugin {
    install(app: VueApp): void;
}

/** 未编译的 SFC，交给使用方的 Vue 工具链编译 */
export interface XqLightboxComponent {
    name: string;
    props: XqLightboxProps;
}

export declare const lightboxComponent: XqLightboxComponent;
declare const plugin: XqLightboxPlugin;

export default plugin;
export { plugin as xqlightbox };
