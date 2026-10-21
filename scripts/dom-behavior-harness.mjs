#!/usr/bin/env node
// 用一个带状态的 DOM 桩执行真正要发布的构建产物。
//
// `node --check` 只能证明文件能解析；这个包里绝大多数缺陷只在构造、打开、
// 关闭、重复 refresh 或销毁时才暴露，所以必须真的跑一遍。
//
// 用法：
//   node scripts/dom-behavior-harness.mjs [--entry lib/js/xqlight.min.js] [--scenario basic|all] [--json]
//
// 场景：
//   basic           构造、扫描、开图、切换、缩放、下载、关闭
//   isolation       同页两个实例互不干扰（旧实现会串到第一个节点）
//   listener-stack  重复 refresh 不会叠加监听
//   destroy         销毁后节点移除、监听归零、滚动恢复
//   missing-option  不传 imgCls 只告警，不抛错
//   ready-state     脚本在 DOMContentLoaded 之前执行时，等解析完成再扫描

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
    const opts = { entry: null, scenario: 'all', json: false };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--entry') opts.entry = argv[++i];
        else if (arg === '--scenario') opts.scenario = argv[++i];
        else if (arg === '--json') opts.json = true;
        else if (arg === '--help' || arg === '-h') opts.help = true;
    }
    return opts;
}

// ---------------------------------------------------------------- DOM 桩

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** 只支持本项目用到的简单选择器：tag、.class、#id、[attr]、[attr="v"] */
function matchesSimple(el, selector) {
    const parsed = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+|\[[^\]]+\])*)$/.exec(String(selector).trim());
    if (!parsed) return false;
    if (parsed[1] && el.nodeName !== parsed[1].toUpperCase()) return false;
    const tokens = parsed[2].match(/[.#][\w-]+|\[[^\]]+\]/g) || [];
    for (const token of tokens) {
        if (token[0] === '.') {
            if (!el.classList.contains(token.slice(1))) return false;
        } else if (token[0] === '#') {
            if (el.getAttribute('id') !== token.slice(1)) return false;
        } else {
            const inner = token.slice(1, -1);
            const eq = inner.indexOf('=');
            if (eq < 0) {
                if (!el.hasAttribute(inner)) return false;
            } else {
                const name = inner.slice(0, eq).trim();
                let value = inner.slice(eq + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (el.getAttribute(name) !== value) return false;
            }
        }
    }
    return true;
}

/** 解析 innerHTML：够用即可，保留属性与父子关系 */
function parseMarkup(html, factory) {
    const roots = [];
    const stack = [];
    const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
    let match;
    while ((match = tagRe.exec(html)) !== null) {
        const [, closing, name, rawAttrs, selfClosing] = match;
        const tag = name.toLowerCase();
        if (closing) {
            for (let i = stack.length - 1; i >= 0; i -= 1) {
                if (stack[i].nodeName === tag.toUpperCase()) {
                    stack.length = i;
                    break;
                }
            }
            continue;
        }
        const attrs = {};
        const attrRe = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attr;
        while ((attr = attrRe.exec(rawAttrs || '')) !== null) {
            attrs[attr[1]] = attr[2] !== undefined ? attr[2] : attr[3] !== undefined ? attr[3] : attr[4] !== undefined ? attr[4] : '';
        }
        const node = factory({ nodeName: tag, attrs });
        const parent = stack[stack.length - 1];
        if (parent) {
            parent.appendChild(node);
        } else {
            roots.push(node);
        }
        if (!VOID_TAGS.has(tag) && !selfClosing) stack.push(node);
    }
    return roots;
}

function createNode(spec = {}) {
    const listeners = new Map();
    const attrs = new Map(Object.entries(spec.attrs || {}));

    const node = {
        nodeName: String(spec.nodeName || 'div').toUpperCase(),
        nodeType: 1,
        children: [],
        parentNode: null,
        style: {},
        textContent: '',
        src: '',
        alt: '',
        href: '',
        _clicks: 0,
        _focused: false,

        get firstElementChild() {
            return this.children[0] || null;
        },
        get className() {
            return Array.from(this._classes || []).join(' ');
        },
        set className(value) {
            this._classes = new Set(String(value || '').split(/\s+/).filter(Boolean));
        },
        get classList() {
            const self = this;
            if (!self._classes) self._classes = new Set();
            return {
                add(name) { self._classes.add(name); },
                remove(name) { self._classes.delete(name); },
                contains(name) { return self._classes.has(name); },
                toggle(name, force) {
                    const next = force === undefined ? !self._classes.has(name) : Boolean(force);
                    if (next) self._classes.add(name);
                    else self._classes.delete(name);
                    return next;
                }
            };
        },
        getAttribute(name) {
            if (name === 'class') return this.className || null;
            return attrs.has(name) ? attrs.get(name) : null;
        },
        setAttribute(name, value) {
            if (name === 'class') {
                this.className = value;
                return;
            }
            attrs.set(name, String(value));
        },
        removeAttribute(name) {
            attrs.delete(name);
        },
        hasAttribute(name) {
            return attrs.has(name);
        },
        appendChild(child) {
            if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
                child.parentNode.removeChild(child);
            }
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        removeChild(child) {
            const at = this.children.indexOf(child);
            if (at >= 0) this.children.splice(at, 1);
            child.parentNode = null;
            return child;
        },
        querySelectorAll(selector) {
            const found = [];
            const walk = (list) => {
                for (const child of list) {
                    if (matchesSimple(child, selector)) found.push(child);
                    walk(child.children);
                }
            };
            walk(this.children);
            return found;
        },
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        addEventListener(type, handler) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(handler);
        },
        removeEventListener(type, handler) {
            const list = listeners.get(type) || [];
            const at = list.indexOf(handler);
            if (at >= 0) list.splice(at, 1);
        },
        listenerCount(type) {
            return (listeners.get(type) || []).length;
        },
        click() {
            this._clicks += 1;
            const event = {
                type: 'click',
                target: this,
                currentTarget: this,
                preventDefault() {},
                stopPropagation() {}
            };
            for (const handler of (listeners.get('click') || []).slice()) handler(event);
        },
        focus() {
            this._focused = true;
            if (this.ownerDocument) this.ownerDocument.activeElement = this;
        }
    };

    node.className = spec.className || '';
    Object.defineProperty(node, 'innerHTML', {
        get() {
            return '';
        },
        set(value) {
            this.children = [];
            parseMarkup(String(value), (childSpec) => {
                const child = createNode(childSpec);
                child.ownerDocument = this.ownerDocument;
                return child;
            }).forEach((child) => this.appendChild(child));
        }
    });

    return node;
}

/**
 * 创建一套 DOM 桩。
 * @param {{ readyState?: string }} [options]
 */
function createSandbox(options = {}) {
    const docListeners = new Map();
    const windowListeners = new Map();
    const document = {
        readyState: options.readyState || 'complete',
        activeElement: null,
        _images: [],
        elements: { body: [], created: [] },
        createElement(tag) {
            const node = createNode({ nodeName: tag });
            node.ownerDocument = document;
            document.elements.created.push(node);
            return node;
        },
        addEventListener(type, handler) {
            if (!docListeners.has(type)) docListeners.set(type, []);
            docListeners.get(type).push(handler);
        },
        removeEventListener(type, handler) {
            const list = docListeners.get(type) || [];
            const at = list.indexOf(handler);
            if (at >= 0) list.splice(at, 1);
        },
        listenerCount(type) {
            return (docListeners.get(type) || []).length;
        },
        dispatch(type, event = {}) {
            const payload = Object.assign({ type, preventDefault() {}, stopPropagation() {} }, event);
            for (const handler of (docListeners.get(type) || []).slice()) handler(payload);
        },
        querySelectorAll(selector) {
            const gallery = /^(\S+)\s+img$/i.exec(String(selector).trim());
            if (gallery) {
                return document._images.filter((img) => matchesSimple({ nodeName: 'DIV', classList: { contains: (c) => img._gallery === c } }, gallery[1]));
            }
            const found = [];
            const walk = (list) => {
                for (const child of list) {
                    if (matchesSimple(child, selector)) found.push(child);
                    walk(child.children);
                }
            };
            walk(document.body.children);
            return found;
        },
        querySelector(selector) {
            return document.querySelectorAll(selector)[0] || null;
        }
    };

    document.body = createNode({ nodeName: 'body', attrs: { class: 'body' } });
    document.body.ownerDocument = document;
    document.documentElement = createNode({ nodeName: 'html' });
    document.documentElement.ownerDocument = document;
    document.activeElement = document.body;

    const window = {
        addEventListener(type, handler) {
            if (!windowListeners.has(type)) windowListeners.set(type, []);
            windowListeners.get(type).push(handler);
        },
        removeEventListener(type, handler) {
            const list = windowListeners.get(type) || [];
            const at = list.indexOf(handler);
            if (at >= 0) list.splice(at, 1);
        },
        listenerCount(type) {
            return (windowListeners.get(type) || []).length;
        }
    };

    const revokes = [];
    const anchors = [];

    const sandbox = {
        document,
        window,
        console: {
            log() {},
            warn() {},
            error() {}
        },
        setTimeout,
        clearTimeout,
        URL: {
            createObjectURL: () => 'blob:xqlight-stub',
            revokeObjectURL: (value) => revokes.push(value)
        },
        fetch: () => Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve({ size: 1 }) }),
        _revokes: revokes,
        _anchors: anchors,
        /**
         * 造一个图库：容器类名 + 图片地址列表。
         * @param {string} containerClass
         * @param {string[]} urls
         */
        addGallery(containerClass, urls) {
            const container = createNode({ nodeName: 'ul', className: containerClass.replace(/^\./, '') });
            container.ownerDocument = document;
            document.body.appendChild(container);
            return urls.map((url, index) => {
                const li = createNode({ nodeName: 'li' });
                li.ownerDocument = document;
                const img = createNode({ nodeName: 'img', attrs: { src: url, alt: 'photo-' + (index + 1) } });
                img.ownerDocument = document;
                img._gallery = containerClass.replace(/^\./, '');
                img.src = url;
                li.appendChild(img);
                container.appendChild(li);
                document._images.push(img);
                return img;
            });
        }
    };
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    document.defaultView = sandbox;

    return sandbox;
}

/** 在沙箱里执行构建产物，取回构造器 */
function loadWidget(file) {
    const sandbox = createSandbox();
    const context = vm.createContext(sandbox);
    new vm.Script(readFileSync(file, 'utf8'), { filename: file }).runInContext(context);
    const Widget = sandbox.XqLightBox || (sandbox.window && sandbox.window.XqLightBox);
    return { Widget, sandbox };
}

/** 重新构造一个共享同一 document 的实例，并接入指定图库 */
function mount(Widget, sandbox, galleryClass, urls) {
    if (galleryClass) sandbox.addGallery(galleryClass, urls);
    return new Widget({ imgCls: galleryClass });
}

function rootOf(instance) {
    return instance.root;
}

function activeRoots(instances) {
    return instances.filter((instance) => instance.root && instance.root.classList.contains('active'));
}

// ---------------------------------------------------------------- 场景

const SCENARIOS = {
    basic: () => {
        const { Widget, sandbox } = loadWidget(SCENARIOS._file);
        const results = [];
        results.push(['exposes a constructable export', typeof Widget === 'function', typeof Widget]);
        if (typeof Widget !== 'function') return results;

        sandbox.addGallery('.imgs', ['./img/a1.jpg', './img/a2.jpg', './img/a3.jpg']);
        let instance;
        let threw = '';
        try {
            instance = new Widget({ imgCls: '.imgs' });
        } catch (error) {
            threw = error.message;
        }
        results.push(['constructs with a valid config', threw === '', threw]);
        if (!instance) return results;

        results.push(['injects its own root into body', rootOf(instance) !== null && sandbox.document.body.children.indexOf(rootOf(instance)) >= 0]);
        results.push(['does not overwrite window.onload', sandbox.window.onload === undefined, String(sandbox.window.onload)]);
        results.push(['binds the gallery images', instance.imgList.length === 3, String(instance.imgList.length)]);
        results.push(['does not use duplicate ids', rootOf(instance).querySelectorAll('[id]').length === 0]);

        instance.showLightBox(0);
        const img = rootOf(instance).querySelector('[data-xqlight="img"]');
        const current = rootOf(instance).querySelector('[data-xqlight="current"]');
        const total = rootOf(instance).querySelector('[data-xqlight="total"]');
        results.push(['opens with the active state', rootOf(instance).classList.contains('active')]);
        results.push(['renders the clicked image', img.src === './img/a1.jpg', img.src]);
        results.push(['shows 1 / 3', current.textContent === '1' && total.textContent === '3', current.textContent + '/' + total.textContent]);
        results.push(['locks page scroll', sandbox.document.body.style.overflow === 'hidden', sandbox.document.body.style.overflow]);

        instance.nextImg();
        results.push(['next moves to 2', current.textContent === '2', current.textContent]);
        instance.showLightBox(2);
        instance.nextImg();
        results.push(['next wraps to the first image', current.textContent === '1', current.textContent]);
        instance.prevImg();
        results.push(['prev wraps to the last image', current.textContent === '3', current.textContent]);

        instance.handleScroll({ deltaY: -1, preventDefault() {} });
        results.push(['wheel zooms in', img.style.transform === 'scale(1.2)', img.style.transform]);
        instance.handleScroll({ deltaY: 1, preventDefault() {} });
        results.push(['wheel zooms back out', img.style.transform === 'scale(1)', img.style.transform]);

        instance.showLightBox(0);
        instance.handleScroll({ deltaY: -1, preventDefault() {} });
        instance.nextImg();
        results.push(['switching image resets the zoom', img.style.transform === 'scale(1)', img.style.transform]);

        instance.downloadImg();
        results.push(['download returns a promise', typeof instance.downloadImg().then === 'function']);
        return results;
    },

    isolation: () => {
        const { Widget, sandbox } = loadWidget(SCENARIOS._file);
        const results = [];
        if (typeof Widget !== 'function') {
            results.push(['exposes a constructable export', false, typeof Widget]);
            return results;
        }

        const a = mount(Widget, sandbox, '.imgs-a', ['./a/1.jpg', './a/2.jpg', './a/3.jpg']);
        const b = mount(Widget, sandbox, '.imgs-b', ['./b/1.jpg', './b/2.jpg']);
        results.push(['two independent instances mount', a.root !== null && b.root !== null && a.root !== b.root]);
        results.push(['each instance only binds its own gallery', a.imgList.length === 3 && b.imgList.length === 2, a.imgList.length + '/' + b.imgList.length]);

        a.showLightBox(1);
        results.push(['opening A does not open B', a.root.classList.contains('active') && !b.root.classList.contains('active')]);
        results.push(['A shows its own image', a.root.querySelector('[data-xqlight="img"]').src === './a/2.jpg', a.root.querySelector('[data-xqlight="img"]').src]);

        b.showLightBox(0);
        const aImg = a.root.querySelector('[data-xqlight="img"]').src;
        results.push(['opening B does not touch A image', aImg === './a/2.jpg', aImg]);
        results.push(['B shows its own image', b.root.querySelector('[data-xqlight="img"]').src === './b/1.jpg']);

        a.closeLightBox();
        results.push(['closing A keeps B open', !a.root.classList.contains('active') && b.root.classList.contains('active')]);
        results.push(['closing A keeps the scroll lock for B', sandbox.document.body.style.overflow === 'hidden', sandbox.document.body.style.overflow]);

        b.closeLightBox();
        results.push(['closing the last instance restores scrolling', sandbox.document.body.style.overflow === '', sandbox.document.body.style.overflow]);
        return results;
    },

    'listener-stack': () => {
        const { Widget, sandbox } = loadWidget(SCENARIOS._file);
        const results = [];
        if (typeof Widget !== 'function') {
            results.push(['exposes a constructable export', false, typeof Widget]);
            return results;
        }
        const images = sandbox.addGallery('.imgs', ['./img/a1.jpg', './img/a2.jpg']);
        const instance = new Widget({ imgCls: '.imgs' });
        const before = images[0].listenerCount('click');
        instance.refresh();
        instance.refresh();
        instance.refresh();
        results.push(['repeated refresh does not duplicate the list', instance.imgList.length === 2, String(instance.imgList.length)]);
        results.push(['repeated refresh does not stack listeners', images[0].listenerCount('click') === before, before + ' -> ' + images[0].listenerCount('click')]);

        images[0].click();
        results.push(['clicking an image opens the lightbox once', instance.root.classList.contains('active') && instance.currentImgIndex === 0]);
        return results;
    },

    destroy: () => {
        const { Widget, sandbox } = loadWidget(SCENARIOS._file);
        const results = [];
        if (typeof Widget !== 'function') {
            results.push(['exposes a constructable export', false, typeof Widget]);
            return results;
        }
        const images = sandbox.addGallery('.imgs', ['./img/a1.jpg', './img/a2.jpg']);
        const instance = new Widget({ imgCls: '.imgs' });
        const root = instance.root;
        instance.showLightBox(0);
        results.push(['document keydown is registered', sandbox.document.listenerCount('keydown') === 1, String(sandbox.document.listenerCount('keydown'))]);

        instance.destroy();
        results.push(['root is removed from body', !sandbox.document.body.children.includes(root)]);
        results.push(['image listeners are removed', images[0].listenerCount('click') === 0, String(images[0].listenerCount('click'))]);
        results.push(['keydown listener is removed', sandbox.document.listenerCount('keydown') === 0, String(sandbox.document.listenerCount('keydown'))]);
        results.push(['page scroll is restored', sandbox.document.body.style.overflow === '', sandbox.document.body.style.overflow]);

        let threw = '';
        try {
            instance.showLightBox(0);
            instance.destroy();
        } catch (error) {
            threw = error.message;
        }
        results.push(['use after destroy does not throw', threw === '', threw]);
        return results;
    },

    'missing-option': () => {
        const { Widget, sandbox } = loadWidget(SCENARIOS._file);
        const results = [];
        if (typeof Widget !== 'function') {
            results.push(['exposes a constructable export', false, typeof Widget]);
            return results;
        }
        const warnings = [];
        sandbox.console.warn = (message) => warnings.push(String(message));

        let threw = '';
        let instance;
        try {
            instance = new Widget();
        } catch (error) {
            threw = error.message;
        }
        results.push(['constructing without options does not throw', threw === '', threw]);
        results.push(['the missing option is reported', warnings.length > 0, JSON.stringify(warnings)]);
        if (!instance) return results;

        let showThrew = '';
        try {
            instance.showLightBox(0);
        } catch (error) {
            showThrew = error.message;
        }
        results.push(['opening without images does not throw', showThrew === '', showThrew]);
        results.push(['no images are bound', instance.imgList.length === 0, String(instance.imgList.length)]);
        return results;
    },

    'ready-state': () => {
        const file = SCENARIOS._file;
        const sandbox = createSandbox({ readyState: 'loading' });
        const context = vm.createContext(sandbox);
        new vm.Script(readFileSync(file, 'utf8'), { filename: file }).runInContext(context);
        const Widget = sandbox.XqLightBox;
        const results = [];
        if (typeof Widget !== 'function') {
            results.push(['exposes a constructable export', false, typeof Widget]);
            return results;
        }

        // 图库已经解析完成：构造完就该能用，不必等到 DOMContentLoaded
        sandbox.addGallery('.imgs', ['./img/a1.jpg', './img/a2.jpg', './img/a3.jpg']);
        const immediate = new Widget({ imgCls: '.imgs' });
        results.push(['binds immediately when the gallery already exists', immediate.imgList.length === 3, String(immediate.imgList.length)]);

        // 图库还不存在：先不绑定，解析完成后再补一次
        const late = new Widget({ imgCls: '.late-gallery' });
        results.push(['does not bind a gallery that is not parsed yet', late.imgList.length === 0, String(late.imgList.length)]);
        results.push(['does not use window.onload', sandbox.window.onload === undefined, String(sandbox.window.onload)]);

        sandbox.addGallery('.late-gallery', ['./late/1.jpg', './late/2.jpg']);
        sandbox.document.readyState = 'interactive';
        sandbox.document.dispatch('DOMContentLoaded');
        results.push(['scans again after DOMContentLoaded', late.imgList.length === 2, String(late.imgList.length)]);
        results.push(['the second scan is idempotent', immediate.imgList.length === 3, String(immediate.imgList.length)]);
        return results;
    }
};

// ---------------------------------------------------------------- 主流程

function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
        console.log('Usage: node scripts/dom-behavior-harness.mjs [--entry <bundle>] [--scenario <name>|all] [--json]');
        console.log('Scenarios: ' + Object.keys(SCENARIOS).join(', '));
        return 0;
    }

    const entry = opts.entry
        ? path.resolve(repo, opts.entry)
        : path.join(repo, 'lib', 'js', 'xqlight.min.js');
    if (!existsSync(entry)) {
        console.error('Entry not found: ' + entry);
        return 2;
    }
    const source = readFileSync(entry, 'utf8');
    if (/(^|[\s;}])(import|export)[\s{'"(]/.test(source)) {
        console.error('This harness stubs the browser bundle; ES module builds are covered by `npm test`.');
        return 2;
    }
    SCENARIOS._file = entry;

    const names = opts.scenario === 'all' ? Object.keys(SCENARIOS).filter((name) => !name.startsWith('_')) : [opts.scenario];
    const report = { entry: path.relative(repo, entry), scenarios: {}, failed: 0 };

    for (const name of names) {
        const scenario = SCENARIOS[name];
        if (typeof scenario !== 'function') {
            console.error('Unknown scenario: ' + name);
            return 2;
        }
        let checks = [];
        try {
            checks = scenario();
        } catch (error) {
            checks = [[name + ' executed', false, error && error.message ? error.message : String(error)]];
        }
        report.scenarios[name] = checks.map(([label, ok, detail]) => ({
            check: label,
            ok: Boolean(ok),
            detail: detail === undefined ? '' : String(detail)
        }));
        for (const check of report.scenarios[name]) {
            if (!check.ok) report.failed += 1;
            if (!opts.json) {
                console.log((check.ok ? 'PASS  ' : 'FAIL  ') + name + ' :: ' + check.check +
                    (check.ok || !check.detail ? '' : ' :: ' + check.detail));
            }
        }
    }

    if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
    } else if (report.failed === 0) {
        console.log('\nALL CHECKS PASSED (' + Object.keys(report.scenarios).length + ' scenarios)');
    } else {
        console.log('\n' + report.failed + ' CHECK(S) FAILED');
    }
    return report.failed === 0 ? 0 : 1;
}

process.exit(main());
