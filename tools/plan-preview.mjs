// Renders the site plan computed by src/02_siteplan.js to an image, for checking against the master plan.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'src', '02_siteplan.js'), 'utf8');
const body = src.slice(src.indexOf('/*PLAN-BEGIN*/'), src.indexOf('/*PLAN-END*/'));
const P = new Function(body + '\nreturn fitPlan();')();
const pad = 40, W = Math.max(...P.POLY.map(p => p[0])) + 2 * pad, H = Math.max(...P.POLY.map(p => p[1])) + 2 * pad + 60;
const k = 1;
const R = (r, fill, extra = '') => `<rect x="${r.x0 + pad}" y="${r.z0 + pad}" width="${r.x1 - r.x0}" height="${r.z1 - r.z0}" fill="${fill}" ${extra}/>`;
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#f4f1e8"/>`;
s += `<polygon points="${P.POLY.map(([x, z]) => `${x + pad},${z + pad}`).join(' ')}" fill="#dfe8cf" stroke="#333" stroke-width="2"/>`;
for (const [n, z] of Object.entries(P.zones)) s += R(z, n === 'park' ? '#8fc47a' : n === 'green' ? '#a9d18e' : '#f2c27a', 'stroke="#555"');
for (const r of P.roads) s += R(r, r.main ? '#6b6f72' : '#9a9a9a');
for (const r of P.lanes) s += R(r, '#a8a8a8');
for (const g of P.greens) s += `<rect x="${g.x + pad}" y="${g.z + pad}" width="${g.w}" height="${g.d}" fill="#9fd08a" stroke="#fff"/>`;
for (const p of P.plots) {
  s += `<rect x="${p.x + pad}" y="${p.z + pad}" width="${p.w}" height="${p.d}" fill="#d69a72" stroke="#fff" stroke-width="1.2"/>`;
  s += `<text x="${p.x + pad + p.w / 2}" y="${p.z + pad + p.d / 2 + 4}" font-size="11" text-anchor="middle" fill="#222" font-family="Arial">${p.no}</text>`;
  const fy = p.f === 'n' ? p.z + pad + 3 : p.z + pad + p.d - 3; s += `<circle cx="${p.x + pad + p.w / 2}" cy="${fy}" r="1.6" fill="#222"/>`;
}
for (const g of P.gates) s += `<circle cx="${g.x + pad}" cy="${g.z + pad}" r="9" fill="#e0281e"/>`;
s += `<text x="${pad}" y="${H - 22}" font-size="16" font-family="Arial">scale ${P.S.toFixed(3)} ft/px · ${P.plots.length} plots (${P.count} slots, ${P.greens.length} pocket greens) · site ${Math.round(W - 2 * pad)} × ${Math.round(H - 2 * pad - 60)} ft</text>`;
s += '</svg>';
await sharp(Buffer.from(s)).png().toFile(process.argv[2] || path.join(ROOT, 'reference', 'plan-preview.png'));
const blocks = {}; P.plots.forEach(p => blocks[p.block] = (blocks[p.block] || 0) + 1);
console.log('scale', P.S.toFixed(3), '| plots', P.plots.length, '| slots', P.count, '| greens', P.greens.length, '| per block', JSON.stringify(blocks), '| roads', P.roads.length, 'lanes', P.lanes.length);
