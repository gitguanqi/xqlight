<template>
    <div
        class="lightbox"
        :class="{ active: isOpen }"
        role="dialog"
        aria-modal="true"
        :aria-hidden="isOpen ? 'false' : 'true'"
        :aria-label="title || lightTitle || '图片预览'"
        data-xqlight-root="1"
        @wheel="handleWheel"
    >
        <div class="lightbox-title">
            <span class="lightbox-title-tip">{{ lightTitle || '图片预览' }}</span>
            <div class="lightbox-title-num">
                (<strong data-xqlight="current">{{ isOpen ? index + 1 : 0 }}</strong>/<strong data-xqlight="total">{{ total }}</strong>)
                <span class="lightbox-name">【<span data-xqlight="name">{{ currentName }}</span>】</span>
            </div>
            <p>
                <i
                    class="lightbox-download plugin plugin-download"
                    role="button"
                    tabindex="0"
                    aria-label="下载图片"
                    @click="downloadImg"
                ></i>
                <i
                    :class="['lightbox-scale', 'plugin', isScale ? 'plugin-fullscreen-exit' : 'plugin-fullscreen']"
                    role="button"
                    tabindex="0"
                    :aria-label="isScale ? '退出全屏' : '全屏显示'"
                    @click="scaleImg"
                ></i>
                <i
                    ref="close"
                    class="lightbox-close plugin plugin-times"
                    role="button"
                    tabindex="0"
                    aria-label="关闭"
                    @click="closeLightBox"
                ></i>
            </p>
        </div>
        <div class="lightbox-content">
            <div class="lightbox-ls">
                <div
                    class="lightbox-arrow lightbox-arrow-left"
                    role="button"
                    tabindex="0"
                    aria-label="上一张"
                    @click="prevImg"
                >
                    <i class="plugin plugin-arrow-left"></i>
                </div>
                <ul class="lightbox-list">
                    <li>
                        <a class="lightbox-link" :href="src || ''" target="_blank" rel="noopener">
                            <img
                                class="lightbox-img"
                                :src="src || ''"
                                :alt="currentName"
                                :style="{ transform: `scale(${currentScale})` }"
                                @click="toggleZoom"
                            />
                        </a>
                    </li>
                </ul>
                <div
                    class="lightbox-arrow lightbox-arrow-right"
                    role="button"
                    tabindex="0"
                    aria-label="下一张"
                    @click="nextImg"
                >
                    <i class="plugin plugin-arrow-right"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
// 纯逻辑（索引环绕、缩放夹紧、下载、全屏）由浏览器版核心提供，
// 组件只做 Vue 侧的状态与事件适配，避免同一份算法维护两遍。
import {
    ZOOM_STEP,
    clampScale,
    wrapIndex,
    buildFileName,
    downloadImage,
    toggleFullscreen,
    exitFullscreen
} from '../js/xqlight.esm.mjs';

export default {
    name: 'XqLightbox',
    props: {
        /** 标题栏文字 */
        lightTitle: {
            type: String,
            default: ''
        },
        /** 是否显示灯箱，由父组件控制 */
        showLightBox: {
            type: Boolean,
            default: false
        },
        /** 图片列表，元素支持 { src | url, name | title } */
        lightImgs: {
            type: Array,
            default: function () {
                return [];
            }
        },
        /** 当前图片地址；不传时取 lightImgs[currentIndex] */
        currentUrl: {
            type: String,
            default: ''
        },
        /** 当前图片索引 */
        currentIndex: {
            type: Number,
            default: 0
        },
        /** 当前图片标题；不传时取 lightImgs[currentIndex] 的 name/title */
        currentText: {
            type: String,
            default: ''
        }
    },
    // Vue 2 忽略该选项，Vue 3 用它声明事件
    emits: ['hideLightBox', 'update:currentIndex', 'update:currentUrl', 'change'],
    data: function () {
        return {
            index: 0,
            currentScale: 1,
            isScale: false,
            src: '',
            title: '',
            // 内部状态放在 data 里，Vue 2/3 都能安全读写（下划线开头的 key 不会被代理）
            scrollLocked: false,
            previousOverflow: '',
            torn: false
        };
    },
    computed: {
        total: function () {
            return this.list.length;
        },
        list: function () {
            return Array.isArray(this.lightImgs) ? this.lightImgs : [];
        },
        isOpen: function () {
            return Boolean(this.showLightBox);
        },
        currentName: function () {
            return this.title || this.currentText || ('IMG' + (this.index + 1));
        }
    },
    watch: {
        currentUrl: function (value) {
            if (value) this.src = value;
        },
        currentIndex: function (value) {
            this.goTo(value, false);
        },
        currentText: function (value) {
            if (value) this.title = value;
        },
        showLightBox: function (value) {
            this.toggleScroll(value);
        }
    },
    mounted: function () {
        this.goTo(this.currentIndex, false);
        this.toggleScroll(this.isOpen);
        document.addEventListener('keydown', this.handleKeydown);
    },
    // Vue 3 用 beforeUnmount，Vue 2 用 beforeDestroy，只有对应那个会触发
    beforeUnmount: function () {
        this.teardown();
    },
    beforeDestroy: function () {
        this.teardown();
    },
    methods: {
        /**
         * 跳到指定索引并同步当前地址/标题。
         * @param {number} index
         * @param {boolean} emit 是否向父组件回传索引变化
         */
        goTo: function (index, emit) {
            const item = this.total ? this.list[wrapIndex(index, this.total)] : null;
            this.index = this.total ? wrapIndex(index, this.total) : 0;
            if (item) {
                this.src = item.src || item.url || '';
                this.title = item.title || item.name || '';
            } else if (this.currentUrl) {
                this.src = this.currentUrl;
            }
            this.currentScale = 1;
            if (emit) {
                this.$emit('update:currentIndex', this.index);
                this.$emit('update:currentUrl', this.src);
                this.$emit('change', { index: this.index, item: item });
            }
        },
        prevImg: function () {
            this.goTo(this.index - 1, true);
        },
        nextImg: function () {
            this.goTo(this.index + 1, true);
        },
        /**
         * 图片点击：在两档之间切换，不再两个分支互相抵消。
         */
        toggleZoom: function () {
            this.currentScale = this.currentScale > 1 ? 1 : clampScale(2);
        },
        /**
         * 滚轮缩放，只在灯箱打开时拦截页面滚动。
         * @param {WheelEvent} event
         */
        handleWheel: function (event) {
            if (!this.isOpen) return;
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            const delta = Number(event && event.deltaY) || 0;
            this.currentScale = clampScale(this.currentScale + (delta > 0 ? -ZOOM_STEP : ZOOM_STEP));
        },
        scaleImg: function () {
            this.isScale = !this.isScale;
            if (this.isScale) toggleFullscreen();
            else exitFullscreen();
        },
        async downloadImg () {
            if (!this.src) return;
            await downloadImage(this.src, buildFileName(this.src));
        },
        closeLightBox: function () {
            this.currentScale = 1;
            this.$emit('hideLightBox');
        },
        /**
         * 键盘操作：Esc 关闭、左右切换。
         * @param {KeyboardEvent} event
         */
        handleKeydown: function (event) {
            if (!this.isOpen) return;
            if (event.key === 'Escape') this.closeLightBox();
            else if (event.key === 'ArrowLeft') this.prevImg();
            else if (event.key === 'ArrowRight') this.nextImg();
        },
        /**
         * 锁定/恢复页面滚动，并保存打开前的滚动位置。
         * @param {boolean} locked
         */
        toggleScroll: function (locked) {
            if (typeof document === 'undefined' || !document.body) return;
            if (locked) {
                if (!this.scrollLocked) {
                    this.previousOverflow = document.body.style.overflow || '';
                    this.scrollLocked = true;
                }
                document.body.style.overflow = 'hidden';
                this.focusClose();
                return;
            }
            if (this.scrollLocked) {
                document.body.style.overflow = this.previousOverflow || '';
                this.scrollLocked = false;
            }
        },
        focusClose: function () {
            const node = this.$refs.close;
            if (node && typeof node.focus === 'function') node.focus();
        },
        teardown: function () {
            if (this.torn) return;
            this.torn = true;
            document.removeEventListener('keydown', this.handleKeydown);
            this.toggleScroll(false);
            if (this.isScale) {
                this.isScale = false;
                exitFullscreen();
            }
        }
    }
};
</script>
