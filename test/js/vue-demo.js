/*
 * Vue 2 / Vue 3 测试页共用的演示辅助组件。
 *
 * 注意：这不是包的导出，只是测试页的辅助代码。真正的 Vue 封装是未编译的
 * lib/vue/index.vue，由使用方自己的工具链编译；浏览器里跑不了 SFC，
 * 所以这里用纯 Options API 的组件包一个原生实例，验证两个大版本的
 * 挂载/卸载生命周期都能和库正确配合。
 */
(function (global) {
    'use strict';

    /**
     * @param {Object} Vue 全局 Vue 构造器（Vue 2）或命名空间（Vue 3）
     * @param {number} major 2 或 3
     */
    function createDemo(Vue, major) {
        let instance = null;
        let app = null;

        const component = {
            name: 'DemoLightbox',
            data: function () {
                return { opened: false };
            },
            mounted: function () {
                // 一个组件只创建一个灯箱实例
                if (!instance) instance = new window.XqLightBox({ imgCls: '.imgs' });
            },
            // Vue 3 触发 beforeUnmount，Vue 2 触发 beforeDestroy，两个都挂同一个清理函数
            beforeUnmount: function () {
                this.teardown();
            },
            beforeDestroy: function () {
                this.teardown();
            },
            methods: {
                teardown: function () {
                    if (!instance) return;
                    instance.destroy();
                    instance = null;
                },
                open: function () {
                    if (instance) instance.showLightBox(0);
                }
            },
            template: '<div class="demo-actions">' +
                '<button type="button" @click="open">用实例打开灯箱</button>' +
                '</div>'
        };

        return {
            component: component,
            get instance() {
                return instance;
            },
            mount: function () {
                const host = document.getElementById('vue-app');
                host.innerHTML = '';
                const slot = document.createElement('div');
                host.appendChild(slot);
                if (major === 2) {
                    app = new Vue({
                        components: { DemoLightbox: component },
                        template: '<demo-lightbox />'
                    }).$mount(slot);
                } else {
                    app = Vue.createApp({
                        components: { DemoLightbox: component },
                        template: '<demo-lightbox />'
                    });
                    app.mount(slot);
                }
                return app;
            },
            unmount: function () {
                if (!app) return;
                if (major === 2) app.$destroy();
                else app.unmount();
                app = null;
            }
        };
    }

    global.createXqlightVueDemo = createDemo;
})(window);
