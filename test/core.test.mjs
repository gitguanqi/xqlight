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
    clampScale,
    wrapIndex,
    parseFileName,
    buildFileName
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

test('纯函数同时挂在构造器的 utils 上', () => {
    assert.equal(typeof XqLightBox.utils, 'object');
    assert.equal(XqLightBox.utils.clampScale, clampScale);
    assert.equal(XqLightBox.utils.wrapIndex, wrapIndex);
    assert.equal(typeof XqLightBox.utils.downloadImage, 'function');
    assert.equal(typeof XqLightBox.utils.toggleFullscreen, 'function');
});

test('导入模块本身不触碰 DOM（可在 SSR 里 import）', () => {
    assert.equal(typeof globalThis.document, 'undefined');
    assert.equal(typeof globalThis.window, 'undefined');
});
