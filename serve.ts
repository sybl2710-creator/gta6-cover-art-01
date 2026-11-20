// A small, dependency-free static server for previewing app/ locally.
// It only serves files that physically live inside app/, answers HEAD without
// a body, and rejects anything other than GET/HEAD. Directory requests fall
// through to index.html so the offline studio behaves like a normal site.
import { createServer } from 'node:http';
import { createReadStream, realpathSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(resolve(fileURLToPath(new URL('.', import.meta.url)), 'app'));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const portArg = process.argv.indexOf('--port');
const requested = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8080;
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const send = (res, status, body, extra = {}) => {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...extra });
  res.end(body);
};

const inside = (file) => file === root || file.startsWith(root + sep);

createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    send(res, 405, 'Method not allowed', { allow: 'GET, HEAD' });
    return;
  }

  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }

  const target = resolve(join(root, normalize(pathname)));
  if (!inside(target)) {
    send(res, 403, 'Forbidden');
    return;
  }

  let file = target;
  let info;
  try {
    info = statSync(file);
    if (info.isDirectory()) {
      file = join(file, 'index.html');
      info = statSync(file);
    }
    file = realpathSync(file);
    if (!inside(file) || !info.isFile()) throw new Error('not a file');
  } catch {
    send(res, 404, 'Not found');
    return;
  }

  const headers = {
    'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': String(info.size),
    'cache-control': 'no-store',
  };

  res.writeHead(200, headers);
  if (method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}).listen(port, () => {
  console.log(`Vice Pop Studio is served from ${root} at http://localhost:${port}`);
});
