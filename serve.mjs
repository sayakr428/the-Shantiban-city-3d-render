// Minimal static server for testing the web build locally (mirrors static hosting).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2], port = +process.argv[3] || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.json': 'application/json' };
http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+$/, '/index.html'));
  fs.readFile(p.endsWith(path.sep) ? path.join(p, 'index.html') : p, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d);
  });
}).listen(port, () => console.log('serving', dir, 'on', port));
