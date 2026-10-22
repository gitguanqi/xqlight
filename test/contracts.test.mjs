// 仓库级“文件契约”测试：抓路径过期、清单缺项、样式与组件约定走偏。
// 这些测试不执行浏览器代码，运行很快；行为验证在 dom-behavior-harness 里。

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(repo, 'package.json'), 'utf8'));
const testDir = path.join(repo, 'test');

const read = (relative) => readFileSync(path.join(repo, relative), 'utf8');
const pages = readdirSync(testDir).filter((name) => name.endsWith('.html')).sort();

/** 递归收集 exports 里的具体文件路径（跳过带 * 的模式） */
function exportTargets(node, out = []) {
    if (typeof node === 'string') {
        if (!node.includes('*')) out.push(node);
        return out;
    }
    if (node && typeof node === 'object') {
        for (const value of Object.values(node)) exportTargets(value, out);
    }
    return out;
}

test('清单里的每个入口文件都真实存在', () => {
    const targets = [pkg.main, pkg.module, pkg.browser, pkg.unpkg, pkg.types, ...exportTargets(pkg.exports)];
    assert.ok(targets.length > 5, 'exports 至少要覆盖主入口、vue 子路径与样式');
    for (const target of targets) {
        const absolute = path.join(repo, target);
        assert.ok(existsSync(absolute), '缺少入口文件: ' + target);
        assert.ok(statSync(absolute).isFile(), '入口必须是文件: ' + target);
    }
});

test('main 可以被 CommonJS require，且不是 .vue', () => {
    assert.ok(!String(pkg.main).endsWith('.vue'), 'main 不能是未编译的 SFC');
    assert.match(pkg.main, /\.js$/);
});

test('发布白名单不含测试资源', () => {
    assert.ok(Array.isArray(pkg.files), 'package.json 需要 files 白名单');
    for (const pattern of pkg.files) {
        assert.ok(!pattern.startsWith('test'), '不应发布测试目录: ' + pattern);
    }
    assert.ok(pkg.files.includes('lib'));
});

test('所有构建产物的版本号与 package.json 一致', () => {
    const files = [
        'lib/js/xqlight.js',
        'lib/js/xqlight.esm.mjs',
        'lib/js/xqlight.min.js',
        'lib/js/xqlight.esm.min.mjs',
        'lib/css/xqlight.css',
        'lib/css/xqlight.min.css'
    ];
    for (const file of files) {
        assert.match(read(file), new RegExp('xqlight v' + pkg.version.replace(/\./g, '\\.')), file + ' 的 banner 版本不一致');
    }
});

test('UMD 产物体积里不出现 ESM 语法，可以直接用 script 加载', () => {
    const umd = read('lib/js/xqlight.min.js');
    assert.ok(!/(^|[\s;}])(import|export)[\s{'"(]/.test(umd), 'UMD 产物被改写成了模块');
    assert.match(umd, /XqLightBox/);
});

test('ESM 产物提供默认导出与具名导出', () => {
    const esm = read('lib/js/xqlight.esm.mjs');
    assert.match(esm, /export default XqLightBox;/);
    assert.match(esm, /export \{/);
    assert.match(esm, /^\s*XqLightBox,/m);
});

test('源码不再注入重复 id，内部钩子改用 data 属性', () => {
    const source = read('lib/js/xqlight.js');
    assert.ok(!/id="lightbox-/.test(source), '仍然在注入 id');
    assert.match(source, /data-xqlight/);
    assert.ok(!/window\.onload\s*=/.test(source), '仍然覆盖 window.onload');
    assert.ok(!/requestFullscreen[^\n]*\n[^\n]*XMLHttpRequest/.test(source));
    assert.ok(!/XMLHttpRequest/.test(source), 'http() 死代码应已移除');
});

test('样式只保留一个可见状态，Vue 与浏览器版共享', () => {
    const css = read('lib/css/xqlight.css');
    assert.match(css, /\.lightbox\s*\{[^}]*display:\s*none/s);
    assert.match(css, /\.lightbox\.active\s*\{[^}]*display:\s*flex/s);
    assert.match(css, /list-style:\s*none/, '缺少列表重置，脱离 demo.css 会露出项目符号');
    assert.ok(!css.includes('iconfont.eot'), 'eot 字体已废弃');

    // 0.5.0 起的美化基线：别再退回固定宽度与桌面专属写法
    assert.ok(!/max-width:\s*700px/.test(css), '图片不应再有 700px 硬上限');
    assert.match(css, /100dvh/, '应提供 dvh 视口高度，避免移动端地址栏跳动');
    assert.match(css, /prefers-reduced-motion/, '应尊重系统减弱动效设置');
    assert.match(css, /safe-area-inset/, '应处理刘海屏安全区');
    assert.match(css, /lightbox-thumbs/, '缩略图样式缺失');
    assert.match(css, /data-xqlight-status="loading"/, '加载态样式缺失');
});

test('Vue 组件覆盖两个大版本的生命周期与事件', () => {
    const sfc = read('lib/vue/index.vue');
    assert.match(sfc, /beforeUnmount/);
    assert.match(sfc, /beforeDestroy/);
    assert.match(sfc, /emits:/);
    assert.ok(!sfc.includes('v-show'), 'v-show 会与 stylesheet 的 display:none 打架');
    assert.ok(!sfc.includes('lang="scss"'), '不应强制使用方安装 sass');
    assert.match(sfc, /xqlight\.esm\.mjs/, '组件应复用核心纯函数');
});

test('Vue 插件同时兼容 Vue.use 与 app.use', () => {
    const plugin = read('lib/vue/index.js');
    assert.match(plugin, /app\.component\(/);
    assert.match(plugin, /export default/);
    assert.match(plugin, /\.\/index\.vue/);
    assert.match(plugin, /xqlight\.css/, '插件应加载共享样式');
});

test('测试页矩阵齐全，且都带共享运行器、图标与状态区', () => {
    const expected = ['browser.html', 'esm.html', 'index.html', 'vue2.html', 'vue3.html'];
    for (const page of expected) {
        assert.ok(pages.includes(page), '缺少测试页: ' + page);
    }
    for (const page of pages) {
        const html = read('test/' + page);
        assert.match(html, /js\/runner\.js/, page + ' 未加载共享运行器');
        assert.match(html, /data-suite-status/, page + ' 缺少状态区');
        assert.match(html, /data-suite-results/, page + ' 缺少结果列表');
        assert.match(html, /rel="icon"[^>]*icon\.svg/, page + ' 缺少共享图标');
        assert.match(html, /\.\.\/lib\/css\/xqlight\.min\.css/, page + ' 未加载仓库内样式产物');
        assert.ok(html.includes('__demoReady'), page + ' 需要标记演示实例就绪');
    }
});

test('索引页链接了每一个场景', () => {
    const index = read('test/index.html');
    for (const page of ['browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
        assert.match(index, new RegExp('href="\\./' + page.replace('.', '\\.') + '"'), '索引缺少 ' + page);
    }
});

test('UMD 页与 ESM 页各自加载正确的产物', () => {
    const browser = read('test/browser.html');
    assert.match(browser, /src="\.\.\/lib\/js\/xqlight\.min\.js"/);

    const esm = read('test/esm.html');
    assert.match(esm, /<script type="module">/);
    assert.match(esm, /from '\.\.\/lib\/js\/xqlight\.esm\.min\.mjs'/);
    assert.match(esm, /XqLightBox === NamedXqLightBox|默认导出与具名导出一致/);
});

test('Vue 页固定 CDN 大版本并复用单实例组件', () => {
    const vue2 = read('test/vue2.html');
    const vue3 = read('test/vue3.html');
    assert.match(vue2, /vue@2\.\d+\.\d+/);
    assert.match(vue3, /vue@3\.\d+\.\d+/);
    for (const html of [vue2, vue3]) {
        assert.match(html, /createXqlightVueDemo/);
        assert.match(html, /__demoReady/);
    }
    const helper = read('test/js/vue-demo.js');
    assert.match(helper, /if \(!instance\) instance = /, '一个组件只能创建一个实例');
    assert.match(helper, /beforeUnmount/);
    assert.match(helper, /beforeDestroy/);
});

test('测试页引用的本地资源都存在', () => {
    for (const page of pages) {
        const html = read('test/' + page);
        const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
        for (const ref of refs) {
            if (/^(https?:|data:|#|mailto:)/.test(ref)) continue;
            const absolute = path.resolve(testDir, ref.split('?')[0]);
            assert.ok(existsSync(absolute), page + ' 引用了不存在的资源: ' + ref);
        }
    }
});

test('死资源已经删除', () => {
    assert.ok(!existsSync(path.join(repo, 'lib/js/iconfont.js')), 'lib/js/iconfont.js 未被引用，应删除');
    assert.ok(!existsSync(path.join(repo, 'lib/js/iconfont.json')), 'lib/js/iconfont.json 未被引用，应删除');
});

test('文档覆盖两条消费路径与 Vue 子路径', () => {
    for (const doc of ['README.md', 'zh.md']) {
        const text = read(doc);
        assert.match(text, /xqlight\/vue/, doc + ' 未说明 vue 子路径');
        assert.match(text, /xqlight\.min\.css|lib\/css\/xqlight\.css/, doc + ' 未说明样式引入');
        assert.match(text, /update:currentIndex|xq-light-box|:light-imgs/, doc + ' 未给出可用的组件示例');
    }
});

// —— 代理元数据（llms.txt / skills）——
// 这几条只校验"元数据指向真实文件、且描述的是真实接口"，不解释文档措辞。

/** 去掉 ./ 前缀，统一成仓库内相对路径 */
const relative = (target) => String(target).replace(/^\.\//, '');

test('代理元数据指向真实文件并进入发布白名单', () => {
    assert.equal(pkg.llms, './llms.txt', 'package.json 缺少 llms 字段');
    assert.match(String(pkg.agents || ''), /^\.\/skills\/[\w-]+\/SKILL\.md$/, 'agents 必须指向包内技能入口');

    for (const field of ['llms', 'agents']) {
        const target = relative(pkg[field]);
        assert.ok(existsSync(path.join(repo, target)), field + ' 指向的文件不存在: ' + target);
        assert.ok(statSync(path.join(repo, target)).isFile(), field + ' 必须指向文件: ' + target);
    }

    assert.ok(pkg.files.includes('llms.txt'), 'llms.txt 需要进入 files 白名单');
    assert.ok(pkg.files.includes('skills'), 'skills 目录需要进入 files 白名单');
});

test('llms.txt 覆盖全部公开导出、实例方法与 Vue 接口', () => {
    const text = read('llms.txt');
    assert.ok(!/\bTODO\b|\bTBD\b|待补/.test(text), 'llms.txt 里留有占位内容');

    // 具名导出以 ESM 产物的 export 块为准
    const esm = read('lib/js/xqlight.esm.mjs');
    const start = esm.lastIndexOf('export {');
    const block = esm.slice(start, esm.indexOf('};', start));
    const names = [...block.matchAll(/^\s{4}([A-Za-z_$][\w$]*),?$/gm)].map((match) => match[1]);
    assert.ok(names.length > 20, '未能从 ESM 产物解析出具名导出');
    for (const name of names) {
        assert.ok(text.includes(name), 'llms.txt 未记录具名导出: ' + name);
    }

    // 文档里点名的实例方法必须真的挂在原型上
    const source = read('lib/js/xqlight.js');
    const publicMethods = [
        'showLightBox', 'closeLightBox', 'prevImg', 'nextImg', 'goTo', 'zoom',
        'setScale', 'toggleZoom', 'rotate', 'scaleImg', 'downloadImg', 'refresh', 'destroy'
    ];
    for (const name of publicMethods) {
        assert.ok(new RegExp('XqLightBox\\.prototype\\.' + name + ' = function').test(source), '源码缺少方法: ' + name);
        assert.ok(text.includes(name + '('), 'llms.txt 未记录方法: ' + name);
    }

    // 两个入口与 Vue 契约
    for (const token of ['xqlight/vue', 'imgCls', 'thumbnails', 'lib/css/xqlight.css']) {
        assert.ok(text.includes(token), 'llms.txt 未记录入口/选项: ' + token);
    }
    for (const prop of ['lightTitle', 'showLightBox', 'lightImgs', 'currentIndex', 'currentText']) {
        assert.ok(text.includes(prop), 'llms.txt 未记录组件 prop: ' + prop);
    }
    for (const event of ['hideLightBox', 'update:currentIndex', 'change']) {
        assert.ok(text.includes(event), 'llms.txt 未记录组件事件: ' + event);
    }
});

test('技能入口的 frontmatter 与引用都成立', () => {
    const skillPath = relative(pkg.agents);
    const skillDir = path.dirname(path.join(repo, skillPath));
    const text = read(skillPath);

    const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
    assert.ok(front, 'SKILL.md 缺少 YAML frontmatter');
    const name = /^name:\s*(\S+)\s*$/m.exec(front[1]);
    const description = /^description:\s*(.+)$/m.exec(front[1]);
    assert.ok(name, 'frontmatter 缺少 name');
    assert.match(name[1], /^[a-z0-9]+(-[a-z0-9]+)*$/, 'name 必须是全小写连字符形式');
    assert.equal(name[1], path.basename(skillDir), 'name 应与技能目录一致');
    assert.ok(description && description[1].length >= 40, 'description 需要说明能力与加载时机');

    assert.ok(!/\bTODO\b|\bTBD\b|待补/.test(text), 'SKILL.md 里留有占位内容');
    assert.ok(text.includes('references/api.md'), '技能入口未链接 references/api.md');

    // 技能内引用的每个相对路径都必须随技能一起发布
    const links = [...text.matchAll(/\]\((\.[^)\s]+)\)/g)].map((match) => match[1]);
    assert.ok(links.length > 0, 'SKILL.md 没有任何相对引用');
    for (const link of links) {
        const target = path.resolve(skillDir, link.split('#')[0]);
        assert.ok(target.startsWith(skillDir), '技能引用不能指向技能目录之外: ' + link);
        assert.ok(existsSync(target), '技能引用的文件不存在: ' + link);
    }
    assert.ok(existsSync(path.join(skillDir, 'references', 'api.md')), '缺少 references/api.md');
});

