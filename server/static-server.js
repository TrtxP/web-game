const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const cache = new Map();

function serveStaticFiles(rootDirectory) {
  return (req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^[/\\]+/, '');
    const filePath = path.resolve(rootDirectory, relativePath);

    if (!filePath.startsWith(`${rootDirectory}${path.sep}`)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (cache.has(filePath)) {
      const cached = cache.get(filePath);
      res.writeHead(200, { 'Content-Type': cached.type });
      res.end(cached.data);
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const type = MIME[path.extname(filePath)] || 'application/octet-stream';
      cache.set(filePath, { type, data });
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  };
}

module.exports = { serveStaticFiles };
