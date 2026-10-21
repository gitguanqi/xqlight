#!/usr/bin/env node
// 零依赖静态服务器，用来跑 test/ 下的自检页面。
//
// 刻意不依赖 live-server 之类的全局工具：`npm run test:browser` 在干净检出里
// 也要能直接工作。
//
//   HOST=127.0.0.1 PORT=4001 node scripts/serve.mjs

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4001);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8'
};

/** 解析后的路径必须落在仓库内，且不能来自 node_modules */
function isServable(target) {
    const relative = path.relative(repo, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
    return !relative.split(path.sep).includes('node_modules');
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, Object.assign({ 'Cache-Control': 'no-store' }, headers));
    res.end(body);
}

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://' + (req.headers.host || HOST));
        const pathname = decodeURIComponent(url.pathname);

        if (pathname === '/') {
            send(res, 302, '', { Location: '/test/' });
            return;
        }

        const target = path.resolve(repo, '.' + pathname);
        if (!isServable(target)) {
            send(res, 403, 'Forbidden');
            return;
        }

        let info = await stat(target).catch(() => null);
        if (info && info.isDirectory()) {
            if (!pathname.endsWith('/')) {
                send(res, 301, '', { Location: pathname + '/' });
                return;
            }
            const indexFile = path.join(target, 'index.html');
            const indexInfo = await stat(indexFile).catch(() => null);
            if (!indexInfo) {
                send(res, 404, 'Not found');
                return;
            }
            const body = await readFile(indexFile);
            send(res, 200, body, {
                'Content-Type': MIME['.html'],
                'Content-Length': body.length
            });
            return;
        }

        if (!info || !info.isFile()) {
            send(res, 404, 'Not found');
            return;
        }

        const body = await readFile(target);
        send(res, 200, body, {
            'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
            'Content-Length': body.length
        });
    } catch (error) {
        send(res, 500, 'Server error: ' + (error && error.message ? error.message : String(error)));
    }
});

async function listPages() {
    const dir = path.join(repo, 'test');
    const entries = await readdir(dir).catch(() => []);
    return entries.filter((name) => name.endsWith('.html')).sort();
}

server.listen(PORT, HOST, async () => {
    const pages = await listPages();
    console.log('xqlight test server');
    console.log('  root: ' + repo);
    for (const page of pages) {
        console.log('  http://' + HOST + ':' + PORT + '/test/' + page);
    }
    console.log('  (Ctrl+C to stop)');
});

server.on('error', (error) => {
    console.error('Failed to start: ' + (error && error.message ? error.message : String(error)));
    process.exit(1);
});
