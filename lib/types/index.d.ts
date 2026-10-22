/**
 * xqlight v0.6.0 — 类型声明
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
    /** 缩略图地址，缺省时复用原图（只作用于 Vue 列表；DOM 扫描读 `data-thumb`） */
    thumb?: string;
}

/** 缩略图条开关：true 强制显示、false 关闭、'auto' 时 2~20 张才显示 */
export type XqLightThumbnails = boolean | 'auto';

/** 灯箱当前状态（同步到根节点的 `data-xqlight-status`） */
export type XqLightStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** 键盘动作名，见 `KEY_ACTIONS` */
export type XqLightAction = 'close' | 'prev' | 'next' | 'first' | 'last' | 'zoomIn' | 'zoomOut';

/** 滚轮累积状态，配合 `accumulateWheel` 使用 */
export interface XqLightWheelState {
    accum: number;
    last: number;
}

/** 构造参数 */
export interface XqLightOptions {
    /** 包裹图片列表的容器选择器，必填，例如 `.imgs` */
    imgCls: string;
    /** 缩略图条：默认 'auto'（2~20 张时显示） */
    thumbnails?: XqLightThumbnails;
}

/** 可复用的纯函数集合，浏览器构建挂在 `XqLightBox.utils` 上 */
export interface XqLightboxUtils {
    readonly ZOOM_STEP: number;
    readonly ZOOM_MIN: number;
    readonly ZOOM_MAX: number;
    /** 触控板累积阈值：累积量达到该值才动一档 */
    readonly WHEEL_UNIT: number;
    /** 滚轮空闲毫秒数，超过后累积量清零 */
    readonly WHEEL_IDLE: number;
    /** 键名 → 动作 的映射表 */
    readonly KEY_ACTIONS: Readonly<Record<string, XqLightAction>>;
    /** 把缩放值夹紧到 [ZOOM_MIN, ZOOM_MAX] */
    clampScale(value: number): number;
    /** 索引环绕，空列表返回 0 */
    wrapIndex(index: number, length: number): number;
    /** 从地址取文件名，去掉查询串与哈希 */
    parseFileName(url: string): string;
    /** 生成 `xqlight-<原名>` 形式的下载文件名 */
    buildFileName(url: string, fallback?: string): string;
    /** 平移 + 旋转 + 缩放合成一个 transform 字符串；旋转为 0 时省略 rotate 段 */
    buildTransform(x: number, y: number, scale: number, rotation?: number): string;
    /** 把角度归一化到 [0, 360) 的 90 度倍数 */
    normalizeRotation(deg: number): number;
    /**
     * 滚轮累积：deltaY 归一化后累入 state，达到 WHEEL_UNIT 时返回 ±1 并扣减，
     * 空闲超过 WHEEL_IDLE 自动清零。deltaMode 1/2 分别按 40/800 换算。
     */
    accumulateWheel(state: XqLightWheelState, deltaY: number, deltaMode: number, now: number): number;
    /** 收集容器内可聚焦节点（a[href]、button、[tabindex="0"]），按文档顺序返回 */
    collectFocusables(root: Element): Element[];
    /** 焦点陷阱走一步：返回下一个应聚焦的节点 */
    focusTrapStep(list: Element[], active: Element | null, backwards: boolean): Element | null;
    /** 把平移坐标夹紧到 [0, maxX] / [0, maxY] */
    clampPan(x: number, y: number, maxX: number, maxY: number): number[];
    /** 预加载图片地址（用 createElement('img')，不影响页面 DOM） */
    preloadImages(urls: string[], doc?: Document): void;
    /** 锁定页面滚动（引用计数 + 滚动条宽度补偿），多实例共享 */
    lockScroll(locked: boolean): void;
    /** 解锁页面滚动 */
    unlockScroll(): void;
    /** 触发下载；跨域读取失败时回退为直接打开源地址 */
    downloadImage(url: string, filename?: string): Promise<boolean>;
    /** 请求全屏；缺省为整页，传元素则只全屏该元素 */
    toggleFullscreen(element?: Element): boolean;
    /** 退出全屏 */
    exitFullscreen(): boolean;
}

/**
 * 图片灯箱。
 *
 * 每个实例拥有独立的 DOM 子树，同一页面可以安全创建多个实例。
 * 根节点上的 `data-xqlight-status` 反映加载状态，可用 CSS 钩子定制加载/错误态。
 */
export declare class XqLightBox {
    constructor(option?: XqLightOptions);

    /** 包版本 */
    static readonly version: string;
    /** 纯函数集合 */
    static readonly utils: XqLightboxUtils;

    /** 图库容器选择器 */
    imgCls: string;
    /** 缩略图条配置 */
    thumbnails: XqLightThumbnails;
    /** 当前绑定的图片列表 */
    imgList: Array<XqLightImage & { index: number; url: string; thumb: string }>;
    /** 当前图片索引 */
    currentImgIndex: number;
    /** 当前缩放值 */
    currentScale: number;
    /** 当前横向位移（像素） */
    currentX: number;
    /** 当前纵向位移（像素） */
    currentY: number;
    /** 当前旋转角度，取值 0 / 90 / 180 / 270 */
    currentRotation: number;
    /** 是否处于全屏 */
    isScale: boolean;
    /** 灯箱是否打开 */
    isOpen: boolean;
    /** 加载状态：idle / loading / loaded / error */
    status: XqLightStatus;
    /** 实例自己的根节点，销毁后为 null */
    root: HTMLElement | null;

    /** 挂载 DOM、绑定控件并扫描图片 */
    init(): this;
    /** 注入灯箱标记并绑定交互 */
    mount(): this;
    /** 生成灯箱 DOM 结构 */
    addLightBoxElem(): this;
    /** 绑定关闭/缩放/下载/上一张/下一张与 Enter/Space 激活 */
    addIconEvent(): this;
    /** 绑定点击遮罩关闭与点击图片缩放 */
    bindBackdrop(): this;
    /** 绑定拖拽平移与滑动切图（PointerEvent） */
    bindGesture(): this;
    /** 绑定滚轮缩放 */
    addArrow(): this;
    /** 绑定键盘操作（含 Tab 焦点陷阱、Home/End） */
    bindKeyboard(): this;
    /** 按文档就绪状态决定扫描时机 */
    whenReady(): this;
    /** 扫描图库图片并绑定点击，可重复调用 */
    getImgs(): this;
    /** 重新扫描图库（动态插入图片后调用） */
    refresh(): this;
    /** 更新总数显示 */
    syncTotal(): this;
    /** 渲染/重建缩略图条（受 thumbnails 配置控制） */
    renderThumbs(): this;
    /** 预加载当前图相邻的前后各一张 */
    preloadNeighbors(): this;
    /** 写入加载状态并同步到根节点属性 */
    setStatus(status: XqLightStatus): this;
    /** 打开灯箱，index 越界时环绕 */
    showLightBox(index: number): this;
    /** 渲染当前图片 */
    showImg(): this;
    /** 立即应用平移与缩放 */
    applyScale(): this;
    /** 把缩放写入合并到下一帧 */
    scheduleFrame(): this;
    /** 设置缩放值，回 1 时清零位移 */
    setScale(value: number): this;
    /** 按方向缩放一档：1 放大，-1 缩小 */
    zoom(direction: number): this;
    /** 滚轮处理器（累积阈值），仅在打开时拦截页面滚动 */
    handleScroll(event: Event): this;
    /** 点击图片在 1× 与放大档之间切换 */
    toggleZoom(): this;
    /** 顺时针旋转 90 度（0→90→180→270→0），切图复位；传负数逆时针 */
    rotate(step?: number): this;
    /** 同步缩放按钮的图标与 aria-label */
    syncZoomButton(): this;
    /** 同步旋转按钮的 aria-label */
    syncRotateButton(): this;
    /** 切换全屏（作用于灯箱根节点） */
    scaleImg(): this;
    /** 进入全屏 */
    fullScreenOpen(): this;
    /** 退出全屏 */
    fullScreenCancel(): this;
    /** 下载当前图片或指定地址 */
    downloadImg(url?: string, name?: string): Promise<boolean>;
    /** 关闭灯箱并恢复打开前焦点 */
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
