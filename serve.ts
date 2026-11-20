import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const appRoot = path.join(path.dirname(path.resolve(process.argv[1])), 'app');
const port = 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
};

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = createServer((req, res) => {
  const rawPath = (req.url ?? '/').split('?')[0].split('#')[0];

  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }

  if (pathname.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  if (segments.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const relative = segments.length === 0 ? 'index.html' : segments.join('/');
  const filePath = path.join(appRoot, relative);

  if (filePath !== appRoot && !filePath.startsWith(appRoot + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  let size;
  try {
    const info = statSync(filePath);
    if (!info.isFile()) {
      notFound(res);
      return;
    }
    size = info.size;
  } catch {
    notFound(res);
    return;
  }

  const type = mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    res.destroy();
  });
  stream.pipe(res);
});

server.listen(port, () => {
  console.log(`Serving app/ at http://localhost:${port}/`);
});
