// 构建产物的纯函数契约。DOM 行为由 scripts/dom-behavior-harness.mjs 覆盖，
// 这里只测不依赖浏览器的那部分。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import XqLightBox, {
    XqLightBox as NamedXqLightBox,
    ZOOM_STEP,
    ZOOM_MIN,
    ZOOM_MAX,
    WHEEL_UNIT,
    WHEEL_IDLE,
    KEY_ACTIONS,
    clampScale,
    wrapIndex,
    parseFileName,
    buildFileName,
    buildTransform,
    normalizeRotation,
    accumulateWheel,
    collectFocusables,
    focusTrapStep,
    clampPan
} from '../lib/js/xqlight.esm.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(repo, 'package.json'), 'utf8'));

test('ESM 构建同时提供默认导出与具名导出，且指向同一个构造器', () => {
    assert.equal(typeof XqLightBox, 'function');
    assert.equal(XqLightBox, NamedXqLightBox);
});

test('构造器版本与 package.json 一致', () => {
    assert.equal(XqLightBox.version, pkg.version);
});

test('缩放常量是公开的', () => {
    assert.equal(ZOOM_STEP, 0.2);
    assert.equal(ZOOM_MIN, 0.4);
    assert.equal(ZOOM_MAX, 3);
});

test('clampScale 夹紧区间并消除浮点误差', () => {
    assert.equal(clampScale(1), 1);
    assert.equal(clampScale(9), ZOOM_MAX);
    assert.equal(clampScale(0.1), ZOOM_MIN);
    assert.equal(clampScale(1.2000000000000002), 1.2);
    assert.equal(clampScale(Number.NaN), 1);
    assert.equal(clampScale('1.4'), 1.4);
});

test('wrapIndex 支持环绕与空列表', () => {
    assert.equal(wrapIndex(0, 5), 0);
    assert.equal(wrapIndex(4, 5), 4);
    assert.equal(wrapIndex(5, 5), 0);
    assert.equal(wrapIndex(-1, 5), 4);
    assert.equal(wrapIndex(-6, 5), 4);
    assert.equal(wrapIndex(3, 0), 0);
    assert.equal(wrapIndex(Number.NaN, 3), 0);
});

test('parseFileName 去掉查询串与哈希', () => {
    assert.equal(parseFileName('https://cdn.test/a/b/photo.jpg?token=1#x'), 'photo.jpg');
    assert.equal(parseFileName('./img/a1.jpg'), 'a1.jpg');
    assert.equal(parseFileName(''), '');
    assert.equal(parseFileName('https://cdn.test/path/'), '');
});

test('buildFileName 保留 xqlight- 前缀约定', () => {
    assert.equal(buildFileName('./img/a1.jpg'), 'xqlight-a1.jpg');
    assert.equal(buildFileName('./img/a1.jpg?token=12121'), 'xqlight-a1.jpg');
    assert.equal(buildFileName(''), 'xqlight-image');
    assert.equal(buildFileName('', 'fallback.png'), 'xqlight-fallback.png');
});

test('buildTransform 统一输出 translate3d + scale', () => {
    assert.equal(buildTransform(0, 0, 1), 'translate3d(0px, 0px, 0px) scale(1)');
    assert.equal(buildTransform(0, 0, 1.2), 'translate3d(0px, 0px, 0px) scale(1.2)');
    assert.equal(buildTransform(12.345, -8, 2), 'translate3d(12.35px, -8px, 0px) scale(2)');
    assert.equal(buildTransform(Number.NaN, undefined, 1), 'translate3d(0px, 0px, 0px) scale(1)');
});

test('buildTransform 的旋转段只在非零角度时出现', () => {
    assert.equal(buildTransform(0, 0, 1, 0), 'translate3d(0px, 0px, 0px) scale(1)');
    assert.equal(buildTransform(0, 0, 1, 90), 'translate3d(0px, 0px, 0px) rotate(90deg) scale(1)');
    assert.equal(buildTransform(0, 0, 1, 360), 'translate3d(0px, 0px, 0px) scale(1)');
    assert.equal(buildTransform(5, -2, 2, 270), 'translate3d(5px, -2px, 0px) rotate(270deg) scale(2)');
});

test('normalizeRotation 归一化到 0~270 的 90 度倍数', () => {
    assert.equal(normalizeRotation(90), 90);
    assert.equal(normalizeRotation(450), 90);
    assert.equal(normalizeRotation(-90), 270);
    assert.equal(normalizeRotation(360), 0);
    assert.equal(normalizeRotation(45), 90);
    assert.equal(normalizeRotation('not a number'), 0);
    assert.equal(normalizeRotation(undefined), 0);
});

test('键盘映射包含旋转快捷键 R', () => {
    assert.equal(KEY_ACTIONS.r, 'rotate');
    assert.equal(KEY_ACTIONS.R, 'rotate');
});

test('accumulateWheel 把高频小步长折算成至多一档', () => {
    assert.equal(WHEEL_UNIT, 50);
    assert.equal(WHEEL_IDLE, 400);

    // 鼠标滚轮整格 ±100 仍然是一档
    const wheel = { accum: 0, last: 0 };
    assert.equal(accumulateWheel(wheel, -100, 0, 1000), 1);
    assert.equal(accumulateWheel(wheel, 100, 0, 1100), -1);

    // 触控板 ±3 不再每个事件都跳档
    const trackpad = { accum: 0, last: 0 };
    assert.equal(accumulateWheel(trackpad, -3, 0, 2000), 0);
    assert.equal(accumulateWheel(trackpad, -3, 0, 2010), 0);
    let steps = 0;
    for (let i = 0; i < 20; i += 1) {
        if (accumulateWheel(trackpad, -3, 0, 2020 + i * 10) === 1) steps += 1;
    }
    assert.equal(steps, 1, '累积满一档后只应触发一次');

    // 空闲超过阈值后余量清零
    const idle = { accum: 0, last: 0 };
    assert.equal(accumulateWheel(idle, -30, 0, 3000), 0);
    assert.equal(accumulateWheel(idle, -30, 0, 3000 + WHEEL_IDLE + 1), 0);

    // 行/页模式按当量换算
    assert.equal(accumulateWheel({ accum: 0, last: 0 }, -2, 1, 4000), 1);
    assert.equal(accumulateWheel({ accum: 0, last: 0 }, 1, 2, 5000), -1);
});

test('clampPan 把平移限制在图片边界，无尺寸时不限制', () => {
    assert.deepEqual(clampPan(50, 30, 20, 10), [20, 10]);
    assert.deepEqual(clampPan(-50, -30, 20, 10), [-20, -10]);
    assert.deepEqual(clampPan(5, 5, 20, 10), [5, 5]);
    assert.deepEqual(clampPan(500, 500, Infinity, Infinity), [500, 500]);
    assert.deepEqual(clampPan(500, 500, 0, 0), [0, 0]);
});

test('focusTrapStep 在首尾之间循环', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };
    const list = [a, b, c];

    assert.equal(focusTrapStep(list, c, false), a);
    assert.equal(focusTrapStep(list, b, false), c);
    assert.equal(focusTrapStep(list, a, true), c);
    assert.equal(focusTrapStep(list, b, true), a);
    assert.equal(focusTrapStep(list, { name: 'outside' }, false), a);
    assert.equal(focusTrapStep([], a, false), null);
});

test('collectFocusables 按 DOM 顺序挑出可聚焦节点', () => {
    const make = (nodeName, attrs, children) => ({
        nodeName,
        children: children || [],
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attrs || {}, name) ? attrs[name] : null;
        },
        hasAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attrs || {}, name);
        }
    });

    const button = make('button', {});
    const anchor = make('a', { href: '#x' });
    const tabbable = make('div', { tabindex: '0' });
    const negative = make('div', { tabindex: '-1' });
    const disabled = make('button', { disabled: '' });
    const hidden = make('button', { 'aria-hidden': 'true' });
    const span = make('span', {});
    const root = make('div', {}, [button, anchor, tabbable, negative, disabled, hidden, span]);

    assert.deepEqual(collectFocusables(root), [button, anchor, tabbable]);
    assert.deepEqual(collectFocusables(null), []);
});

test('纯函数同时挂在构造器的 utils 上', () => {
    assert.equal(typeof XqLightBox.utils, 'object');
    assert.equal(XqLightBox.utils.clampScale, clampScale);
    assert.equal(XqLightBox.utils.wrapIndex, wrapIndex);
    assert.equal(XqLightBox.utils.buildTransform, buildTransform);
    assert.equal(XqLightBox.utils.accumulateWheel, accumulateWheel);
    assert.equal(XqLightBox.utils.focusTrapStep, focusTrapStep);
    assert.equal(typeof XqLightBox.utils.lockScroll, 'function');
    assert.equal(typeof XqLightBox.utils.unlockScroll, 'function');
    assert.equal(typeof XqLightBox.utils.downloadImage, 'function');
    assert.equal(typeof XqLightBox.utils.toggleFullscreen, 'function');
    assert.equal(KEY_ACTIONS.Escape, 'close');
    assert.equal(KEY_ACTIONS.End, 'last');
});

test('导入模块本身不触碰 DOM（可在 SSR 里 import）', () => {
    assert.equal(typeof globalThis.document, 'undefined');
    assert.equal(typeof globalThis.window, 'undefined');
});
