/**
 * xqlight v0.4.0 — 类型声明
 * 由 lib/js/xqlight.js 的公共接口手工维护，随包一起提交。
 */

/** 图库中的一张图片 */
export interface XqLightImage {
    /** 图片地址，优先级高于 url */
    src?: string;
    /** 图片地址的兼容字段 */
    url?: string;
    /** 显示名称，缺省时回落到 `img<序号>` */
    name?: string;
    /** 标题的兼容字段 */
    title?: string;
}

/** 构造参数 */
export interface XqLightOptions {
    /** 包裹图片列表的容器选择器，必填，例如 `.imgs` */
    imgCls: string;
}

/** 可复用的纯函数集合，浏览器构建挂在 `XqLightBox.utils` 上 */
export interface XqLightboxUtils {
    readonly ZOOM_STEP: number;
    readonly ZOOM_MIN: number;
    readonly ZOOM_MAX: number;
    /** 把缩放值夹紧到 [ZOOM_MIN, ZOOM_MAX] */
    clampScale(value: number): number;
    /** 索引环绕，空列表返回 0 */
    wrapIndex(index: number, length: number): number;
    /** 从地址取文件名，去掉查询串与哈希 */
    parseFileName(url: string): string;
    /** 生成 `xqlight-<原名>` 形式的下载文件名 */
    buildFileName(url: string, fallback?: string): string;
    /** 触发下载；跨域读取失败时回退为直接打开源地址 */
    downloadImage(url: string, filename?: string): Promise<boolean>;
    /** 请求全屏 */
    toggleFullscreen(): boolean;
    /** 退出全屏 */
    exitFullscreen(): boolean;
}

/**
 * 图片灯箱。
 *
 * 每个实例拥有独立的 DOM 子树，同一页面可以安全创建多个实例。
 */
export declare class XqLightBox {
    constructor(option?: XqLightOptions);

    /** 包版本 */
    static readonly version: string;
    /** 纯函数集合 */
    static readonly utils: XqLightboxUtils;

    /** 图库容器选择器 */
    imgCls: string;
    /** 当前绑定的图片列表 */
    imgList: XqLightImage[];
    /** 当前图片索引 */
    currentImgIndex: number;
    /** 当前缩放值 */
    currentScale: number;
    /** 是否处于全屏 */
    isScale: boolean;
    /** 灯箱是否打开 */
    isOpen: boolean;
    /** 实例自己的根节点，销毁后为 null */
    root: HTMLElement | null;

    /** 挂载 DOM、绑定控件并扫描图片 */
    init(): this;
    /** 注入灯箱标记 */
    addLightBoxElem(): this;
    /** 绑定关闭/缩放/下载/上一张/下一张 */
    addIconEvent(): this;
    /** 绑定滚轮缩放 */
    addArrow(): this;
    /** 绑定键盘操作 */
    bindKeyboard(): this;
    /** 按文档就绪状态决定扫描时机 */
    whenReady(): this;
    /** 扫描图库图片并绑定点击，可重复调用 */
    getImgs(): this;
    /** 重新扫描图库（动态插入图片后调用） */
    refresh(): this;
    /** 更新总数显示 */
    syncTotal(): this;
    /** 打开灯箱，index 越界时环绕 */
    showLightBox(index: number): this;
    /** 渲染当前图片 */
    showImg(): this;
    /** 立即应用缩放 */
    applyScale(): this;
    /** 把缩放写入合并到下一帧 */
    scheduleFrame(): this;
    /** 按方向缩放一档：1 放大，-1 缩小 */
    zoom(direction: number): this;
    /** 滚轮处理器，仅在打开时拦截页面滚动 */
    handleScroll(event: Event): this;
    /** 切换全屏 */
    scaleImg(): this;
    /** 进入全屏 */
    fullScreenOpen(): this;
    /** 退出全屏 */
    fullScreenCancel(): this;
    /** 下载当前图片或指定地址 */
    downloadImg(url?: string, name?: string): Promise<boolean>;
    /** 关闭灯箱 */
    closeLightBox(): this;
    /** 上一张 */
    prevImg(): this;
    /** 下一张 */
    nextImg(): this;
    /** 跳到指定索引 */
    goTo(index: number): this;
    /** 销毁实例，解绑全部监听并移除节点 */
    destroy(): this;
}

declare global {
    interface Window {
        /** 通过 `<script>` 引入时挂到 window 上的构造器 */
        XqLightBox: typeof XqLightBox;
    }
}

export default XqLightBox;
