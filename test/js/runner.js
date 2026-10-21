/*
 * xqlight 测试页共用的自检运行器。
 *
 * 页面上的每个断言都必须可见：控制台里的报错不算通过。运行器把结果写成
 * PENDING / PASS / FAIL 列表，并在页头状态徽章上同步 `data-status`，
 * 方便浏览器自动化等待。
 */
(function (global) {
    'use strict';

    function createSuite() {
        const statusNode = document.querySelector('[data-suite-status]');
        const listNode = document.querySelector('[data-suite-results]');
        const results = [];

        const state = {
            status: 'pending',
            results: results
        };

        function setStatus(next, text) {
            state.status = next;
            if (statusNode) {
                statusNode.setAttribute('data-status', next);
                statusNode.textContent = text;
            }
            if (global.__xqlightTest) {
                global.__xqlightTest.status = next;
                global.__xqlightTest.failed = results.filter((item) => !item.ok).length;
            }
        }

        function record(label, ok, detail) {
            results.push({ label: label, ok: Boolean(ok), detail: detail || '' });
            if (listNode) {
                const item = document.createElement('li');
                item.className = ok ? 'is-pass' : 'is-fail';
                item.textContent = (ok ? 'PASS ' : 'FAIL ') + label + (ok || !detail ? '' : ' — ' + detail);
                listNode.appendChild(item);
            }
            return Boolean(ok);
        }

        global.__xqlightTest = state;
        setStatus('pending', 'PENDING');

        // 未捕获异常与未处理的 Promise 拒绝都必须落到检查列表里，不能只留在控制台
        global.addEventListener('error', function (event) {
            record('未捕获异常：' + (event.message || 'unknown'), false, event.filename || '');
        });
        global.addEventListener('unhandledrejection', function (event) {
            const reason = event.reason;
            record('未处理的 Promise 拒绝', false, String((reason && reason.message) || reason || ''));
        });

        return {
            results: results,
            get status() {
                return state.status;
            },
            /**
             * 同步断言。fn 返回 true/false，或 { ok, detail }；抛错视为失败。
             * @param {string} label
             * @param {Function|boolean} fn
             * @returns {boolean}
             */
            check(label, fn) {
                let ok = false;
                let detail = '';
                try {
                    const out = typeof fn === 'function' ? fn() : fn;
                    if (out && typeof out === 'object') {
                        ok = Boolean(out.ok);
                        detail = out.detail || '';
                    } else {
                        ok = Boolean(out);
                    }
                } catch (error) {
                    ok = false;
                    detail = error && error.message ? error.message : String(error);
                }
                return record(label, ok, detail);
            },
            /**
             * 异步断言。fn 返回 Promise<boolean|{ok, detail}>。
             * @param {string} label
             * @param {Function} fn
             * @returns {Promise<boolean>}
             */
            async checkAsync(label, fn) {
                try {
                    const out = await fn();
                    if (out && typeof out === 'object') return record(label, out.ok, out.detail);
                    return record(label, out);
                } catch (error) {
                    return record(label, false, error && error.message ? error.message : String(error));
                }
            },
            /** 等待图片真正解码完成 */
            waitForImage(src) {
                return new Promise(function (resolve, reject) {
                    const probe = new Image();
                    probe.onload = function () {
                        resolve(probe.naturalWidth > 0);
                    };
                    probe.onerror = function () {
                        reject(new Error('image failed to load: ' + src));
                    };
                    probe.src = src;
                });
            },
            /** 轮询直到条件成立；超时抛错，由 checkAsync 记成失败 */
            waitFor(fn, timeout) {
                const limit = typeof timeout === 'number' ? timeout : 4000;
                const start = Date.now();
                return new Promise(function (resolve, reject) {
                    function tick() {
                        let value = false;
                        try {
                            value = fn();
                        } catch (error) {
                            reject(error);
                            return;
                        }
                        if (value) {
                            resolve(true);
                            return;
                        }
                        if (Date.now() - start > limit) {
                            reject(new Error('waitFor timeout after ' + limit + 'ms'));
                            return;
                        }
                        setTimeout(tick, 50);
                    }
                    tick();
                });
            },
            /** 等一帧：滚轮缩放是 rAF 合并写入的，断言前要让它落地 */
            nextFrame() {
                return new Promise(function (resolve) {
                    requestAnimationFrame(function () {
                        resolve(true);
                    });
                });
            },
            /** 页面没有横向溢出（窄屏检查用） */
            noHorizontalOverflow() {
                return {
                    ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
                    detail: document.documentElement.scrollWidth + ' > ' + window.innerWidth
                };
            },
            /** 收尾：写入最终状态 */
            finish() {
                const failed = results.filter((item) => !item.ok).length;
                if (!results.length) {
                    setStatus('failed', 'FAIL — 没有任何检查项');
                    return false;
                }
                if (failed === 0) {
                    setStatus('passed', 'PASS (' + results.length + ')');
                    return true;
                }
                setStatus('failed', 'FAIL (' + failed + '/' + results.length + ')');
                return false;
            }
        };
    }

    global.XqSuite = { create: createSuite };
})(window);
